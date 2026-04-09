import { hasRuntimeSecrets } from "@/lib/config/env";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    ok: true,
    configured: hasRuntimeSecrets(),
    timestamp: new Date().toISOString()
  });
}
