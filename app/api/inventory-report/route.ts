import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type SubmitBody = {
  storeId?: unknown;
  productId?: unknown;
  quantity?: unknown;
  comment?: unknown;
  clientId?: unknown;
  turnstileToken?: unknown;
};

type TurnstileResult = {
  success: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const TURNSTILE_SECRET_KEY =
  process.env.TURNSTILE_SECRET_KEY;

const ALLOWED_HOSTNAME =
  "kingandprince-stock.vercel.app";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function getClientIp(request: Request) {
  return (
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    ""
  )
    .split(",")[0]
    .trim();
}

function hashIp(ip: string) {
  if (!TURNSTILE_SECRET_KEY) {
    throw new Error(
      "TURNSTILE_SECRET_KEY is not configured."
    );
  }

  return createHmac(
    "sha256",
    TURNSTILE_SECRET_KEY
  )
    .update(ip)
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY ||
      !TURNSTILE_SECRET_KEY
    ) {
      console.error(
        "Inventory API environment variables are missing."
      );

      return jsonError(
        "サーバー設定に問題があります。",
        500
      );
    }

    let body: SubmitBody;

    try {
      body = await request.json();
    } catch {
      return jsonError(
        "送信内容を確認できませんでした。",
        400
      );
    }

    const storeId = Number(body.storeId);
    const productId = Number(body.productId);
    const quantity = Number(body.quantity);

    const comment =
      typeof body.comment === "string"
        ? body.comment.trim()
        : "";

    const clientId =
      typeof body.clientId === "string"
        ? body.clientId.trim()
        : "";

    const turnstileToken =
      typeof body.turnstileToken === "string"
        ? body.turnstileToken.trim()
        : "";

    // -----------------------------------------
    // 入力値チェック
    // -----------------------------------------

    if (
      !Number.isInteger(storeId) ||
      storeId <= 0
    ) {
      return jsonError(
        "店舗を選択してください。",
        400
      );
    }

    if (
      !Number.isInteger(productId) ||
      productId <= 0
    ) {
      return jsonError(
        "商品を選択してください。",
        400
      );
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      quantity > 100
    ) {
      return jsonError(
        "在庫枚数は0〜100の整数で入力してください。",
        400
      );
    }

    if (comment.length > 500) {
      return jsonError(
        "コメントは500文字以内で入力してください。",
        400
      );
    }

    if (
      clientId.length < 10 ||
      clientId.length > 200
    ) {
      return jsonError(
        "投稿情報を確認できませんでした。ページを再読み込みしてください。",
        400
      );
    }

    if (
      turnstileToken.length === 0 ||
      turnstileToken.length > 2048
    ) {
      return jsonError(
        "Bot確認を完了してから投稿してください。",
        403
      );
    }

    // -----------------------------------------
    // Vercelから利用者IPを取得
    // -----------------------------------------

    const clientIp = getClientIp(request);

    if (!clientIp) {
      console.error(
        "Inventory API: client IP was not available."
      );

      return jsonError(
        "通信情報を確認できませんでした。もう一度お試しください。",
        403
      );
    }

    // -----------------------------------------
    // Cloudflare Turnstile検証
    // -----------------------------------------

    let turnstileResult: TurnstileResult;

    try {
      const verifyResponse = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            secret: TURNSTILE_SECRET_KEY,
            response: turnstileToken,
            remoteip: clientIp,
          }),
          cache: "no-store",
        }
      );

      if (!verifyResponse.ok) {
        throw new Error(
          `Turnstile returned ${verifyResponse.status}`
        );
      }

      turnstileResult =
        (await verifyResponse.json()) as TurnstileResult;
    } catch (error) {
      console.error(
        "Turnstile verification error:",
        error
      );

      return jsonError(
        "Bot確認に失敗しました。もう一度お試しください。",
        403
      );
    }

    if (
      !turnstileResult.success ||
      turnstileResult.hostname !== ALLOWED_HOSTNAME ||
      turnstileResult.action !== "inventory_report"
    ) {
      console.error(
        "Turnstile verification rejected:",
        turnstileResult["error-codes"] ?? [],
        turnstileResult.hostname,
        turnstileResult.action
      );

      return jsonError(
        "Bot確認に失敗しました。もう一度お試しください。",
        403
      );
    }

    // -----------------------------------------
    // Supabase service role接続
    // -----------------------------------------

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // -----------------------------------------
    // IPは生値を保存せずHMAC-SHA256化
    // -----------------------------------------

    const ipHash = hashIp(clientIp);

    // -----------------------------------------
    // 同一IP：10分間に最大30件
    //
    // 携帯回線・会社Wi-Fiなど同じIPを複数人で
    // 共有する可能性があるため、
    // ブラウザIDより少し緩めの制限にする
    // -----------------------------------------

    const tenMinutesAgo = new Date(
      Date.now() - 10 * 60 * 1000
    ).toISOString();

    const {
      count: recentIpCount,
      error: recentIpError,
    } = await supabase
      .from("inventory_ip_rate_limits")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("ip_hash", ipHash)
      .gt("created_at", tenMinutesAgo);

    if (recentIpError) {
      console.error(
        "IP rate-limit count error:",
        recentIpError
      );

      return jsonError(
        "投稿処理中にエラーが発生しました。",
        500
      );
    }

    if ((recentIpCount ?? 0) >= 30) {
      return jsonError(
        "短時間に多数の投稿が行われています。少し時間をおいてから投稿してください。",
        429
      );
    }

    // -----------------------------------------
    // 同一IP＋同一店舗＋同一商品：
    // 10分間に最大5件
    //
    // 共有IPによる誤判定を避けるため、
    // ブラウザIDの3分制限より緩め
    // -----------------------------------------

    const {
      count: sameItemIpCount,
      error: sameItemIpError,
    } = await supabase
      .from("inventory_ip_rate_limits")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("ip_hash", ipHash)
      .eq("store_id", storeId)
      .eq("product_id", productId)
      .gt("created_at", tenMinutesAgo);

    if (sameItemIpError) {
      console.error(
        "IP item rate-limit count error:",
        sameItemIpError
      );

      return jsonError(
        "投稿処理中にエラーが発生しました。",
        500
      );
    }

    if ((sameItemIpCount ?? 0) >= 5) {
      return jsonError(
        "同じ店舗・同じ商品への投稿が短時間に集中しています。少し時間をおいてください。",
        429
      );
    }

    // -----------------------------------------
    // 既存RPCを実行
    //
    // ここでも
    // ・同一ブラウザ 10分10件
    // ・同一ブラウザ＋同一店舗＋商品 3分
    // ・在庫0〜100
    // が再チェックされる
    // -----------------------------------------

    const {
      data: reportId,
      error: submitError,
    } = await supabase.rpc(
      "submit_inventory_report",
      {
        p_store_id: storeId,
        p_product_id: productId,
        p_quantity: quantity,
        p_comment:
          comment === "" ? null : comment,
        p_client_id: clientId,
      }
    );

    if (submitError) {
      console.error(
        "submit_inventory_report error:",
        submitError
      );

      let message =
        submitError.message ||
        "投稿に失敗しました。";

      if (
        message.includes(
          "同じ店舗・同じ商品への連続投稿"
        )
      ) {
        message =
          "同じ店舗・同じ商品への再投稿は、3分ほど時間をおいてください。";
      } else if (
        message.includes(
          "短時間に投稿が集中"
        )
      ) {
        message =
          "短時間に投稿が集中しています。少し時間をおいてから投稿してください。";
      }

      return jsonError(message, 429);
    }

    // -----------------------------------------
    // 成功した投稿だけIP制限履歴へ記録
    // -----------------------------------------

    const { error: ipLogError } =
      await supabase
        .from("inventory_ip_rate_limits")
        .insert({
          ip_hash: ipHash,
          store_id: storeId,
          product_id: productId,
        });

    if (ipLogError) {
      // 在庫投稿自体は成功しているので、
      // 利用者にはエラーを返さない
      console.error(
        "IP rate-limit log error:",
        ipLogError
      );
    }

    // 7日より古いIP制限履歴を削除
    const sevenDaysAgo = new Date(
      Date.now() -
        7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { error: cleanupError } =
      await supabase
        .from("inventory_ip_rate_limits")
        .delete()
        .lt("created_at", sevenDaysAgo);

    if (cleanupError) {
      console.error(
        "IP rate-limit cleanup error:",
        cleanupError
      );
    }

    return NextResponse.json(
      {
        success: true,
        reportId,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Inventory API unexpected error:",
      error
    );

    return jsonError(
      "投稿中にエラーが発生しました。もう一度お試しください。",
      500
    );
  }
}