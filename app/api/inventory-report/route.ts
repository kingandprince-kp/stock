import {
  createHash,
  createHmac,
} from "crypto";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const ALLOWED_HOSTNAME =
  "kingandprince-stock.vercel.app";

type RequestBody = {
  storeId?: number;
  productId?: number;
  quantity?: number;
  comment?: string | null;
  clientId?: string;
  turnstileToken?: string;
};

type TurnstileResponse = {
  success: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
};

function jsonError(
  message: string,
  status = 400
) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status,
    }
  );
}

export async function POST(
  request: Request
) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    const turnstileSecret =
      process.env.TURNSTILE_SECRET_KEY;

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !turnstileSecret
    ) {
      console.error(
        "Required server environment variables are missing."
      );

      return jsonError(
        "サーバー設定に問題があります。",
        500
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    let body: RequestBody;

    try {
      body =
        (await request.json()) as RequestBody;
    } catch {
      return jsonError(
        "投稿内容を確認できませんでした。"
      );
    }

    const {
      storeId,
      productId,
      quantity,
      comment,
      clientId,
      turnstileToken,
    } = body;

    /*
     * IP取得
     */
    const forwardedFor =
      request.headers.get(
        "x-vercel-forwarded-for"
      ) ??
      request.headers.get(
        "x-forwarded-for"
      ) ??
      request.headers.get("x-real-ip") ??
      "";

    const ip =
      forwardedFor
        .split(",")[0]
        ?.trim() || null;

    /*
     * IPハッシュ
     */
    const ipHash = ip
      ? createHmac(
          "sha256",
          turnstileSecret
        )
          .update(ip)
          .digest("hex")
      : null;

    /*
     * Browser/clientハッシュ
     */
    const clientHash =
      typeof clientId === "string" &&
      clientId.length > 0
        ? createHash("sha256")
            .update(clientId)
            .digest("hex")
        : null;

    /*
     * セキュリティイベント記録用
     */
    async function logSecurityEvent(
      eventType: string,
      reason: string | null = null,
      reviewStatus:
        | "approved"
        | "pending"
        | "rejected"
        | null = null,
      reportId: number | null = null
    ) {
      const {
        error: logError,
      } = await supabase
        .from(
          "inventory_security_events"
        )
        .insert({
          event_type: eventType,
          report_id: reportId,

          ip_address: ip,
          ip_hash: ipHash,
          client_hash: clientHash,

          store_id:
            Number.isInteger(storeId) &&
            Number(storeId) > 0
              ? Number(storeId)
              : null,

          product_id:
            Number.isInteger(productId) &&
            Number(productId) > 0
              ? Number(productId)
              : null,

          quantity:
            Number.isInteger(quantity)
              ? Number(quantity)
              : null,

          comment:
            typeof comment === "string" &&
            comment.trim() !== ""
              ? comment.trim().slice(
                  0,
                  500
                )
              : null,

          review_status:
            reviewStatus,

          reason,
        });

      if (logError) {
        console.error(
          "security event log error:",
          logError
        );
      }
    }

    /*
     * 基本入力チェック
     */
    if (
      !Number.isInteger(storeId) ||
      Number(storeId) <= 0
    ) {
      await logSecurityEvent(
        "invalid_request",
        "店舗IDが不正"
      );

      return jsonError(
        "店舗を選択してください。"
      );
    }

    if (
      !Number.isInteger(productId) ||
      Number(productId) <= 0
    ) {
      await logSecurityEvent(
        "invalid_request",
        "商品IDが不正"
      );

      return jsonError(
        "商品を選択してください。"
      );
    }

    if (
      !Number.isInteger(quantity) ||
      Number(quantity) < 0 ||
      Number(quantity) > 100
    ) {
      await logSecurityEvent(
        "invalid_request",
        "在庫枚数が0〜100の範囲外"
      );

      return jsonError(
        "在庫枚数は0〜100の整数で入力してください。"
      );
    }

    if (
      typeof comment === "string" &&
      comment.length > 500
    ) {
      await logSecurityEvent(
        "invalid_request",
        "コメントが500文字を超過"
      );

      return jsonError(
        "コメントは500文字以内で入力してください。"
      );
    }

    if (
      typeof clientId !== "string" ||
      clientId.trim().length < 10 ||
      clientId.length > 200
    ) {
      await logSecurityEvent(
        "invalid_request",
        "client IDが不正"
      );

      return jsonError(
        "投稿情報を確認できませんでした。ページを再読み込みしてください。"
      );
    }

    if (
      typeof turnstileToken !== "string" ||
      !turnstileToken ||
      turnstileToken.length > 2048
    ) {
      await logSecurityEvent(
        "turnstile_block",
        "Turnstile tokenがない、または不正"
      );

      return jsonError(
        "Bot確認が完了していません。ページを再読み込みしてください。",
        403
      );
    }

    /*
     * Turnstile確認
     */
    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: turnstileToken,
          ...(ip
            ? { remoteip: ip }
            : {}),
        }),
      }
    );

    if (!verifyResponse.ok) {
      await logSecurityEvent(
        "turnstile_block",
        `Turnstile verification HTTP ${verifyResponse.status}`
      );

      return jsonError(
        "Bot確認に失敗しました。もう一度お試しください。",
        403
      );
    }

    const verifyResult =
      (await verifyResponse.json()) as TurnstileResponse;

    if (!verifyResult.success) {
      await logSecurityEvent(
        "turnstile_block",
        `Turnstile rejected: ${
          verifyResult[
            "error-codes"
          ]?.join(", ") ??
          "unknown"
        }`
      );

      return jsonError(
        "Bot確認に失敗しました。もう一度お試しください。",
        403
      );
    }

    if (
      verifyResult.hostname !==
      ALLOWED_HOSTNAME
    ) {
      await logSecurityEvent(
        "turnstile_block",
        `Turnstile hostname mismatch: ${
          verifyResult.hostname ??
          "unknown"
        }`
      );

      return jsonError(
        "Bot確認に失敗しました。",
        403
      );
    }

    if (
      verifyResult.action !==
      "inventory_report"
    ) {
      await logSecurityEvent(
        "turnstile_block",
        `Turnstile action mismatch: ${
          verifyResult.action ??
          "unknown"
        }`
      );

      return jsonError(
        "Bot確認に失敗しました。",
        403
      );
    }

    const now = Date.now();

    const tenMinutesAgo =
      new Date(
        now - 10 * 60 * 1000
      ).toISOString();

    const fiveMinutesAgo =
      new Date(
        now - 5 * 60 * 1000
      ).toISOString();

    const threeMinutesAgo =
      new Date(
        now - 3 * 60 * 1000
      ).toISOString();

    /*
     * client ID:
     * 10分以内に10件投稿済みなら
     * 次の投稿を拒否
     */
    const {
      count: clientRecentCount,
      error: clientRecentError,
    } = await supabase
      .from("inventory_rate_limits")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "client_hash",
        clientHash
      )
      .gt(
        "created_at",
        tenMinutesAgo
      );

    if (clientRecentError) {
      console.error(
        "client rate limit check error:",
        clientRecentError
      );

      return jsonError(
        "投稿情報の確認中にエラーが発生しました。",
        500
      );
    }

    if (
      (clientRecentCount ?? 0) >= 10
    ) {
      await logSecurityEvent(
        "rate_limit_client",
        "同一ブラウザから10分以内に10件以上の投稿"
      );

      return jsonError(
        "短時間に投稿が集中しています。少し時間をおいてから投稿してください。",
        429
      );
    }

    /*
     * 同一ブラウザ・同一店舗・同一商品
     * 3分以内の再投稿を拒否
     */
    const {
      count: sameItemCount,
      error: sameItemError,
    } = await supabase
      .from("inventory_rate_limits")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "client_hash",
        clientHash
      )
      .eq(
        "store_id",
        Number(storeId)
      )
      .eq(
        "product_id",
        Number(productId)
      )
      .gt(
        "created_at",
        threeMinutesAgo
      );

    if (sameItemError) {
      console.error(
        "same item check error:",
        sameItemError
      );

      return jsonError(
        "投稿情報の確認中にエラーが発生しました。",
        500
      );
    }

    if (
      (sameItemCount ?? 0) > 0
    ) {
      await logSecurityEvent(
        "same_item_block",
        "同一ブラウザから同一店舗・同一商品への3分以内の再投稿"
      );

      return jsonError(
        "同じ店舗・同じ商品への連続投稿は、3分以上時間をおいてください。",
        429
      );
    }

    /*
     * IP:
     * 10分以内30件で拒否
     */
    if (ipHash) {
      const {
        count: ipRecentCount,
        error: ipRecentError,
      } = await supabase
        .from(
          "inventory_ip_rate_limits"
        )
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "ip_hash",
          ipHash
        )
        .gt(
          "created_at",
          tenMinutesAgo
        );

      if (ipRecentError) {
        console.error(
          "IP rate limit check error:",
          ipRecentError
        );

        return jsonError(
          "投稿情報の確認中にエラーが発生しました。",
          500
        );
      }

      if (
        (ipRecentCount ?? 0) >=
        30
      ) {
        await logSecurityEvent(
          "rate_limit_ip",
          "同一IPから10分以内に30件以上の投稿"
        );

        return jsonError(
          "短時間に投稿が集中しています。少し時間をおいてから投稿してください。",
          429
        );
      }

      /*
       * 同一IP・同一店舗・同一商品
       * 10分以内5件で拒否
       */
      const {
        count: ipSameItemCount,
        error: ipSameItemError,
      } = await supabase
        .from(
          "inventory_ip_rate_limits"
        )
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "ip_hash",
          ipHash
        )
        .eq(
          "store_id",
          Number(storeId)
        )
        .eq(
          "product_id",
          Number(productId)
        )
        .gt(
          "created_at",
          tenMinutesAgo
        );

      if (ipSameItemError) {
        console.error(
          "IP same item check error:",
          ipSameItemError
        );

        return jsonError(
          "投稿情報の確認中にエラーが発生しました。",
          500
        );
      }

      if (
        (ipSameItemCount ?? 0) >=
        5
      ) {
        await logSecurityEvent(
          "rate_limit_ip",
          "同一IPから同一店舗・同一商品へ10分以内に5件以上の投稿"
        );

        return jsonError(
          "同じ店舗・同じ商品への投稿が短時間に集中しています。少し時間をおいてください。",
          429
        );
      }
    }

    /*
     * 5分以内の異なる店舗数を確認
     */
    const [
      clientStoresResult,
      ipStoresResult,
    ] = await Promise.all([
      supabase
        .from(
          "inventory_rate_limits"
        )
        .select("store_id")
        .eq(
          "client_hash",
          clientHash
        )
        .gt(
          "created_at",
          fiveMinutesAgo
        ),

      ipHash
        ? supabase
            .from(
              "inventory_ip_rate_limits"
            )
            .select("store_id")
            .eq(
              "ip_hash",
              ipHash
            )
            .gt(
              "created_at",
              fiveMinutesAgo
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

    if (
      clientStoresResult.error ||
      ipStoresResult.error
    ) {
      console.error(
        "suspicious store check error:",
        clientStoresResult.error ??
          ipStoresResult.error
      );

      return jsonError(
        "投稿情報の確認中にエラーが発生しました。",
        500
      );
    }

    const clientStoreIds =
      new Set<number>(
        (
          clientStoresResult.data ??
          []
        ).map((row) =>
          Number(row.store_id)
        )
      );

    const ipStoreIds =
      new Set<number>(
        (
          ipStoresResult.data ??
          []
        ).map((row) =>
          Number(row.store_id)
        )
      );

    /*
     * 今回投稿する店舗も加える。
     * これで「5店舗目」からpending。
     */
    clientStoreIds.add(
      Number(storeId)
    );

    if (ipHash) {
      ipStoreIds.add(
        Number(storeId)
      );
    }

    const suspiciousByClient =
      clientStoreIds.size >= 5;

    const suspiciousByIp =
      Boolean(ipHash) &&
      ipStoreIds.size >= 5;

    const reviewStatus:
      | "approved"
      | "pending" =
      suspiciousByClient ||
      suspiciousByIp
        ? "pending"
        : "approved";

    let reviewReason:
      | string
      | null = null;

    if (
      suspiciousByClient &&
      suspiciousByIp
    ) {
      reviewReason =
        "5分以内に同一IP・同一ブラウザから異なる5店舗以上への投稿を検知";
    } else if (
      suspiciousByClient
    ) {
      reviewReason =
        "5分以内に同一ブラウザから異なる5店舗以上への投稿を検知";
    } else if (
      suspiciousByIp
    ) {
      reviewReason =
        "5分以内に同一IPから異なる5店舗以上への投稿を検知";
    }

    /*
     * 在庫投稿
     */
    const {
      data: reportId,
      error: rpcError,
    } = await supabase.rpc(
      "submit_inventory_report_v2",
      {
        p_store_id:
          Number(storeId),

        p_product_id:
          Number(productId),

        p_quantity:
          Number(quantity),

        p_comment:
          typeof comment ===
            "string" &&
          comment.trim() !== ""
            ? comment.trim()
            : null,

        p_client_id:
          clientId,

        p_review_status:
          reviewStatus,

        p_review_reason:
          reviewReason,
      }
    );

    if (rpcError) {
      console.error(
        "submit_inventory_report_v2 error:",
        rpcError
      );

      /*
       * RPC側でレート制限に
       * 引っかかった場合も記録。
       */
      const rpcMessage =
        rpcError.message ?? "";

      if (
        rpcMessage.includes(
          "同じ店舗・同じ商品"
        )
      ) {
        await logSecurityEvent(
          "same_item_block",
          rpcMessage
        );
      } else if (
        rpcMessage.includes(
          "短時間に投稿が集中"
        )
      ) {
        await logSecurityEvent(
          "rate_limit_client",
          rpcMessage
        );
      } else {
        await logSecurityEvent(
          "invalid_request",
          rpcMessage ||
            "RPC投稿エラー"
        );
      }

      return jsonError(
        rpcMessage ||
          "投稿に失敗しました。",
        400
      );
    }

    /*
     * IPレート制限履歴
     */
    if (ipHash) {
      const {
        error: ipInsertError,
      } = await supabase
        .from(
          "inventory_ip_rate_limits"
        )
        .insert({
          ip_hash: ipHash,
          store_id:
            Number(storeId),
          product_id:
            Number(productId),
        });

      if (ipInsertError) {
        console.error(
          "IP rate limit insert error:",
          ipInsertError
        );
      }
    }

    /*
     * ★ 投稿が成功した1件目から
     * すべてセキュリティ履歴へ保存
     */
    if (
      reviewStatus === "pending"
    ) {
      await logSecurityEvent(
        "pending",
        reviewReason,
        "pending",
        Number(reportId)
      );
    } else {
      await logSecurityEvent(
        "submitted",
        "正常投稿",
        "approved",
        Number(reportId)
      );
    }

    return NextResponse.json({
      success: true,
      reportId,
    });
  } catch (error) {
    console.error(
      "inventory report API error:",
      error
    );

    return jsonError(
      "投稿中にエラーが発生しました。もう一度お試しください。",
      500
    );
  }
}