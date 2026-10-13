import { NextResponse } from "next/server";
import { badRequest, readJson, requireAuth, serverError } from "@/app/api/_helpers/auth";

type GeocodeResult = { lat: number; lng: number; name: string };

async function geocodeAddress(
  address: string,
  apiKey: string
): Promise<GeocodeResult | null> {
  const url = new URL("https://api.openrouteservice.org/geocode/search");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("text", address);
  url.searchParams.set("size", "1");
  // Focus search on Brazil to avoid finding addresses in other countries
  url.searchParams.set("boundary.country", "BR");

  const response = await fetch(url.toString(), { cache: "no-store" });
  const data = (await response.json()) as {
    features?: Array<{
      geometry: { coordinates: [number, number] };
      properties: { label: string; country?: string };
    }>;
  };

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

    const directionsResponse = await fetch(
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
      }
    );

    const directionsData = (await directionsResponse.json()) as {
      routes?: Array<{ summary: { distance: number; duration: number } }>;
      error?: { message?: string };
    };

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
    console.error("OpenRouteService API error:", error);
    return serverError("Erro ao conectar com OpenRouteService API");
  }
}
