import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => vi.unstubAllEnvs());

describe("Status seguro da autenticação Google", () => {
  it("desativa o login quando faltam credenciais OAuth", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ enabled: false });
  });

  it("libera a opção quando ambas credenciais estão definidas, sem expô-las", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "test-public-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-secret-not-for-browser");
    const response = await GET();
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ enabled: true });
    expect(text).not.toContain("test-secret-not-for-browser");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
