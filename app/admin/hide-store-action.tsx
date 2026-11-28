"use client";

import { useRef, useState } from "react";
import { supabase } from "@/app/lib/supabase";

export default function HideStoreAction({ sourceType, sourceId, storeName, defaultNote, onHidden }: {
  sourceType: "store_info" | "store_comment";
  sourceId: number;
  storeName: string;
  defaultNote: string;
  onHidden?: () => Promise<void>;
}) {
  const [note, setNote] = useState(defaultNote);
  const [pending, setPending] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  async function hideStore() {
    if (inFlight.current) return;
    if (!note.trim() || note.trim().length > 1000) {
      setError("非表示にする理由を1〜1,000文字で入力してください。");
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const result = await supabase.rpc("salt_boy_hide_store_admin", {
        p_source_type: sourceType,
        p_source_id: sourceId,
        p_note: note.trim(),
      });
      if (result.error) throw new Error(result.error.message);
      setHidden(true);
      await onHidden?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "店舗を非表示にできませんでした。再度お試しください。");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <details className="mt-3 rounded-xl border border-[#d8cad7] bg-[#fbf7fa] p-3">
      <summary className="cursor-pointer text-sm font-bold">店舗を非表示</summary>
      <p className="mt-2 text-sm">{storeName}を在庫チェッカーの店舗一覧から非表示にします。投稿内容・確認方法・投稿番号と管理メモをDBに保存します。在庫投稿やコメントは削除しません。</p>
      <label className="mt-2 block text-sm font-bold">
        非表示にする理由・管理メモ
        <textarea value={note} onChange={(event) => setNote(event.target.value)} disabled={pending || hidden} maxLength={1000} rows={3} className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-2 font-normal" />
      </label>
      <button type="button" onClick={() => void hideStore()} disabled={pending || hidden} className="mt-2 rounded-xl bg-[#6d4966] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {pending ? "保存中…" : hidden ? "店舗を非表示にしました" : "メモを保存して店舗を非表示"}
      </button>
      {hidden && <p role="status" className="mt-2 text-sm text-green-800">メモをDBに保存し、店舗を非表示にしました。店舗履歴から保存内容を確認できます。</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </details>
  );
}
