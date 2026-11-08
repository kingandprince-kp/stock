"use client";

import { useRef, useState } from "react";
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

function SupportForm({ children, send, onReset, submitLabel = "送信する" }: {
  children: ReactNode;
  send: (data: FormData) => PromiseLike<{ error: unknown }>;
  onReset?: () => void;
  submitLabel?: string;
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
      onReset?.();
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
        <button type="submit">{pending ? "送信中…" : submitLabel}</button>
      </fieldset>
      {message && <p role={failed ? "alert" : "status"}>{message}</p>}
    </form>
  );
}

export function StoreContribution({ store, online }: { store: Store; online: boolean }) {
  return (
    <details className="salt-contribution">
      <summary className="salt-contribution-summary"><span>店舗情報を提供</span><span className="salt-contribution-action salt-contribution-open">フォーム ＋</span><span className="salt-contribution-action salt-contribution-close">閉じる −</span></summary>
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
    <details className="salt-support" id="store-request">
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

const DEVICE_TYPES = ["iPhone", "iPad", "Android", "PC", "その他"];
const BROWSERS = ["Chrome", "Safari", "Brave", "Edge", "Opera", "Firefox", "その他"];
const OS_NAMES = ["iPadOS", "iOS", "Android", "Windows", "macOS", "Ubuntu", "Linux", "Chrome OS"];
const FEEDBACK_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

function parseFeedbackOs(value: string) {
  const name = OS_NAMES.find((os) => value.toLowerCase().startsWith(os.toLowerCase()));
  return {
    type: name ?? (value ? "その他" : "未入力"),
    version: (name ? value.slice(name.length).trim() : value) || null,
  };
}

function detectFeedbackEnvironment() {
  const ua = navigator.userAgent;
  const ipad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  const os = [
    [ipad, "iPadOS", "iPad"],
    [/iPhone/i.test(ua), "iOS", "iPhone"],
    [/Android/i.test(ua), "Android", "Android"],
    [/Windows/i.test(ua), "Windows", "PC"],
    [/Mac OS X|Macintosh/i.test(ua), "macOS", "PC"],
    [/CrOS/i.test(ua), "Chrome OS", "PC"],
    [/Linux/i.test(ua), "Linux", "PC"],
  ].find(([matches]) => matches) as [boolean, string, string] | undefined;
  const browserMatches: Array<[string, RegExp]> = [
    ["Edge", /(?:EdgA|EdgiOS|Edg)\/([\d.]+)/i],
    ["Opera", /(?:OPR|Opera)\/([\d.]+)/i],
    ["Firefox", /(?:FxiOS|Firefox)\/([\d.]+)/i],
    ["Chrome", /(?:CriOS|Chrome)\/([\d.]+)/i],
    ["Safari", /Version\/([\d.]+).*Safari/i],
  ];
  for (const [name, pattern] of browserMatches) {
    const match = ua.match(pattern);
    if (match) return { os: os?.[1] ?? "", device: os?.[2] ?? "", browser: name, version: match[1] };
  }
  return { os: os?.[1] ?? "", device: os?.[2] ?? "", browser: "", version: "" };
}

export function FeedbackForm() {
  const [kind, setKind] = useState<"bug" | "request">("bug");
  const [autoDetect, setAutoDetect] = useState(false);
  const [device, setDevice] = useState("");
  const [os, setOs] = useState("");
  const [browser, setBrowser] = useState("");
  const [browserVersion, setBrowserVersion] = useState("");
  const [imageCount, setImageCount] = useState(0);
  const detection = useRef(0);
  const isBug = kind === "bug";

  async function autoFill(checked: boolean) {
    const attempt = ++detection.current;
    setAutoDetect(checked);
    if (!checked) return;
    const detected = detectFeedbackEnvironment();
    setDevice(detected.device);
    setOs(detected.os);
    setBrowser(detected.browser);
    setBrowserVersion(detected.version);
    const brave = (navigator as Navigator & { brave?: { isBrave?: () => Promise<boolean> } }).brave;
    if (await brave?.isBrave?.().catch(() => false) && detection.current === attempt) {
      setBrowser("Brave");
      setBrowserVersion("");
    }
  }

  function resetFeedback() {
    detection.current++;
    setKind("bug");
    setAutoDetect(false);
    setDevice("");
    setOs("");
    setBrowser("");
    setBrowserVersion("");
    setImageCount(0);
  }

  return (
    <details className="salt-support" id="feedback">
      <summary>
        <span className="salt-feedback-copy">不具合・ご要望はこちら<small>表示や操作で気になったことをお寄せください。</small></span>
        <span className="salt-feedback-action salt-feedback-action--open">フォームを開く ＋</span>
        <span className="salt-feedback-action salt-feedback-action--close">フォームを閉じる −</span>
      </summary>
      <SupportForm onReset={resetFeedback} submitLabel={isBug ? "不具合報告を送信" : "ご要望を送信"} send={async (data) => {
        const isBugReport = field(data, "type") === "bug";
        const description = field(data, "description");
        const deviceType = field(data, "device");
        const osInput = field(data, "os");
        const browserType = field(data, "browser");
        const browserOther = field(data, "browserOther");
        if (!description) throw new Error(isBugReport ? "不具合内容を入力してください。" : "ご要望内容を入力してください。");
        if (isBugReport && !deviceType) throw new Error("端末種類を選択してください。");
        if (isBugReport && !osInput) throw new Error("OS・バージョンを入力してください。");
        if (browserType === "その他" && !browserOther) throw new Error("ブラウザ名を入力してください。");
        const parsedOs = parseFeedbackOs(osInput);
        const images = data.getAll("images").filter((entry): entry is File => entry instanceof File && entry.size > 0);
        if (images.length > 5 || images.some((image) => image.size > 5 * 1024 * 1024 || (image.type && !FEEDBACK_IMAGE_TYPES.includes(image.type)))) {
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
          issue_description: `[${isBugReport ? "不具合" : "要望"}] ${description}`,
          device_type: deviceType || "未入力",
          device_model: field(data, "deviceModel") || null,
          os_type: parsedOs.type,
          os_version: parsedOs.version,
          browser: (browserType === "その他" ? browserOther : browserType) || null,
          browser_other: browserType === "その他" ? browserOther : null,
          browser_version: browserVersion || null,
          image_url: paths[0] ?? null,
          image_urls: paths.length ? paths : null,
          page_path: "/stockchecker/saltboy",
        });
      }}>
        <p>不具合のご報告だけでなく、「こんな機能があるといい」「こうすると使いやすい」などのご要望もお寄せください。いただいた内容は確認し、可能な範囲で改善に努めます。</p>
        <label><span>内容の種類 <strong className="salt-feedback-required">必須</strong></span>
          <select name="type" value={kind} onChange={(event) => setKind(event.target.value === "request" ? "request" : "bug")} required>
            <option value="bug">不具合</option><option value="request">ご要望・改善案</option>
          </select>
        </label>
        <label><span>{isBug ? "不具合内容" : "ご要望内容"} <strong className="salt-feedback-required">必須</strong></span>
          <textarea name="description" rows={3} maxLength={1000} required placeholder={isBug ? "例: 店舗をタップしても反応しない" : "例: こんな機能があると便利、ここをこうすると使いやすい"} />
        </label>
        <div className="salt-feedback-note">
          <p>不具合の場合は、端末・OS・ブラウザ情報があると確認しやすくなります。要望の場合は入力不要です。</p>
          <p><strong>チェックを入れるまで表示環境情報は自動入力しません。自動入力した内容も、送信ボタンを押すまで送信されません。</strong></p>
          <p>取得する情報は表示環境に関するもののみです。不具合の確認・改善のために使用します。</p>
          <label className="salt-feedback-opt-in"><input type="checkbox" checked={autoDetect} onChange={(event) => void autoFill(event.target.checked)} />端末種類・OS・ブラウザ情報を自動入力する</label>
          {autoDetect && <p>機種名とOSバージョンは手動で入力してください。自動入力後も修正できます。</p>}
        </div>
        <div className="salt-feedback-fields">
          <label><span>端末種類 {isBug ? <strong className="salt-feedback-required">必須</strong> : <small>任意</small>}</span>
            <select name="device" value={device} onChange={(event) => setDevice(event.target.value)} required={isBug}>
              <option value="">選択</option>{DEVICE_TYPES.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          <label><span>機種名 <small>任意</small></span><input name="deviceModel" maxLength={100} placeholder="例: Pixel 9 / AQUOS sense9" /></label>
          <label className="salt-feedback-wide"><span>OS・バージョン {isBug ? <strong className="salt-feedback-required">必須</strong> : <small>任意</small>}</span>
            <input name="os" value={os} onChange={(event) => setOs(event.target.value)} maxLength={100} required={isBug} placeholder="例: iOS 26.5 / Android 15 / Windows 11 / macOS 15.6" />
            <small>自動入力を利用した場合も、OSバージョンは手動で入力してください。</small>
          </label>
          <label className="salt-feedback-wide"><span>ブラウザ <small>任意</small></span>
            <select name="browser" value={browser} onChange={(event) => {
              detection.current++;
              setBrowser(event.target.value);
              setBrowserVersion("");
            }}>
              <option value="">選択</option>{BROWSERS.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          {browser === "その他" && <label className="salt-feedback-wide"><span>ブラウザ名 <strong className="salt-feedback-required">必須</strong></span><input name="browserOther" maxLength={100} required /></label>}
          {browserVersion && <p className="salt-feedback-wide">ブラウザバージョン: {browserVersion}</p>}
        </div>
        <details className="salt-feedback-note">
          <summary>端末・OS情報の確認方法を見る</summary>
          <p><strong>iPhone / iPad</strong><br />設定 → 一般 → 情報 → iOSバージョン / iPadOSバージョン</p>
          <p><strong>Android</strong><br />設定 → デバイス情報 / 端末情報 → Androidバージョン</p>
          <p><strong>機種名</strong><br />Androidは設定 → デバイス情報 / 端末情報、iPhone / iPadは設定 → 一般 → 情報の「機種名」で確認できます。</p>
          <p><strong>ブラウザ</strong><br />このページを開いているブラウザを選択してください。</p>
        </details>
        <div className="salt-feedback-note">
          <strong>動作環境について</strong>
          <p>古いOS・ブラウザでは、表示の崩れやタップ操作が反応しないなど、一部機能が正常に動作しない場合があります。</p>
          <p>iPhone・iPadでは、iOS / iPadOS 16.4以降を目安にご利用ください。Android・Windows等をご利用の場合も、OSとブラウザを最新の状態にしてご利用ください。</p>
        </div>
        <label><span>スクリーンショット <small>任意・最大5枚・1枚5MBまで</small></span>
          <input type="file" name="images" accept={`${FEEDBACK_IMAGE_TYPES.join(",")},.heic,.heif`} multiple onChange={(event) => setImageCount(event.target.files?.length ?? 0)} />
          {imageCount > 0 && <small role="status">{imageCount > 5 ? "画像は5枚まで添付できます。" : `選択中: ${imageCount}枚`}</small>}
        </label>
      </SupportForm>
    </details>
  );
}
