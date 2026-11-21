"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, Store } from "./data";
import { purchaseLabel, type PurchaseVariant } from "./purchase-variants";

type OwnReport = {
  id: number; store_id: number; product_id: number; purchase_variant: PurchaseVariant | null;
  quantity: number; stock_status: string; comment: string | null; created_at: string; deleted_at: string | null;
};
const dateFormat = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "short", timeStyle: "short" });

export default function OwnReports({ stores, products }: { stores: Store[]; products: Product[] }) {
  const router = useRouter();
  const [reports, setReports] = useState<OwnReport[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [more, setMore] = useState(false);
  const [before, setBefore] = useState<number>();

  async function load(cursor?: number) {
    setBusy(true);
    setMessage("");
    try {
      const clientId = localStorage.getItem("kp_inventory_client_id");
      if (!clientId) { setReports([]); setLoaded(true); setMore(false); return; }
      const response = await fetch("/api/salt-boy/own-reports", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", clientId, before: cursor }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "投稿を取得できませんでした。");
      setReports(result.reports); setMore(result.hasMore); setBefore(cursor); setLoaded(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "投稿を取得できませんでした。再度お試しください。");
    } finally { setBusy(false); }
  }

  async function remove(report: OwnReport) {
    if (busy || !window.confirm("自分の在庫投稿を削除しますか?")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/salt-boy/own-reports", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", clientId: localStorage.getItem("kp_inventory_client_id"), reportId: report.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "削除できませんでした。");
      setReports((rows) => rows.map((row) => row.id === report.id ? { ...row, deleted_at: new Date().toISOString() } : row));
      setMessage("自分の在庫投稿を削除しました。");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "削除できませんでした。再度お試しください。");
    } finally { setBusy(false); }
  }

  return <details className="salt-support" onToggle={(event) => { if (event.currentTarget.open && !loaded && !busy) void load(); }}>
    <summary>自分の在庫投稿 <small>投稿内容の確認・削除</small></summary>
    <div className="salt-own-reports">
      <p>このブラウザーから投稿したSALT BOYの在庫情報を確認・削除できます。</p>
      <button type="button" disabled={busy} onClick={() => void load()}>最新の状態に更新</button>
      {message && <p role="status">{message}</p>}
      {busy && <p role="status">処理中…</p>}
      {loaded && !reports.length && <p>自分の在庫投稿はありません。</p>}
      {reports.map((report) => <article key={report.id}>
        <strong>{stores.find((store) => store.id === report.store_id)?.name ?? "掲載終了店舗"}</strong>
        <p>{purchaseLabel(products.find((product) => product.id === report.product_id)?.name ?? "掲載終了商品", report.purchase_variant)}</p>
        <p>{report.quantity > 0 ? `${report.quantity.toLocaleString("ja-JP")}枚` : report.stock_status === "in_stock" || report.stock_status === "low_stock" ? "在庫あり" : "在庫なし"} · {dateFormat.format(new Date(report.created_at))}</p>
        {report.comment && <p className="whitespace-pre-wrap break-words">{report.comment}</p>}
        {report.deleted_at ? <span>削除済み</span> : <button type="button" disabled={busy} onClick={() => void remove(report)}>自分の投稿を削除</button>}
      </article>)}
      {before && <button type="button" disabled={busy} onClick={() => void load()}>先頭へ</button>}
      {more && <button type="button" disabled={busy} onClick={() => void load(reports[reports.length - 1].id)}>次の50件</button>}
    </div>
  </details>;
}
