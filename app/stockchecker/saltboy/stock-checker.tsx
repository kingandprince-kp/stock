"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import type { FirstWeek, Inventory, Product, SaltInventory, Store } from "./data";
import { AMAZON_JAPAN_STORE_ID, RAKUTEN_BOOKS_STORE_ID, purchaseLabel, stockKey, type PurchaseVariant } from "./purchase-variants";
import { readShippingEstimate, shippingEstimateText } from "./shipping-estimate";
import { firstWeekEstimate, FIRST_WEEK_LABELS } from "./first-week-estimate";
import ShippingEstimateFields from "./shipping-estimate-fields";
import { FeedbackForm, StoreContribution, StoreRequest } from "./support-forms";

type Mode = "physical" | "online";
const AMAZON_PRODUCTS: Partial<Record<string, { standard: string; bonus?: string }>> = {
  "UPCH-7909": { standard: "B0HMHZRS92", bonus: "B0HMHM67MR" },
  "UPCH-7910": { standard: "B0HMHNY2K4", bonus: "B0HMHKQVHJ" },
  "UPCH-7911": { standard: "B0HMHNLR3L", bonus: "B0HMHMBQHW" },
  "UPCH-7912": { standard: "B0HMJB4MT1", bonus: "B0HMHT46H4" },
  "UPCH-7913": { standard: "B0HMHVYQZF", bonus: "B0HMHJD92X" },
};
const HMV_PRODUCT_BASE = "https://www.hmv.co.jp/artist_KAITO_000000001041831/item_SALT-BOY";
const HMV_PRODUCTS: Partial<Record<string, string>> = {
  "UPCH-7909": `${encodeURIComponent("【初回限定盤A】")}-CD-Blu-ray_17348057`,
  "UPCH-7910": `${encodeURIComponent("【初回限定盤A】")}-CD-DVD_17348058`,
  "UPCH-7911": `${encodeURIComponent("【初回限定盤B】")}-CD-Blu-ray_17348059`,
  "UPCH-7912": `${encodeURIComponent("【初回限定盤B】")}-CD-DVD_17348060`,
  "UPCH-7913": `${encodeURIComponent("【通常盤＜初回プレス＞】")}_17348061`,
};
const RAKUTEN_BOOKS_PRODUCT_BASE = "https://books.rakuten.co.jp/rb/";
const RAKUTEN_BOOKS_PRODUCTS: Partial<Record<string, { standard: string; bonus: string }>> = {
  "UPCH-7909": { standard: "18854626", bonus: "18854635" },
  "UPCH-7910": { standard: "18854627", bonus: "18854637" },
  "UPCH-7911": { standard: "18854628", bonus: "18854639" },
  "UPCH-7912": { standard: "18854629", bonus: "18854641" },
  "UPCH-7913": { standard: "18854630", bonus: "18854643" },
};
const TOWER_PRODUCTS: Partial<Record<string, string>> = {
  "UPCH-7909": "8186655",
  "UPCH-7910": "8186658",
  "UPCH-7911": "8186659",
  "UPCH-7912": "8186660",
  "UPCH-7913": "8186661",
};
type Listing = { product: Product; variant: PurchaseVariant | null; url?: string };

function getListings(store: Store, products: Product[], online: boolean): Listing[] {
  const retailer = `${store.name} ${store.chain_name ?? ""}`;
  return products.flatMap((product): Listing[] => {
    if (!online) return [{ product, variant: null }];
    const code = product.catalog_number;
    const amazon = store.id === AMAZON_JAPAN_STORE_ID ? AMAZON_PRODUCTS[code] : undefined;
    const rakuten = store.id === RAKUTEN_BOOKS_STORE_ID ? RAKUTEN_BOOKS_PRODUCTS[code] : undefined;
    const sku = amazon ?? rakuten;
    if (sku) {
      const base = amazon ? "https://www.amazon.co.jp/dp/" : RAKUTEN_BOOKS_PRODUCT_BASE;
      const entry = (variant: PurchaseVariant, id: string): Listing => ({ product, variant, url: base + id + (amazon ? "" : "/") });
      return [entry("no_special", sku.standard), ...(sku.bonus ? [entry("special", sku.bonus)] : [])];
    }
    if (/hmv/i.test(retailer) && HMV_PRODUCTS[code]) return [{ product, variant: null, url: HMV_PRODUCT_BASE + HMV_PRODUCTS[code] }];
    if (/タワーレコード|tower/i.test(retailer) && TOWER_PRODUCTS[code]) return [{ product, variant: null, url: `https://tower.jp/item/${TOWER_PRODUCTS[code]}` }];
    if (store.id === 307 && /^UPCH-79(?:09|1[0-3])$/.test(code)) return [{ product, variant: null, url: `https://store.universal-music.co.jp/collections/kaito/products/${code.toLowerCase().replace("-", "")}` }];
    return [{ product, variant: null }];
  }).concat(online && store.id === RAKUTEN_BOOKS_STORE_ID ? products.filter((p) => p.catalog_number === "UPCH-7913").flatMap((product): Listing[] => [
    { product, variant: "bluray_set", url: RAKUTEN_BOOKS_PRODUCT_BASE + "18854631/" },
    { product, variant: "bluray_set_special", url: RAKUTEN_BOOKS_PRODUCT_BASE + "18854632/" },
    { product, variant: "dvd_set", url: RAKUTEN_BOOKS_PRODUCT_BASE + "18854633/" },
    { product, variant: "dvd_set_special", url: RAKUTEN_BOOKS_PRODUCT_BASE + "18854634/" },
  ]) : []);
}
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

const REPORT_OPTIONS = {
  in_stock: "在庫あり",
  sold_out: "在庫なし",
  quantity: "枚数を入力",
} as const;
const DATE_FORMAT = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
});
const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const radians = (degrees: number) => degrees * Math.PI / 180;

function isInStock(item: Inventory | undefined) {
  return !!item && (item.stock_status === "in_stock" || item.stock_status === "low_stock"
    || (item.stock_status === null && (item.quantity ?? 0) > 0));
}

function stockLabel(item: Inventory) {
  if (isInStock(item)) {
    return item.quantity && item.quantity > 0 ? `${item.quantity.toLocaleString("ja-JP")}枚` : "在庫あり";
  }
  return item.stock_status === "sold_out" || item.stock_status === "backorder" || item.quantity === 0 ? "在庫なし" : "要確認";
}

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

function ExternalLink({ href, children, showArrow = true }: { href: string; children: ReactNode; showArrow?: boolean }) {
  return (
    <a className="salt-external-link" href={href} target="_blank" rel="noopener noreferrer">
      {children}
      {showArrow && <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12 12 4m-6 0h6v6" /></svg>}
    </a>
  );
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
            <p>対象の確認には、オリコン公式の「CD・DVD/Blu-rayランキング調査協力店」一覧を参照しています。</p>
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
  store, mode, inventory, reports, stockOnly, firstWeek, commentCount, onCommentsChanged, onReport, distance,
}: {
  store: Store;
  mode: Mode;
  inventory: SaltInventory | null;
  reports: Map<string, Inventory>;
  stockOnly: boolean;
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
  const storeUrl = safeUrl(store.official_url);
  const listings = getListings(store, inventory?.products ?? [], online);
  const stockItems = listings.map((listing) => {
    const key = stockKey(store.id, listing.product.id, listing.variant);
    return { ...listing, key, item: reports.get(key) };
  });
  const lastUpdated = stockItems.reduce<string | null>((latest, { item }) => (
    item && (!latest || Date.parse(item.created_at) > Date.parse(latest)) ? item.created_at : latest
  ), null);

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
          <div className="salt-store-meta">
            <span>{online ? "🛒 オンラインショップ" : `📍 ${store.prefecture}${store.city ? ` ${store.city}` : ""}${distance !== null ? ` · ${distance.toFixed(1)} km` : ""}`}</span>
            {!online && store.business_hours && <strong>🕒 営業時間: {store.business_hours}</strong>}
          </div>
        </div>
        <div className="salt-badges" aria-label="集計対象">
          {store.oricon_target === true && <span className="salt-badge salt-badge-oricon">オリコン対象</span>}
          {store.billboard_status === "target" && <span className="salt-badge salt-badge-billboard">Billboard対象</span>}
          {store.billboard_status === "check_store" && <span className="salt-badge salt-badge-check">Billboard要確認</span>}
          {store.billboard_status === "not_target" && <span className="salt-badge salt-badge-not-target">Billboard対象外</span>}
        </div>
      </div>

      <div className="salt-store-tools">
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
      </div>

      {inventory && (
        <section className="salt-stock-panel" aria-label="在庫状況">
          <div className="salt-stock-heading">
            <h4>STOCK</h4>
            <p>最終更新 {lastUpdated ? <time dateTime={lastUpdated}>{DATE_FORMAT.format(new Date(lastUpdated))}</time> : "—"}</p>
          </div>
          <dl className="salt-stock">
            {stockItems.filter(({ item }) => !stockOnly || isInStock(item)).map(({ product, variant, item, key, url }) => {
              const shipping = online ? item?.shipping_estimate : null;
              const label = item ? stockLabel(item) : null;
              const firstWeekStatus = online && (shipping || isInStock(item)) ? firstWeekEstimate(shipping ?? null) : null;
              return (
                <div key={key}>
                  <dt>{url ? <ExternalLink href={url} showArrow={false}>{purchaseLabel(product.name, variant)}</ExternalLink> : purchaseLabel(product.name, variant)}</dt>
                  <dd>
                    {label ? <strong className="salt-stock-status" data-status={isInStock(item) ? "available" : label === "在庫なし" ? "unavailable" : "unknown"}>{label}</strong> : "投稿なし"}
                    {item && <time dateTime={item.created_at}>{DATE_FORMAT.format(new Date(item.created_at))}</time>}
                    {shipping && <span className="salt-stock-shipping">
                      {shippingEstimateText(shipping)}
                      {shipping.condition && <><br />条件: {shipping.condition}</>}
                    </span>}
                    {firstWeekStatus && <span className="salt-stock-first-week" data-status={firstWeekStatus.status}>
                      <strong>{FIRST_WEEK_LABELS[firstWeekStatus.status]}</strong>
                      <small>{firstWeekStatus.reason}</small>
                    </span>}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      )}

      <div className="salt-store-actions">
        {inventory?.products.length ? <button type="button" onClick={() => onReport(store)}>在庫投稿</button> : null}
        {!online && <button type="button" className="salt-info-toggle" aria-expanded={infoOpen} onClick={() => setInfoOpen((value) => !value)}>{infoOpen ? "店舗情報を閉じる ∧" : "店舗情報を見る ∨"}</button>}
      </div>

      {!online && infoOpen && <div className="salt-store-info">
          <div className="salt-contact-grid">
            <section><strong>📍 住所</strong><p>{store.address || "情報なし"}</p>{store.address && <div className="salt-map-links"><ExternalLink href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`} showArrow={false}>Googleマップ</ExternalLink><ExternalLink href={`https://maps.apple.com/?q=${encodeURIComponent(store.address)}`} showArrow={false}>Appleマップ</ExternalLink></div>}</section>
            <div className="salt-contact-actions">
              <section className="salt-contact-phone"><strong>☎️ 電話番号</strong>{store.phone ? <a href={`tel:${store.phone.replace(/[^\d+]/g, "")}`}>{store.phone}</a> : <p>情報なし</p>}</section>
              {storeUrl && <div className="salt-official-link"><ExternalLink href={storeUrl} showArrow={false}>公式ページへ</ExternalLink></div>}
            </div>
          </div>
      </div>}

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
              <textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} maxLength={300} rows={3} placeholder={online ? "例) 再入荷予定、発送・お届け予定など" : "例) レジの混雑、入荷予定、売場の状況など"} />
              <small>個人情報・URLの投稿はお控えください。店舗状況は時間とともに変わるため、参考情報としてご利用ください。</small>
              {commentError && <p role="alert">{commentError}</p>}
              {commentMessage && <p role="status">{commentMessage}</p>}
              <button type="button" disabled={commentSubmitting} onClick={() => void submitComment()}>{commentSubmitting ? "投稿中…" : "コメントを投稿"}</button>
            </div>
          </div>
        )}
      </div>
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
  const [stockOnly, setStockOnly] = useState(false);
  const [billboardOnly, setBillboardOnly] = useState(false);
  const [limit, setLimit] = useState(20);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoMessage, setGeoMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [reportStore, setReportStore] = useState<Store | null>(null);
  const [reportInputs, setReportInputs] = useState<Record<string, { status: string; quantity: string }>>({});
  const reportListings = reportStore ? getListings(reportStore, inventory?.products ?? [], mode === "online") : [];
  const [reportComment, setReportComment] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  useEffect(() => {
    if (!reportMessage) return;
    const timeout = window.setTimeout(() => setReportMessage(""), 10000);
    return () => window.clearTimeout(timeout);
  }, [reportMessage]);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileError, setTurnstileError] = useState("");
  const [requestId, setRequestId] = useState("");
  const reportDialog = useRef<HTMLDialogElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const router = useRouter();
  const [commentCounts, setCommentCounts] = useState<CommentCount[]>([]);
  const reports = useMemo(() => new Map(inventory?.reports.map((item) => [stockKey(item.store_id, item.product_id, item.purchase_variant), item])), [inventory]);
  const inStockStores = useMemo(() => {
    const activeProducts = new Set(inventory?.products.map((product) => product.id));
    return new Set(inventory?.reports.filter((item) => activeProducts.has(item.product_id) && isInStock(item)
      && (item.purchase_variant || (item.store_id !== AMAZON_JAPAN_STORE_ID && item.store_id !== RAKUTEN_BOOKS_STORE_ID))).map((item) => item.store_id));
  }, [inventory]);
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
      && (!billboardOnly || store.billboard_status === "target")
      && (!stockOnly || inStockStores.has(store.id))
      && (!term || normalize([displayName(store), store.prefecture, store.city, store.address].join(" ")).includes(term))
    ).map((store) => ({ store, distance: mode === "physical" && location ? distanceKm(location.lat, location.lng, store) : null }));
    if (mode === "physical" && location) stores.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    return stores;
  }, [mode, physical, online, prefecture, query, location, billboardOnly, stockOnly, inStockStores]);

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

    const form = new FormData(event.currentTarget);
    const comment = reportComment.trim();
    const items = [];
    for (const { product, variant } of reportListings) {
      const key = stockKey(reportStore.id, product.id, variant);
      const selected = reportInputs[key];
      if (!selected?.status) continue;
      const isQuantity = selected.status === "quantity";
      const quantity = isQuantity ? Number(selected.quantity) : 0;
      if (isQuantity && (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000)) {
        return setReportError("枚数は1〜10,000の整数で入力してください。");
      }
      const prefix = key + ":";
      const includesShipping = mode === "online" && form.has(prefix + "includeShipping");
      const shippingEstimate = includesShipping ? readShippingEstimate(form, prefix) : null;
      if (includesShipping && !shippingEstimate) {
        return setReportError(purchaseLabel(product.name, variant) + "の発送・お届け目安を確認してください。");
      }
      items.push({ productId: product.id, purchaseVariant: variant, quantity, stockStatus: isQuantity ? "in_stock" : selected.status, comment, shippingEstimate });
    }
    if (!items.length) return setReportError("投稿する形態と在庫状況を選択してください。");
    if (items.some((item) => item.quantity >= 50) && !comment) {
      return setReportError("50枚以上の場合は、確認した状況をコメント欄に入力してください。");
    }

    setReportSubmitting(true);
    try {
      const response = await fetch("/api/salt-boy/inventory-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: reportStore.id, items, clientId: clientId(), requestId, turnstileToken }),
      });
      const result = await response.json() as { success?: boolean; message?: string; pendingCount?: number | null };
      if (!response.ok || !result.success) {
        setReportError(result.message || "在庫を送信できませんでした。内容を確認して再度お試しください。");
        return;
      }
      const resultMessage = result.pendingCount === 0 ? "在庫情報を投稿しました。"
        : result.pendingCount ? `在庫情報を受け付けました。うち${result.pendingCount}件は承認待ちです。`
        : "在庫情報を受け付けました。";
      setReportMessage(`${displayName(reportStore)}: ${resultMessage}`);
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
      <a className="salt-page-links" href="#salt-page-bottom">
        <span>
          <span className="salt-page-links-text">最新の在庫情報・店舗リクエスト・不具合やご要望はページ下部へ</span>{" "}
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v10m-4-4 4 4 4-4" /></svg>
        </span>
      </a>
      <InfoAccordions />
      <section id="stores" className="salt-search" aria-label="店舗検索">
        <div className="salt-section-kicker">STOCK SEARCH</div>
        <h2>🏬 店舗を探す</h2>
        <p className="salt-listing-note">オリコン集計対象の店舗を掲載しています。<br />※ヴィレッジヴァンガードのアウトレット店は、オリコン集計対象か要確認です。</p>
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
        <div className="salt-results-head">
          <div>
            <div className="salt-section-kicker">STORE RESULTS</div>
            <p className="salt-count" aria-live="polite">{matches.length.toLocaleString("ja-JP")}件{mode === "physical" && location ? " ・現在地に近い順" : ""}</p>
          </div>
          <div className="salt-result-filters" role="group" aria-label="店舗一覧の絞り込み">
            <label className="salt-stock-filter">
              <input type="checkbox" checked={billboardOnly} onChange={(event) => { setBillboardOnly(event.target.checked); setLimit(20); }} />
              Billboard対象店のみ
            </label>
            {inventory && <label className="salt-stock-filter">
              <input type="checkbox" checked={stockOnly} onChange={(event) => { setStockOnly(event.target.checked); setLimit(20); }} />
              在庫あり商品のみ表示
            </label>}
          </div>
        </div>
        {!inventory && <p className="salt-error" role="alert">SALT BOYの在庫データを取得できませんでした。時間をおいて再読み込みしてください。</p>}
        {matches.slice(0, limit).map(({ store, distance }) => <StoreCard key={`${mode}-${store.id}`} store={store} mode={mode} inventory={inventory} reports={reports} stockOnly={stockOnly} firstWeek={firstWeek.get(store.id) ?? []} commentCount={commentCountMap.get(store.id) ?? 0} onCommentsChanged={loadCommentCounts} onReport={openReport} distance={distance} />)}
        {!matches.length && <p className="salt-empty">{stockOnly ? "条件に一致する在庫ありの投稿はありません。" : "条件に一致する店舗が見つかりませんでした。"}</p>}
        {matches.length > limit && <button type="button" className="salt-more-button" onClick={() => setLimit((value) => value + 20)}>さらに20件表示</button>}
      </section>

      <section id="salt-page-bottom" aria-label="最新の在庫情報・お問い合わせ">
        <section className="salt-support salt-recent" id="latest-reports" aria-labelledby="salt-latest-title">
          <div className="salt-section-kicker">LATEST REPORTS</div>
          <h2 id="salt-latest-title">最新の在庫投稿</h2>
          {!inventory ? <p>在庫投稿を取得できませんでした。</p> : !inventory.recentReports.length ? <p>公開済みの在庫投稿はまだありません。</p> : (
            <ol>{inventory.recentReports.map((item) => {
              const store = storesById.get(item.store_id);
              return (
                <li key={item.id}>
                  <div><strong>{store ? displayName(store) : "掲載終了店舗"}</strong><span>{purchaseLabel(productsById.get(item.product_id)?.name ?? "掲載終了商品", item.purchase_variant)}{!item.purchase_variant && (item.store_id === AMAZON_JAPAN_STORE_ID || item.store_id === RAKUTEN_BOOKS_STORE_ID) ? " (特典区分不明)" : ""}</span></div>
                  <div><strong>{stockLabel(item)}</strong><time dateTime={item.created_at}>{DATE_FORMAT.format(new Date(item.created_at))}</time></div>
                  {item.comment && <p>{item.comment}</p>}
                </li>
              );
            })}</ol>
          )}
        </section>
        <StoreRequest online={mode === "online"} prefecture={prefecture} prefectures={PREFECTURE_GROUPS.flatMap((group) => group.prefectures)} />
        <FeedbackForm />
      </section>

      {reportStore && <dialog ref={reportDialog} className="salt-dialog" aria-labelledby="salt-report-title" onCancel={(event) => { event.preventDefault(); closeReport(); }}>
        <form onSubmit={(event) => void submitReport(event)}>
          <button type="button" className="salt-dialog-close" aria-label="閉じる" onClick={closeReport} disabled={reportSubmitting}>×</button>
          <div className="salt-section-kicker">INVENTORY REPORT</div>
          <h2 id="salt-report-title">在庫投稿</h2>
          <p className="salt-report-store-name">{displayName(reportStore)}</p>
          <p className="salt-report-help">投稿する商品を選んでください。複数の商品を一度に送信できます。</p>
          {mode === "physical" && <aside className="salt-report-multiple">
            <strong>複数店舗をまとめて確認・投稿される方へ</strong>
            <p>帰宅後などに複数店舗の在庫情報をまとめて投稿する場合は、各店舗のコメント欄に「店頭で確認」「電話で確認」など、確認方法を一言添えてください。</p>
          </aside>}
          <fieldset className="salt-report-products"><legend>在庫状況</legend>{reportListings.map(({ product, variant }) => {
            const key = stockKey(reportStore.id, product.id, variant);
            const title = purchaseLabel(product.name, variant);
            const selected = reportInputs[key] ?? { status: "", quantity: "" };
            return <div className="salt-report-product" key={key}>
              <label htmlFor={"salt-status-" + key}>{title}</label>
              <select id={"salt-status-" + key} value={selected.status} onChange={(event) => setReportInputs((current) => ({
                ...current, [key]: { status: event.target.value, quantity: current[key]?.quantity ?? "" },
              }))}>
                <option value="">投稿しない</option>
                {Object.entries(REPORT_OPTIONS).filter(([value]) => mode === "physical" || value !== "quantity")
                  .map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              {mode === "physical" && selected.status === "quantity" && <label className="salt-report-quantity">
                <input type="number" min="1" max="10000" step="1" inputMode="numeric" value={selected.quantity} onChange={(event) => setReportInputs((current) => ({ ...current, [key]: { ...selected, quantity: event.target.value } }))} required aria-label={title + "の在庫数"} />
                <span>枚</span>
              </label>}
              {mode === "online" && selected.status && <ShippingEstimateFields prefix={key + ":"} />}
            </div>;
          })}</fieldset>
          <label className="salt-report-comment">コメント (任意)
            <textarea value={reportComment} onChange={(event) => setReportComment(event.target.value)} maxLength={300} rows={3} placeholder={mode === "online"
              ? "再入荷や発送・お届け予定など。個人情報・URLは入力しないでください。"
              : "売場や入荷状況など。個人情報・URLは入力しないでください。"} />
            <small>{reportComment.length}/300文字</small>
          </label>
          <div className="salt-report-caution">在庫状況は投稿後に変わる場合があります。表示された在庫を保証するものではありません。来店・購入前に店舗やショップへ最新情報をご確認ください。</div>
          <div id="salt-inventory-turnstile" className="salt-turnstile" />
          {turnstileError && <p className="salt-error" role="alert">{turnstileError}</p>}
          {reportError && <p className="salt-error" role="alert">{reportError}</p>}
          <div className="salt-report-actions">
            <button type="button" className="salt-report-cancel" onClick={closeReport} disabled={reportSubmitting}>キャンセル</button>
            <button type="submit" className="salt-report-submit" disabled={reportSubmitting || !turnstileReady || !turnstileToken}>
              {reportSubmitting ? "送信中…" : "投稿する"}
            </button>
          </div>
        </form>
      </dialog>}
      {reportMessage && <p className="salt-report-result" role="status">{reportMessage}</p>}
      <a href="#top" aria-label="サイトトップへ" className="salt-back-to-top">サイト<br />トップへ</a>
    </>
  );
}
