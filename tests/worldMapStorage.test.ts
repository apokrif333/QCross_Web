import { describe, expect, it, vi } from "vitest";
import { S3Client } from "@aws-sdk/client-s3";
import { fallbackMap, mapFilename, serveWorldMap, snapshotMapKey } from "../lib/worldMapStorage";

describe("world-map delivery", () => {
  it("maps only the two known names to bundled files", () => {
    expect(mapFilename("countries")).toBe("countries_rental_yield.html");
    expect(mapFilename("cities")).toBe("cities_rental_yield.html");
    expect(snapshotMapKey("world-map", "a-version", "cities"))
      .toBe("world-map/versions/a-version/maps/cities_rental_yield.html");
  });

  it("redirects storage failures to the bundled static map", () => {
    const response = fallbackMap(new Request("https://example.com/api/world-map/cities"), "cities");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/maps/cities_rental_yield.html");
  });

  it("uses the bundled map when storage is not configured", async () => {
    vi.stubEnv("WORLD_MAP_S3_BUCKET", "");
    try {
      const response = await serveWorldMap(new Request("https://example.com/api/world-map/countries"), "countries");
      expect(response.headers.get("location")).toBe("https://example.com/maps/countries_rental_yield.html");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("uses the new bundled country map while storage still has an older renderer", async () => {
    vi.stubEnv("WORLD_MAP_S3_ENDPOINT", "https://s3.example.com");
    vi.stubEnv("WORLD_MAP_S3_REGION", "us-east-1");
    vi.stubEnv("WORLD_MAP_S3_BUCKET", "test");
    vi.stubEnv("WORLD_MAP_S3_ACCESS_KEY_ID", "test");
    vi.stubEnv("WORLD_MAP_S3_SECRET_ACCESS_KEY", "test");
    const send = vi.spyOn(S3Client.prototype, "send").mockResolvedValueOnce({
      Body: { transformToString: async () => JSON.stringify({ version: "123e4567-e89b-12d3-a456-426614174000" }) },
    } as never);
    try {
      const response = await serveWorldMap(new Request("https://example.com/api/world-map/countries"), "countries");
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("https://example.com/maps/countries_rental_yield.html");
      expect(send).toHaveBeenCalledOnce();
    } finally {
      send.mockRestore();
      vi.unstubAllEnvs();
    }
  });
});
