import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { inventoryDb } from "@/app/stockchecker/saltboy/data";

// The browser's random client ID is the existing ownership credential.
// Accept it only in a POST body, never in URLs or public response fields.
export async function POST(request: Request) {
  const respond = (body: unknown, status = 200) => NextResponse.json(body, {
    status, headers: { "Cache-Control": "no-store" },
  });
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return respond({ message: "送信元を確認できません。" }, 403);
    let body;
    try { body = await request.json(); } catch { return respond({ message: "入力を確認してください。" }, 400); }
    if (!body || typeof body.clientId !== "string" || body.clientId.length < 10 || body.clientId.length > 200
      || !["list", "delete"].includes(body.action)) return respond({ message: "投稿情報を確認できません。" }, 400);
    const hash = createHash("sha256").update(body.clientId).digest("hex");
    const db = inventoryDb();
    if (body.action === "delete") {
      if (!Number.isSafeInteger(body.reportId) || body.reportId < 1) return respond({ message: "投稿を選択してください。" }, 400);
      const result = await db.rpc("salt_boy_delete_own_inventory_report", { p_report_id: body.reportId, p_client_hash: hash });
      if (result.error) throw result.error;
      // Retrying a successful delete is safe. Do not reveal another owner's report.
      if (!result.data) {
        const own = await db.from("salt_boy_inventory_reports").select("id")
          .eq("id", body.reportId).eq("client_hash", hash).not("deleted_at", "is", null).maybeSingle();
        if (own.error) throw own.error;
        if (!own.data) return respond({ message: "削除できる自分の投稿が見つかりません。" }, 404);
      }
      return respond({ success: true });
    }
    if (body.before != null && (!Number.isSafeInteger(body.before) || body.before < 1)) return respond({ message: "入力を確認してください。" }, 400);
    let query = db.from("salt_boy_inventory_reports")
      .select("id,store_id,product_id,purchase_variant,quantity,stock_status,comment,created_at,deleted_at")
      .eq("client_hash", hash).order("id", { ascending: false }).limit(51);
    if (body.before) query = query.lt("id", body.before);
    const result = await query;
    if (result.error) throw result.error;
    return respond({ success: true, reports: result.data.slice(0, 50), hasMore: result.data.length > 50 });
  } catch (error) {
    console.error("SALT BOY own reports:", error);
    return respond({ message: "投稿情報を取得・更新できませんでした。再度お試しください。" }, 500);
  }
}
