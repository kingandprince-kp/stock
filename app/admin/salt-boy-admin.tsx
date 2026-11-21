"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import SaltBoyReports from "./salt-boy-reports";
import { purchaseLabel, type PurchaseVariant } from "@/app/stockchecker/saltboy/purchase-variants";

type Tab = "reports" | "history" | "firstWeek" | "security";
type Product = { id: number; name: string; catalog_number: string };
type Store = { id: number; name: string; online: boolean };
type FirstWeekRecord = {
  store_id: number; product_id: number | null; purchase_variant: PurchaseVariant | null;
  cutoff_kind: string | null; cutoff_date: string | null; cutoff_time: string | null;
  estimate_basis: string | null; earliest_date: string | null; latest_date: string | null;
  note: string | null; evidence: string | null; verified_at: string;
};
type SecurityEvent = { id: number; event_type: string; store_id: number | null; reason: string; created_at: string };
type AdminData = { stores: Store[]; products: Product[]; firstWeek: FirstWeekRecord[]; security: SecurityEvent[] };
type History = { id: number; report_id: number; store_name: string; product_name: string; action: string; actor_kind: string; note: string | null; created_at: string };
const tabs: Record<Tab, string> = { reports: "投稿一覧", history: "操作履歴", firstWeek: "初週情報", security: "セキュリティ履歴" };
const actions: Record<string, string> = { approve: "承認", reject: "却下", delete: "削除", restore: "復元" };
const dateFormat = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "short", timeStyle: "short" });
const buttonClass = "rounded-lg border px-3 py-2 text-sm disabled:opacity-50";
const fieldClass = "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm w-full";

function HistoryList() {
  const [rows, setRows] = useState<History[]>([]);
  const [before, setBefore] = useState<number>();
  const [reportId, setReportId] = useState("");
  const [filter, setFilter] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await supabase.rpc("salt_boy_admin_history", { p_report_id: filter, p_before_id: before ?? null });
      if (result.error) throw result.error;
      setError("");
      setRows(result.data ?? []);
    } catch { setError("履歴を取得できませんでした。再度お試しください。"); }
    finally { setLoading(false); }
  }, [before, filter]);
  useEffect(() => {
    // Cancel the scheduled initial fetch when Strict Mode remounts the panel.
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);
  return <section className="space-y-3">
    <h2 className="font-bold">SALT BOY 操作履歴</h2>
    <form className="flex flex-wrap gap-2" onSubmit={(event) => {
      event.preventDefault();
      const id = reportId ? Number(reportId) : null;
      if (id !== null && (!Number.isSafeInteger(id) || id < 1)) { setError("投稿IDを確認してください。"); return; }
      setBefore(undefined); setFilter(id);
    }}>
      <input className="rounded-lg border px-3 py-2 text-sm" type="number" min="1" placeholder="投稿ID (空欄ですべて)" aria-label="履歴の投稿ID" value={reportId} onChange={(event) => setReportId(event.target.value)} />
      <button className={buttonClass} disabled={loading}>絞り込む</button>
      <button className={buttonClass} type="button" disabled={loading} onClick={() => void load()}>更新</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {loading ? <p>読み込み中…</p> : <>
      {!rows.length && <p>操作履歴はありません。</p>}
      <ul className="divide-y">{rows.slice(0, 50).map((row) => <li key={row.id} className="py-3 text-sm">
        <p className="font-bold">{row.store_name} / {row.product_name}</p>
        <p>投稿 #{row.report_id} · {actions[row.action] ?? row.action} · {row.actor_kind === "owner" ? "投稿者本人" : "管理者"} · {dateFormat.format(new Date(row.created_at))}</p>
        {row.note && <p className="whitespace-pre-wrap break-words">{row.note}</p>}
      </li>)}</ul>
      {before && <button className={buttonClass} onClick={() => setBefore(undefined)}>先頭へ</button>}
      {rows.length > 50 && <button className={buttonClass} onClick={() => setBefore(rows[49].id)}>次の50件</button>}
    </>}
  </section>;
}

function FirstWeekEditor({ store, record, productId, variant, saved }: {
  store: Store; record?: FirstWeekRecord; productId: number | null; variant: PurchaseVariant | null; saved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState(record?.cutoff_kind ?? "closing");
  async function submit(form: HTMLFormElement, remove = false) {
    if (busy || (remove && !window.confirm("この初週情報の公開を取り下げますか?"))) return;
    setBusy(true); setMessage("");
    try {
      const fields = Object.fromEntries(new FormData(form).entries());
      const result = await supabase.rpc("salt_boy_save_first_week", {
        p_value: { ...fields, store_id: store.id, product_id: productId, purchase_variant: variant }, p_delete: remove,
      });
      if (result.error) throw result.error;
      await saved();
      setMessage(remove ? "初週情報の公開を取り下げました。" : "初週情報を保存しました。");
    } catch (error) {
      setMessage(typeof error === "object" && error && "message" in error ? String(error.message) : "更新できませんでした。再度お試しください。");
    } finally { setBusy(false); }
  }
  return <form onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }} className="space-y-3">
    <fieldset disabled={busy} className="space-y-3">
      {store.online ? <>
        <p className="text-sm">確認済みの日付範囲を登録します。商品ごとの情報です。注文条件が確定していない相対表記は日付に置き換えず、在庫投稿の発送・お届け欄で共有してください。</p>
        <label className="block text-sm">発送・到着の区分<select name="estimate_basis" className={fieldClass} defaultValue={record?.estimate_basis ?? "shipping"}><option value="shipping">発送・出荷</option><option value="delivery">お届け・到着</option></select></label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">から<input className={fieldClass} name="earliest_date" type="date" required defaultValue={record?.earliest_date ?? ""} /></label>
          <label className="text-sm">まで<input className={fieldClass} name="latest_date" type="date" required defaultValue={record?.latest_date ?? ""} /></label>
        </div>
      </> : <>
        <p className="text-sm">締切日・指定時刻は日本時間です。「閉店まで」は、店舗でその日の扱いを確認できた場合に選択してください。</p>
        <label className="block text-sm">締切日<input className={fieldClass} name="cutoff_date" type="date" required defaultValue={record?.cutoff_date ?? ""} /></label>
        <label className="block text-sm">締め時間<select className={fieldClass} name="cutoff_kind" value={kind} onChange={(event) => setKind(event.target.value)}><option value="closing">閉店まで</option><option value="time">指定時刻まで</option></select></label>
        {kind === "time" && <label className="block text-sm">指定時刻<input className={fieldClass} name="cutoff_time" type="time" required defaultValue={record?.cutoff_time?.slice(0, 5) ?? ""} /></label>}
      </>}
      <label className="block text-sm">補足 (任意)<textarea className={fieldClass} name="note" maxLength={500} rows={2} defaultValue={record?.note ?? ""} /></label>
      <label className="block text-sm">確認方法・ソース<textarea className={fieldClass} name="evidence" required maxLength={1000} rows={2} defaultValue={record?.evidence ?? ""} /></label>
      {record && <p className="text-sm">確認更新: {dateFormat.format(new Date(record.verified_at))}</p>}
      <button className={buttonClass} type="submit">{busy ? "保存中…" : "保存する"}</button>
      {record && <button className={buttonClass + " ml-2"} type="button" onClick={(event) => { const form = event.currentTarget.form; if (form) void submit(form, true); }}>公開を取り下げる</button>}
    </fieldset>
    {message && <p role="status" className="text-sm">{message}</p>}
  </form>;
}

function FirstWeekPanel({ data, reload }: { data: AdminData; reload: () => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [storeId, setStoreId] = useState(0);
  const [listing, setListing] = useState("");
  const store = data.stores.find((row) => row.id === storeId);
  const listings = data.products.flatMap((product) => {
    const variants: (PurchaseVariant | null)[] = storeId === 308 || storeId === 309 ? ["no_special", "special"] : [null];
    if (product.catalog_number === "UPCH-7913") {
      if (storeId === 309) variants.push("bluray_set", "dvd_set", "bluray_set_special", "dvd_set_special");
      if (storeId === 320 || storeId === 1208) variants.push("bluray_set_special", "dvd_set_special");
    }
    return variants.map((variant) => ({ value: `${product.id}:${variant ?? ""}`, product, variant }));
  });
  const selected = listings.find((row) => row.value === listing);
  const productId = store?.online ? selected?.product.id ?? null : null;
  const variant = store?.online ? selected?.variant ?? null : null;
  const record = data.firstWeek.find((row) => row.store_id === storeId && row.product_id === productId && row.purchase_variant === variant);
  return <section className="space-y-3">
    <h2 className="font-bold">SALT BOY 初週情報</h2>
    <p className="text-sm">確認した内容を公開画面に登録します。発送・到着の情報は実際の初週計上を保証するものではありません。</p>
    <label className="block text-sm">店舗を検索<input type="search" className={fieldClass} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    <label className="block text-sm">店舗<select className={fieldClass} value={storeId} onChange={(event) => { setStoreId(Number(event.target.value)); setListing(""); }}>
      <option value={0}>選択してください</option>
      {data.stores.filter((row) => row.id === storeId || row.name.normalize("NFKC").toLowerCase().includes(query.normalize("NFKC").toLowerCase())).map((row) => <option key={row.id} value={row.id}>{row.name}{row.online ? " (オンライン)" : ""}</option>)}
    </select></label>
    {store?.online && <label className="block text-sm">商品<select className={fieldClass} value={listing} onChange={(event) => setListing(event.target.value)}>
      <option value="">選択してください</option>
      {listings.map((row) => <option key={row.value} value={row.value}>{purchaseLabel(row.product.name, row.variant)}</option>)}
    </select></label>}
    {store && (!store.online || selected) && <FirstWeekEditor key={`${storeId}:${listing}`} store={store} record={record} productId={productId} variant={variant} saved={reload} />}
    <details className="rounded-lg border p-3 text-sm"><summary>登録済みの初週情報 ({data.firstWeek.length}件)</summary>
      {data.firstWeek.map((row) => <button className="block w-full border-b py-2 text-left" key={`${row.store_id}:${row.product_id}:${row.purchase_variant}`} onClick={() => { setQuery(""); setStoreId(row.store_id); setListing(row.product_id ? `${row.product_id}:${row.purchase_variant ?? ""}` : ""); }}>
        {data.stores.find((s) => s.id === row.store_id)?.name ?? row.store_id} / {row.product_id ? purchaseLabel(data.products.find((p) => p.id === row.product_id)?.name ?? "商品", row.purchase_variant) : "店舗の締め時間"}
      </button>)}
      {!data.firstWeek.length && <p>登録はありません。</p>}
    </details>
  </section>;
}

export default function SaltBoyAdmin() {
  const [tab, setTab] = useState<Tab>("reports");
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await supabase.rpc("salt_boy_admin_data");
      if (result.error) throw result.error;
      setError("");
      setData(result.data as AdminData);
    } catch { setError("SALT BOYの管理情報を取得できませんでした。再度更新してください。"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    if (tab !== "firstWeek" && tab !== "security") return;
    const task = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(task);
  }, [tab, reload]);
  return <div className="mt-4 space-y-3">
    <nav aria-label="SALT BOYの管理" className="flex flex-wrap gap-2">
      {(Object.keys(tabs) as Tab[]).map((key) => <button key={key} className={`${buttonClass} ${tab === key ? "bg-slate-800 text-white" : "bg-white"}`} aria-pressed={tab === key} onClick={() => setTab(key)}>{tabs[key]}</button>)}
    </nav>
    {tab === "reports" ? <SaltBoyReports /> : tab === "history" ? <HistoryList /> : <section className="space-y-3 rounded-2xl border p-4">
      <button className={buttonClass} disabled={loading} onClick={() => void reload()}>最新の状態に更新</button>
      {error && <p role="alert">{error}</p>}
      {loading && !data ? <p>読み込み中…</p> : data && (tab === "firstWeek" ? <FirstWeekPanel data={data} reload={reload} /> : <>
        <h2 className="font-bold">SALT BOY セキュリティ履歴</h2>
        <p className="text-sm">最新100件。形態の一括送信は1回として数えます。</p>
        <ul className="divide-y">{data.security.map((row) => <li key={row.id} className="py-2 text-sm">
          <p>{dateFormat.format(new Date(row.created_at))} · {data.stores.find((s) => s.id === row.store_id)?.name ?? "店舗未指定"}</p>
          <p>{row.reason}</p>
        </li>)}</ul>
        {!data.security.length && <p>記録はありません。</p>}
      </>)}
    </section>}
  </div>;
}
