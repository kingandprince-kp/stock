"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import type { FirstWeek, Inventory, SaltInventory, Store } from "./data";
import { FeedbackForm, StoreContribution, StoreRequest } from "./support-forms";

type Mode = "physical" | "online";
type Comment = {
  id: number;
  body: string;
  created_at: string;
  is_own: boolean;
  applause_count: number;
  applauded_by_me: boolean;
};
type CommentCount = { store_id: number; comment_count: number };

const PREFECTURE_GROUPS = [
  { region: "北海道・東北", prefectures: ["北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"] },
  { region: "関東", prefectures: ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"] },
  { region: "中部", prefectures: ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県"] },
  { region: "近畿", prefectures: ["三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"] },
  { region: "中国", prefectures: ["鳥取県", "島根県", "岡山県", "広島県", "山口県"] },
  { region: "四国", prefectures: ["徳島県", "香川県", "愛媛県", "高知県"] },
  { region: "九州・沖縄", prefectures: ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"] },
];

const STATUS_TEXT: Record<string, string> = {
  in_stock: "在庫あり",
  low_stock: "残りわずか",
  sold_out: "売り切れ",
  backorder: "取り寄せ",
};
const DATE_FORMAT = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
});
const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const radians = (degrees: number) => degrees * Math.PI / 180;

function distanceKm(lat: number, lng: number, store: Store) {
  if (store.latitude == null || store.longitude == null) return null;
  const a = Math.sin(radians(store.latitude - lat) / 2) ** 2
    + Math.cos(radians(lat)) * Math.cos(radians(store.latitude)) * Math.sin(radians(store.longitude - lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1, a)));
}

function displayName(store: Store) {
  return store.chain_name && !normalize(store.name).includes(normalize(store.chain_name))
    ? `${store.chain_name} ${store.name}` : store.name;
}

function safeUrl(value: string | null | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function clientId() {
  let id = localStorage.getItem("kp_inventory_client_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("kp_inventory_client_id", id);
  }
  return id;
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children} ↗</a>;
}

function InfoAccordions() {
  return (
    <div className="salt-explanations">
      <details className="salt-explanation">
        <summary><span>📊 オリコン・Billboard集計について</span><span className="salt-chevron">∨</span></summary>
        <div className="salt-explanation-body">
          <section>
            <h3>オリコン</h3>
            <p><span className="salt-badge salt-badge-oricon">オリコン対象</span></p>
            <p>掲載している実店舗は、オリコン「CD・DVD/Blu-rayランキング調査協力店」として確認できた店舗を掲載しています。</p>
            <div className="salt-caution"><strong>⏰ 初週集計の購入目安</strong><p>初週集計の締め時間は店舗や購入方法によって異なります。確認できた情報のみ表示し、未確認の場合は「要確認」としています。実際の店舗にご確認ください。</p><p>オンラインショップは注文日時だけでなく発送時期などによって集計タイミングが変わります。購入前に各ショップの商品ページで発送予定をご確認ください。</p><p>※表示は目安です。店舗・ショップや購入方法、在庫・発送状況によって変わる場合があります。</p></div>
            <ExternalLink href="https://biz.oricon.co.jp/coope.asp">オリコン 調査協力店一覧を確認する</ExternalLink>
          </section>
          <section className="salt-explanation-subsection">
            <h3>Billboard</h3>
            <p>店舗ごとに集計対象、対象外、要確認の状態を表示しています。</p>
            <div className="salt-badge-legend"><span className="salt-badge salt-badge-billboard">Billboard 対象</span><span>集計対象として確認できた店舗</span></div>
            <div className="salt-badge-legend"><span className="salt-badge salt-badge-not-target">Billboard 対象外</span><span>集計対象外として確認できた店舗</span></div>
            <div className="salt-badge-legend"><span className="salt-badge salt-badge-check">Billboard 要確認</span><span>店舗ごとの対象状況を確認できていない店舗</span></div>
            <p className="salt-muted-note">※フランチャイズ店舗などは店舗ごとに対象状況が異なる場合があります。掲載情報やランキングへの集計を保証するものではありません。購入前に各店舗・公式サイト等で最新情報をご確認ください。</p>
          </section>
        </div>
      </details>

      <details className="salt-explanation">
        <summary><span>📦 在庫情報について</span><span className="salt-chevron">∨</span></summary>
        <div className="salt-explanation-body">
          <p>本サイトの在庫情報は、店舗・オンラインショップで確認した情報をユーザーが投稿し共有するものです。</p>
          <p>在庫状況は投稿後に変動する場合があり、表示されている在庫数や在庫の有無を保証するものではありません。店舗への取り置き・予約の可否についても、各店舗へ直接ご確認ください。</p>
          <p className="salt-muted-note">※掲載情報は参考情報としてご利用ください。<strong>購入・来店前には、ご自身で各店舗・オンラインショップ等へ最新の在庫状況をご確認ください。</strong></p>
        </div>
      </details>
    </div>
  );
}

function StoreCard({
  store, mode, inventory, reports, firstWeek, commentCount, onCommentsChanged, onReport, distance,
}: {
  store: Store;
  mode: Mode;
  inventory: SaltInventory | null;
  reports: Map<string, Inventory>;
  firstWeek: FirstWeek[];
  commentCount: number;
  onCommentsChanged: () => Promise<void>;
  onReport: (store: Store) => void;
  distance: number | null;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [commentError, setCommentError] = useState("");
  const [commentMessage, setCommentMessage] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [busyComment, setBusyComment] = useState<number | null>(null);

  const online = mode === "online";
  const storeUrl = safeUrl(online ? store.online_url : store.official_url);

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    setCommentError("");
    const { data, error } = await supabase.rpc("get_store_comments", {
      p_store_id: store.id, p_limit: 20, p_client_id: clientId(),
    });
    if (error) setCommentError("コメントを読み込めませんでした。時間をおいて再度お試しください。");
    else setComments((data ?? []) as Comment[]);
    setCommentsLoading(false);
  }, [store.id]);

  async function toggleComments() {
    const next = !commentsOpen;
    setCommentsOpen(next);
    setCommentError("");
    setCommentMessage("");
    if (next) await loadComments();
  }

  async function submitComment() {
    const body = commentBody.trim();
    setCommentError("");
    setCommentMessage("");
    if (!body) return setCommentError("コメントを入力してください。");
    if (body.length > 300) return setCommentError("コメントは300文字以内で入力してください。");
    if (/https?:\/\/|www\./i.test(body)) return setCommentError("店舗コメントにはURLを投稿できません。");
    setCommentSubmitting(true);
    const { error } = await supabase.rpc("submit_store_comment", {
      p_store_id: store.id, p_body: body, p_client_id: clientId(),
    });
    if (error) setCommentError("コメントを投稿できませんでした。時間をおいて再度お試しください。");
    else {
      setCommentBody("");
      setCommentMessage("コメントを投稿しました。ありがとうございます。");
      await Promise.all([loadComments(), onCommentsChanged()]);
    }
    setCommentSubmitting(false);
  }

  async function applaud(comment: Comment) {
    setBusyComment(comment.id);
    const { error } = await supabase.rpc("toggle_store_comment_applause", {
      p_comment_id: comment.id, p_client_id: clientId(),
    });
    if (error) setCommentError("応援を更新できませんでした。もう一度お試しください。");
    else await loadComments();
    setBusyComment(null);
  }

  async function deleteComment(comment: Comment) {
    if (!window.confirm("自分の店舗コメントを削除しますか?")) return;
    setBusyComment(comment.id);
    const { error } = await supabase.rpc("delete_own_store_comment", {
      p_comment_id: comment.id, p_client_id: localStorage.getItem("kp_inventory_client_id"),
    });
    if (error) setCommentError("コメントを削除できませんでした。");
    else {
      setCommentMessage("自分のコメントを削除しました。");
      await Promise.all([loadComments(), onCommentsChanged()]);
    }
    setBusyComment(null);
  }

  return (
    <article className="salt-store">
      <div className="salt-store-head">
        <div className="salt-store-title">
          <h3>{displayName(store)}</h3>
          <p>{online ? "🛒 オンラインショップ" : `📍 ${store.prefecture}${store.city ? ` ${store.city}` : ""}${distance !== null ? ` · ${distance.toFixed(1)} km` : ""}`}</p>
          {!online && store.business_hours && <p>🕒 営業時間: {store.business_hours}</p>}
        </div>
        <div className="salt-badges" aria-label="集計対象">
          {store.oricon_target === true && <span className="salt-badge salt-badge-oricon">オリコン対象</span>}
          {store.billboard_status === "target" && <span className="salt-badge salt-badge-billboard">Billboard対象</span>}
          {store.billboard_status === "check_store" && <span className="salt-badge salt-badge-check">Billboard要確認</span>}
          {store.billboard_status === "not_target" && <span className="salt-badge salt-badge-not-target">Billboard対象外</span>}
        </div>
      </div>

      {!online && !firstWeek.some((item) => item.cutoff_date) && (
        <p className="salt-first-week">初週締め時間: 要確認</p>
      )}
      {firstWeek.map((item, index) => (
        <p key={`${item.product_id}-${index}`} className="salt-first-week">
          {online ? "初週情報: " : "初週締め時間: "}
          {online
            ? [
                inventory?.products.find((product) => product.id === item.product_id)?.name,
                item.estimate_basis === "shipping" ? "発送予定" : "お届け予定",
                item.earliest_date === item.latest_date ? item.earliest_date : [item.earliest_date, item.latest_date].filter(Boolean).join("～"),
                item.note,
              ].filter(Boolean).join(" ")
            : [item.cutoff_date, item.cutoff_kind === "closing" ? "閉店まで" : item.cutoff_time?.slice(0, 5), item.note].filter(Boolean).join(" ")}
        </p>
      ))}
      <StoreContribution store={store} online={online} />

      {inventory && (
        <section className="salt-stock-panel" aria-label="在庫状況">
          <h4>STOCK</h4>
          <dl className="salt-stock">
            {inventory.products.map((product) => {
              const item = reports.get(`${store.id}:${product.id}`);
              const status = item
                ? (item.stock_status && STATUS_TEXT[item.stock_status]) || (item.quantity == null ? "要確認" : `在庫 ${item.quantity.toLocaleString("ja-JP")}枚`)
                : "報告なし";
              return (
                <div key={product.id}>
                  <dt>{product.name}</dt>
                  <dd>{status}</dd>
                  {item && <time dateTime={item.created_at}>{DATE_FORMAT.format(new Date(item.created_at))} 更新</time>}
                </div>
              );
            })}
          </dl>
        </section>
      )}

      <div className="salt-store-actions">
        {online && storeUrl && <ExternalLink href={storeUrl}>商品ページを見る</ExternalLink>}
        {inventory?.products.length ? <button type="button" onClick={() => onReport(store)}>在庫投稿</button> : null}
      </div>

      <div className="salt-comments">
        <button type="button" className="salt-comments-toggle" aria-expanded={commentsOpen} onClick={() => void toggleComments()}>
          <span><strong>💬 店舗コメント({commentCount})</strong><small>{online ? "在庫状況・再入荷・発送予定などを共有できます" : "混雑・レジ・入荷予定・売場状況などを共有できます"}</small></span>
          <span className="salt-chevron">{commentsOpen ? "∧" : "∨"}</span>
        </button>
        {commentsOpen && (
          <div className="salt-comments-body">
            {commentsLoading ? <p>コメントを読み込み中…</p> : comments.length === 0 ? <p className="salt-no-comments">まだコメントはありません。</p> : (
              <div className="salt-comment-list">
                {comments.map((comment) => <article key={comment.id} className="salt-comment">
                  <p>{comment.body}</p>
                  <div><time dateTime={comment.created_at}>{DATE_FORMAT.format(new Date(comment.created_at))}</time>
                    <button type="button" disabled={busyComment === comment.id} onClick={() => void applaud(comment)}>{comment.applauded_by_me ? "👏 応援済み" : "👏 応援"} {comment.applause_count || ""}</button>
                    {comment.is_own && <button type="button" disabled={busyComment === comment.id} onClick={() => void deleteComment(comment)}>自分のコメントを削除</button>}
                  </div>
                </article>)}
              </div>
            )}
            <div className="salt-comment-form">
              <strong>コメントを追加</strong>
              <textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} maxLength={300} rows={3} placeholder="例) レジの混雑、入荷予定、売場の状況など" />
              <small>個人情報・URLの投稿はお控えください。店舗状況は時間とともに変わるため、参考情報としてご利用ください。</small>
              {commentError && <p role="alert">{commentError}</p>}
              {commentMessage && <p role="status">{commentMessage}</p>}
              <button type="button" disabled={commentSubmitting} onClick={() => void submitComment()}>{commentSubmitting ? "投稿中…" : "コメントを投稿"}</button>
            </div>
          </div>
        )}
      </div>

      {!online && <button type="button" className="salt-info-toggle" aria-expanded={infoOpen} onClick={() => setInfoOpen((value) => !value)}>{infoOpen ? "店舗情報を閉じる ∧" : "店舗情報を見る ∨"}</button>}
      {(online || infoOpen) && <div className="salt-store-info">
        {online ? <div className="salt-online-info"><strong>🛒 オンラインショップ</strong>{store.online_url && <ExternalLink href={store.online_url}>商品ページを見る</ExternalLink>}</div> : <>
          <div className="salt-contact-grid">
            <section><strong>📍 住所</strong><p>{store.address || "情報なし"}</p>{store.address && <div className="salt-map-links"><ExternalLink href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`}>Googleマップ</ExternalLink><ExternalLink href={`https://maps.apple.com/?q=${encodeURIComponent(store.address)}`}>Appleマップ</ExternalLink></div>}</section>
            <section><strong>☎️ 電話番号</strong>{store.phone ? <a href={`tel:${store.phone.replace(/[^\d+]/g, "")}`}>{store.phone}</a> : <p>情報なし</p>}</section>
          </div>
          {storeUrl && <div className="salt-official-link"><ExternalLink href={storeUrl}>公式ページを見る</ExternalLink></div>}
        </>}
      </div>}
    </article>
  );
}

export default function StockChecker({ physical, online, inventory }: {
  physical: Store[];
  online: Store[];
  inventory: SaltInventory | null;
}) {
  const [mode, setMode] = useState<Mode>("physical");
  const [query, setQuery] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [limit, setLimit] = useState(20);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoMessage, setGeoMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [reportStore, setReportStore] = useState<Store | null>(null);
  const [reportInputs, setReportInputs] = useState<Record<number, { status: string; quantity: string }>>({});
  const [reportComment, setReportComment] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileError, setTurnstileError] = useState("");
  const [requestId, setRequestId] = useState("");
  const reportDialog = useRef<HTMLDialogElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const router = useRouter();
  const [commentCounts, setCommentCounts] = useState<CommentCount[]>([]);
  const reports = useMemo(() => new Map(inventory?.reports.map((item) => [`${item.store_id}:${item.product_id}`, item])), [inventory]);
  const storesById = useMemo(() => new Map([...physical, ...online].map((store) => [store.id, store])), [physical, online]);
  const productsById = useMemo(() => new Map(inventory?.products.map((product) => [product.id, product])), [inventory]);
  const firstWeek = useMemo(() => {
    const map = new Map<number, FirstWeek[]>();
    for (const item of inventory?.firstWeek ?? []) map.set(item.store_id, [...(map.get(item.store_id) ?? []), item]);
    return map;
  }, [inventory]);
  const commentCountMap = useMemo(() => new Map(commentCounts.map((item) => [item.store_id, Number(item.comment_count) || 0])), [commentCounts]);

  const loadCommentCounts = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_store_comment_counts");
    if (!error) setCommentCounts((data ?? []) as CommentCount[]);
  }, []);
  useEffect(() => { void loadCommentCounts(); }, [loadCommentCounts]);

  useEffect(() => {
    if (reportStore && reportDialog.current && !reportDialog.current.open) {
      reportDialog.current.showModal();
    }
  }, [reportStore]);

  useEffect(() => {
    if (!reportStore) return;
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) {
      setTurnstileError("Bot対策の設定を読み込めません。");
      return;
    }

    let cancelled = false;
    const renderWidget = () => {
      const turnstile = (window as typeof window & {
        turnstile?: {
          render: (selector: string, options: {
            sitekey: string;
            action: string;
            callback: (token: string) => void;
            "expired-callback": () => void;
            "error-callback": () => void;
          }) => string;
          remove?: (widgetId?: string) => void;
        };
      }).turnstile;
      if (cancelled || !turnstile || turnstileWidgetId.current) return;
      if (!document.querySelector("#salt-inventory-turnstile")) return;
      turnstileWidgetId.current = turnstile.render("#salt-inventory-turnstile", {
        sitekey: siteKey,
        action: "inventory_report",
        callback: (token) => { setTurnstileToken(token); setTurnstileReady(true); setTurnstileError(""); },
        "expired-callback": () => { setTurnstileToken(""); setTurnstileReady(false); },
        "error-callback": () => { setTurnstileToken(""); setTurnstileReady(false); setTurnstileError("Bot対策を確認できません。再読み込みしてください。"); },
      });
    };

    const scriptUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`);
    if (existingScript) {
      if ((window as typeof window & { turnstile?: unknown }).turnstile) renderWidget();
      else existingScript.addEventListener("load", renderWidget, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = scriptUrl;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", renderWidget, { once: true });
      script.addEventListener("error", () => setTurnstileError("Bot対策を読み込めません。時間をおいて再度お試しください。"), { once: true });
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
      const turnstile = (window as typeof window & { turnstile?: { remove?: (widgetId?: string) => void } }).turnstile;
      if (turnstileWidgetId.current) turnstile?.remove?.(turnstileWidgetId.current);
      turnstileWidgetId.current = null;
      setTurnstileToken("");
      setTurnstileReady(false);
    };
  }, [reportStore]);

  const matches = useMemo(() => {
    const term = normalize(query);
    const stores = (mode === "physical" ? physical : online).filter((store) =>
      (!prefecture || mode === "online" || store.prefecture === prefecture)
      && (!term || normalize([displayName(store), store.prefecture, store.city, store.address].join(" ")).includes(term))
    ).map((store) => ({ store, distance: mode === "physical" && location ? distanceKm(location.lat, location.lng, store) : null }));
    if (mode === "physical" && location) stores.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    return stores;
  }, [mode, physical, online, prefecture, query, location]);

  function locate() {
    if (!navigator.geolocation) return setGeoMessage("このブラウザーでは現在地を取得できません。");
    setLocating(true);
    setGeoMessage("");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setLocation({ lat: coords.latitude, lng: coords.longitude });
      setPrefecture("");
      setLimit(20);
      setLocating(false);
    }, () => {
      setGeoMessage("現在地を取得できませんでした。位置情報の許可を確認してください。");
      setLocating(false);
    }, { timeout: 10000, maximumAge: 60000 });
  }

  function openReport(store: Store) {
    setReportStore(store);
    setReportInputs({});
    setReportComment("");
    setReportError("");
    setReportMessage("");
    setTurnstileError("");
    setRequestId(crypto.randomUUID());
  }

  function closeReport() {
    if (reportSubmitting) return;
    setReportStore(null);
    setTurnstileToken("");
    setTurnstileReady(false);
  }

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReportError("");
    setReportMessage("");
    if (!reportStore || !inventory) return;
    if (!turnstileToken) return setReportError("Bot対策の確認を完了してください。");

    const items = inventory.products.flatMap((product) => {
      const selected = reportInputs[product.id];
      if (!selected?.status) return [];
      if (selected.status === "in_stock" || selected.status === "low_stock") {
        const quantity = Number(selected.quantity);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) return [];
        return [{ productId: product.id, quantity, stockStatus: selected.status, comment: reportComment.trim() }];
      }
      return [{ productId: product.id, quantity: selected.status === "sold_out" ? 0 : 1, stockStatus: selected.status, comment: reportComment.trim() }];
    });
    if (!items.length) return setReportError("報告する形態と在庫状況を選択してください。");
    if (items.length !== Object.values(reportInputs).filter((item) => item.status).length) {
      return setReportError("枚数を入力する形態は、1～10,000の整数で入力してください。");
    }

    setReportSubmitting(true);
    try {
      const response = await fetch("/api/salt-boy/inventory-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: reportStore.id, items, clientId: localStorage.getItem("kp_inventory_client_id") || crypto.randomUUID(), requestId, turnstileToken }),
      });
      const result = await response.json() as { success?: boolean; message?: string; reportCount?: number };
      if (!response.ok || !result.success) {
        setReportError(result.message || "在庫を送信できませんでした。内容を確認して再度お試しください。");
        return;
      }
      setReportMessage("在庫情報を送信しました。承認後に一覧へ反映されます。");
      setReportStore(null);
      router.refresh();
    } catch {
      setReportError("在庫報告中にエラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setReportSubmitting(false);
    }
  }

  return (
    <>
      <nav className="salt-page-links" aria-label="ページ内のご案内">
        <p>ページ下部のご案内</p>
        <ul>
          <li><a href="#store-request">店舗の追加リクエスト</a></li>
          <li><a href="#latest-reports">最新の在庫投稿</a></li>
          <li><a href="#feedback">不具合・ご要望</a></li>
        </ul>
      </nav>
      <InfoAccordions />
      <section id="stores" className="salt-search" aria-label="店舗検索">
        <div className="salt-section-kicker">STOCK SEARCH</div>
        <h2>🏬 店舗を探す</h2>
        <div className="salt-tabs" role="group" aria-label="店舗の種類">
          <button type="button" aria-pressed={mode === "physical"} onClick={() => { setMode("physical"); setLimit(20); }}>🏪 実店舗</button>
          <button type="button" aria-pressed={mode === "online"} onClick={() => { setMode("online"); setLimit(20); }}>🛒 オンライン</button>
        </div>
        <div className="salt-search-tools">
          <label className="salt-search-label">{mode === "physical" ? "店舗名・チェーン名・市区町村で検索" : "オンラインショップ名で検索"}
            <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(20); }} placeholder="店舗名・チェーン名を入力" />
          </label>
          {mode === "physical" && (
            <button type="button" className="salt-location-button" aria-pressed={location !== null} onClick={location ? () => setLocation(null) : locate} disabled={locating}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
              </svg>
              {locating ? "現在地を取得中…" : location ? "現在地検索を解除" : "現在地から探す"}
            </button>
          )}
        </div>
        {mode === "physical" && geoMessage && <p className="salt-geolocation-message" role="status">{geoMessage}</p>}
        {mode === "physical" && <>
          <div className="salt-prefectures">
            <div className="salt-prefecture-heading">📍 都道府県を選択</div>
            <button type="button" className={`salt-prefecture-chip salt-all-chip ${!prefecture ? "selected" : ""}`} aria-pressed={!prefecture} onClick={() => { setPrefecture(""); setLimit(20); }}>全国</button>
            {PREFECTURE_GROUPS.map((group) => <section key={group.region}>
              <h3>{group.region}</h3>
              <div className="salt-prefecture-list">{group.prefectures.map((item) => <button key={item} type="button" className={`salt-prefecture-chip ${prefecture === item ? "selected" : ""}`} aria-pressed={prefecture === item} onClick={() => { setPrefecture(item); setLimit(20); }}>{item}</button>)}</div>
            </section>)}
          </div>
        </>}
      </section>

      <section className="salt-results" aria-label="店舗一覧">
        <div className="salt-section-kicker">STORE RESULTS</div>
        <p className="salt-count" aria-live="polite">{matches.length.toLocaleString("ja-JP")}件{mode === "physical" && location ? " ・現在地に近い順" : ""}</p>
        {!inventory && <p className="salt-error" role="alert">SALT BOYの在庫データを取得できませんでした。時間をおいて再読み込みしてください。</p>}
        {matches.slice(0, limit).map(({ store, distance }) => <StoreCard key={`${mode}-${store.id}`} store={store} mode={mode} inventory={inventory} reports={reports} firstWeek={firstWeek.get(store.id) ?? []} commentCount={commentCountMap.get(store.id) ?? 0} onCommentsChanged={loadCommentCounts} onReport={openReport} distance={distance} />)}
        {!matches.length && <p className="salt-empty">条件に一致する店舗が見つかりませんでした。</p>}
        {matches.length > limit && <button type="button" className="salt-more-button" onClick={() => setLimit((value) => value + 20)}>さらに20件表示</button>}
      </section>

      <StoreRequest online={mode === "online"} prefecture={prefecture} prefectures={PREFECTURE_GROUPS.flatMap((group) => group.prefectures)} />
      <section className="salt-support salt-recent" id="latest-reports" aria-labelledby="salt-latest-title">
        <div className="salt-section-kicker">LATEST REPORTS</div>
        <h2 id="salt-latest-title">最新の在庫投稿</h2>
        {reportMessage && <p role="status">{reportMessage}</p>}
        {!inventory ? <p>在庫投稿を取得できませんでした。</p> : !inventory.recentReports.length ? <p>公開済みの在庫投稿はまだありません。</p> : (
          <ol>{inventory.recentReports.map((item) => {
            const store = storesById.get(item.store_id);
            return (
              <li key={item.id}>
                <div><strong>{store ? displayName(store) : "掲載終了店舗"}</strong><span>{productsById.get(item.product_id)?.name ?? "掲載終了商品"}</span></div>
                <div><strong>{(item.stock_status && STATUS_TEXT[item.stock_status]) || (item.quantity === null ? "要確認" : `${item.quantity.toLocaleString("ja-JP")}枚`)}</strong><time dateTime={item.created_at}>{DATE_FORMAT.format(new Date(item.created_at))}</time></div>
                {item.comment && <p>{item.comment}</p>}
              </li>
            );
          })}</ol>
        )}
      </section>
      <FeedbackForm />

      {reportStore && <dialog ref={reportDialog} className="salt-dialog" aria-labelledby="salt-report-title" onCancel={(event) => { event.preventDefault(); closeReport(); }}>
        <form onSubmit={(event) => void submitReport(event)}>
          <button type="button" className="salt-dialog-close" aria-label="閉じる" onClick={closeReport} disabled={reportSubmitting}>×</button>
          <div className="salt-section-kicker">INVENTORY REPORT</div>
          <h2 id="salt-report-title">在庫をまとめて報告</h2>
          <p className="salt-report-store-name">{displayName(reportStore)}</p>
          <p className="salt-report-help">報告する形態だけ選択してください。複数形態を一度に送信できます。</p>
          <fieldset className="salt-report-products"><legend>形態ごとの在庫状況</legend>{inventory?.products.map((product) => {
            const selected = reportInputs[product.id] ?? { status: "", quantity: "" };
            return <div className="salt-report-product" key={product.id}>
              <label htmlFor={`salt-status-${product.id}`}>{product.name}</label>
              <select id={`salt-status-${product.id}`} value={selected.status} onChange={(event) => setReportInputs((current) => ({
                ...current,
                [product.id]: { status: event.target.value, quantity: event.target.value && event.target.value !== "sold_out" && event.target.value !== "backorder" ? (Number(current[product.id]?.quantity) > 0 ? current[product.id].quantity : "1") : "0" },
              }))}>
                <option value="">報告しない</option>
                {Object.entries(STATUS_TEXT).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              {selected.status && selected.status !== "sold_out" && selected.status !== "backorder" && <label className="salt-report-quantity">数量
                <input type="number" min="1" max="10000" step="1" inputMode="numeric" value={selected.quantity} onChange={(event) => setReportInputs((current) => ({ ...current, [product.id]: { ...selected, quantity: event.target.value } }))} required aria-label={`${product.name}の在庫数`} />
                <span>枚</span>
              </label>}
            </div>;
          })}</fieldset>
          <label className="salt-report-comment">店舗メモ (任意)
            <textarea value={reportComment} onChange={(event) => setReportComment(event.target.value)} maxLength={300} rows={3} placeholder="売場や入荷状況など。個人情報・URLは入力しないでください。" />
            <small>{reportComment.length}/300文字</small>
          </label>
          <div className="salt-report-caution">在庫状況は投稿後に変わる場合があります。表示された在庫を保証するものではありません。来店・購入前に店舗やショップへ最新情報をご確認ください。</div>
          <div id="salt-inventory-turnstile" className="salt-turnstile" />
          {turnstileError && <p className="salt-error" role="alert">{turnstileError}</p>}
          {reportError && <p className="salt-error" role="alert">{reportError}</p>}
          <div className="salt-report-actions">
            <button type="button" className="salt-report-cancel" onClick={closeReport} disabled={reportSubmitting}>キャンセル</button>
            <button type="submit" className="salt-report-submit" disabled={reportSubmitting || !turnstileReady || !turnstileToken}>
              {reportSubmitting ? "送信中…" : "選択した形態をまとめて報告"}
            </button>
          </div>
        </form>
      </dialog>}
      <a href="#top" aria-label="サイトトップに戻る" className="salt-back-to-top"><span>↑</span><small>サイトトップ<br />に戻る</small></a>
    </>
  );
}
