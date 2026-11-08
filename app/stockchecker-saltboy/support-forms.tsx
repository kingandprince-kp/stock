"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { supabase } from "@/app/lib/supabase";
import type { Store } from "./data";

function clientId() {
  const existing = localStorage.getItem("kp_inventory_client_id");
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem("kp_inventory_client_id", id);
  return id;
}

function field(data: FormData, name: string) {
  return String(data.get(name) ?? "").trim();
}

function SupportForm({ children, send }: {
  children: ReactNode;
  send: (data: FormData) => PromiseLike<{ error: unknown }>;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    setPending(true);
    setMessage("");
    try {
      const { error } = await send(new FormData(form));
      if (error) throw error;
      form.reset();
      setFailed(false);
      setMessage("送信しました。情報をお寄せいただき、ありがとうございます。");
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "送信できませんでした。時間をおいて再度お試しください。");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="salt-support-form" onSubmit={(event) => void submit(event)}>
      <fieldset disabled={pending}>
        {children}
        <button type="submit">{pending ? "送信中…" : "送信する"}</button>
      </fieldset>
      {message && <p role={failed ? "alert" : "status"}>{message}</p>}
    </form>
  );
}

export function StoreContribution({ store, online }: { store: Store; online: boolean }) {
  return (
    <details className="salt-contribution">
      <summary>店舗情報を提供 <small>{online ? "集計・発送予定など" : "初週集計の締め時間など"}</small></summary>
      <SupportForm send={(data) => {
        const category = field(data, "category");
        const detail = field(data, "detail");
        const evidence = field(data, "evidence");
        if (!detail || (category === "Billboard集計" && !evidence)) {
          throw new Error("提供する内容と、必要な確認方法を入力してください。");
        }
        // Route campaign-specific reports to manual review in the existing queue.
        return supabase.rpc("submit_store_info_request_v2", {
          p_store_id: store.id,
          p_request_type: "other",
          p_product_id: null,
          p_detail: `[SALT BOY・${category}] ${detail}`,
          p_evidence: evidence || null,
          p_client_id: clientId(),
          p_shipping_type: null,
          p_shipping_min_days: null,
          p_shipping_max_days: null,
          p_shipping_date: null,
          p_confirmation_source: null,
          p_confirmation_source_detail: null,
        });
      }}>
        <label>情報の種類<select name="category">
          {online ? <option>発送予定</option> : <option>初週集計の締め時間</option>}
          <option>Billboard集計</option><option>その他</option>
        </select></label>
        <label>提供する内容<textarea name="detail" rows={2} maxLength={900} required placeholder={online ? "例: 商品ページに発売日の発送と記載" : "例: 初週集計は17時までと店舗で確認"} /></label>
        <label>確認方法・ソース<textarea name="evidence" rows={2} maxLength={1000} placeholder="例: 店頭で確認。Billboard情報の場合は必須です。" /></label>
      </SupportForm>
    </details>
  );
}

export function StoreRequest({ online, prefecture, prefectures }: {
  online: boolean;
  prefecture: string;
  prefectures: string[];
}) {
  return (
    <details className="salt-support">
      <summary>店舗が見つからない場合 <small>未掲載店舗の追加をリクエストできます</small></summary>
      <SupportForm key={`${online}-${prefecture}`} send={(data) => {
        const name = field(data, "name");
        if (!name) throw new Error("店舗名を入力してください。");
        const note = field(data, "note");
        return supabase.rpc("submit_store_request", {
          p_prefecture: online ? "オンライン" : field(data, "prefecture"),
          p_city: online ? null : field(data, "city") || null,
          p_name: name,
          p_chain_name: field(data, "chain") || null,
          p_comment: note ? `[SALT BOY] ${note}` : "[SALT BOY]",
          p_client_id: clientId(),
        });
      }}>
        {!online && <>
          <label>都道府県<select name="prefecture" defaultValue={prefecture} required>
            <option value="">選択してください</option>
            {prefectures.map((name) => <option key={name}>{name}</option>)}
          </select></label>
          <label>市区町村 (任意)<input name="city" maxLength={80} /></label>
        </>}
        <label>店舗名<input name="name" maxLength={100} required /></label>
        <label>チェーン名 (任意)<input name="chain" maxLength={100} /></label>
        <label>補足 (任意)<textarea name="note" rows={2} maxLength={400} /></label>
      </SupportForm>
    </details>
  );
}

export function FeedbackForm() {
  return (
    <details className="salt-support">
      <summary>不具合・ご要望はこちら <small>フォームを開く</small></summary>
      <SupportForm send={async (data) => {
        const description = field(data, "description");
        if (!description) throw new Error("内容を入力してください。");
        const images = data.getAll("images").filter((entry): entry is File => entry instanceof File && entry.size > 0);
        const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
        if (images.length > 5 || images.some((image) => image.size > 5 * 1024 * 1024 || (image.type && !allowed.has(image.type)))) {
          throw new Error("画像はJPEG・PNG・WebP・HEIC形式で、1枚5MB以内、5枚まで添付できます。");
        }
        const paths: string[] = [];
        for (const image of images) {
          const extension = image.name.match(/\.(jpe?g|png|webp|heic|heif)$/i)?.[1].toLowerCase() ?? "jpg";
          const path = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
          const { error } = await supabase.storage.from("bug-report-images").upload(path, image);
          if (error) throw new Error("画像をアップロードできませんでした。");
          paths.push(path);
        }
        return supabase.from("bug_reports").insert({
          issue_description: `[${field(data, "type")}] ${description}`,
          device_type: field(data, "device") || "未入力",
          os_type: field(data, "os") || "未入力",
          browser: field(data, "browser") || null,
          image_url: paths[0] ?? null,
          image_urls: paths.length ? paths : null,
          page_path: "/stockchecker-saltboy",
        });
      }}>
        <label>内容の種類<select name="type"><option>不具合</option><option>要望</option></select></label>
        <label>内容<textarea name="description" rows={3} maxLength={1000} required /></label>
        <label>端末 (任意)<input name="device" maxLength={80} /></label>
        <label>OS (任意)<input name="os" maxLength={80} /></label>
        <label>ブラウザ (任意)<input name="browser" maxLength={80} /></label>
        <label>画像 (任意)<input type="file" name="images" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple /></label>
      </SupportForm>
    </details>
  );
}
