"use client";

import { useRef, useState } from "react";
import { supabase } from "@/app/lib/supabase";

export default function HideStoreAction({ sourceType, sourceId, storeName, defaultNote, isActive, onHidden }: {
  sourceType: "store_info" | "store_comment";
  sourceId: number;
  storeName: string;
  defaultNote: string;
  isActive: boolean | undefined;
  onHidden?: () => Promise<void>;
}) {
  const [currentActive, setCurrentActive] = useState(isActive);
  const [hideNote, setHideNote] = useState(defaultNote);
  const [restoreNote, setRestoreNote] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const known = typeof currentActive === "boolean";
  const restoring = currentActive === false;
  const action = restoring ? "再表示" : "非表示";
  const note = restoring ? restoreNote : hideNote;

  async function changeVisibility() {
    if (inFlight.current || !known) return;
    if (!note.trim() || note.trim().length > 1000) {
      setError(`${action}する理由を1〜1,000文字で入力してください。`);
      return;
    }
    const targetActive = restoring;
    inFlight.current = true;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const result = await supabase.rpc(restoring ? "salt_boy_restore_store_admin" : "salt_boy_hide_store_admin", {
        p_source_type: sourceType,
        p_source_id: sourceId,
        p_note: note.trim(),
      });
      if (result.error) throw new Error(result.error.message);
      setCurrentActive(targetActive);
      setMessage(`管理メモをDBに保存し、店舗を${targetActive ? "再表示しました" : "非表示にしました"}。店舗履歴から保存内容を確認できます。`);
      try {
        await onHidden?.();
      } catch {
        setError("操作は完了しましたが、一覧の更新に失敗しました。「最新の状態に更新」で再取得してください。");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `店舗を${action}にできませんでした。再度お試しください。`);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <details className="mt-3 rounded-xl border border-[#d8cad7] bg-[#fbf7fa] p-3">
      <summary className="cursor-pointer text-sm font-bold">
        {known ? `店舗を${action}` : "店舗の公開状態を確認中"}
        <span className="ml-2 rounded bg-white px-2 py-1 text-xs">{known ? (currentActive ? "店舗: 表示中" : "店舗: 非表示中") : "読み込み中"}</span>
      </summary>
      <p className="mt-2 text-sm">{storeName}を在庫チェッカーの店舗一覧で{action}にします。管理メモは既存の記録に追記し、店舗履歴にも保存します。</p>
      <label className="mt-2 block text-sm font-bold">
        {action}する理由・管理メモ
        <textarea value={note} onChange={(event) => restoring ? setRestoreNote(event.target.value) : setHideNote(event.target.value)} disabled={pending || !known} maxLength={1000} rows={3} placeholder={restoring ? "例: CD取り扱いを再確認したため再表示" : undefined} className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-2 font-normal" />
      </label>
      <button type="button" onClick={() => void changeVisibility()} disabled={pending || !known} className="mt-2 rounded-xl bg-[#6d4966] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {pending ? "保存中…" : `メモを保存して店舗を${action}`}
      </button>
      {message && <p role="status" className="mt-2 text-sm text-green-800">{message}</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </details>
  );
}
