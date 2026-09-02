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
  stockStatus?: "in_stock" | "low_stock" | "backorder" | "sold_out";
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

type StoreRow = {
  id: number;
  store_type: string | null;
  prefecture: string | null;
};

type OnlineStockStatus =
  | "in_stock"
  | "low_stock"
  | "backorder"
  | "sold_out";

type ProductRow = {
  id: number;
  online_only: boolean;
};

const ONLINE_STOCK_STATUSES = new Set<OnlineStockStatus>([
  "in_stock",
  "low_stock",
  "backorder",
  "sold_out",
]);

type SecurityRow = {
  report_id: number | null;
  store_id: number | null;
  created_at: string;
};

function jsonError(
  message: string,
  status = 400
) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

function isOnlineStore(store: StoreRow) {
  return (
    store.store_type === "online" ||
    store.prefecture === "オンライン"
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
      stockStatus,
      comment,
      clientId,
      turnstileToken,
    } = body;

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

    const ipHash = ip
      ? createHmac(
          "sha256",
          turnstileSecret
        )
          .update(ip)
          .digest("hex")
      : null;

    const clientHash =
      typeof clientId === "string" &&
      clientId.length > 0
        ? createHash("sha256")
            .update(clientId)
            .digest("hex")
        : null;

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
      const { error: logError } =
        await supabase
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
            stock_status:
              typeof stockStatus === "string" &&
              ONLINE_STOCK_STATUSES.has(stockStatus as OnlineStockStatus)
                ? stockStatus
                : null,
            comment:
              typeof comment === "string" &&
              comment.trim() !== ""
                ? comment
                    .trim()
                    .slice(0, 500)
                : null,
            review_status: reviewStatus,
            reason,
          });

      if (logError) {
        console.error(
          "security event log error:",
          logError
        );
      }
    }

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

    const normalizedComment =
      typeof comment === "string" &&
      comment.trim() !== ""
        ? comment.trim()
        : null;

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

    const {
      data: currentStoreData,
      error: currentStoreError,
    } = await supabase
      .from("stores")
      .select(
        "id, store_type, prefecture"
      )
      .eq("id", Number(storeId))
      .single();

    if (
      currentStoreError ||
      !currentStoreData
    ) {
      await logSecurityEvent(
        "invalid_request",
        "店舗情報を取得できない"
      );
      return jsonError(
        "店舗情報を確認できませんでした。"
      );
    }

    const currentStore =
      currentStoreData as StoreRow;

    const online =
      isOnlineStore(currentStore);

    const { data: currentProductData, error: currentProductError } =
      await supabase
        .from("products")
        .select("id, online_only")
        .eq("id", Number(productId))
        .single();

    if (currentProductError || !currentProductData) {
      await logSecurityEvent(
        "invalid_request",
        "商品情報を取得できない"
      );
      return jsonError("商品情報を確認できませんでした。");
    }

    const currentProduct = currentProductData as ProductRow;

    if (currentProduct.online_only && !online) {
      await logSecurityEvent(
        "invalid_request",
        "オンライン限定商品を実店舗へ投稿"
      );
      return jsonError(
        "この商品はオンラインショップのみ投稿できます。"
      );
    }

    const normalizedStockStatus =
      typeof stockStatus === "string" &&
      ONLINE_STOCK_STATUSES.has(stockStatus as OnlineStockStatus)
        ? (stockStatus as OnlineStockStatus)
        : null;

    if (online) {
      if (!normalizedStockStatus) {
        await logSecurityEvent(
          "invalid_request",
          "オンライン在庫状態が不正"
        );
        return jsonError(
          "オンラインショップの在庫状況を選択してください。"
        );
      }
    } else {
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

      if (Number(quantity) >= 50 && !normalizedComment) {
        await logSecurityEvent(
          "invalid_request",
          "50枚以上の投稿でコメント未入力"
        );
        return jsonError(
          "50枚以上の在庫情報は、確認できた状況をコメント欄に入力してください。"
        );
      }
    }

    const storedQuantity = online ? 0 : Number(quantity);

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
     * 同一ブラウザ・同一店舗・同一商品:
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

    if ((sameItemCount ?? 0) > 0) {
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
     * 同一IP・同一店舗・同一商品:
     * 10分以内5件で拒否
     */
    if (ipHash) {
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
        (ipSameItemCount ?? 0) >= 5
      ) {
        await logSecurityEvent(
          "rate_limit_ip",
          "同一IPから同一店舗・同一商品へ10分以内に5件以上の投稿"
        );
        return jsonError(
          "同じ店舗・同じ商品への投稿が短時間に集中しています。10分ほど時間をおいてから、もう一度お試しください。",
          429
        );
      }
    }

    /*
     * 直近の「登録済み在庫投稿」のセキュリティ履歴を取得。
     * submitted / pending / auto_rollback_pending のみを対象にする。
     */
    let recentQuery = supabase
      .from(
        "inventory_security_events"
      )
      .select(
        "report_id, store_id, created_at"
      )
      .eq(
        "client_hash",
        clientHash
      )
      .in(
        "event_type",
        [
          "submitted",
          "pending",
          "auto_rollback_pending",
        ]
      )
      .not(
        "report_id",
        "is",
        null
      )
      .gt(
        "created_at",
        tenMinutesAgo
      )
      .order(
        "created_at",
        { ascending: true }
      );

    if (ipHash) {
      recentQuery =
        recentQuery.eq(
          "ip_hash",
          ipHash
        );
    }

    const {
      data: recentSecurityData,
      error: recentSecurityError,
    } = await recentQuery;

    if (recentSecurityError) {
      console.error(
        "recent security check error:",
        recentSecurityError
      );
      return jsonError(
        "投稿情報の確認中にエラーが発生しました。",
        500
      );
    }

    const recentRows =
      (recentSecurityData ??
        []) as SecurityRow[];

    const recentStoreIds = [
      ...new Set(
        recentRows
          .map((row) =>
            Number(row.store_id)
          )
          .filter((id) =>
            Number.isInteger(id)
          )
      ),
    ];

    let recentStoreMap =
      new Map<number, StoreRow>();

    if (recentStoreIds.length > 0) {
      const {
        data: recentStoresData,
        error: recentStoresError,
      } = await supabase
        .from("stores")
        .select(
          "id, store_type, prefecture"
        )
        .in(
          "id",
          recentStoreIds
        );

      if (recentStoresError) {
        console.error(
          "recent store type check error:",
          recentStoresError
        );
        return jsonError(
          "投稿情報の確認中にエラーが発生しました。",
          500
        );
      }

      recentStoreMap =
        new Map(
          (
            recentStoresData ??
            []
          ).map((row) => [
            Number(row.id),
            row as StoreRow,
          ])
        );
    }

    const sameCategoryRows =
      recentRows.filter((row) => {
        const store =
          recentStoreMap.get(
            Number(row.store_id)
          );

        if (!store) return false;

        return (
          isOnlineStore(store) === online
        );
      });

    const sameCategoryFiveMinuteRows =
      sameCategoryRows.filter(
        (row) =>
          row.created_at >
          fiveMinutesAgo
      );

    /*
     * 強い警戒:
     * 実店舗 15件目で全件Pending、16件目以降ブロック
     * オンライン 30件目で全件Pending、31件目以降ブロック
     *
     * ここでの recentRows は「今回の投稿より前」の件数。
     */
    const strongLimit =
      online ? 30 : 15;

    if (
      ipHash &&
      sameCategoryRows.length >=
        strongLimit
    ) {
      await logSecurityEvent(
        "rate_limit_client",
        `${
          online
            ? "オンライン"
            : "実店舗"
        }の在庫投稿が10分以内に${strongLimit}件を超えたためブロック`
      );

      return jsonError(
        "短時間に投稿が集中したため、一時的に投稿を制限しています。10分ほど時間をおいてから、もう一度お試しください。",
        429
      );
    }

    /*
     * 軽い警戒:
     * 実店舗のみ。
     * 5分以内に今回を含め8件以上、
     * かつ2店舗以上なら8件目以降をPending。
     *
     * オンラインは短時間の複数ショップ確認があり得るため、
     * この8件判定は適用しない。
     */
    const physicalFiveMinuteStoreIds =
      new Set(
        sameCategoryFiveMinuteRows.map(
          (row) =>
            Number(row.store_id)
        )
      );

    physicalFiveMinuteStoreIds.add(
      Number(storeId)
    );

    const lightPhysicalPending =
      !online &&
      sameCategoryFiveMinuteRows.length >=
        7 &&
      physicalFiveMinuteStoreIds.size >=
        2;

    /*
     * 50枚以上:
     * コメント必須 + その投稿をPending。
     */
    const highQuantityPending =
      !online && storedQuantity >= 50;

    /*
     * 今回が強い警戒の到達点か。
     * 実店舗15件目 / オンライン30件目。
     */
    const reachesStrongLimit =
      Boolean(ipHash) &&
      sameCategoryRows.length ===
        strongLimit - 1;

    let reviewStatus:
      | "approved"
      | "pending" =
      highQuantityPending ||
      lightPhysicalPending ||
      reachesStrongLimit
        ? "pending"
        : "approved";

    let reviewReason:
      | string
      | null = null;

    if (reachesStrongLimit) {
      reviewReason =
        `連続投稿による自動保留：${
          online
            ? "オンライン"
            : "実店舗"
        }の在庫投稿が10分以内に${strongLimit}件に到達`;
    } else if (
      highQuantityPending &&
      lightPhysicalPending
    ) {
      reviewReason =
        "大量在庫（50枚以上）＋短時間の連続投稿";
    } else if (
      highQuantityPending
    ) {
      reviewReason =
        "大量在庫（50枚以上）のため管理者確認";
    } else if (
      lightPhysicalPending
    ) {
      reviewReason =
        "短時間の連続投稿：実店舗で5分以内に8件以上、かつ2店舗以上への投稿";
    }

    /*
     * 在庫投稿を登録。
     * service_role から直接登録し、
     * client/IP のレート制限履歴もこのAPIで管理する。
     */
    const {
      data: insertedReport,
      error: insertError,
    } = await supabase
      .from("inventory_reports")
      .insert({
        store_id: Number(storeId),
        product_id:
          Number(productId),
        quantity: storedQuantity,
        stock_status: online ? normalizedStockStatus : null,
        comment: normalizedComment,
        review_status:
          reviewStatus,
        review_reason:
          reviewReason,
      })
      .select("id")
      .single();

    if (
      insertError ||
      !insertedReport
    ) {
      console.error(
        "inventory report insert error:",
        insertError
      );
      await logSecurityEvent(
        "invalid_request",
        insertError?.message ??
          "在庫投稿の登録エラー"
      );
      return jsonError(
        "投稿に失敗しました。",
        400
      );
    }

    const reportId =
      Number(insertedReport.id);

    /*
     * ブラウザ側レート制限履歴
     */
    const {
      error: clientRateInsertError,
    } = await supabase
      .from(
        "inventory_rate_limits"
      )
      .insert({
        client_hash:
          clientHash,
        store_id:
          Number(storeId),
        product_id:
          Number(productId),
      });

    if (clientRateInsertError) {
      console.error(
        "client rate limit insert error:",
        clientRateInsertError
      );
    }

    /*
     * IP側レート制限履歴
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
     * 強い警戒の到達点:
     * 同一IP + 同一ブラウザ + 同じ区分
     * （実店舗 / オンライン）の直近10分を
     * 1件目まで遡って全部Pendingへ変更。
     */
    if (reachesStrongLimit) {
      const previousReportIds =
        sameCategoryRows
          .map((row) =>
            Number(row.report_id)
          )
          .filter((id) =>
            Number.isInteger(id)
          );

      const rollbackIds = [
        ...new Set([
          ...previousReportIds,
          reportId,
        ]),
      ];

      if (rollbackIds.length > 0) {
        const {
          error: rollbackError,
        } = await supabase
          .from(
            "inventory_reports"
          )
          .update({
            review_status:
              "pending",
            review_reason:
              `連続投稿による自動保留：${
                online
                  ? "オンライン"
                  : "実店舗"
              }の在庫投稿が10分以内に${strongLimit}件に到達。公開後に自動で保留へ変更された投稿を含みます。`,
            reviewed_at: null,
            reviewed_by: null,
          })
          .in(
            "id",
            rollbackIds
          );

        if (rollbackError) {
          console.error(
            "auto rollback error:",
            rollbackError
          );
          return jsonError(
            "投稿は受け付けましたが、自動確認処理中にエラーが発生しました。",
            500
          );
        }

        /*
         * 巻き戻された各投稿をセキュリティ履歴へ残す。
         * 何が自動保留になったか report_id で追跡できる。
         */
        for (
          const rollbackId of
          rollbackIds
        ) {
          const original =
            sameCategoryRows.find(
              (row) =>
                Number(
                  row.report_id
                ) === rollbackId
            );

          const {
            data: rollbackReport,
          } = await supabase
            .from(
              "inventory_reports"
            )
            .select(
              "store_id, product_id, quantity, stock_status, comment"
            )
            .eq(
              "id",
              rollbackId
            )
            .single();

          const {
            error:
              rollbackLogError,
          } = await supabase
            .from(
              "inventory_security_events"
            )
            .insert({
              event_type:
                "auto_rollback_pending",
              report_id:
                rollbackId,
              ip_address: ip,
              ip_hash: ipHash,
              client_hash:
                clientHash,
              store_id:
                rollbackReport
                  ?.store_id ??
                original?.store_id ??
                null,
              product_id:
                rollbackReport
                  ?.product_id ??
                null,
              quantity:
                rollbackReport
                  ?.quantity ??
                null,
              stock_status:
                rollbackReport
                  ?.stock_status ??
                null,
              comment:
                rollbackReport
                  ?.comment ??
                null,
              review_status:
                "pending",
              reason:
                `連続投稿による自動保留：${
                  online
                    ? "オンライン"
                    : "実店舗"
                }の直近10分の投稿をPendingへ変更`,
            });

          if (
            rollbackLogError
          ) {
            console.error(
              "rollback security log error:",
              rollbackLogError
            );
          }
        }
      }
    } else if (
      reviewStatus ===
      "pending"
    ) {
      await logSecurityEvent(
        "pending",
        reviewReason,
        "pending",
        reportId
      );
    } else {
      await logSecurityEvent(
        "submitted",
        "正常投稿",
        "approved",
        reportId
      );
    }

    return NextResponse.json({
      success: true,
      reportId,
      reviewStatus:
        reachesStrongLimit
          ? "pending"
          : reviewStatus,
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
