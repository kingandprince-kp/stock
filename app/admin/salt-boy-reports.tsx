"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { parseShippingEstimate, shippingEstimateText } from "@/app/stockchecker/saltboy/shipping-estimate";

type View = "pending" | "published" | "closed";
type Action = "approve" | "reject" | "delete" | "restore";
type Report = {
  id: number;
  store_name: string;
  product_name: string;
  quantity: number;
  stock_status: string;
  comment: string | null;
  shipping_estimate: unknown;
  created_at: string;
  review_status: string;
  deleted_at: string | null;
  manually_approved: boolean;
};

const VIEWS: Record<View, string> = { pending: "承認待ち", published: "公開中", closed: "却下・削除済み" };
const ACTIONS: Record<Action, string> = { approve: "承認", reject: "却下", delete: "削除", restore: "復元" };
const timeFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo", dateStyle: "short", timeStyle: "short",
});

export default function SaltBoyReports() {
  const [view, setView] = useState<View>("pending");
  const [before, setBefore] = useState<number>();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const visible = reports.slice(0, 50);
  const selectable = visible.filter((report) => view !== "closed" || report.deleted_at);
  const chosen = selectable.filter((report) => selected.includes(report.id));
  const allSelected = selectable.length > 0 && chosen.length === selectable.length;
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error } = await supabase.rpc("salt_boy_list_admin_reports", {
      p_view: view,
      p_before_id: before ?? null,
    });
    if (error) {
      setReports([]);
      setError("SALT BOYの投稿一覧を取得できませんでした。");
    } else {
      setReports((data ?? []) as Report[]);
    }
    setLoading(false);
  }, [view, before]);

  useEffect(() => { void load(); }, [load]);

  async function manage(id: number, action: Action) {
    if (busy) return;
    if ((action === "delete" || action === "reject") && !window.confirm(`投稿 #${id} を${ACTIONS[action]}しますか?`)) return;
    setBusy(true);
    setMessage("");
    setError("");
    const { error } = await supabase.rpc("salt_boy_manage_inventory_report", { p_report_id: id, p_action: action });
    if (error) {
      setError("操作できませんでした。最新の状態に更新して確認してください。");
    } else {
      setMessage(`投稿 #${id} を${ACTIONS[action]}しました。`);
      await load();
    }
    setBusy(false);
  }

  async function manageSelection(action: Action) {
    if (busy || !chosen.length) return;
    if ((action === "delete" || action === "reject") &&
      !window.confirm(`選択した投稿${chosen.length}件を${ACTIONS[action]}しますか?`)) return;
    setBusy(true);
    setMessage("");
    setError("");
    const failed: number[] = [];
    try {
      for (const { id } of chosen) {
        const result = await supabase.rpc("salt_boy_manage_inventory_report", { p_report_id: id, p_action: action });
        if (result.error) failed.push(id);
      }
      const completed = chosen.length - failed.length;
      if (completed) setMessage(`${completed}件の投稿を${ACTIONS[action]}しました。`);
      setSelected(failed);
      await load();
      if (failed.length) setError(`${failed.length}件の投稿を処理できませんでした。`);
    } catch {
      setSelected([]);
      await load();
      setError("処理を中断しました。一覧で最新の状態を確認してください。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4" aria-label="SALT BOYの在庫投稿">
      <h2 className="text-lg font-bold">SALT BOY 在庫投稿</h2>
      <div className="my-3 flex flex-wrap gap-2">
        {(Object.keys(VIEWS) as View[]).map((key) => (
          <button key={key} type="button" aria-pressed={view === key} disabled={busy || loading}
            className={`rounded-lg border px-3 py-2 text-sm font-bold ${view === key ? "bg-slate-800 text-white" : "bg-white"}`}
            onClick={() => { setView(key); setBefore(undefined); setSelected([]); setMessage(""); }}>
            {VIEWS[key]}
          </button>
        ))}
        <button type="button" disabled={busy || loading} className="rounded-lg border px-3 py-2 text-sm" onClick={() => void load()}>更新</button>
      </div>
      {message && <p role="status" className="mb-2 text-sm">{message}</p>}
      {error && <p role="alert" className="mb-2 text-sm text-red-800">{error}</p>}
      {!loading && selectable.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={allSelected} disabled={busy}
              onChange={() => setSelected(allSelected ? [] : selectable.map((report) => report.id))} />
            表示中を全選択
          </label>
          <span aria-live="polite">選択中 {chosen.length}件</span>
          {(view === "pending" ? ["approve", "reject", "delete"] as const : view === "published" ? ["delete"] as const : ["restore"] as const).map((action) => (
            <button key={action} type="button" className="rounded-lg border px-3 py-1.5 disabled:opacity-50"
              disabled={busy || !chosen.length} onClick={() => void manageSelection(action)}>
              選択した投稿を{ACTIONS[action]}
            </button>
          ))}
        </div>
      )}
      {loading ? <p>読み込み中…</p> : !reports.length ? <p>該当する投稿はありません。</p> : (
        <ul className="divide-y divide-gray-200">
          {visible.map((report) => {
            const shipping = parseShippingEstimate(report.shipping_estimate, 30);
            let actions: Action[] = [];
            if (report.deleted_at) actions = ["restore"];
            else if (report.review_status === "pending") actions = ["approve", "reject", "delete"];
            else if (report.review_status === "approved") actions = ["delete"];
            const status = report.deleted_at ? "削除済み"
              : report.review_status === "approved" ? (report.manually_approved ? "管理者が承認済み" : "自動反映済み")
              : report.review_status === "pending" ? "承認待ち" : "却下済み";
            return (
              <li key={report.id} className="space-y-1 py-3 text-sm">
                <div className="flex items-start gap-2">
                  {actions.length > 0 && <input type="checkbox" checked={selected.includes(report.id)} disabled={busy}
                    aria-label={`投稿 #${report.id} を選択`}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setSelected((current) => checked ? [...current, report.id] : current.filter((id) => id !== report.id));
                    }} />}
                  <p className="font-bold">{report.store_name} / {report.product_name}</p>
                </div>
                <p>#{report.id} · {timeFormat.format(new Date(report.created_at))} · {status} · {report.quantity > 0 ? `${report.quantity.toLocaleString("ja-JP")}枚` : report.stock_status === "in_stock" ? "在庫あり" : "在庫なし"}</p>
                {shipping && <p>{shippingEstimateText(shipping)}{shipping.condition && ` / 条件: ${shipping.condition}`}</p>}
                {report.comment && <p className="whitespace-pre-wrap break-words">{report.comment}</p>}
                <div className="flex flex-wrap gap-2">
                  {actions.map((action) => <button key={action} type="button" className="rounded-lg border px-3 py-1.5" disabled={busy} onClick={() => void manage(report.id, action)}>{ACTIONS[action]}</button>)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-3 flex gap-2 text-sm">
        {before && <button type="button" disabled={busy || loading} className="rounded-lg border px-3 py-2" onClick={() => { setSelected([]); setBefore(undefined); }}>先頭へ</button>}
        {reports.length > 50 && <button type="button" disabled={busy || loading} className="rounded-lg border px-3 py-2" onClick={() => { setSelected([]); setBefore(reports[49].id); }}>次の50件</button>}
      </div>
    </section>
  );
}
