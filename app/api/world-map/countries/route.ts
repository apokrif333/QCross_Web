import { serveWorldMap } from "@/lib/worldMapStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return serveWorldMap(request, "countries");
}
