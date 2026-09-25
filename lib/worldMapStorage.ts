import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const MAP_FILES = {
  countries: "countries_rental_yield.html",
  cities: "cities_rental_yield.html",
} as const;

export type WorldMapName = keyof typeof MAP_FILES;

export function mapFilename(name: WorldMapName): string {
  return MAP_FILES[name];
}

export function snapshotMapKey(prefix: string, version: string, name: WorldMapName): string {
  return `${prefix}/versions/${version}/maps/${mapFilename(name)}`;
}

export function fallbackMap(request: Request, name: WorldMapName): Response {
  return new Response(null, {
    status: 307,
    headers: {
      Location: new URL(`/maps/${mapFilename(name)}`, request.url).toString(),
      "Cache-Control": "public, max-age=0, s-maxage=60",
    },
  });
}

function configuration() {
  const { WORLD_MAP_S3_ENDPOINT: endpoint, WORLD_MAP_S3_REGION: region,
    WORLD_MAP_S3_BUCKET: bucket, WORLD_MAP_S3_ACCESS_KEY_ID: accessKeyId,
    WORLD_MAP_S3_SECRET_ACCESS_KEY: secretAccessKey } = process.env;
  if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) return null;
  return { endpoint, region, bucket, accessKeyId, secretAccessKey,
    prefix: (process.env.WORLD_MAP_S3_PREFIX || "world-map").replace(/^\/+|\/+$/g, "") };
}

export async function serveWorldMap(request: Request, name: WorldMapName): Promise<Response> {
  const config = configuration();
  if (!config) return fallbackMap(request, name);

  try {
    const client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: process.env.WORLD_MAP_S3_FORCE_PATH_STYLE === "true",
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
    const manifest = await client.send(new GetObjectCommand({
      Bucket: config.bucket, Key: `${config.prefix}/current.json`,
    }));
    if (!manifest.Body) throw new Error("Empty world-map manifest");
    const { version } = JSON.parse(await manifest.Body.transformToString()) as { version?: unknown };
    if (typeof version !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(version)) {
      throw new Error("Invalid world-map snapshot version");
    }
    const object = await client.send(new GetObjectCommand({
      Bucket: config.bucket,
      Key: snapshotMapKey(config.prefix, version, name),
    }));
    if (!object.Body) throw new Error("Empty world-map object");
    return new Response(object.Body.transformToWebStream(), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error(`World map ${name} storage read failed; using bundled map.`, error);
    return fallbackMap(request, name);
  }
}
