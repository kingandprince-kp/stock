"use client";
import { useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { DEFAULT_FIRST_WEEK_SETTINGS, type FirstWeekSettings, type RetailerRule } from "@/app/stockchecker/saltboy/first-week-model";
import { validDate, type ShippingBasis } from "@/app/stockchecker/saltboy/shipping-estimate";

const field = "block w-full rounded-lg border bg-white px-3 py-2 text-sm";
const button = "rounded-lg border px-3 py-2 text-sm disabled:opacity-50";
function RuleForm({ storeId, basis, record, settings, saved }: { storeId: number; basis: ShippingBasis; record?: RetailerRule; settings: FirstWeekSettings | null; saved: () => Promise<void> }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [mode, setMode] = useState(record?.whole_day ? "whole" : record?.cutoff_time ? "time" : "unknown");
  const [orderKind, setOrderKind] = useState(record?.order_cutoff_kind ?? "unknown");
  async function submit(form: HTMLFormElement, remove = false) {
    if (busy || (remove && !window.confirm("このショップの判定条件を取り下げますか? 未確認の条件は要確認になります。"))) return;
    setBusy(true); setMessage("");
    try {
      const data = new FormData(form);
      const days = data.getAll("businessWeekdays").map(Number);
      const excluded = String(data.get("excludedDates") ?? "").split(/[\s,、]+/).filter(Boolean);
      if (!remove && excluded.some((date) => !validDate(date))) throw new Error("休業日は YYYY-MM-DD 形式で入力してください。");
      const result = await supabase.rpc("salt_boy_save_retailer_rule", { p_delete: remove, p_value: {
        store_id: storeId, basis, cutoff_date: data.get("cutoffDate"),
        cutoff_time: mode === "time" ? data.get("cutoffTime") : null, whole_day: mode === "whole",
        evidence: String(data.get("evidence") ?? "").trim(), order_cutoff_kind: orderKind,
        order_cutoff_time: orderKind === "time" ? data.get("orderCutoffTime") : null,
        business_weekdays: days, excluded_dates: excluded, calendar_verified_from: data.get("calendarFrom") || null, calendar_verified_until: data.get("calendarUntil") || null,
      } });
      if (result.error) throw result.error;
      await saved(); setMessage(remove ? "判定条件を取り下げました。" : "判定条件を保存しました。");
    } catch (error) { setMessage(error && typeof error === "object" && "message" in error ? String(error.message) : "更新できませんでした。"); }
    finally { setBusy(false); }
  }
  const defaults = settings ?? DEFAULT_FIRST_WEEK_SETTINGS;
  return <form className="space-y-3 rounded-lg border p-3" onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}>
    <fieldset disabled={busy} className="space-y-3">
      <p className="text-sm">このショップで{basis === "shipping" ? "発送" : "到着"}を根拠にできる条件を、確認方法とともに登録します。商品の在庫投稿とは別の設定です。実際の初週計上を保証するものではありません。</p>
      <label className="block text-sm">購入目安の締切日<input className={field} name="cutoffDate" type="date" required defaultValue={record?.cutoff_date ?? (basis === "shipping" ? defaults.cutoff_date : defaults.delivery_cutoff_date) ?? ""} /></label>
      <label className="block text-sm">締切日の時刻の扱い<select className={field} value={mode} onChange={(event) => setMode(event.target.value)}><option value="unknown">時刻は未確認 (当日分は要確認)</option><option value="time">指定時刻まで</option><option value="whole">終日を対象とすることを確認済み</option></select></label>
      {mode === "time" && <label className="block text-sm">締切時刻 (日本時間)<input className={field} name="cutoffTime" type="time" required defaultValue={record?.cutoff_time?.slice(0, 5) ?? ""} /></label>}
      <label className="block text-sm">確認した条件・公式案内などのソース<textarea className={field} name="evidence" required rows={3} maxLength={1000} defaultValue={record?.evidence ?? ""} /></label>
      <details><summary>相対日数を日付へ換算する条件</summary><div className="space-y-3 py-3">
        <label className="block text-sm">注文の締め時刻<select className={field} value={orderKind} onChange={(event) => setOrderKind(event.target.value as typeof orderKind)}><option value="unknown">未確認 (相対日数は要確認)</option><option value="none">日内の締め時刻による繰り越しなしを確認</option><option value="time">指定時刻後は翌対象日へ繰り越すことを確認</option></select></label>
        {orderKind === "time" && <label className="block text-sm">注文締め時刻<input className={field} name="orderCutoffTime" type="time" required defaultValue={record?.order_cutoff_time?.slice(0, 5) ?? ""} /></label>}
        <p className="text-sm">営業日表記の場合は対象の曜日・休業日・確認済み期間を登録します。通常の営業時間から推測しないでください。</p>
        <div className="flex flex-wrap gap-3">{["日", "月", "火", "水", "木", "金", "土"].map((name, index) => <label key={name}><input type="checkbox" name="businessWeekdays" value={index} defaultChecked={record?.business_weekdays?.includes(index) ?? false} />{name}</label>)}</div>
        <label className="block text-sm">休業日 (日付を改行またはカンマで区切る)<textarea className={field} name="excludedDates" defaultValue={record?.excluded_dates?.join("\n") ?? ""} placeholder="2026-11-23" /></label>
        <label className="block text-sm">営業日カレンダーの確認済み開始日<input className={field} name="calendarFrom" type="date" defaultValue={record?.calendar_verified_from ?? ""} /></label>
        <label className="block text-sm">営業日カレンダーの確認済み最終日<input className={field} name="calendarUntil" type="date" defaultValue={record?.calendar_verified_until ?? ""} /></label>
      </div></details>
      {record && <p className="text-sm">確認更新: {new Date(record.verified_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</p>}
      <button className={button} type="submit">{busy ? "保存中…" : "条件を保存"}</button>
      {record && <button className={button + " ml-2"} type="button" onClick={(event) => { if (event.currentTarget.form) void submit(event.currentTarget.form, true); }}>条件を取り下げる</button>}
    </fieldset>
    {message && <p role="status" className="text-sm">{message}</p>}
  </form>;
}
export default function RetailerRules({ storeId, rules, settings, saved }: { storeId: number; rules: RetailerRule[]; settings: FirstWeekSettings | null; saved: () => Promise<void> }) {
  const [basis, setBasis] = useState<ShippingBasis>("shipping");
  return <details className="rounded-lg border p-3"><summary>このショップの初週判定条件</summary>
    <label className="my-3 block text-sm">根拠にする区分<select className={field} value={basis} onChange={(event) => setBasis(event.target.value as ShippingBasis)}><option value="shipping">発送・出荷</option><option value="delivery">お届け・到着</option></select></label>
    <RuleForm key={`${storeId}:${basis}`} storeId={storeId} basis={basis} record={rules.find((row) => row.store_id === storeId && row.basis === basis)} settings={settings} saved={saved} />
  </details>;
}
