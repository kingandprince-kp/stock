import { NextResponse } from "next/server";
import { inventoryDb } from "@/app/stockchecker/saltboy/data";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request: Request) {
  const reply = (success: boolean, status: number) => NextResponse.json({ success }, { status, headers: { "Cache-Control": "no-store" } });
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return reply(false,403);
  try {
    const body = await request.json();
    if (!body || typeof body.eventId !== "string" || !UUID.test(body.eventId) || typeof body.clientId !== "string" || body.clientId.trim().length < 10 || body.clientId.length > 200) return reply(false,400);
    const { error } = await inventoryDb().rpc("salt_boy_record_page_access", { p_event_id: body.eventId, p_client_id: body.clientId });
    return reply(!error,error ? 503 : 200);
  } catch { return reply(false,503); }
}
