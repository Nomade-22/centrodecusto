import { NextResponse } from "next/server";
import { badRequest, readJson, requireAuth, serverError } from "@/app/api/_helpers/auth";

export const maxDuration = 60;

type GeocodeResult = { lat: number; lng: number; name: string };

/** Exibe erros úteis sem expor segredos ou respostas brutas do provedor. */
class RouteProviderError extends Error {
  constructor(message: string, public readonly httpStatus: number) {
    super(message);
    this.name = "RouteProviderError";
  }
}

async function readProviderResponse<T>(response: Response, step: string): Promise<T> {
  const raw = await response.text();
  let data: unknown = null;
  try {
    data = JSON.parse(raw);
  } catch {
    // Gateways podem devolver HTML ou texto em erros de autenticação/limite.
  }

  if (!response.ok) {
    const status = response.status;
    const message =
      status === 401 || status === 403
        ? "A API de rotas recusou a chave de acesso. Verifique a credencial OPENROUTE_API_KEY na Vercel."
        : status === 429
          ? "Limite de consultas de rotas atingido. Aguarde e tente novamente."
          : status >= 500
            ? "Serviço externo de rotas temporariamente indisponível. Tente novamente."
            : `A API não conseguiu concluir ${step} (HTTP ${status}). Verifique os endereços.`;
    console.error(`HeiGIT ${step}: HTTP ${status}`);
    throw new RouteProviderError(message, status);
  }

  if (data === null || typeof data !== "object") {
    throw new RouteProviderError(
      `Resposta inválida do serviço de ${step}. Tente novamente.`,
      502
    );
  }
  return data as T;
}

/** Fallback temporário para a URL antiga (desligamento anunciado para novembro/2026).
 * Não altera a chave nem as fórmulas de orçamento. Tentativas independentes têm
 * seus próprios timeouts para não reutilizar um sinal já abortado.
 */
function networkFailureCode(error: unknown): string {
  if (!(error instanceof Error)) return "ERRO_DESCONHECIDO";
  if (error.name === "TimeoutError" || error.name === "AbortError") return "TIMEOUT";
  const cause = (error as Error & { cause?: { code?: string } }).cause;
  const code = cause?.code;
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "DNS";
  if (code === "ECONNRESET" || code === "ETIMEDOUT") return "CONEXAO";
  if (error.name === "TypeError") return "REDE";
  return "INDEFINIDO";
}

async function fetchWithTemporaryFallback(
  modernUrl: string,
  legacyUrl: string,
  options: RequestInit,
  step: string,
  timeoutMs: number
): Promise<Response> {
  const attempt = (url: string) =>
    fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });

  let primaryFailure = "";
  try {
    const response = await attempt(modernUrl);
    // Não contornar limites (429) nem restrições de credencial (401/403).
    if (response.status !== 502 && response.status !== 503 && response.status !== 504) {
      return response;
    }
    primaryFailure = `HTTP_${response.status}`;
  } catch (error) {
    primaryFailure = networkFailureCode(error);
  }

  console.warn(`HeiGIT indisponível na etapa ${step}: ${primaryFailure}; tentando URL temporária`);
  try {
    const response = await attempt(legacyUrl);
    console.info(`Retorno da conexão temporária em ${step}: HTTP_${response.status}`);
    return response;
  } catch (error) {
    const backupFailure = networkFailureCode(error);
    console.error(`Ambos endpoints indisponíveis em ${step}: ${primaryFailure}/${backupFailure}`);
    throw new RouteProviderError(
      `Não foi possível conectar aos serviços de rota (${step}). Código: ${primaryFailure}/${backupFailure}. A chave não foi exposta.`,
      503
    );
  }
}

async function geocodeAddress(
  address: string,
  apiKey: string
): Promise<GeocodeResult | null> {
  const url = new URL("https://api.heigit.org/pelias/v1/search");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("text", address);
  url.searchParams.set("size", "1");
  // Focus search on Brazil to avoid finding addresses in other countries
  url.searchParams.set("boundary.country", "BR");

  const legacyUrl = new URL("https://api.openrouteservice.org/geocode/search");
  legacyUrl.search = url.search;
  const response = await fetchWithTemporaryFallback(
    url.toString(),
    legacyUrl.toString(),
    { cache: "no-store" },
    "geocodificação",
    9000
  );
  const data = await readProviderResponse<{
    features?: Array<{
      geometry: { coordinates: [number, number] };
      properties: { label: string; country?: string };
    }>;
  }>(response, "geocodificação");

  if (!data.features || data.features.length === 0) {
    return null;
  }

  const feature = data.features[0];
  return {
    lng: feature.geometry.coordinates[0],
    lat: feature.geometry.coordinates[1],
    name: feature.properties.label,
  };
}

/**
 * POST /api/calculate-route
 *
 * Geocode origin + destination and ask OpenRouteService for driving directions.
 * Requires an authorized account to prevent public abuse of the paid routing API key.
 */
export async function POST(req: Request) {
  const access = await requireAuth(req);
  if (access.response) return access.response;

  const { origin, destination } = await readJson<{
    origin?: string;
    destination?: string;
  }>(req);

  if (!origin?.trim() || !destination?.trim() || origin.length > 250 || destination.length > 250) {
    return badRequest("Origem e destino são obrigatórios");
  }

  const apiKey = process.env.OPENROUTE_API_KEY;
  if (!apiKey) {
    return serverError("OpenRouteService API Key não configurada");
  }

  try {
    const [originCoords, destCoords] = await Promise.all([
      geocodeAddress(origin, apiKey),
      geocodeAddress(destination, apiKey),
    ]);

    if (!originCoords) {
      return badRequest("Não foi possível encontrar o endereço de origem");
    }
    if (!destCoords) {
      return badRequest("Não foi possível encontrar o endereço de destino");
    }

    const directionsResponse = await fetchWithTemporaryFallback(
      "https://api.heigit.org/openrouteservice/v2/directions/driving-car",
      "https://api.openrouteservice.org/v2/directions/driving-car",
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates: [
            [originCoords.lng, originCoords.lat],
            [destCoords.lng, destCoords.lat],
          ],
        }),
        cache: "no-store",
      },
      "cálculo de rota",
      12000
    );

    const directionsData = await readProviderResponse<{
      routes?: Array<{ summary: { distance: number; duration: number } }>;
      error?: { message?: string };
    }>(directionsResponse, "cálculo de rota");

    if (directionsData.error) {
      // Distance-limit rejections get a more actionable message.
      if (directionsData.error.message?.includes("6000000")) {
        return badRequest(
          `A rota é muito longa ou os endereços foram interpretados incorretamente. Verifique se os endereços estão corretos.\n\nOrigem encontrada: ${originCoords.name}\nDestino encontrado: ${destCoords.name}`
        );
      }
      return badRequest(
        "Erro ao calcular rota: " + (directionsData.error.message ?? "")
      );
    }

    if (!directionsData.routes || directionsData.routes.length === 0) {
      return badRequest("Não foi possível calcular a rota entre esses locais");
    }

    const route = directionsData.routes[0];
    const distanceKm = route.summary.distance / 1000;
    const durationMinutes = route.summary.duration / 60;

    const hours = Math.floor(durationMinutes / 60);
    const mins = Math.round(durationMinutes % 60);
    const durationText = hours > 0 ? `${hours}h ${mins}min` : `${mins} min`;

    return NextResponse.json({
      origin_address: originCoords.name,
      destination_address: destCoords.name,
      distance_km: Math.round(distanceKm * 10) / 10,
      distance_text: `${Math.round(distanceKm * 10) / 10} km`,
      duration_minutes: Math.round(durationMinutes * 10) / 10,
      duration_text: durationText,
    });
  } catch (error) {
    if (error instanceof RouteProviderError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.httpStatus === 429 ? 429 : 502 }
      );
    }
    const code = networkFailureCode(error);
    console.error("Falha inesperada no cálculo de rota:", code);
    return serverError(`Falha inesperada no serviço de rotas (código ${code}). Tente novamente.`);
  }
}
