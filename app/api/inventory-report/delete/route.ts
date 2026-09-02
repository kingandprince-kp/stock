import { createHash } from "crypto";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type DeleteBody = {
  reportId?: number;
  clientId?: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

export async function POST(request: Request) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonError("サーバー設定に問題があります。", 500);
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

    let body: DeleteBody;
    try {
      body = (await request.json()) as DeleteBody;
    } catch {
      return jsonError("削除する投稿を確認できませんでした。");
    }

    const { reportId, clientId } = body;

    if (!Number.isInteger(reportId) || Number(reportId) <= 0) {
      return jsonError("削除する投稿を確認できませんでした。");
    }

    if (
      typeof clientId !== "string" ||
      clientId.length < 10 ||
      clientId.length > 200
    ) {
      return jsonError(
        "このブラウザから投稿したことを確認できませんでした。",
        403
      );
    }

    const clientHash = createHash("sha256")
      .update(clientId)
      .digest("hex");

    const { data: report, error: reportError } =
      await supabase
        .from("inventory_reports")
        .select(
          "id, store_id, product_id, quantity, stock_status, comment, created_at, client_hash"
        )
        .eq("id", Number(reportId))
        .single();

    if (reportError || !report) {
      return jsonError("投稿が見つかりませんでした。", 404);
    }

    if (
      !report.client_hash ||
      report.client_hash !== clientHash
    ) {
      return jsonError(
        "この投稿は、このブラウザから削除できません。",
        403
      );
    }

    const { error: historyError } =
      await supabase
        .from("inventory_user_deletions")
        .insert({
          original_report_id: report.id,
          store_id: report.store_id,
          product_id: report.product_id,
          quantity: report.quantity,
          stock_status: report.stock_status,
          comment: report.comment,
          original_created_at: report.created_at,
          client_hash: clientHash,
        });

    if (historyError) {
      console.error("user deletion history error:", historyError);
      return jsonError(
        "削除履歴を保存できなかったため、投稿は削除していません。",
        500
      );
    }

    const { data: deletedRows, error: deleteError } =
      await supabase
        .from("inventory_reports")
        .delete()
        .eq("id", report.id)
        .eq("client_hash", clientHash)
        .select("id");

    if (
      deleteError ||
      !deletedRows ||
      deletedRows.length !== 1
    ) {
      console.error("user inventory delete error:", deleteError);
      return jsonError("投稿を削除できませんでした。", 500);
    }

    return NextResponse.json({
      success: true,
      message: "投稿を削除しました。",
    });
  } catch (error) {
    console.error("user inventory delete unexpected error:", error);
    return jsonError("削除中にエラーが発生しました。", 500);
  }
}
