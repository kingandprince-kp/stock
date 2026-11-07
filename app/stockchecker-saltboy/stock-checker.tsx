"use client";

import { useMemo, useRef, useState } from "react";
import type { Directory, FirstWeek, Inventory, Product, Store } from "./data";

type Props = {
  physical: Store[];
  online: Store[];
  campaign?: Directory["campaigns"][number];
  inventory: { products: Product[]; reports: Inventory[]; firstWeek: FirstWeek[] } | null;
};

const statusText: Record<string, string> = {
  in_stock: "在庫あり", low_stock: "残りわずか", sold_out: "在庫なし", backorder: "入荷待ち",
};
const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const dateFormat = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
const radians = (degrees: number) => degrees * Math.PI / 180;

function distanceKm(lat: number, lng: number, store: Store) {
  if (store.latitude == null || store.longitude == null) return null;
  const a = Math.sin(radians(store.latitude - lat) / 2) ** 2
    + Math.cos(radians(lat)) * Math.cos(radians(store.latitude)) * Math.sin(radians(store.longitude - lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1, a)));
}

function storeName(store: Store) {
  return store.chain_name && !normalize(store.name).includes(normalize(store.chain_name))
    ? `${store.chain_name} ${store.name}` : store.name;
}

function webUrl(value: string | null | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch { /* Ignore malformed links in the directory. */ }
}

export default function StockChecker({ physical, online, campaign, inventory }: Props) {
  const [mode, setMode] = useState<"physical" | "online">("physical");
  const [query, setQuery] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [serialOnly, setSerialOnly] = useState(false);
  const [limit, setLimit] = useState(20);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoMessage, setGeoMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [reportStore, setReportStore] = useState<Store | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const prefectures = useMemo(() => [...new Set(physical.map((store) => store.prefecture))], [physical]);
  const serial = useMemo(() => new Map(campaign?.matches.map((match) => [match.id, match.status])), [campaign]);
  const reports = useMemo(() => new Map(inventory?.reports.map((item) => [`${item.store_id}:${item.product_id}`, item])), [inventory]);
  const firstWeek = useMemo(() => {
    const byStore = new Map<number, FirstWeek[]>();
    for (const item of inventory?.firstWeek ?? []) {
      const items = byStore.get(item.store_id) ?? [];
      items.push(item);
      byStore.set(item.store_id, items);
    }
    return byStore;
  }, [inventory]);
  const matches = useMemo(() => {
    const term = normalize(query);
    const currentLocation = mode === "physical" ? location : null;
    const rows = (mode === "physical" ? physical : online).filter((store) =>
      (!prefecture || mode === "online" || store.prefecture === prefecture)
      && (!serialOnly || serial.get(store.id) === "target")
      && (!term || normalize([storeName(store), store.prefecture, store.city, store.address].join(" ")).includes(term))
    ).map((store) => ({ store, distance: currentLocation ? distanceKm(currentLocation.lat, currentLocation.lng, store) : null }));
    if (currentLocation) rows.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    return rows;
  }, [mode, location, physical, online, prefecture, serialOnly, serial, query]);

  function locate() {
    if (!navigator.geolocation) {
      setGeoMessage("このブラウザーでは現在地を取得できません。");
      return;
    }
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

  return (
    <>
      <section className="salt-search" aria-label="店舗を探す">
        <div className="salt-tabs" role="group" aria-label="店舗の種類">
          <button type="button" aria-pressed={mode === "physical"} onClick={() => { setMode("physical"); setLimit(20); }}>実店舗</button>
          <button type="button" aria-pressed={mode === "online"} onClick={() => { setMode("online"); setLimit(20); }}>オンラインショップ</button>
        </div>
        <div className="salt-fields">
          <label>店舗名<input value={query} onChange={(event) => { setQuery(event.target.value); setLimit(20); }} type="search" placeholder="店舗名・チェーン名で探す" /></label>
          {mode === "physical" && (
            <>
              <label>都道府県<select value={prefecture} onChange={(event) => { setPrefecture(event.target.value); setLimit(20); }}>
                <option value="">すべての都道府県</option>
                {prefectures.map((item) => <option key={item}>{item}</option>)}
              </select></label>
              <button type="button" onClick={location ? () => setLocation(null) : locate} disabled={locating}>{locating ? "現在地を取得中…" : location ? "現在地順を解除" : "現在地から探す"}</button>
            </>
          )}
        </div>
        {mode === "physical" && geoMessage && <p role="status">{geoMessage}</p>}
        {campaign && (
          <div className="salt-serial">
            <label><input type="checkbox" checked={serialOnly} onChange={(event) => { setSerialOnly(event.target.checked); setLimit(20); }} /> シリアル対象店舗のみ</label>
            <p>{campaign.notice} {webUrl(campaign.conditions_url) && <a href={webUrl(campaign.conditions_url)}>配布条件</a>}</p>
          </div>
        )}
      </section>

      <section className="salt-results" aria-label="店舗一覧">
        <p className="salt-count" aria-live="polite">{matches.length.toLocaleString("ja-JP")}件{mode === "physical" && location && " · 現在地に近い順"}</p>
        {!inventory && <p role="alert">SALT BOYの在庫データを取得できませんでした。</p>}
        {matches.slice(0, limit).map(({ store, distance }) => {
          const storeUrl = webUrl(mode === "online" ? store.online_url : store.official_url);
          return (
            <article key={store.id} className="salt-store">
              <div className="salt-store-head">
                <div>
                  <h2>{storeName(store)}</h2>
                  {store.address && <p>{store.address}{distance !== null && ` · ${distance.toFixed(1)} km`}</p>}
                  {store.business_hours && <p>営業時間 {store.business_hours}</p>}
                </div>
                <div className="salt-badges">
                  {store.oricon_target === true && <span className="salt-badge-oricon">オリコン対象</span>}
                  {store.billboard_status === "target" && <span className="salt-badge-billboard">Billboard対象</span>}
                  {store.billboard_status === "check_store" && <span>Billboard要確認</span>}
                  {store.billboard_status === "not_target" && <span>Billboard対象外</span>}
                  {serial.get(store.id) === "target" && <span className="salt-badge-serial">シリアル対象</span>}
                </div>
              </div>
              {(firstWeek.get(store.id) ?? []).map((item, index) => (
                <p key={index} className="salt-first-week">
                  初週情報 {inventory?.products.find((product) => product.id === item.product_id)?.name} {[item.cutoff_date, item.cutoff_time, item.note].filter(Boolean).join(" ")}
                </p>
              ))}
              {inventory && (
                <dl className="salt-stock">
                  {inventory.products.map((product) => {
                    const item = reports.get(`${store.id}:${product.id}`);
                    const status = item
                      ? (item.stock_status && statusText[item.stock_status]) || (item.quantity == null ? "要確認" : `在庫 ${item.quantity.toLocaleString("ja-JP")}枚`)
                      : "報告なし";
                    return <div key={product.id}><dt>{product.name}</dt><dd>{status}</dd>{item && <time dateTime={item.created_at}>{dateFormat.format(new Date(item.created_at))}</time>}</div>;
                  })}
                </dl>
              )}
              <div className="salt-actions">
                {storeUrl && <a href={storeUrl}>{mode === "online" ? "オンラインショップを開く" : "店舗公式サイト"}</a>}
                {store.phone && <a href={`tel:${store.phone.replace(/[^\d+]/g, "")}`}>{store.phone}</a>}
                {inventory?.products.length ? <button type="button" onClick={() => { setReportStore(store); dialog.current?.showModal(); }}>在庫をまとめて報告</button> : null}
              </div>
            </article>
          );
        })}
        {!matches.length && <p>条件に一致する店舗が見つかりませんでした。</p>}
        {matches.length > limit && <button type="button" onClick={() => setLimit(limit + 20)}>さらに20件表示</button>}
      </section>

      <dialog ref={dialog} className="salt-dialog" aria-labelledby="salt-report-heading">
        <form method="dialog" key={reportStore?.id}>
          <h2 id="salt-report-heading">在庫をまとめて報告</h2>
          {reportStore && <p>{storeName(reportStore)}</p>}
          <fieldset>
            <legend>形態ごとの在庫状況</legend>
            {inventory?.products.map((product) => (
              <label key={product.id}>{product.name}<select defaultValue="">
                <option value="">報告しない</option>
                {Object.entries(statusText).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select></label>
            ))}
          </fieldset>
          <p>在庫報告の送信は準備中です。</p>
          <button type="submit">閉じる</button>
        </form>
      </dialog>
    </>
  );
}
