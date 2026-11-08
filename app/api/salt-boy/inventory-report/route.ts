import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { inventoryDb } from "@/app/so-honey/stockchecker/saltboy/data";

const ALLOWED_HOSTNAME = "kingandprince-stock.vercel.app";
const STOCK_STATUSES = new Set(["in_stock", "low_stock", "backorder", "sold_out"]);

type ReportItem = {
  productId: number;
  quantity: number;
  stockStatus: string;
  comment?: string;
};
type RequestBody = {
  storeId?: number;
  items?: ReportItem[];
  clientId?: string;
  requestId?: string;
  turnstileToken?: string;
};
type TurnstileResponse = { success: boolean; hostname?: string; action?: string };

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (!supabaseUrl || !serviceRoleKey || !turnstileSecret) {
      console.error("SALT BOY inventory report environment is incomplete.");
      return errorResponse("サーバー設定を確認できません。", 500);
    }

    let body: RequestBody;
    try {
      body = (await request.json()) as RequestBody;
    } catch {
      return errorResponse("投稿内容を読み取れませんでした。");
    }

    const { storeId, items, clientId, requestId, turnstileToken } = body;
    if (!Number.isSafeInteger(storeId) || Number(storeId) <= 0) {
      return errorResponse("店舗を選び直してください。");
    }
    if (!Array.isArray(items) || items.length < 1 || items.length > 7) {
      return errorResponse("在庫状況を1～7形態選択してください。");
    }
    if (new Set(items.map((item) => item.productId)).size !== items.length || items.some((item) =>
      !Number.isSafeInteger(item.productId) || item.productId <= 0
      || !Number.isSafeInteger(item.quantity) || item.quantity < 0 || item.quantity > 10000
      || !STOCK_STATUSES.has(item.stockStatus)
      || (typeof item.comment === "string" && item.comment.length > 300)
    )) {
      return errorResponse("形態ごとの在庫情報を確認してください。");
    }
    if (typeof clientId !== "string" || clientId.length < 10 || clientId.length > 200
      || typeof requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
      return errorResponse("投稿情報を確認できません。画面を開き直してください。");
    }
    if (typeof turnstileToken !== "string" || turnstileToken.length < 1 || turnstileToken.length > 2048) {
      return errorResponse("Bot対策の確認を完了してください。");
    }

    const forwardedFor = request.headers.get("x-vercel-forwarded-for")
      ?? request.headers.get("x-forwarded-for")
      ?? request.headers.get("x-real-ip")
      ?? "";
    const remoteIp = forwardedFor.split(",")[0]?.trim();
    const verifyBody = new FormData();
    verifyBody.set("secret", turnstileSecret);
    verifyBody.set("response", turnstileToken);
    if (remoteIp) verifyBody.set("remoteip", remoteIp);

    const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: verifyBody,
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!verifyResponse.ok) return errorResponse("Bot対策の確認に失敗しました。もう一度お試しください。", 403);
    const verification = (await verifyResponse.json()) as TurnstileResponse;
    if (!verification.success || verification.hostname !== ALLOWED_HOSTNAME || verification.action !== "inventory_report") {
      return errorResponse("Bot対策の確認に失敗しました。もう一度お試しください。", 403);
    }

    const supabase = inventoryDb();
    const clientHash = createHash("sha256").update(clientId).digest("hex");
    const { data, error } = await supabase.rpc("salt_boy_submit_inventory", {
      p_store_id: storeId,
      p_client_hash: clientHash,
      p_request_id: requestId,
      p_items: items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        stock_status: item.stockStatus,
        purchase_variant: null,
        comment: item.comment?.trim() || null,
      })),
    });
    if (error) {
      console.error("SALT BOY inventory submit error:", error.message);
      return errorResponse("在庫を送信できませんでした。内容を確認して再度お試しください。", 400);
    }

    return NextResponse.json({ success: true, reportCount: data?.length ?? items.length });
  } catch (error) {
    console.error("SALT BOY inventory report unexpected error:", error);
    return errorResponse("在庫報告中にエラーが発生しました。時間をおいて再度お試しください。", 500);
  }
}
