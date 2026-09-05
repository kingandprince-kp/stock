"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/app/lib/supabase";

const GOAL = 300000;
const SHOW_GOAL_PROGRESS = false;

const PREFECTURE_GROUPS = [
  {
    region: "北海道・東北",
    prefectures: [
      "北海道",
      "青森県",
      "岩手県",
      "宮城県",
      "秋田県",
      "山形県",
      "福島県",
    ],
  },
  {
    region: "関東",
    prefectures: [
      "茨城県",
      "栃木県",
      "群馬県",
      "埼玉県",
      "千葉県",
      "東京都",
      "神奈川県",
    ],
  },
  {
    region: "中部",
    prefectures: [
      "新潟県",
      "富山県",
      "石川県",
      "福井県",
      "山梨県",
      "長野県",
      "岐阜県",
      "静岡県",
      "愛知県",
    ],
  },
  {
    region: "近畿",
    prefectures: [
      "三重県",
      "滋賀県",
      "京都府",
      "大阪府",
      "兵庫県",
      "奈良県",
      "和歌山県",
    ],
  },
  {
    region: "中国",
    prefectures: [
      "鳥取県",
      "島根県",
      "岡山県",
      "広島県",
      "山口県",
    ],
  },
  {
    region: "四国",
    prefectures: [
      "徳島県",
      "香川県",
      "愛媛県",
      "高知県",
    ],
  },
  {
    region: "九州・沖縄",
    prefectures: [
      "福岡県",
      "佐賀県",
      "長崎県",
      "熊本県",
      "大分県",
      "宮崎県",
      "鹿児島県",
      "沖縄県",
    ],
  },
];

const PREFECTURES = PREFECTURE_GROUPS.flatMap(
  (group) => group.prefectures
);

const PREFECTURE_ORDER = new Map(
  PREFECTURES.map((prefecture, index) => [
    prefecture,
    index,
  ])
);

const CHAIN_PRIORITY = [
  "タワーレコード",
  "HMV",
  "新星堂",
  "紀伊國屋書店",
  "TSUTAYA",
  "アニメイト",
  "玉光堂",
  "バンダレコード",
  "くまざわ書店",
  "ACADEMIA",
];

const ONLINE_STORE_PRIORITY: string[][] = [
  ["universal", "ユニバーサル", "store.universal-music.co.jp"],
  ["タワーレコード", "towerrecords", "towerrecord", "タワレコ", "tower.jp"],
  ["hmv", "hmv.co.jp"],
  ["楽天ブックス", "rakutenbooks"],
  ["amazon", "amazon.co.jp"],
  ["ジョーシン", "joshin", "joshinweb", "joshinweb.jp"],
  ["セブンネット", "セブンネットショッピング", "7netshopping"],
  ["ネオウィング", "neowing", "neowing.co.jp"],
  ["ビックカメラ", "biccamera", "biccamera.com"],
  ["ヤマダ", "yamada", "ウェブコム", "webcom", "yamada-denkiweb.com"],
];

const VERIFIED_ONLINE_PRODUCT_URLS: Record<
  "universal" | "tower" | "hmv" | "amazon" | "joshin" | "neowing",
  Record<number, string>
> = {
  universal: {
    1: "https://store.universal-music.co.jp/products/upcj9079",
    2: "https://store.universal-music.co.jp/products/upcj9080",
    3: "https://store.universal-music.co.jp/products/upcj9081",
    4: "https://store.universal-music.co.jp/products/upcj9082",
    5: "https://store.universal-music.co.jp/products/upcj9083",
    6: "https://store.universal-music.co.jp/products/upcj9084",
    7: "https://store.universal-music.co.jp/products/upcj9085",
    8: "https://store.universal-music.co.jp/products/d2cj12885",
    9: "https://store.universal-music.co.jp/products/d2cj12886/",
  },
  tower: {
    1: "https://tower.jp/item/8064415",
    2: "https://tower.jp/item/8064418",
    3: "https://tower.jp/item/8064419",
    4: "https://tower.jp/item/8064420",
    5: "https://tower.jp/item/8064421",
    6: "https://tower.jp/item/8064422",
    7: "https://tower.jp/item/8064424",
    8: "https://tower.jp/item/8065755",
    9: "https://tower.jp/item/8065756",
  },
  hmv: {
    1: "https://www.hmv.co.jp/artist_King-Prince_000000000744568/item_So-Honey-EP%E3%80%90%E5%88%9D%E5%9B%9E%E9%99%90%E5%AE%9A%E7%9B%A4A%E3%80%91-CD-Blu-ray_17062106",
    2: "https://www.hmv.co.jp/artist_King-Prince_000000000744568/item_So-Honey-EP%E3%80%90%E5%88%9D%E5%9B%9E%E9%99%90%E5%AE%9A%E7%9B%A4A%E3%80%91-CD-DVD_17062107",
    3: "https://www.hmv.co.jp/artist_King-Prince_000000000744568/item_So-Honey-EP%E3%80%90%E5%88%9D%E5%9B%9E%E9%99%90%E5%AE%9A%E7%9B%A4B%E3%80%91-CD-Blu-ray_17062108",
    4: "https://www.hmv.co.jp/artist_King-Prince_000000000744568/item_So-Honey-EP%E3%80%90%E5%88%9D%E5%9B%9E%E9%99%90%E5%AE%9A%E7%9B%A4B%E3%80%91-CD-DVD_17062109",
    5: "https://www.hmv.co.jp/artist_King-Prince_000000000744568/item_So-Honey-EP%E3%80%90%E5%88%9D%E5%9B%9E%E9%99%90%E5%AE%9ALIVE%E7%9B%A4%E3%80%91-CD-Blu-ray_17062110",
    6: "https://www.hmv.co.jp/artist_King-Prince_000000000744568/item_So-Honey-EP%E3%80%90%E5%88%9D%E5%9B%9E%E9%99%90%E5%AE%9ALIVE%E7%9B%A4%E3%80%91-CD-DVD_17062111",
    7: "https://www.hmv.co.jp/artist_King-Prince_000000000744568/item_So-Honey-EP%E3%80%90%E9%80%9A%E5%B8%B8%E7%9B%A4%EF%BC%9C%E5%88%9D%E5%9B%9E%E3%83%97%E3%83%AC%E3%82%B9%EF%BC%9E%E3%80%91_17062112",
    8: "https://www.hmv.co.jp/artist_King-Prince_000000000744568/item_%E3%80%8A4%E5%BD%A2%E6%85%8B%E5%90%8C%E6%99%82%E8%B3%BC%E5%85%A5%E7%89%B9%E5%85%B8%E4%BB%98Blu-ray%E3%82%BB%E3%83%83%E3%83%88%E3%80%8BSo-Honey-EP%E3%80%90%E5%88%9D%E5%9B%9E%E9%99%90%E5%AE%9A%E7%9B%A4A-%E5%88%9D%E5%9B%9E%E9%99%90%E5%AE%9A%E7%9B%A4B-%E5%88%9D%E5%9B%9E%E9%99%90%E5%AE%9ALIVE%E7%9B%A4-%E9%80%9A%E5%B8%B8%E7%9B%A4%EF%BC%9C%E5%88%9D%E5%9B%9E%E3%83%97%E3%83%AC%E3%82%B9%EF%BC%9E%E3%80%91_17062116",
    9: "https://www.hmv.co.jp/product/detail/17062117",
  },
  amazon: {
    1: "https://www.amazon.co.jp/dp/B0H6PRKJNB",
    2: "https://www.amazon.co.jp/dp/B0H6PW7STF",
    3: "https://www.amazon.co.jp/dp/B0H6PQD33G",
    4: "https://www.amazon.co.jp/dp/B0H6PN3S34",
    5: "https://www.amazon.co.jp/dp/B0H6PTB8NC",
    6: "https://www.amazon.co.jp/dp/B0H6PPWPGL",
    7: "https://www.amazon.co.jp/dp/B0H6PR6R63",
  },
  joshin: {
    1: "https://joshinweb.jp/dp/4988031882238.html",
    2: "https://joshinweb.jp/dp/4988031882252.html",
    3: "https://joshinweb.jp/dp/4988031882269.html",
    4: "https://joshinweb.jp/dp/4988031882276.html",
    5: "https://joshinweb.jp/dp/4988031882283.html",
    6: "https://joshinweb.jp/dp/4988031882290.html",
    7: "https://joshinweb.jp/dp/4988031882306.html",
  },
  neowing: {
    1: "https://www.neowing.co.jp/product/UPCJ-9079",
    2: "https://www.neowing.co.jp/product/UPCJ-9080",
    3: "https://www.neowing.co.jp/product/UPCJ-9081",
    4: "https://www.neowing.co.jp/product/UPCJ-9082",
    5: "https://www.neowing.co.jp/product/UPCJ-9083",
    6: "https://www.neowing.co.jp/product/UPCJ-9084",
    7: "https://www.neowing.co.jp/product/UPCJ-9085",
    8: "https://www.neowing.co.jp/product/NEOIKT-2103",
    9: "https://www.neowing.co.jp/product/NEOIKT-2104",
  },
};

type ProductLinkOption = {
  label: string;
  url: string;
};

const RAKUTEN_PRODUCT_LINKS: Record<number, ProductLinkOption[]> = {
  1: [
    { label: "先着特典あり", url: "https://books.rakuten.co.jp/rb/18695315/" },
    { label: "特典なし", url: "https://books.rakuten.co.jp/rb/18695306/" },
  ],
  2: [
    { label: "先着特典あり", url: "https://books.rakuten.co.jp/rb/18695316/" },
    { label: "特典なし", url: "https://books.rakuten.co.jp/rb/18695307/" },
  ],
  3: [
    { label: "先着特典あり", url: "https://books.rakuten.co.jp/rb/18695317/" },
    { label: "特典なし", url: "https://books.rakuten.co.jp/rb/18695308/" },
  ],
  4: [
    { label: "先着特典あり", url: "https://books.rakuten.co.jp/rb/18695318/" },
    { label: "特典なし", url: "https://books.rakuten.co.jp/rb/18695309/" },
  ],
  5: [
    { label: "先着特典あり", url: "https://books.rakuten.co.jp/rb/18695319/" },
    { label: "特典なし", url: "https://books.rakuten.co.jp/rb/18695310/" },
  ],
  6: [
    { label: "先着特典あり", url: "https://books.rakuten.co.jp/rb/18695320/" },
    { label: "特典なし", url: "https://books.rakuten.co.jp/rb/18695311/" },
  ],
  7: [
    { label: "先着特典あり", url: "https://books.rakuten.co.jp/rb/18695321/" },
    { label: "特典なし", url: "https://books.rakuten.co.jp/rb/18695312/" },
  ],
  8: [
    { label: "同時購入特典+先着特典あり", url: "https://books.rakuten.co.jp/rb/18695313/" },
  ],
  9: [
    { label: "同時購入特典+先着特典あり", url: "https://books.rakuten.co.jp/rb/18695314/" },
  ],
};

const SEVEN_PRODUCT_LINKS: Record<number, ProductLinkOption[]> = {
  1: [
    { label: "先着特典あり", url: "https://7net.omni7.jp/detail/1301601115.html" },
    { label: "特典なし", url: "https://7net.omni7.jp/detail/1301601124.html" },
  ],
  2: [
    { label: "先着特典あり", url: "https://7net.omni7.jp/detail/1301601116.html" },
    { label: "特典なし", url: "https://7net.omni7.jp/detail/1301601125.html" },
  ],
  3: [
    { label: "先着特典あり", url: "https://7net.omni7.jp/detail/1301601117.html" },
    { label: "特典なし", url: "https://7net.omni7.jp/detail/1301601126.html" },
  ],
  4: [
    { label: "先着特典あり", url: "https://7net.omni7.jp/detail/1301601118.html" },
    { label: "特典なし", url: "https://7net.omni7.jp/detail/1301601127.html" },
  ],
  5: [
    { label: "先着特典あり", url: "https://7net.omni7.jp/detail/1301601119.html" },
    { label: "特典なし", url: "https://7net.omni7.jp/detail/1301601128.html" },
  ],
  6: [
    { label: "先着特典あり", url: "https://7net.omni7.jp/detail/1301601120.html" },
    { label: "特典なし", url: "https://7net.omni7.jp/detail/1301601129.html" },
  ],
  7: [
    { label: "先着特典あり", url: "https://7net.omni7.jp/detail/1301601121.html" },
    { label: "特典なし", url: "https://7net.omni7.jp/detail/1301601130.html" },
  ],
  8: [
    { label: "同時購入特典+先着特典あり", url: "https://7net.omni7.jp/detail/1301601122.html" },
  ],
  9: [
    { label: "同時購入特典+先着特典あり", url: "https://7net.omni7.jp/detail/1301601123.html" },
  ],
};

type Store = {
  id: number;
  prefecture: string;
  city: string | null;
  name: string;
  chain_name: string | null;
  store_type: string | null;
  online_url: string | null;
  oricon_target: boolean | null;
  billboard_status:
    | "target"
    | "check_store"
    | "not_target"
    | null;
  address: string | null;
  phone: string | null;
  business_hours: string | null;
  official_url: string | null;
  first_week_cutoff_note: string | null;
  first_week_verified_at: string | null;
};

type Product = {
  id: number;
  name: string;
  sort_order: number | null;
  online_only: boolean;
};

type OnlineStockStatus =
  | "in_stock"
  | "low_stock"
  | "backorder"
  | "sold_out";

type PurchaseVariant = "special" | "no_special";

type InventoryReport = {
  id: number;
  store_id: number;
  product_id: number;
  quantity: number;
  stock_status: OnlineStockStatus | null;
  purchase_variant: PurchaseVariant | null;
  comment: string | null;
  created_at: string;
  is_own?: boolean;
};

type SalesSummary = {
  id: number;
  today_sales: number | null;
  weekly_sales: number | null;
  total_sales: number | null;
  goal: number;
  sales_date: string;
  week_start: string;
  week_end: string;
  updated_at: string;
};

type BillboardInfoStatus = "target" | "not_target";

type OnlineFirstWeekStatusValue = "likely" | "check" | "unlikely";

type OnlineProductFirstWeekStatusRow = {
  store_id: number;
  product_id: number;
  status: OnlineFirstWeekStatusValue;
  shipping_note: string | null;
  verified_at: string;
  shipping_type: "relative" | "date" | "other" | null;
  shipping_basis: "shipping" | "delivery" | null;
  shipping_min_days: number | null;
  shipping_max_days: number | null;
  shipping_date: string | null;
  confirmation_source: "product_page" | "cart_order" | "email" | "other" | null;
  confirmation_source_detail: string | null;
};

type OnlineFirstWeekFilter =
  | "actionable"
  | "likely"
  | "check"
  | "unlikely"
  | "all";

type StoreComment = {
  id: number;
  store_id: number;
  body: string;
  created_at: string;
  is_own: boolean;
  applause_count: number;
  applauded_by_me: boolean;
};

type PhysicalStockInput = "quantity" | "in_stock" | "sold_out";

type TodayActivity = {
  inventory_posts: number;
  updated_stores: number;
  store_comments: number;
  applause: number;
};

type StoreCommentCount = {
  store_id: number;
  comment_count: number;
};

type SearchMode = "physical" | "online";

export default function Home() {
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reports, setReports] = useState<InventoryReport[]>([]);
  const [deletingOwnReportId, setDeletingOwnReportId] =
    useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState("");

  const [searchMode, setSearchMode] =
    useState<SearchMode>("physical");
  const [prefecture, setPrefecture] = useState("全国");
  const [search, setSearch] = useState("");

  const [reportMode, setReportMode] =
    useState<SearchMode>("physical");
  const [reportPrefecture, setReportPrefecture] =
    useState("北海道");
  const [reportStoreSearch, setReportStoreSearch] =
    useState("");
  const [reportStoreId, setReportStoreId] = useState("");
  const [reportProductId, setReportProductId] = useState("");
 const [reportQuantity, setReportQuantity] = useState("");
const [reportStockStatus, setReportStockStatus] =
  useState<OnlineStockStatus>("in_stock");
const [physicalStockInput, setPhysicalStockInput] =
  useState<PhysicalStockInput>("quantity");
const [reportPurchaseVariant, setReportPurchaseVariant] =
  useState<PurchaseVariant>("special");
const [reportShippingEnabled, setReportShippingEnabled] = useState(false);
const [reportShippingBasis, setReportShippingBasis] = useState<"shipping" | "delivery">("shipping");
const [reportShippingMode, setReportShippingMode] =
  useState<"range" | "date" | "other">("range");
const [reportShippingMinDays, setReportShippingMinDays] = useState("0");
const [reportShippingMaxDays, setReportShippingMaxDays] = useState("1");
const [reportShippingDate, setReportShippingDate] = useState("");
const [reportShippingOther, setReportShippingOther] = useState("");
const [reportShippingCondition, setReportShippingCondition] = useState("");
const [reportShippingSource, setReportShippingSource] = useState("product_page");
const [reportShippingSourceDetail, setReportShippingSourceDetail] = useState("");
const [reportComment, setReportComment] = useState("");

const [turnstileToken, setTurnstileToken] =
  useState("");

const [turnstileReady, setTurnstileReady] =
  useState(false);

const turnstileWidgetIdRef =
  useRef<string | null>(null);

const [submitting, setSubmitting] = useState(false);
const [submitMessage, setSubmitMessage] = useState("");
const [submitError, setSubmitError] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestChainName, setRequestChainName] = useState("");
  const [requestCity, setRequestCity] = useState("");
  const [requestComment, setRequestComment] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestError, setRequestError] = useState("");
  const [salesData, setSalesData] =
  useState<SalesSummary | null>(null);
  const [onlineProductFirstWeekStatuses, setOnlineProductFirstWeekStatuses] =
    useState<OnlineProductFirstWeekStatusRow[]>([]);
  const [onlineFirstWeekFilter, setOnlineFirstWeekFilter] =
    useState<OnlineFirstWeekFilter>("all");
  const [stockOnly, setStockOnly] = useState(false);
  const [xShareOpen, setXShareOpen] = useState(false);
  const [storeCommentCounts, setStoreCommentCounts] =
    useState<StoreCommentCount[]>([]);
  const [todayActivity, setTodayActivity] =
    useState<TodayActivity | null>(null);
  const [bugReportOpen, setBugReportOpen] = useState(false);
const [bugReportType, setBugReportType] = useState<"bug" | "request">("bug");
const [bugDescription, setBugDescription] = useState("");
const [bugDeviceType, setBugDeviceType] = useState("");
const [bugDeviceModel, setBugDeviceModel] = useState("");
const [bugOsType, setBugOsType] = useState("");
const [bugOsVersion, setBugOsVersion] = useState("");
const [bugOsDisplay, setBugOsDisplay] = useState("");
const [bugBrowser, setBugBrowser] = useState("");
const [bugBrowserOther, setBugBrowserOther] = useState("");
const [bugBrowserVersion, setBugBrowserVersion] = useState("");
const [bugImages, setBugImages] = useState<File[]>([]);

const [bugSubmitting, setBugSubmitting] = useState(false);
const [bugMessage, setBugMessage] = useState("");
const [bugError, setBugError] = useState("");
const [bugAutoDetect, setBugAutoDetect] = useState(false);

  // Android Chromium系ブラウザだけ、半透明の白背景・backdrop-filterを避ける
  // PC / iPhone / iPad では false のままなので、従来の見た目を維持する
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    setIsAndroid(/Android/i.test(navigator.userAgent));
  }, []);

  // 管理者向けアクセス集計。IPアドレスは保存せず、
  // ブラウザ識別子は日別ユニーク数の重複判定にだけ使用する。
  useEffect(() => {
    async function recordPageAccess() {
      try {
        let clientId = localStorage.getItem("kp_inventory_client_id");

        if (!clientId) {
          clientId = crypto.randomUUID();
          localStorage.setItem("kp_inventory_client_id", clientId);
        }

        const { error } = await supabase.rpc("record_page_access", {
          p_path: window.location.pathname,
          p_client_id: clientId,
        });

        if (error) {
          console.error("record_page_access error:", error);
        }
      } catch (error) {
        console.error("record_page_access error:", error);
      }
    }

    void recordPageAccess();
  }, []);

  useEffect(() => {
  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!siteKey) {
    console.error(
      "NEXT_PUBLIC_TURNSTILE_SITE_KEY is not configured."
    );
    return;
  }

  const renderTurnstile = () => {
    const turnstile = (
      window as typeof window & {
        turnstile?: {
          render: (
            selector: string,
            options: {
              sitekey: string;
              action: string;
              callback: (token: string) => void;
              "expired-callback": () => void;
              "error-callback": () => void;
            }
          ) => string;
          reset: (widgetId?: string) => void;
        };
      }
    ).turnstile;

    if (!turnstile) return;

    if (turnstileWidgetIdRef.current) return;

    const target =
      document.querySelector("#inventory-turnstile");

    if (!target) return;

    turnstileWidgetIdRef.current =
      turnstile.render("#inventory-turnstile", {
        sitekey: siteKey,
        action: "inventory_report",
        callback: (token) => {
          setTurnstileToken(token);
          setTurnstileReady(true);
        },
        "expired-callback": () => {
          setTurnstileToken("");
          setTurnstileReady(false);
        },
        "error-callback": () => {
          setTurnstileToken("");
          setTurnstileReady(false);
        },
      });
  };

  const existingScript =
    document.querySelector<HTMLScriptElement>(
      'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"]'
    );

  if (existingScript) {
    if (
      (
        window as typeof window & {
          turnstile?: unknown;
        }
      ).turnstile
    ) {
      renderTurnstile();
    } else {
      existingScript.addEventListener(
        "load",
        renderTurnstile,
        { once: true }
      );
    }

    return;
  }

  const script = document.createElement("script");

  script.src =
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

  script.async = true;
  script.defer = true;

  script.addEventListener(
    "load",
    renderTurnstile,
    { once: true }
  );

  document.head.appendChild(script);
}, []);

 const sales = salesData?.total_sales ?? null;
const today = salesData?.today_sales ?? null;
const week = salesData?.weekly_sales ?? null;
const goal = salesData?.goal ?? GOAL;

const salesDateLabel =
  salesData?.sales_date
    ? `${formatShortSalesDate(
        salesData.sales_date
      )}付`
    : "本日";

const salesWeekLabel =
  salesData?.week_start &&
  salesData?.week_end
    ? `${formatShortSalesDate(
        salesData.week_start
      )}〜${formatShortSalesDate(
        salesData.week_end
      )}`
    : "今週";

const salesForProgress = sales ?? 0;

const remain = Math.max(
  goal - salesForProgress,
  0
);

const percent =
  goal > 0
    ? Math.min(
        (salesForProgress / goal) * 100,
        100
      )
    : 0;

  const loadInventoryReports = useCallback(async () => {
    try {
      const clientId =
        typeof window !== "undefined"
          ? localStorage.getItem("kp_inventory_client_id")
          : null;

      const query = clientId
        ? `?clientId=${encodeURIComponent(clientId)}`
        : "";

      const response = await fetch(
        `/api/inventory-report${query}`,
        { cache: "no-store" }
      );

      const result = (await response.json()) as {
        success?: boolean;
        reports?: InventoryReport[];
      };

      if (!response.ok || !result.success) {
        console.error("inventory_reports load error");
        return;
      }

      setReports(result.reports ?? []);
    } catch (error) {
      console.error("inventory_reports load error:", error);
    }
  }, []);

  const loadTodayActivity = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_today_community_activity");

    if (error) {
      console.error("today activity load error:", error);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return;

    setTodayActivity({
      inventory_posts: Number(row.inventory_posts ?? 0),
      updated_stores: Number(row.updated_stores ?? 0),
      store_comments: Number(row.store_comments ?? 0),
      applause: Number(row.applause ?? 0),
    });
  }, []);

  const loadSalesData = useCallback(async () => {
  const { data, error } = await supabase.rpc(
    "get_sales_summary_v2"
  );

  if (error) {
    console.error("get_sales_summary error:", error);
    return;
  }

  const latest =
    Array.isArray(data) && data.length > 0
      ? (data[0] as SalesSummary)
      : null;

  setSalesData(latest);
}, []);

const loadOnlineProductFirstWeekStatuses = useCallback(async () => {
  const { data, error } = await supabase.rpc(
    "get_online_product_first_week_statuses"
  );

  if (error) {
    console.error("get_online_product_first_week_statuses error:", error);
    return;
  }

  setOnlineProductFirstWeekStatuses(
    (data ?? []) as OnlineProductFirstWeekStatusRow[]
  );
}, []);

const loadStoreCommentCounts = useCallback(async () => {
  const { data, error } = await supabase.rpc(
    "get_store_comment_counts"
  );

  if (error) {
    console.error("get_store_comment_counts error:", error);
    return;
  }

  setStoreCommentCounts(
    (data ?? []) as StoreCommentCount[]
  );
}, []);

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      setDataError("");

      const [storesResult, productsResult] = await Promise.all([
        supabase
          .from("stores")
          .select(`
            id,
            prefecture,
            city,
            name,
            chain_name,
            store_type,
            online_url,
            oricon_target,
            billboard_status,
            address,
            phone,
            business_hours,
            official_url,
            first_week_cutoff_note,
            first_week_verified_at
          `)
          .eq("is_active", true)
          .limit(2000),

        supabase
          .from("products")
          .select("id, name, sort_order, online_only")
          .order("sort_order", { ascending: true }),
      ]);

      if (storesResult.error) {
        setDataError(
          `店舗データを読み込めませんでした: ${storesResult.error.message}`
        );
        setLoading(false);
        return;
      }

      if (productsResult.error) {
        setDataError(
          `商品データを読み込めませんでした: ${productsResult.error.message}`
        );
        setLoading(false);
        return;
      }

      const loadedStores =
        (storesResult.data ?? []) as Store[];

      const loadedProducts =
        (productsResult.data ?? []) as Product[];

      setStores(loadedStores);
      setProducts(loadedProducts);

      if (loadedProducts.length > 0) {
        setReportProductId(String(loadedProducts[0].id));
      }

      await Promise.all([
  loadInventoryReports(),
  loadSalesData(),
  loadOnlineProductFirstWeekStatuses(),
  loadStoreCommentCounts(),
        loadTodayActivity(),
]);

setLoading(false);
    }

    loadInitialData();
  }, [
    loadInventoryReports,
    loadSalesData,
    loadOnlineProductFirstWeekStatuses,
    loadStoreCommentCounts,
  ]);

  const physicalStores = useMemo(() => {
    return stores.filter(
      (store) =>
        store.store_type !== "online" &&
        store.prefecture !== "オンライン"
    );
  }, [stores]);

  const onlineStores = useMemo(() => {
    return stores.filter(
      (store) =>
        store.store_type === "online" ||
        store.prefecture === "オンライン"
    );
  }, [stores]);

  const visibleStores = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (searchMode === "online") {
      return [...onlineStores]
        .filter((store) => {
          if (!keyword) return true;

          return (
            getDisplayStoreName(store)
              .toLowerCase()
              .includes(keyword) ||
            store.name.toLowerCase().includes(keyword) ||
            (store.chain_name ?? "")
              .toLowerCase()
              .includes(keyword)
          );
        })
        .sort(compareOnlineStores);
    }

    return [...physicalStores]
      .filter((store) => {
        const matchPrefecture =
          prefecture === "全国" ||
          store.prefecture === prefecture;

        const matchSearch =
          !keyword ||
          getDisplayStoreName(store)
            .toLowerCase()
            .includes(keyword) ||
          store.name.toLowerCase().includes(keyword) ||
          (store.chain_name ?? "")
            .toLowerCase()
            .includes(keyword) ||
          (store.city ?? "")
            .toLowerCase()
            .includes(keyword) ||
          (store.address ?? "")
            .toLowerCase()
            .includes(keyword);

        return matchPrefecture && matchSearch;
      })
      .sort((a, b) =>
        comparePhysicalStores(a, b, prefecture)
      );
  }, [
    physicalStores,
    onlineStores,
    searchMode,
    prefecture,
    search,
  ]);

  const reportProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          reportMode === "online" || !product.online_only
      ),
    [products, reportMode]
  );

  useEffect(() => {
    if (
      reportProducts.length > 0 &&
      !reportProducts.some(
        (product) => String(product.id) === reportProductId
      )
    ) {
      setReportProductId(String(reportProducts[0].id));
    }
  }, [reportProducts, reportProductId]);

  const reportCandidates = useMemo(() => {
    const keyword =
      reportStoreSearch.trim().toLowerCase();

    const baseStores =
      reportMode === "online"
        ? onlineStores
        : physicalStores.filter(
            (store) => store.prefecture === reportPrefecture
          );

    return [...baseStores]
      .filter((store) => {
        if (!keyword) return true;

        return (
          getDisplayStoreName(store)
            .toLowerCase()
            .includes(keyword) ||
          store.name.toLowerCase().includes(keyword) ||
          (store.chain_name ?? "")
            .toLowerCase()
            .includes(keyword) ||
          (store.city ?? "")
            .toLowerCase()
            .includes(keyword)
        );
      })
      .sort(
        reportMode === "online"
          ? compareOnlineStores
          : (a, b) =>
              comparePhysicalStores(
                a,
                b,
                reportPrefecture
              )
      );
  }, [
    reportMode,
    reportPrefecture,
    reportStoreSearch,
    physicalStores,
    onlineStores,
  ]);

  const latestReportMap = useMemo(() => {
    const map = new Map<string, InventoryReport>();

    for (const report of reports) {
      const variantKey = report.purchase_variant ?? "default";
      const variantMapKey = `${report.store_id}-${report.product_id}-${variantKey}`;
      if (!map.has(variantMapKey)) {
        map.set(variantMapKey, report);
      }

      const genericKey = `${report.store_id}-${report.product_id}`;
      if (!map.has(genericKey)) {
        map.set(genericKey, report);
      }
    }

    return map;
  }, [reports]);

  const onlineProductFirstWeekStatusMap = useMemo(() => {
    const map = new Map<string, OnlineProductFirstWeekStatusRow>();
    for (const item of onlineProductFirstWeekStatuses) {
      map.set(`${item.store_id}-${item.product_id}`, item);
    }
    return map;
  }, [onlineProductFirstWeekStatuses]);

  const matchesOnlineFirstWeekFilter = useCallback(
    (
      status: OnlineProductFirstWeekStatusRow | null,
      filter: OnlineFirstWeekFilter
    ) => {
      const value = status?.status ?? "check";
      if (filter === "all") return true;
      if (filter === "actionable") return value !== "unlikely";
      return value === filter;
    },
    []
  );

  const displayedStores = useMemo(() => {
    const filteredByFirstWeek =
      searchMode !== "online"
        ? visibleStores
        : visibleStores.filter((store) =>
            products.some((product) =>
              matchesOnlineFirstWeekFilter(
                onlineProductFirstWeekStatusMap.get(
                  `${store.id}-${product.id}`
                ) ?? null,
                onlineFirstWeekFilter
              )
            )
          );

    const filteredByStock = !stockOnly
      ? filteredByFirstWeek
      : filteredByFirstWeek.filter((store) => {
          const online = isOnlineStore(store);
          const candidateProducts = online
            ? products.filter((product) =>
                matchesOnlineFirstWeekFilter(
                  onlineProductFirstWeekStatusMap.get(
                    `${store.id}-${product.id}`
                  ) ?? null,
                  onlineFirstWeekFilter
                )
              )
            : products.filter((product) => !product.online_only);

          return candidateProducts.some((product) =>
            isInventoryReportInStock(
              latestReportMap.get(`${store.id}-${product.id}`) ?? null,
              online
            )
          );
        });

    if (searchMode !== "online") return filteredByStock;

    // オンライン店舗は指定された固定順を最優先する。
    // 初週判定(likely/check/unlikely)では店舗自体の並び順を変えない。
    return [...filteredByStock].sort(compareOnlineStores);
  }, [
    searchMode,
    visibleStores,
    products,
    latestReportMap,
    onlineProductFirstWeekStatusMap,
    onlineFirstWeekFilter,
    stockOnly,
    matchesOnlineFirstWeekFilter,
  ]);

  const storeCommentCountMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of storeCommentCounts) {
      map.set(item.store_id, Number(item.comment_count) || 0);
    }
    return map;
  }, [storeCommentCounts]);

  const latestFiveReports = reports.slice(0, 5);

  const getLatestReport = (
    storeId: number,
    productId: number,
    purchaseVariant?: PurchaseVariant | "unknown"
  ) => {
    if (purchaseVariant === "unknown") {
      return latestReportMap.get(`${storeId}-${productId}-default`) ?? null;
    }
    if (purchaseVariant) {
      return latestReportMap.get(`${storeId}-${productId}-${purchaseVariant}`) ?? null;
    }
    return latestReportMap.get(`${storeId}-${productId}`) ?? null;
  };

  const getStoreName = (storeId: number) => {
    const store = stores.find((item) => item.id === storeId);

    return store ? getDisplayStoreName(store) : "店舗不明";
  };

  const getProductName = (productId: number) =>
    products.find((product) => product.id === productId)
      ?.name ?? "商品不明";

  const selectedReportStore =
    stores.find(
      (store) => String(store.id) === reportStoreId
    ) ?? null;

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));

 async function handleSubmitReport() {
   setSubmitMessage("");
   setSubmitError("");

   if (!reportStoreId) {
     setSubmitError("店舗を選択してください。");
     return;
   }

   if (!reportProductId) {
     setSubmitError("商品を選択してください。");
     return;
   }

   const online = reportMode === "online";
   const selectedProduct =
     products.find((product) => String(product.id) === reportProductId) ?? null;
   const rakutenVariantRequired =
     online &&
     selectedReportStore !== null &&
     selectedProduct !== null &&
     hasPurchaseVariantLinks(selectedReportStore, selectedProduct);

   let quantity = 0;

   if (!online && physicalStockInput === "quantity") {
     if (reportQuantity.trim() === "") {
       setSubmitError("在庫枚数を入力してください。");
       return;
     }

     quantity = Number(reportQuantity);

     if (
       !Number.isInteger(quantity) ||
       quantity < 0 ||
       quantity > 100
     ) {
       setSubmitError(
         "在庫枚数は0〜100の整数で入力してください。"
       );
       return;
     }
   }

   if (reportComment.length > 500) {
     setSubmitError(
       "コメントは500文字以内で入力してください。"
     );
     return;
   }

   if (
     !online &&
     physicalStockInput === "quantity" &&
     quantity >= 50 &&
     reportComment.trim() === ""
   ) {
     setSubmitError(
       "50枚以上の在庫情報は確認のためコメント入力が必要です。入荷状況や店頭で確認できた内容をご記入ください。"
     );
     return;
   }

   if (online && reportShippingEnabled) {
     if (reportShippingBasis === "delivery" && reportShippingMode === "range") {
       setSubmitError("お届け目安は日付またはその他を選択してください。");
       return;
     }

     if (reportShippingMode === "range") {
       const minDays = Number(reportShippingMinDays);
       const maxDays = Number(reportShippingMaxDays);

       if (
         !Number.isInteger(minDays) ||
         !Number.isInteger(maxDays) ||
         minDays < 0 ||
         maxDays < 0 ||
         minDays > 4 ||
         maxDays > 4
       ) {
         setSubmitError("発送目安の日数を選び直してください。");
         return;
       }

       if (maxDays < minDays) {
         setSubmitError("発送目安の「まで」は「から」以上の日数を選んでください。");
         return;
       }
     }

     if (reportShippingMode === "date" && !reportShippingDate) {
       setSubmitError(reportShippingBasis === "delivery" ? "お届け予定日を入力してください。" : "発送予定日を入力してください。");
       return;
     }

     if (reportShippingMode === "other" && !reportShippingOther.trim()) {
       setSubmitError(reportShippingBasis === "delivery" ? "表示されているお届け案内を入力してください。" : "表示されている発送案内を入力してください。");
       return;
     }

     if (reportShippingSource === "other" && !reportShippingSourceDetail.trim()) {
       setSubmitError("確認場所を入力してください。");
       return;
     }
   }

   if (!turnstileReady || !turnstileToken) {
     setSubmitError(
       "Bot確認が完了していません。少し待ってからもう一度お試しください。"
     );
     return;
   }

   setSubmitting(true);

   try {
     let clientId = localStorage.getItem(
       "kp_inventory_client_id"
     );

     if (!clientId) {
       clientId = crypto.randomUUID();
       localStorage.setItem(
         "kp_inventory_client_id",
         clientId
       );
     }

     const response = await fetch(
       "/api/inventory-report",
       {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
         },
         body: JSON.stringify({
           storeId: Number(reportStoreId),
           productId: Number(reportProductId),
           quantity: online ? undefined : quantity,
           stockStatus: online
             ? reportStockStatus
             : physicalStockInput === "quantity"
             ? undefined
             : physicalStockInput,
           purchaseVariant:
             rakutenVariantRequired
               ? reportPurchaseVariant
               : undefined,
           comment:
             reportComment.trim() === ""
               ? null
               : reportComment.trim(),
           clientId,
           turnstileToken,
         }),
       }
     );

     const result = (await response.json()) as {
       success?: boolean;
       message?: string;
       reportId?: number;
     };

     const turnstile = (
       window as typeof window & {
         turnstile?: {
           reset: (widgetId?: string) => void;
         };
       }
     ).turnstile;

     if (turnstile && turnstileWidgetIdRef.current) {
       turnstile.reset(turnstileWidgetIdRef.current);
     }

     setTurnstileToken("");
     setTurnstileReady(false);

     if (!response.ok || !result.success) {
       setSubmitError(
         result.message ||
           "投稿に失敗しました。もう一度お試しください。"
       );
       return;
     }

     if (online && reportShippingEnabled) {
       const range =
         reportShippingMode === "range"
           ? [
               Number(reportShippingMinDays),
               Number(reportShippingMaxDays),
             ]
           : null;
       const shippingType =
         reportShippingMode === "date"
           ? "date"
           : reportShippingMode === "other"
             ? "other"
             : "relative";
       const detail =
         reportShippingMode === "other"
           ? reportShippingOther.trim()
           : reportShippingCondition.trim();

       const { error: shippingError } = await supabase.rpc("submit_store_info_request_v3", {
         p_store_id: Number(reportStoreId), p_request_type: "online_product_first_week", p_product_id: Number(reportProductId),
         p_detail: detail, p_evidence: null, p_client_id: clientId, p_shipping_type: shippingType, p_shipping_basis: reportShippingBasis,
         p_shipping_min_days: range ? range[0] : null, p_shipping_max_days: range ? range[1] : null,
         p_shipping_date: reportShippingMode === "date" ? reportShippingDate : null,
         p_confirmation_source: reportShippingSource, p_confirmation_source_detail: reportShippingSourceDetail.trim() || null,
       });
       if (shippingError) {
         console.error("shipping info submit error:", shippingError);
         setSubmitMessage("在庫情報は投稿できました。発送・お届け目安だけ送信できなかったため、必要であればもう一度お試しください。");
       } else {
         setSubmitMessage("在庫情報と発送・お届け目安を投稿しました。ありがとうございます!");
       }
     } else {
       setSubmitMessage("在庫情報を投稿しました。在庫チェッカーへのご協力、ありがとうございます!");
     }

     setReportQuantity("");
     setPhysicalStockInput("quantity");
     setReportStockStatus("in_stock");
     setReportPurchaseVariant("special");
     setReportShippingEnabled(false);
     setReportShippingMode("range");
     setReportShippingMinDays("0");
     setReportShippingMaxDays("1");
     setReportShippingDate("");
     setReportShippingOther("");
     setReportShippingCondition("");
     setReportShippingSource("product_page");
     setReportShippingSourceDetail("");
     setReportComment("");
     await Promise.all([
       loadInventoryReports(),
       loadOnlineProductFirstWeekStatuses(),
     ]);
   } catch (error) {
     console.error(error);
     setSubmitError(
       "投稿中にエラーが発生しました。もう一度お試しください。"
     );
   } finally {
     setSubmitting(false);
   }
 }

 async function handleDeleteOwnReport(reportId: number) {
   const confirmed = window.confirm(
     "この在庫投稿を削除しますか？\n削除すると在庫一覧から取り消されます。"
   );

   if (!confirmed) return;

   setDeletingOwnReportId(reportId);

   try {
     const clientId =
       localStorage.getItem("kp_inventory_client_id");

     if (!clientId) {
       window.alert(
         "このブラウザから投稿したことを確認できませんでした。"
       );
       return;
     }

     const response = await fetch(
       "/api/inventory-report/delete",
       {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
         },
         body: JSON.stringify({
           reportId,
           clientId,
         }),
       }
     );

     const result = (await response.json()) as {
       success?: boolean;
       message?: string;
     };

     if (!response.ok || !result.success) {
       window.alert(
         result.message ||
           "投稿を削除できませんでした。"
       );
       return;
     }

     await loadInventoryReports();
   } catch (error) {
     console.error(error);
     window.alert(
       "削除中にエラーが発生しました。もう一度お試しください。"
     );
   } finally {
     setDeletingOwnReportId(null);
   }
 }


async function handleStoreRequest() {
  setRequestMessage("");
  setRequestError("");

  if (requestName.trim() === "") {
    setRequestError("店舗名を入力してください。");
    return;
  }

  if (requestName.trim().length > 150) {
    setRequestError("店舗名は150文字以内で入力してください。");
    return;
  }

  if (requestCity.trim().length > 100) {
    setRequestError("市区町村は100文字以内で入力してください。");
    return;
  }

  if (requestChainName.trim().length > 100) {
    setRequestError("チェーン名は100文字以内で入力してください。");
    return;
  }

  if (requestComment.length > 500) {
    setRequestError("コメントは500文字以内で入力してください。");
    return;
  }

  setRequestSubmitting(true);

  try {
    let clientId = localStorage.getItem(
      "kp_inventory_client_id"
    );

    if (!clientId) {
      clientId = crypto.randomUUID();

      localStorage.setItem(
        "kp_inventory_client_id",
        clientId
      );
    }

    const { error } = await supabase.rpc(
      "submit_store_request",
      {
        p_prefecture:
          reportMode === "online"
            ? "オンライン"
            : reportPrefecture,

        p_city:
          reportMode === "online"
            ? null
            : requestCity.trim() === ""
              ? null
              : requestCity.trim(),

        p_name: requestName.trim(),

        p_chain_name:
          requestChainName.trim() === ""
            ? null
            : requestChainName.trim(),

        p_comment:
          requestComment.trim() === ""
            ? null
            : requestComment.trim(),

        p_client_id: clientId,
      }
    );

    if (error) {
      console.error(
        "submit_store_request error:",
        error
      );

      setRequestError(error.message);
      return;
    }

    setRequestMessage(
      "店舗追加リクエストを送信しました。管理者が確認後、追加します。"
    );

    setRequestName("");
    setRequestChainName("");
    setRequestCity("");
    setRequestComment("");
  } catch (error) {
    console.error(error);

    setRequestError(
      "リクエスト送信中にエラーが発生しました。もう一度お試しください。"
    );
  } finally {
    setRequestSubmitting(false);
  }
}

function handleBugOsDisplayChange(value: string) {
  setBugOsDisplay(value);

  const trimmed = value.trim();

  if (trimmed === "") {
    setBugOsType("");
    setBugOsVersion("");
    return;
  }

  const patterns: Array<[RegExp, string]> = [
    [/^iPadOS\s*/i, "iPadOS"],
    [/^iOS\s*/i, "iOS"],
    [/^Android\s*/i, "Android"],
    [/^Windows\s*/i, "Windows"],
    [/^macOS\s*/i, "macOS"],
    [/^Ubuntu\s*/i, "Ubuntu"],
    [/^Linux\s*/i, "Linux"],
  ];

  for (const [pattern, osType] of patterns) {
    if (pattern.test(trimmed)) {
      setBugOsType(osType);
      setBugOsVersion(trimmed.replace(pattern, "").trim());
      return;
    }
  }

  setBugOsType("その他");
  setBugOsVersion(trimmed);
}

async function detectBugEnvironment() {
  if (typeof window === "undefined") return;

  const ua = navigator.userAgent;
  let browserVersion = "";

  // 端末種類だけを自動判定する。
  // 具体的な機種名はブラウザから正確に取得できない場合があるため自動入力しない。
  if (/iPhone/i.test(ua)) {
    setBugDeviceType("iPhone");
  } else if (/iPad/i.test(ua)) {
    setBugDeviceType("iPad");
  } else if (/Android/i.test(ua)) {
    setBugDeviceType("Android");
  } else {
    setBugDeviceType("PC");
  }

  // OSの種類だけを自動判定する。
  // OSバージョンはUser-Agentが実際と異なる値を返す場合があるため自動入力しない。
  if (/iPhone/i.test(ua)) {
    setBugOsType("iOS");
    setBugOsVersion("");
    setBugOsDisplay("iOS");
  } else if (/iPad/i.test(ua)) {
    setBugOsType("iPadOS");
    setBugOsVersion("");
    setBugOsDisplay("iPadOS");
  } else if (/Android/i.test(ua)) {
    setBugOsType("Android");
    setBugOsVersion("");
    setBugOsDisplay("Android");
  } else if (/Windows/i.test(ua)) {
    setBugOsType("Windows");
    setBugOsVersion("");
    setBugOsDisplay("Windows");
  } else if (/Mac OS X|Macintosh/i.test(ua)) {
    setBugOsType("macOS");
    setBugOsVersion("");
    setBugOsDisplay("macOS");
  } else if (/Linux/i.test(ua)) {
    setBugOsType("Linux");
    setBugOsVersion("");
    setBugOsDisplay("Linux");
  } else {
    setBugOsType("");
    setBugOsVersion("");
    setBugOsDisplay("");
  }

  // ブラウザ・ブラウザバージョン
  const braveNavigator = navigator as Navigator & {
    brave?: {
      isBrave?: () => Promise<boolean>;
    };
  };

  let isBraveBrowser = false;

  try {
    if (braveNavigator.brave?.isBrave) {
      isBraveBrowser =
        await braveNavigator.brave.isBrave();
    }
  } catch {
    isBraveBrowser = false;
  }

  if (isBraveBrowser) {
    setBugBrowser("Brave");

    // Brave固有のバージョンではなくChromium側の値になる場合がある。
    const match = ua.match(/Chrome\/([\d.]+)/i);
    browserVersion = match?.[1] ?? "";
  } else if (/EdgA|EdgiOS|Edg/i.test(ua)) {
    setBugBrowser("Edge");

    const match = ua.match(
      /(?:EdgA|EdgiOS|Edg)\/([\d.]+)/i
    );
    browserVersion = match?.[1] ?? "";
  } else if (/OPR|Opera/i.test(ua)) {
    setBugBrowser("Opera");

    const match = ua.match(
      /(?:OPR|Opera)\/([\d.]+)/i
    );
    browserVersion = match?.[1] ?? "";
  } else if (/FxiOS|Firefox/i.test(ua)) {
    setBugBrowser("Firefox");

    const match = ua.match(
      /(?:FxiOS|Firefox)\/([\d.]+)/i
    );
    browserVersion = match?.[1] ?? "";
  } else if (/CriOS|Chrome/i.test(ua)) {
    setBugBrowser("Chrome");

    const match = ua.match(
      /(?:CriOS|Chrome)\/([\d.]+)/i
    );
    browserVersion = match?.[1] ?? "";
  } else if (/Safari/i.test(ua)) {
    setBugBrowser("Safari");

    const match = ua.match(/Version\/([\d.]+)/i);
    browserVersion = match?.[1] ?? "";
  } else {
    setBugBrowser("");
  }

  setBugBrowserVersion(browserVersion);
}

async function handleBugReport() {
  setBugMessage("");
  setBugError("");

  if (bugDescription.trim() === "") {
    setBugError(
      bugReportType === "bug"
        ? "不具合内容を入力してください。"
        : "ご要望内容を入力してください。"
    );
    return;
  }

  if (
    bugReportType === "bug" &&
    bugDeviceType.trim() === ""
  ) {
    setBugError("端末種類を選択してください。");
    return;
  }

  if (
    bugReportType === "bug" &&
    bugOsType.trim() === ""
  ) {
    setBugError("OS種類を入力してください。");
    return;
  }

  if (
    bugBrowser === "その他" &&
    bugBrowserOther.trim() === ""
  ) {
    setBugError("ブラウザ名を入力してください。");
    return;
  }

  if (bugImages.length > 5) {
    setBugError("画像は5枚まで添付できます。");
    return;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ];

  for (const image of bugImages) {
    if (image.size > 5 * 1024 * 1024) {
      setBugError("画像は1枚につき5MB以内で添付してください。");
      return;
    }

    if (
      image.type &&
      !allowedTypes.includes(image.type)
    ) {
      setBugError(
        "画像はJPEG・PNG・WebP・HEIC形式で添付してください。"
      );
      return;
    }
  }

  setBugSubmitting(true);

  try {
    const imagePaths: string[] = [];

    for (const image of bugImages) {
      const extension =
        image.name.split(".").pop()?.toLowerCase() || "jpg";

      const fileName =
        `${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("bug-report-images")
        .upload(fileName, image, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error(
          "bug image upload error:",
          uploadError
        );

        setBugError(
          "画像のアップロードに失敗しました。画像を減らすか、画像なしで再度お試しください。"
        );
        return;
      }

      imagePaths.push(fileName);
    }

    const browserName =
      bugBrowser === "その他"
        ? bugBrowserOther.trim()
        : bugBrowser.trim();

    const { error } = await supabase
      .from("bug_reports")
      .insert({
        issue_description:
          `${bugReportType === "request" ? "[要望] " : "[不具合] "}${bugDescription.trim()}`,
        device_type:
          bugDeviceType.trim() === ""
            ? "未入力"
            : bugDeviceType.trim(),
        device_model:
          bugDeviceModel.trim() === ""
            ? null
            : bugDeviceModel.trim(),
        os_type:
          bugOsType.trim() === ""
            ? "未入力"
            : bugOsType.trim(),
        os_version:
          bugOsVersion.trim() === ""
            ? null
            : bugOsVersion.trim(),
        browser:
          browserName === ""
            ? null
            : browserName,
        browser_other:
          bugBrowser === "その他" &&
          bugBrowserOther.trim() !== ""
            ? bugBrowserOther.trim()
            : null,
        browser_version:
          bugBrowserVersion.trim() === ""
            ? null
            : bugBrowserVersion.trim(),
        image_url: imagePaths[0] ?? null,
        image_urls:
          imagePaths.length > 0
            ? imagePaths
            : null,
        supplemental_comment: null,
        page_path:
          typeof window !== "undefined"
            ? window.location.pathname
            : "/so-honey",
      });

    if (error) {
      console.error("bug_reports insert error:", error);

      setBugError(
        "送信に失敗しました。少し時間をおいてからもう一度お試しください。"
      );
      return;
    }

    setBugMessage(
      bugReportType === "bug"
        ? "不具合報告を送信しました。ありがとうございます。"
        : "ご要望を送信しました。ありがとうございます。"
    );

    setBugDescription("");
    setBugDeviceModel("");
    setBugBrowserOther("");
    setBugImages([]);
  } catch (error) {
    console.error(error);

    setBugError(
      "送信中にエラーが発生しました。もう一度お試しください。"
    );
  } finally {
    setBugSubmitting(false);
  }
}

  function openXShare(includePageLink: boolean) {
    if (typeof window === "undefined") return;

    const hashtag = "#KP在庫ここにあるよ";
    const pageUrl = "https://kingandprince-stock.vercel.app/so-honey";
    const text = includePageLink
      ? `${hashtag}\n${pageUrl}`
      : hashtag;

    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );

    setXShareOpen(false);
  }

  return (
    <main
      id="top"
      className="min-h-screen w-full max-w-full overflow-x-clip p-2.5 pb-20 md:p-6 md:pb-24"
      style={{
        fontFamily: '"Meiryo", "メイリオ", sans-serif',
        background:
          "linear-gradient(180deg, #f9eef7 0%, #f2ebfa 42%, #fcf9fc 100%)",
      }}
    >
      <div className="mx-auto w-full max-w-5xl space-y-4 md:space-y-5">
        {/* ===== HERO ===== */}
        <section
          className={`relative overflow-hidden rounded-[24px] border border-white/80 p-4 shadow-sm md:rounded-[30px] md:p-6 ${
            isAndroid ? "bg-white" : "bg-white/90"
          }`}
        >
          <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-full bg-[#f4a8cc]/25" />
          <div className="pointer-events-none absolute left-[16%] -top-20 h-40 w-40 rounded-full bg-[#d5b5ed]/25" />
          <div className="pointer-events-none absolute right-[18%] -top-12 h-36 w-36 rounded-full bg-[#f6bfd9]/30" />
          <div className="pointer-events-none absolute -right-16 top-8 h-52 w-52 rounded-full bg-[#cdb0ea]/25" />
          <div className="pointer-events-none absolute right-[37%] bottom-3 h-20 w-20 rounded-full bg-[#f6cfdf]/30" />

          <div className="relative z-10 mx-auto flex max-w-4xl items-center justify-center gap-2 md:gap-6">
            <div className="hidden w-[180px] shrink-0 md:block lg:w-[220px]">
              <img
                src="/bee-ren.png"
                alt=""
                className="h-auto w-full object-contain mix-blend-multiply"
              />
            </div>

            <div className="min-w-0 flex-1 text-center">
              <div className="mx-auto flex w-full justify-center">
                <img
                  src="/so-honey-ribbon.png"
                  alt="So Honey EP"
                  className="h-auto w-[300px] max-w-full translate-y-4 object-contain md:w-[420px] md:translate-y-7"
                />
              </div>

              {/* スマホ: タイトルの左右に蜂 */}
              <div className="mx-auto mt-1 grid w-full max-w-[360px] grid-cols-[78px_minmax(0,1fr)_78px] items-center gap-0 md:block md:max-w-none">
                <img
                  src="/bee-ren.png"
                  alt=""
                  className="h-auto w-full translate-x-2 scale-[1.6] object-contain mix-blend-multiply md:hidden"
                />

                <h1
                  className="text-center text-[22px] font-bold leading-tight text-[#171417] sm:text-[24px] md:mt-6 md:text-[48px]"
                  style={{
                    fontFamily: '"Meiryo", "メイリオ", sans-serif',
                  }}
                >
                  <span className="whitespace-nowrap">King & Prince</span>
                  <br />
                  <span className="whitespace-nowrap">在庫チェッカー</span>
                </h1>

                <img
                  src="/bee-kaito.png"
                  alt=""
                  className="h-auto w-full -translate-x-2 scale-[1.6] object-contain mix-blend-multiply md:hidden"
                />
              </div>

              <div className="mt-3 flex items-center justify-center gap-2 text-[12px] font-medium leading-5 text-[#655b64] md:mt-4 md:gap-3 md:text-lg md:leading-7">
                <span className="text-base md:text-2xl" aria-hidden="true">
                  🍯
                </span>

                <p className="whitespace-nowrap">
  全国の実店舗・オンラインショップの在庫を
  <br />
  7種類まとめて確認できます。
</p>

                <span className="text-base md:text-2xl" aria-hidden="true">
                  🍯
                </span>
              </div>
            </div>

            <div className="hidden w-[180px] shrink-0 md:block lg:w-[220px]">
              <img
                src="/bee-kaito.png"
                alt=""
                className="h-auto w-full object-contain mix-blend-multiply"
              />
            </div>
          </div>

          {/* 売上 */}
          <div className="relative z-10 mt-5 rounded-2xl bg-[#211d21] p-4 text-white md:mt-8 md:rounded-3xl md:p-7">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="text-[10px] font-bold tracking-[0.12em] text-[#e8cfe3] md:text-sm">
                TOTAL SALES
              </div>

              <div className="mt-1 text-3xl font-bold md:mt-2 md:text-5xl">
                {sales === null ? (
                  "－"
                ) : (
                  <>
                    {sales.toLocaleString()}
                    <span className="ml-1 text-sm md:text-xl">枚</span>
                  </>
                )}
              </div>
            </div>

            {SHOW_GOAL_PROGRESS && (
              <>
                <div className="mt-3 text-center">
                  <div className="text-xs text-[#d9cfd8] md:text-base">
                    達成率 {percent.toFixed(1)}%
                  </div>

                  <div className="mt-0.5 text-sm font-bold text-[#efcbe7] md:mt-1 md:text-lg">
                    あと {remain.toLocaleString()}枚
                  </div>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15 md:mt-5 md:h-3">
                  <div
                    className="h-full rounded-full bg-[#dc82c4]"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </>
            )}
          </div>

          <div className="relative z-10 mt-3 grid grid-cols-3 gap-1.5 md:mt-5 md:gap-3">
            <StatCard
              icon="📊"
              title={salesDateLabel}
              value={today}
            />
            <StatCard
              icon="📅"
              title={salesWeekLabel}
              value={week}
            />
            <StatCard
              icon="👑"
              title="累計"
              value={sales}
            />
          </div>
        </section>

        {/* ===== X共有 + 今日の投稿状況 ===== */}
        <section
          className={`rounded-2xl border border-[#e2d3e4] px-3 py-3 shadow-sm md:px-5 md:py-4 ${
            isAndroid ? "bg-white" : "bg-white/90"
          }`}
        >
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-center gap-3 md:gap-5">
            <div className="min-w-0">
              <div className="text-[12px] font-bold text-[#3f3340] md:text-base">
                見つけた在庫をみんなに共有
              </div>
              <div className="mt-0.5 text-[9px] leading-4 text-[#806f7d] md:text-sm md:leading-5">
                #KP在庫ここにあるよ をつけてXへ投稿できます
              </div>

              <button
                type="button"
                onClick={() => setXShareOpen(true)}
                className="mt-2 w-full rounded-xl border border-[#b986b5] bg-[#f6e8f3] px-3 py-2.5 text-[11px] font-bold text-[#694260] shadow-sm transition hover:bg-[#eedbec] md:px-5 md:py-3 md:text-base"
              >
                𝕏 在庫情報を共有する
              </button>
            </div>

            <div className="min-w-0 text-right text-[10px] leading-5 text-[#655764] md:text-sm md:leading-7">
              <div className="font-bold text-[#5f3e57]">今日の投稿状況</div>
              <div className="whitespace-nowrap">
                在庫投稿{" "}
                <strong className="text-sm text-[#2b2329] md:text-lg">
                  {todayActivity?.inventory_posts == null
                    ? "－"
                    : todayActivity.inventory_posts.toLocaleString()}
                </strong>
                件
              </div>
              <div className="whitespace-nowrap">
                更新店舗{" "}
                <strong className="text-sm text-[#2b2329] md:text-lg">
                  {todayActivity?.updated_stores == null
                    ? "－"
                    : todayActivity.updated_stores.toLocaleString()}
                </strong>
                店舗
              </div>
            </div>
          </div>
        </section>

        {/* ===== 上部ナビ ===== */}
        <nav
          className={`sticky top-2 z-40 rounded-xl border border-[#e3d4e3] p-1.5 shadow-md md:rounded-2xl md:p-2 ${
            isAndroid ? "bg-white" : "bg-white/95 backdrop-blur"
          }`}
        >
          <div className={`grid gap-1.5 md:gap-2 ${reportShippingBasis === "shipping" ? "grid-cols-3" : "grid-cols-2"}`}>
            <a
              href="#stores"
              className="whitespace-nowrap rounded-lg bg-[#f4e4f1] px-1 py-2.5 text-center text-[10px] font-bold text-[#68415f] transition hover:bg-[#ead2e5] md:rounded-xl md:px-2 md:py-3.5 md:text-base"
            >
              🏪 店舗を探す
            </a>

            <a
              href="#report"
              className="whitespace-nowrap rounded-lg bg-[#eadff5] px-1 py-2.5 text-center text-[10px] font-bold text-[#654b78] transition hover:bg-[#dfceed] md:rounded-xl md:px-2 md:py-3.5 md:text-base"
            >
              ✍️ 在庫情報を投稿
            </a>

            <a
              href="#latest"
              className="whitespace-nowrap rounded-lg bg-[#f5e7ef] px-1 py-2.5 text-center text-[10px] font-bold text-[#754e66] transition hover:bg-[#ecd6e2] md:rounded-xl md:px-2 md:py-3.5 md:text-base"
            >
              🕒 最新の在庫投稿
            </a>
          </div>
        </nav>

        {/* ===== 集計について ===== */}
        <details
          className={`rounded-xl border border-[#e3d4e3] shadow-sm md:rounded-2xl ${
            isAndroid ? "bg-white" : "bg-white/90"
          }`}
        >
          <summary className="cursor-pointer list-none px-4 py-3 text-[12px] font-bold text-[#4f414d] md:px-6 md:py-4 md:text-xl">
            <div className="flex items-center justify-between gap-2">
              <span className="whitespace-nowrap">
                📊 オリコン・Billboard集計について
              </span>
              <span className="text-[#9b6c91]">∨</span>
            </div>
          </summary>

          <div className="border-t border-[#eaddea] px-4 pb-4 pt-4 md:px-6 md:pb-6 md:pt-5">
            <div>
              <div className="text-base font-bold text-[#2c252b] md:text-lg">
                オリコン
              </div>

              <div className="mt-2">
                <span className="inline-block rounded-lg border border-[#bd4f88] bg-[#d9609b] px-2.5 py-1 text-[11px] font-bold text-white md:rounded-xl md:px-3 md:py-1.5 md:text-sm">
                  オリコン対象
                </span>
              </div>

              <p className="mt-2 text-[12px] leading-5 text-[#2f2a2f] md:mt-3 md:text-base md:leading-7">
                本サイトに掲載している実店舗は、基本的にオリコン
                「CD・DVD/Blu-rayランキング調査協力店」として
                確認できた店舗を掲載しています。
              </p>

              <div className="mt-3 rounded-lg border border-[#ead7a7] bg-[#fff9e8] p-3 text-[11px] leading-5 text-[#5f512f] md:mt-4 md:rounded-xl md:p-4 md:text-sm md:leading-6">
                <div className="font-bold text-[#4f4021]">⏰ 初週集計の購入目安</div>
                <p className="mt-1.5">初週集計の締め時間は店舗や購入方法によって異なる可能性があります。店舗ごとに確認できた情報のみ表示し、未確認の場合は「要確認」としていますが、保証するものではありませんので、実際の店舗にご確認ください。</p>
                <p className="mt-1.5">オンラインショップは、注文日時だけでなく発送時期などによって集計タイミングが変わるため、<strong>購入前に必ず各ショップの商品ページで発送予定をご確認ください。</strong></p>
                <p className="mt-1.5 text-[#766744]">※表示は目安です。店舗・ショップや購入方法、在庫・発送状況によって変わる場合があります。</p>
              </div>

              <a
                href="https://biz.oricon.co.jp/coope.asp"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center rounded-full bg-[#f1dfec] px-3 py-2 text-[11px] font-bold text-[#6d4966] transition hover:bg-[#e9d2e4] md:mt-3 md:px-4 md:py-2.5 md:text-base"
              >
                <span>オリコン 調査協力店一覧を確認する</span>
                <ExternalArrow />
              </a>
            </div>

            <div className="mt-5 border-t border-[#eaddea] pt-5 md:mt-6 md:pt-6">
              <div className="text-base font-bold text-[#2c252b] md:text-lg">
                Billboard
              </div>

              <p className="mt-1.5 text-[12px] leading-5 text-[#2f2a2f] md:mt-2 md:text-base md:leading-7">
                店舗ごとに、以下の3種類で表示しています。
              </p>

              <div className="mt-3 space-y-2 md:mt-4 md:space-y-3">
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <span className="rounded-lg border border-[#7250a5] bg-[#835ab3] px-2.5 py-1 text-[11px] font-bold text-white md:rounded-xl md:px-3 md:py-1.5 md:text-sm">
                    Billboard 対象
                  </span>
                  <span className="text-[12px] text-[#2f2a2f] md:text-base">
                    集計対象として確認できた店舗
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <span className="rounded-lg border border-[#a9a2a8] bg-[#ece9ec] px-2.5 py-1 text-[11px] font-bold text-[#595159] md:rounded-xl md:px-3 md:py-1.5 md:text-sm">
                    Billboard 対象外
                  </span>
                  <span className="text-[12px] text-[#2f2a2f] md:text-base">
                    集計対象外として確認した店舗
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <span className="rounded-lg border border-[#9e85b8] bg-[#eee7f4] px-2.5 py-1 text-[11px] font-bold text-[#5b486b] md:rounded-xl md:px-3 md:py-1.5 md:text-sm">
                    Billboard 要確認
                  </span>
                  <span className="text-[12px] text-[#2f2a2f] md:text-base">
                    店舗ごとの確認が必要な店舗
                  </span>
                </div>
              </div>

              <a
                href="https://www.billboard-japan.com/common/special/others/storelist/storelist.html"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center rounded-full bg-[#eee7f4] px-3 py-2 text-[11px] font-bold text-[#5b486b] transition hover:bg-[#e5daee] md:mt-4 md:px-4 md:py-2.5 md:text-base"
              >
                <span>Billboard JAPAN 集計対象店を確認する</span>
                <ExternalArrow />
              </a>

              <div className="mt-4 rounded-lg bg-[#f8f4f7] p-3 text-[11px] leading-5 text-[#2f2a2f] md:mt-5 md:rounded-xl md:p-4 md:text-sm md:leading-6">
                <p>
                  ※ TSUTAYAなどフランチャイズ店舗が多いチェーンでは、店舗によって集計対象状況が異なる場合があるため、「要確認」としている店舗があります。
                </p>

                <p className="mt-2">
  ※掲載情報は公式情報等をもとに可能な範囲で確認していますが、最新性・正確性やランキングへの集計を保証するものではありません。店舗の状況や集計条件が変更される場合もあるため、
  <span className="font-bold text-[#4e454d]">
    購入前に各店舗・公式サイト等で最新情報をご自身でご確認ください。
  </span>
</p>
              </div>
            </div>
          </div>
        </details>

        {/* ===== 在庫情報について ===== */}
        <details
          className={`rounded-xl border border-[#e3d4e3] shadow-sm md:rounded-2xl ${
            isAndroid ? "bg-white" : "bg-white/90"
          }`}
        >
          <summary className="cursor-pointer list-none px-4 py-3 text-[12px] font-bold text-[#4f414d] md:px-6 md:py-4 md:text-xl">
            <div className="flex items-center justify-between gap-2">
              <span>📦 在庫情報について</span>
              <span className="text-[#9b6c91]">∨</span>
            </div>
          </summary>

          <div className="border-t border-[#eaddea] px-4 pb-4 pt-4 text-[12px] leading-5 text-[#2f2a2f] md:px-6 md:pb-6 md:pt-5 md:text-base md:leading-7">
            <p>
              本サイトの在庫情報は、店舗・オンラインショップで確認した情報を
              ユーザーが投稿し共有するものです。
            </p>

            <p className="mt-2 md:mt-3">
              在庫状況は投稿後に変動する場合があり、
              表示されている在庫数や在庫の有無を保証するものではありません。
              <br />
              また、店舗への取り置き・予約の可否についても、
              各店舗へ直接ご確認ください。
            </p>

            <div className="mt-3 rounded-lg bg-[#f8f4f7] p-3 text-[11px] leading-5 text-[#2f2a2f] md:mt-4 md:rounded-xl md:p-4 md:text-sm md:leading-6">
              ※ 掲載情報は参考情報としてご利用ください。
              <strong className="font-bold">
                購入・来店前には、ご自身で各店舗・オンラインショップ等へ
                最新の在庫状況をご確認ください。
              </strong>
            </div>
          </div>
        </details>

        {/* ===== 店舗検索 ===== */}
        <section
          id="stores"
          className={`scroll-mt-24 rounded-[20px] border border-white/80 p-3.5 text-[#211d21] shadow-sm md:rounded-[30px] md:p-6 ${
            isAndroid ? "bg-white" : "bg-white/90"
          }`}
        >
          <div className="text-[10px] font-bold tracking-[0.12em] text-[#9b6c91] opacity-100 [-webkit-text-fill-color:#9b6c91] md:text-sm">
            STOCK SEARCH
          </div>

          <h2 className="mt-1 text-lg font-bold text-[#1d191d] opacity-100 [-webkit-text-fill-color:#1d191d] md:text-3xl">
            🏬 店舗を探す
          </h2>

          <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-[#f6edf5] p-1.5 md:mt-5 md:gap-2 md:rounded-2xl md:p-2">
            <button
              type="button"
              onClick={() => setSearchMode("physical")}
              className={`rounded-lg px-3 py-2 text-[12px] font-bold transition md:rounded-xl md:px-4 md:py-3.5 md:text-base ${
                searchMode === "physical"
                  ? "bg-[#211d21] text-white shadow-sm"
                  : "text-[#715f6e]"
              }`}
            >
              🏪 実店舗
            </button>

            <button
              type="button"
              onClick={() => setSearchMode("online")}
              className={`rounded-lg px-3 py-2 text-[12px] font-bold transition md:rounded-xl md:px-4 md:py-3.5 md:text-base ${
                searchMode === "online"
                  ? "bg-[#211d21] text-white shadow-sm"
                  : "text-[#715f6e]"
              }`}
            >
              🛒 オンライン
            </button>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              searchMode === "physical"
                ? "店舗名・チェーン名・市区町村で検索"
                : "オンラインショップ名で検索"
            }
            className="mt-3 w-full rounded-xl border border-[#d9c9d8] bg-[#fdfafd] p-2.5 text-[12px] outline-none focus:border-[#bb79a7] focus:ring-2 focus:ring-[#eedbea] md:mt-4 md:rounded-2xl md:p-4 md:text-base"
          />

          {searchMode === "physical" && (
            <div className="mt-4 md:mt-7">
              <div className="text-sm font-bold text-[#2c252b] md:text-xl">
                📍 都道府県から探す
              </div>

              <button
                onClick={() => setPrefecture("全国")}
                className={`mt-2.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold md:mt-4 md:px-5 md:py-2.5 md:text-base ${
                  prefecture === "全国"
                    ? "bg-[#211d21] text-white"
                    : "bg-[#f1dfed] text-[#68415f]"
                }`}
              >
                全国
              </button>

              <div className="mt-3 space-y-2.5 md:mt-6 md:space-y-5">
                {PREFECTURE_GROUPS.map((group) => (
                  <div key={group.region}>
                    <div className="mb-1 text-[11px] font-bold text-[#a26796] md:mb-2 md:text-base">
                      {group.region}
                    </div>

                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                      {group.prefectures.map((pref) => (
                        <button
                          key={pref}
                          onClick={() => setPrefecture(pref)}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold md:px-4 md:py-2 md:text-base ${
                            prefecture === pref
                              ? "bg-[#b96b9f] text-white shadow-sm"
                              : "bg-[#f3e1ef] text-[#66475e]"
                          }`}
                        >
                          {shortPrefectureName(pref)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 border-t border-[#eaddea] pt-4 md:mt-9 md:pt-7">
            <div className="flex flex-wrap items-end justify-between gap-2 md:gap-3">
              <div>
                <div className="text-[10px] font-bold tracking-[0.12em] text-[#9b6c91] opacity-100 [-webkit-text-fill-color:#9b6c91] md:text-sm">
                  STOCK LIST
                </div>

                <h3 className="mt-1 text-lg font-bold text-[#1d191d] opacity-100 [-webkit-text-fill-color:#1d191d] md:text-3xl">
                  🎈{" "}
                  {searchMode === "physical"
                    ? "店舗別 在庫一覧"
                    : "オンライン 在庫一覧"}
                </h3>

                {searchMode === "physical" &&
                  prefecture !== "全国" && (
                    <p className="mt-1 text-[12px] text-[#766a75] md:mt-2 md:text-base">
                      📍 {prefecture}
                    </p>
                  )}
              </div>

              {!loading && !dataError && (
                <div className="rounded-full bg-[#f3dce9] px-2.5 py-1 text-[11px] font-bold text-[#653b56] md:px-4 md:py-2 md:text-base">
                  {displayedStores.length.toLocaleString()}店舗
                </div>
              )}
            </div>

            {!loading && !dataError && (
              <div className="mt-3 md:mt-5">
                <button
                  type="button"
                  aria-pressed={stockOnly}
                  onClick={() => setStockOnly((current) => !current)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition md:max-w-md md:rounded-2xl md:px-4 md:py-3.5 ${
                    stockOnly
                      ? "border-[#7bb88d] bg-[#eaf7ee] text-[#245f35] shadow-sm"
                      : "border-[#d8cad7] bg-white text-[#4f454d] shadow-sm"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold ${
                        stockOnly
                          ? "border-[#4f9565] bg-[#4f9565] text-white"
                          : "border-[#b9abb6] bg-white text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span>
                      <span className="block text-[12px] font-bold md:text-sm">
                        在庫あり商品のみ表示
                      </span>
                      <span className="mt-0.5 block text-[9px] font-normal opacity-75 md:text-xs">
                        在庫なし・入荷待ちなどを一覧から隠します
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] font-bold md:text-xs">
                    {stockOnly ? "ON" : "OFF"}
                  </span>
                </button>
              </div>
            )}

            {searchMode === "online" && !loading && !dataError && (
              <div className="mt-3 rounded-xl border border-[#ead7a7] bg-[#fffaf0] p-2.5 md:mt-5 md:rounded-2xl md:p-4">
                <div className="text-[11px] font-bold text-[#59471f] md:text-sm">
                  ⏰ 初週集計に間に合う見込みで絞り込み
                </div>
                <p className="mt-1 text-[10px] leading-5 text-[#746443] md:text-sm md:leading-6">
  発送予定などの情報をもとに、初週集計に間に合う見込みで絞り込めます。
  初期表示では、すべてのオンラインショップを表示しています。
  <br />
  <span className="font-bold">
    ※あくまで見込みであり、初週集計への反映を保証するものではありません。
    購入前に、各商品ページの最新情報をご確認ください。
  </span>
</p>
                <div className="mt-2 flex flex-wrap gap-1.5 md:gap-2">
                  {([
                    ["all", "すべて"],
                    ["likely", "🔵 間に合う見込み"],
                    ["check", "🟡 要確認"],
                    ["unlikely", "🔴 間に合わない見込み"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setOnlineFirstWeekFilter(value)}
                      className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition md:px-4 md:py-2 md:text-sm ${
                        onlineFirstWeekFilter === value
                          ? "bg-[#59471f] text-white"
                          : "border border-[#ddc98e] bg-white text-[#59471f]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading ? (
              <LoadingBox text="店舗データを読み込み中…" />
            ) : dataError ? (
              <ErrorBox text={dataError} />
            ) : displayedStores.length === 0 ? (
              <EmptyBox text="該当する店舗がありません" />
            ) : (
              <div className="mt-3 space-y-3 md:mt-6 md:space-y-5">
                {displayedStores.map((store) => (
                  <StoreCard
                    key={store.id}
                    store={store}
                    products={products}
                    getLatestReport={getLatestReport}
                    formatDate={formatDate}
                    onDeleteOwnReport={handleDeleteOwnReport}
                    deletingOwnReportId={deletingOwnReportId}
                    onlineProductFirstWeekStatusMap={onlineProductFirstWeekStatusMap}
                    onlineFirstWeekFilter={onlineFirstWeekFilter}
                    stockOnly={stockOnly}
                    commentCount={
                      storeCommentCountMap.get(store.id) ?? 0
                    }
                    onCommentsChanged={loadStoreCommentCounts}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ===== 在庫投稿 ===== */}
        <section
          id="report"
          className={`scroll-mt-24 rounded-[20px] border border-white/80 p-3.5 text-[#211d21] opacity-100 shadow-sm md:rounded-[30px] md:p-6 ${
            isAndroid ? "bg-white" : "bg-white/90"
          }`}
        >
          <div className="text-[10px] font-bold tracking-[0.12em] text-[#9b6c91] opacity-100 [-webkit-text-fill-color:#9b6c91] md:text-sm">
            REPORT STOCK
          </div>

          <h2 className="mt-1 text-lg font-bold text-[#1d191d] opacity-100 [-webkit-text-fill-color:#1d191d] md:text-3xl">
            ✍️ 在庫情報を投稿
          </h2>

          <p className="mt-1 text-[12px] text-[#766a75] md:mt-2 md:text-base">
            実店舗・オンラインショップで確認した在庫を投稿できます。
          </p>

          <div className="mt-3 rounded-xl border border-[#ead7a7] bg-[#fff9e8] p-3 text-[11px] leading-5 text-[#5f512f] md:mt-4 md:rounded-2xl md:p-4 md:text-sm md:leading-6">
            <div className="font-bold text-[#4f4021]">📞 複数店舗をまとめて確認・投稿される方へ</div>
            <p className="mt-1.5">電話確認などで複数店舗の情報をまとめて投稿してくださる場合は、<strong>コメント欄に「電話確認」「複数店舗をまとめて確認」など、どのように確認した情報か一言添えていただけると助かります。</strong></p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-[#f6edf5] p-1.5 md:mt-5 md:gap-2 md:rounded-2xl md:p-2">
            <button
              type="button"
              onClick={() => {
                setReportMode("physical");
                setReportStoreId("");
                setReportStoreSearch("");
              }}
              className={`rounded-lg px-3 py-2 text-[12px] font-bold md:rounded-xl md:px-4 md:py-3.5 md:text-base ${
                reportMode === "physical"
                  ? "bg-[#211d21] text-white"
                  : "text-[#715f6e]"
              }`}
            >
              🏪 実店舗
            </button>

            <button
              type="button"
              onClick={() => {
                setReportMode("online");
                setReportStoreId("");
                setReportStoreSearch("");
              }}
              className={`rounded-lg px-3 py-2 text-[12px] font-bold md:rounded-xl md:px-4 md:py-3.5 md:text-base ${
                reportMode === "online"
                  ? "bg-[#211d21] text-white"
                  : "text-[#715f6e]"
              }`}
            >
              🛒 オンライン
            </button>
          </div>

          <div className="mt-3 grid gap-3 md:mt-5 md:grid-cols-2 md:gap-4">
            {reportMode === "physical" && (
              <label className="space-y-1.5 md:space-y-2">
                <span className="text-[12px] font-bold text-[#211d21] opacity-100 md:text-base">
                  📍 都道府県
                </span>

                <select
                  value={reportPrefecture}
                  onChange={(e) => {
                    setReportPrefecture(e.target.value);
                    setReportStoreId("");
                    setReportStoreSearch("");
                  }}
                  className="w-full rounded-xl border border-[#d9c9d8] bg-[#fdfafd] p-2.5 text-[12px] text-[#211d21] opacity-100 [color:#211d21] [-webkit-text-fill-color:#211d21] md:rounded-2xl md:p-3.5 md:text-base"
                >
                  {PREFECTURES.map((pref) => (
                    <option key={pref} value={pref}>
                      {pref}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="space-y-1.5 md:space-y-2">
              <span className="text-[12px] font-bold text-[#211d21] opacity-100 md:text-base">
                💿 商品
              </span>

              <select
                value={reportProductId}
                onChange={(e) =>
                  setReportProductId(e.target.value)
                }
                className="w-full rounded-xl border border-[#d9c9d8] bg-[#fdfafd] p-2.5 text-[12px] text-[#211d21] opacity-100 [color:#211d21] [-webkit-text-fill-color:#211d21] md:rounded-2xl md:p-3.5 md:text-base"
              >
                {reportProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-3 block space-y-1.5 md:mt-5 md:space-y-2">
            <span className="text-[12px] font-bold text-[#211d21] opacity-100 md:text-base">
              🔎{" "}
              {reportMode === "online"
                ? "オンラインショップを検索"
                : "店舗を検索"}
            </span>

            <input
              value={reportStoreSearch}
              onChange={(e) => {
                setReportStoreSearch(e.target.value);
                setReportStoreId("");
              }}
              placeholder={
                reportMode === "online"
                  ? "ショップ名を入力"
                  : "店舗名・チェーン名・市区町村を入力"
              }
              className="w-full rounded-xl border border-[#d9c9d8] bg-[#fdfafd] p-2.5 text-[12px] text-[#211d21] opacity-100 [color:#211d21] [-webkit-text-fill-color:#211d21] placeholder:text-[#766c74] placeholder:opacity-100 md:rounded-2xl md:p-3.5 md:text-base"
            />
          </label>

          <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-[#eaddea] bg-[#fcf9fc] p-1.5 md:mt-3 md:max-h-72 md:rounded-2xl md:p-2">
            {reportCandidates.length === 0 ? (
              <div className="p-3 text-[12px] text-[#837983] md:p-4 md:text-base">
                該当する店舗がありません
              </div>
            ) : (
              <div className="space-y-1.5 md:space-y-2">
                {reportCandidates.slice(0, 30).map((store) => {
                  const selected =
                    String(store.id) === reportStoreId;

                  return (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() =>
                        setReportStoreId(String(store.id))
                      }
                      className={`w-full rounded-lg border px-3 py-2 text-left text-[12px] font-bold text-[#211d21] opacity-100 [color:#211d21] [-webkit-text-fill-color:#211d21] md:rounded-xl md:px-4 md:py-3 md:text-base ${
                        selected
                          ? "border-[#b96b9f] bg-[#f1deeb]"
                          : "border-transparent bg-white"
                      }`}
                    >
                      {getDisplayStoreName(store)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedReportStore && (
            <div className="mt-2 rounded-xl border border-[#d2b4ca] bg-[#f4e5f0] p-3 md:mt-3 md:rounded-2xl md:p-4">
              <div className="text-[10px] font-bold text-[#986b8e] md:text-sm">
                選択中
              </div>

              <div className="mt-0.5 text-[12px] font-bold text-[#211d21] opacity-100 [color:#211d21] [-webkit-text-fill-color:#211d21] md:mt-1 md:text-base">
                {getDisplayStoreName(selectedReportStore)}
              </div>
            </div>
          )}

          {reportMode === "physical" ? (
            <div className="mt-3 md:mt-5">
              <div className="text-[12px] font-bold text-[#211d21] md:text-base">
                🔢 在庫状況
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5 md:gap-2">
                {[
                  ["quantity", "枚数を入力"],
                  ["in_stock", "○ 在庫あり"],
                  ["sold_out", "× 在庫なし"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPhysicalStockInput(value as PhysicalStockInput)}
                    className={`rounded-xl border px-2 py-2.5 text-[10px] font-bold md:px-3 md:py-3 md:text-sm ${
                      physicalStockInput === value
                        ? "border-[#9e638d] bg-[#ead8e6] text-[#4f2f46]"
                        : "border-[#d9c9d8] bg-[#fdfafd] text-[#5f545d]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {physicalStockInput === "quantity" ? (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={reportQuantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      setReportQuantity("");
                      return;
                    }
                    if (/^[0-9]+$/.test(value)) {
                      const number = Number(value);
                      if (number >= 0 && number <= 100) {
                        setReportQuantity(value);
                      }
                    }
                  }}
                  placeholder="例: 5"
                  className="mt-2 w-full rounded-xl border border-[#d9c9d8] bg-[#fdfafd] p-2.5 text-[12px] text-[#211d21] opacity-100 [color:#211d21] [-webkit-text-fill-color:#211d21] placeholder:text-[#766c74] placeholder:opacity-100 md:rounded-2xl md:p-3.5 md:text-base"
                />
              ) : (
                <div className="mt-2 rounded-xl bg-[#fbf7fa] px-3 py-2 text-[10px] leading-5 text-[#756873] md:text-sm">
                  枚数が分からなくても投稿できます。在庫が多い場合は、コメントに「在庫潤沢」「店頭に多数あり」など状況を添えていただけると参考になります。
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-3 md:mt-5 md:space-y-4">
              {selectedReportStore &&
                reportProducts.find(
                  (product) => String(product.id) === reportProductId
                ) &&
                hasPurchaseVariantLinks(
                  selectedReportStore,
                  reportProducts.find(
                    (product) => String(product.id) === reportProductId
                  )!
                ) && (
                  <div className="rounded-xl border border-[#d8c4d4] bg-[#fcf8fc] p-3">
                    <div className="text-[12px] font-bold text-[#211d21] md:text-base">
                      🎁 {purchaseVariantStoreLabel(selectedReportStore)}の特典区分
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {[
                        ["special", "先着特典あり"],
                        ["no_special", "特典なし"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setReportPurchaseVariant(value as PurchaseVariant)
                          }
                          className={`rounded-xl border px-3 py-2.5 text-[11px] font-bold md:text-sm ${
                            reportPurchaseVariant === value
                              ? "border-[#7e5597] bg-[#7e5597] text-white"
                              : "border-[#d8c4d4] bg-white text-[#6d4966]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[10px] leading-5 text-[#7b6b77] md:text-xs">
                      在庫状況は特典あり・なしで別々に記録されます。
                    </p>
                  </div>
                )}

              <div>
                <div className="text-[12px] font-bold text-[#211d21] md:text-base">
                  🛒 在庫状況
                </div>
              <div className="mt-2 grid grid-cols-2 gap-2 md:gap-3">
                {[
                  ["in_stock", "○ 在庫あり"],
                  ["low_stock", "△ 残りわずか"],
                  ["backorder", "入荷待ち"],
                  ["sold_out", "× 在庫なし"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setReportStockStatus(value as OnlineStockStatus)
                    }
                    className={`rounded-xl border px-3 py-2.5 text-[12px] font-bold md:px-4 md:py-3 md:text-base ${
                      reportStockStatus === value
                        ? "border-[#9e638d] bg-[#ead8e6] text-[#4f2f46]"
                        : "border-[#d9c9d8] bg-[#fdfafd] text-[#5f545d]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              </div>
            </div>
          )}

          {reportMode === "online" && (
            <div className="mt-3 rounded-xl border border-[#dfc16f] bg-[#fffaf0] p-3 text-[#2f292e] opacity-100 md:mt-5 md:rounded-2xl md:p-4">
              <label className="flex cursor-pointer items-start gap-2">
                <input type="checkbox" checked={reportShippingEnabled} onChange={(e) => setReportShippingEnabled(e.target.checked)} className="mt-0.5 h-4 w-4" />
                <span>
                  <span className="block text-[12px] font-bold text-[#4d3d18] [-webkit-text-fill-color:#4d3d18] md:text-base">🚚 発送・お届け目安も投稿する</span>
                  <span className="mt-0.5 block text-[10px] leading-4 text-[#766744] [-webkit-text-fill-color:#766744] md:text-sm">
                    任意です。日数表示なら「から」「まで」を選ぶだけで投稿できます。
                  </span>
                </span>
              </label>
              {reportShippingEnabled && (
                <div className="mt-3 space-y-3 border-t border-[#ead9a8] pt-3">
                  <div>
                    <div className="mb-1.5 text-[11px] font-bold text-[#4d434c] md:text-sm">
                      何を基準にした表示ですか？
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                      {[
                        ["shipping", "発送・出荷"],
                        ["delivery", "お届け・到着"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            const next = value as "shipping" | "delivery";
                            setReportShippingBasis(next);
                            if (next === "delivery" && reportShippingMode === "range") {
                              setReportShippingMode("date");
                            }
                          }}
                          className={`rounded-lg border px-2 py-2 text-[10px] font-bold md:rounded-xl md:px-3 md:py-2.5 md:text-sm ${
                            reportShippingBasis === value
                              ? "border-[#8c6b49] bg-[#8c6b49] text-white"
                              : "border-[#d8cad7] bg-white text-[#5e5145]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 text-[11px] font-bold text-[#4d434c] md:text-sm">
                      表示されている目安
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                      {[
                        ...(reportShippingBasis === "shipping" ? [["range", "日数"]] : []),
                        ["date", "日付"],
                        ["other", "その他"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setReportShippingMode(
                              value as "range" | "date" | "other"
                            )
                          }
                          className={`rounded-lg border px-2 py-2 text-[10px] font-bold md:rounded-xl md:px-3 md:py-2.5 md:text-sm ${
                            reportShippingMode === value
                              ? "border-[#8c6b49] bg-[#8c6b49] text-white"
                              : "border-[#d8cad7] bg-white text-[#5e5145]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {reportShippingBasis === "shipping" && reportShippingMode === "range" && (
                    <div className="rounded-xl border border-[#ead9a8] bg-white p-3">
                      <div className="mb-2 text-[10px] leading-4 text-[#766744] md:text-xs">
                        例: 「当日発送」は「当日～当日」、「当日～2日で発送」は「当日～2日」にします。
                      </div>
                      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-bold text-[#4d434c] md:text-xs">
                            から
                          </span>
                          <select
                            value={reportShippingMinDays}
                            onChange={(e) => {
                              const nextMin = e.target.value;
                              setReportShippingMinDays(nextMin);
                              if (
                                Number(reportShippingMaxDays) <
                                Number(nextMin)
                              ) {
                                setReportShippingMaxDays(nextMin);
                              }
                            }}
                            className="w-full rounded-lg border border-[#d8cad7] bg-white p-2.5 text-[12px] text-[#2f292e] opacity-100 [color:#2f292e] [-webkit-text-fill-color:#2f292e] md:rounded-xl md:p-3 md:text-sm"
                          >
                            <option value="0">当日</option>
                            <option value="1">1日</option>
                            <option value="2">2日</option>
                            <option value="3">3日</option>
                            <option value="4">4日</option>
                          </select>
                        </label>

                        <div className="pb-2.5 text-sm font-bold text-[#6a5b4f] md:pb-3">
                          ～
                        </div>

                        <label className="block">
                          <span className="mb-1 block text-[10px] font-bold text-[#4d434c] md:text-xs">
                            まで
                          </span>
                          <select
                            value={reportShippingMaxDays}
                            onChange={(e) => setReportShippingMaxDays(e.target.value)}
                            className="w-full rounded-lg border border-[#d8cad7] bg-white p-2.5 text-[12px] text-[#2f292e] opacity-100 [color:#2f292e] [-webkit-text-fill-color:#2f292e] md:rounded-xl md:p-3 md:text-sm"
                          >
                            <option value="0">当日</option>
                            <option value="1">1日</option>
                            <option value="2">2日</option>
                            <option value="3">3日</option>
                            <option value="4">4日</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  )}

                  {reportShippingMode === "date" && (
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-bold text-[#4d434c] md:text-sm">
                        {reportShippingBasis === "delivery" ? "お届け予定日" : "発送・出荷予定日"}
                      </span>
                      <input
                        type="date"
                        value={reportShippingDate}
                        onChange={(e) => setReportShippingDate(e.target.value)}
                        className="w-full rounded-lg border border-[#d8cad7] bg-white p-2.5 text-[12px] text-[#2f292e] opacity-100 [color:#2f292e] [-webkit-text-fill-color:#2f292e] md:rounded-xl md:p-3 md:text-sm"
                      />
                    </label>
                  )}

                  {reportShippingMode === "other" && (
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-bold text-[#4d434c] md:text-sm">
                        表示されている内容
                      </span>
                      <input
                        type="text"
                        maxLength={200}
                        value={reportShippingOther}
                        onChange={(e) => setReportShippingOther(e.target.value)}
                        placeholder={
                          reportShippingBasis === "delivery"
                            ? "例: 地域によりお届け日が異なる / お届け日未定"
                            : "例: お取り寄せ2〜7日 / 入荷次第発送 / 3〜5営業日"
                        }
                        className="w-full rounded-lg border border-[#d8cad7] bg-white p-2.5 text-[12px] text-[#2f292e] opacity-100 [color:#2f292e] [-webkit-text-fill-color:#2f292e] placeholder:text-[#766c74] md:rounded-xl md:p-3 md:text-sm"
                      />
                      <span className="mt-1 block text-[9px] leading-4 text-[#766744] md:text-xs">
                        4日を超える表示や、日数で表せない案内はこちらにそのまま入力してください。
                      </span>
                    </label>
                  )}

                  {reportShippingMode !== "other" && (
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-bold text-[#4d434c] md:text-sm">
                        条件・補足
                        <span className="ml-2 text-[10px] font-normal text-[#8a7b70] md:text-xs">
                          任意
                        </span>
                      </span>
                      <input
                        type="text"
                        maxLength={200}
                        value={reportShippingCondition}
                        onChange={(e) => setReportShippingCondition(e.target.value)}
                        placeholder={
                          reportShippingBasis === "delivery"
                            ? "例: 配送先によってお届け日が異なる"
                            : "例: 13時までの注文で当日発送"
                        }
                        className="w-full rounded-lg border border-[#d8cad7] bg-white p-2.5 text-[12px] text-[#2f292e] opacity-100 [color:#2f292e] [-webkit-text-fill-color:#2f292e] placeholder:text-[#766c74] md:rounded-xl md:p-3 md:text-sm"
                      />
                      <span className="mt-1 block text-[9px] leading-4 text-[#766744] md:text-xs">
                        時刻・注文条件などが表示されている場合は、そのまま入力してください。
                      </span>
                    </label>
                  )}

                  <label className="block">
                    <span className="mb-1 block text-[11px] font-bold text-[#4d434c] md:text-sm">確認場所</span>
                    <select value={reportShippingSource} onChange={(e) => setReportShippingSource(e.target.value)} className="w-full rounded-lg border border-[#d8cad7] bg-white p-2.5 text-[12px] text-[#2f292e] opacity-100 [color:#2f292e] [-webkit-text-fill-color:#2f292e] md:rounded-xl md:p-3 md:text-sm"><option value="product_page">商品ページ</option><option value="cart_order">カート・注文画面</option><option value="email">メール</option><option value="other">その他</option></select>
                  </label>
                  {reportShippingSource === "other" && <input type="text" maxLength={100} value={reportShippingSourceDetail} onChange={(e) => setReportShippingSourceDetail(e.target.value)} placeholder="確認場所を入力" className="w-full rounded-lg border border-[#d8cad7] bg-white p-2.5 text-[12px] text-[#2f292e] opacity-100 [color:#2f292e] [-webkit-text-fill-color:#2f292e] placeholder:text-[#766c74] md:rounded-xl md:p-3 md:text-sm" />}
                  <p className="text-[10px] leading-4 text-[#766744] [-webkit-text-fill-color:#766744] md:text-xs">
                    発送・出荷は9/6までなら「間に合う見込み」、9/7以降なら「間に合わない見込み」、期間がまたがる場合は「要確認」として判定します。お届け予定日は、表示された日付が9/6までなら「間に合う見込み」、9/7以降なら「間に合わない見込み」とします。日付を特定できないお届け案内は「要確認」です。
                  </p>
                  {reportShippingBasis === "delivery" && (
                    <p className="rounded-lg bg-[#fff3d6] px-2.5 py-2 text-[10px] leading-4 text-[#6f5724] [-webkit-text-fill-color:#6f5724] md:text-xs">
                      ※表示されたお届け予定日を基準とした見込みです。配送地域等により異なるため、ご自身の配送先で表示されるお届け予定日をご確認ください。
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <label className="mt-3 block space-y-1.5 md:mt-5 md:space-y-2">
            <span className="text-[12px] font-bold text-[#211d21] opacity-100 md:text-base">
              💬 コメント
              <span className="ml-2 text-[11px] font-normal text-[#8a8089] md:text-sm">
                任意・500文字まで
              </span>
            </span>

            <textarea
              rows={3}
              maxLength={500}
              value={reportComment}
              onChange={(e) =>
                setReportComment(e.target.value)
              }
              placeholder="例: 入荷予定なしとのこと / バックヤードに潤沢 / 店員さんに出してもらう など"
              className="w-full rounded-xl border border-[#d9c9d8] bg-[#fdfafd] p-2.5 text-[12px] text-[#211d21] opacity-100 [color:#211d21] [-webkit-text-fill-color:#211d21] placeholder:text-[#766c74] placeholder:opacity-100 md:rounded-2xl md:p-3.5 md:text-base"
            />
          </label>

          {submitError && (
            <div className="mt-3 rounded-xl bg-[#fde7ec] p-3 text-[12px] font-bold text-[#8a304a] md:mt-4 md:rounded-2xl md:p-4 md:text-base">
              {submitError}
            </div>
          )}

          {submitMessage && (
            <div className="mt-3 rounded-xl bg-[#edf5ec] p-3 text-[12px] font-bold text-[#456043] md:mt-4 md:rounded-2xl md:p-4 md:text-base">
              {submitMessage}
            </div>
          )}

<div className="mt-3 md:mt-5">
  <div id="inventory-turnstile" />
</div>

          <button
            onClick={handleSubmitReport}
            disabled={submitting || !turnstileReady}
            className="mt-3 rounded-xl bg-[#211d21] px-5 py-2.5 text-[12px] font-bold text-white disabled:opacity-50 md:mt-5 md:rounded-2xl md:px-7 md:py-3.5 md:text-base"
          >
            {submitting ? "投稿中…" : "投稿する"}
          </button>

          {/* 店舗追加リクエスト */}
          <div className="mt-3 rounded-xl border border-[#eaddea] bg-[#fbf7fa] p-3 md:mt-4 md:rounded-2xl md:p-4">
            <button
              type="button"
              onClick={() => {
                setRequestOpen((current) => !current);
                setRequestMessage("");
                setRequestError("");
              }}
              className="flex w-full items-center justify-between gap-2 text-left md:gap-3"
            >
              <div>
                <div className="text-[10px] font-bold tracking-[0.12em] text-[#9b6c91] opacity-100 [-webkit-text-fill-color:#9b6c91] md:text-sm">
                  STORE REQUEST
                </div>

                <div className="mt-0.5 text-sm font-bold text-[#2c252b] opacity-100 [-webkit-text-fill-color:#2c252b] md:mt-1 md:text-2xl">
                  🏪 店舗が見つからない場合
                </div>

                <div className="mt-1 text-[11px] text-[#766a75] opacity-100 [-webkit-text-fill-color:#766a75] md:mt-2 md:text-base">
                  登録されていない店舗を追加リクエストできます。
                </div>
              </div>

              <span className="shrink-0 text-base font-bold text-[#9d6c91] opacity-100 [-webkit-text-fill-color:#9d6c91] md:text-lg">
                {requestOpen ? "∧" : "∨"}
              </span>
            </button>

            {requestOpen && (
              <div className="mt-4 border-t border-[#eaddea] pt-4 md:mt-5 md:pt-5">
                <div className="mb-3 rounded-lg bg-[#f2e5f0] p-2.5 text-[11px] leading-5 text-[#64515f] opacity-100 [-webkit-text-fill-color:#64515f] md:mb-5 md:rounded-xl md:p-3 md:text-sm md:leading-6">
                  {reportMode === "online"
                    ? "オンラインショップの追加リクエスト"
                    : `追加先: ${reportPrefecture}`}
                </div>

                {reportMode === "physical" && (
                  <label className="mb-3 block md:mb-4">
                    <div className="mb-1.5 text-[12px] font-bold text-[#211d21] opacity-100 [-webkit-text-fill-color:#211d21] md:mb-2 md:text-base">
                      📍 追加先の都道府県
                      <span className="ml-1 text-[11px] text-[#c44f82] opacity-100 [-webkit-text-fill-color:#c44f82] md:text-sm">
                        必須
                      </span>
                    </div>

                    <select
                      value={reportPrefecture}
                      onChange={(e) => {
                        setReportPrefecture(e.target.value);
                        setReportStoreId("");
                        setReportStoreSearch("");
                        setRequestMessage("");
                        setRequestError("");
                      }}
                      className="w-full rounded-lg border border-[#d9c9d8] bg-white p-2.5 text-[12px] text-[#211d21] opacity-100 [color:#211d21] [-webkit-text-fill-color:#211d21] md:rounded-xl md:p-3.5 md:text-base"
                    >
                      {PREFECTURES.map((pref) => (
                        <option
                          key={pref}
                          value={pref}
                        >
                          {pref}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                  <label className="block">
                    <div className="mb-1.5 text-[12px] font-bold text-[#211d21] opacity-100 [-webkit-text-fill-color:#211d21] md:mb-2 md:text-base">
                      🏢 チェーン名
                      <span className="ml-2 text-[11px] font-normal text-[#8a8089] opacity-100 [-webkit-text-fill-color:#8a8089] md:text-sm">
                        任意
                      </span>
                    </div>

                    <input
                      type="text"
                      maxLength={100}
                      value={requestChainName}
                      onChange={(e) => {
                        setRequestChainName(e.target.value);
                        setRequestMessage("");
                        setRequestError("");
                      }}
                      placeholder="例: タワーレコード"
                      className="w-full rounded-lg border border-[#d9c9d8] bg-white p-2.5 text-[12px] text-[#211d21] opacity-100 [color:#211d21] [-webkit-text-fill-color:#211d21] placeholder:text-[#766c74] placeholder:opacity-100 md:rounded-xl md:p-3.5 md:text-base"
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1.5 text-[12px] font-bold text-[#211d21] opacity-100 [-webkit-text-fill-color:#211d21] md:mb-2 md:text-base">
                      {reportMode === "online"
                        ? "🛒 ショップ名"
                        : "🏪 店舗名"}
                      <span className="ml-1 text-[11px] text-[#c44f82] opacity-100 [-webkit-text-fill-color:#c44f82] md:text-sm">
                        必須
                      </span>
                    </div>

                    <input
                      type="text"
                      maxLength={150}
                      value={requestName}
                      onChange={(e) => {
                        setRequestName(e.target.value);
                        setRequestMessage("");
                        setRequestError("");
                      }}
                      placeholder={
                        reportMode === "online"
                          ? "例: UNIVERSAL MUSIC STORE"
                          : "例: 札幌パルコ店"
                      }
                      className="w-full rounded-lg border border-[#d9c9d8] bg-white p-2.5 text-[12px] text-[#211d21] opacity-100 [color:#211d21] [-webkit-text-fill-color:#211d21] placeholder:text-[#766c74] placeholder:opacity-100 md:rounded-xl md:p-3.5 md:text-base"
                    />
                  </label>
                </div>

                {reportMode === "physical" && (
                  <label className="mt-3 block md:mt-4">
                    <div className="mb-1.5 text-[12px] font-bold text-[#211d21] opacity-100 [-webkit-text-fill-color:#211d21] md:mb-2 md:text-base">
                      📍 市区町村
                      <span className="ml-2 text-[11px] font-normal text-[#8a8089] opacity-100 [-webkit-text-fill-color:#8a8089] md:text-sm">
                        任意
                      </span>
                    </div>

                    <input
                      type="text"
                      maxLength={100}
                      value={requestCity}
                      onChange={(e) => {
                        setRequestCity(e.target.value);
                        setRequestMessage("");
                        setRequestError("");
                      }}
                      placeholder="例: 札幌市中央区"
                      className="w-full rounded-lg border border-[#d9c9d8] bg-white p-2.5 text-[12px] text-[#211d21] opacity-100 [color:#211d21] [-webkit-text-fill-color:#211d21] placeholder:text-[#766c74] placeholder:opacity-100 md:rounded-xl md:p-3.5 md:text-base"
                    />
                  </label>
                )}

                <label className="mt-3 block md:mt-4">
                  <div className="mb-1.5 text-[12px] font-bold text-[#211d21] opacity-100 [-webkit-text-fill-color:#211d21] md:mb-2 md:text-base">
                    💬 補足
                    <span className="ml-2 text-[11px] font-normal text-[#8a8089] opacity-100 [-webkit-text-fill-color:#8a8089] md:text-sm">
                      任意・500文字まで
                    </span>
                  </div>

                  <textarea
                    rows={3}
                    maxLength={500}
                    value={requestComment}
                    onChange={(e) => {
                      setRequestComment(e.target.value);
                      setRequestMessage("");
                      setRequestError("");
                    }}
                    placeholder="例: 新しくオープンした店舗です。公式サイトでCD取扱いを確認しました。"
                    className="w-full rounded-lg border border-[#d9c9d8] bg-white p-2.5 text-[12px] text-[#211d21] opacity-100 [color:#211d21] [-webkit-text-fill-color:#211d21] placeholder:text-[#766c74] placeholder:opacity-100 md:rounded-xl md:p-3.5 md:text-base"
                  />
                </label>

                {requestError && (
                  <div className="mt-3 rounded-lg bg-[#fde7ec] p-3 text-[11px] font-bold text-[#8a304a] md:mt-4 md:rounded-xl md:p-4 md:text-sm">
                    {requestError}
                  </div>
                )}

                {requestMessage && (
                  <div className="mt-3 rounded-lg bg-[#edf5ec] p-3 text-[11px] font-bold leading-5 text-[#456043] md:mt-4 md:rounded-xl md:p-4 md:text-sm md:leading-6">
                    {requestMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleStoreRequest}
                  disabled={requestSubmitting}
                  className="mt-3 rounded-lg bg-[#b65d92] px-5 py-2.5 text-[12px] font-bold text-white opacity-100 [-webkit-text-fill-color:#ffffff] transition hover:bg-[#a84e84] disabled:opacity-50 md:mt-4 md:rounded-xl md:px-6 md:py-3.5 md:text-base"
                >
                  {requestSubmitting
                    ? "送信中…"
                    : "店舗追加をリクエスト"}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ===== 最新投稿 ===== */}
        <section
          id="latest"
          className={`scroll-mt-24 rounded-[20px] border border-white/80 p-3.5 text-[#211d21] opacity-100 shadow-sm md:rounded-[30px] md:p-6 ${
            isAndroid ? "bg-white" : "bg-white/90"
          }`}
        >
          <div className="text-[10px] font-bold tracking-[0.12em] text-[#9b6c91] opacity-100 [-webkit-text-fill-color:#9b6c91] md:text-sm">
            LATEST REPORTS
          </div>

          <h2 className="mt-1 text-lg font-bold text-[#1d191d] opacity-100 [-webkit-text-fill-color:#1d191d] md:text-3xl">
            🕒 最新の在庫投稿
          </h2>

          {latestFiveReports.length === 0 ? (
            <EmptyBox text="まだ在庫投稿はありません" />
          ) : (
            <div className="mt-3 space-y-1.5 md:mt-5 md:space-y-3">
              {latestFiveReports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-lg border border-[#eaddea] bg-[#fcf9fc] px-2.5 py-2 md:rounded-2xl md:p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[11px] font-bold leading-4 text-[#241f24] opacity-100 [-webkit-text-fill-color:#241f24] md:text-base md:leading-normal">
                        {getStoreName(report.store_id)}
                      </div>

                      <div className="mt-0.5 truncate text-[10px] leading-4 text-[#766a75] opacity-100 [-webkit-text-fill-color:#766a75] md:mt-1 md:text-base md:leading-normal">
                        {getProductName(report.product_id)}
                        {report.purchase_variant && (
                          <span className="ml-1 font-bold text-[#7b5573]">
                            ({purchaseVariantLabel(report.purchase_variant)})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="whitespace-nowrap text-[12px] font-bold leading-4 text-[#241f24] opacity-100 [-webkit-text-fill-color:#241f24] md:text-base md:leading-normal">
                        {report.stock_status ? (
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold md:text-sm ${getOnlineStockHistoryStatusClass(report.stock_status)}`}
                          >
                            {formatStockStatus(report.stock_status)}
                          </span>
                        ) : report.quantity === 0 ? (
                          "在庫なし"
                        ) : (
                          `${report.quantity}枚`
                        )}
                      </div>

                      <div className="mt-0.5 text-[9px] leading-3 text-[#766a75] opacity-100 [-webkit-text-fill-color:#766a75] md:mt-0 md:text-sm md:leading-normal">
                        {formatDate(report.created_at)}
                      </div>
                    </div>
                  </div>

                  {report.comment && (
                    <div className="mt-1 rounded-md bg-white px-2 py-1.5 text-[10px] leading-4 text-[#605760] opacity-100 [-webkit-text-fill-color:#605760] md:mt-3 md:rounded-xl md:p-3 md:text-base md:leading-6">
                      {report.comment}
                    </div>
                  )}
                  {report.is_own && (
                    <button
                      type="button"
                      disabled={deletingOwnReportId === report.id}
                      onClick={() => void handleDeleteOwnReport(report.id)}
                      className="mt-2 rounded-full border border-[#d7c7d4] bg-white px-2.5 py-1 text-[9px] font-bold text-[#775f70] opacity-100 [-webkit-text-fill-color:#775f70] disabled:opacity-50 md:mt-3 md:px-3 md:py-1.5 md:text-xs"
                    >
                      {deletingOwnReportId === report.id
                        ? "削除中…"
                        : "自分の投稿を削除"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===== FOOTER ===== */}
        {/* ===== 不具合報告 ===== */}
        <section className="rounded-2xl border-2 border-[#d45a9b] bg-[#fff7fb] p-2.5 shadow-sm md:rounded-[28px] md:p-4">
          <div className="rounded-xl border border-[#eadde6] bg-white px-3.5 py-3.5 shadow-sm md:rounded-[24px] md:px-5 md:py-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] font-bold text-[#963365] md:text-[17px]">
                  💡 不具合・ご要望はこちら
                </div>
                <div className="mt-1 text-[9px] leading-4 text-[#655764] md:mt-2 md:text-[13px] md:leading-6">
                  使いにくいところや、ほしい機能などもお気軽にお寄せください
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setBugReportOpen((current) => !current);
                  setBugMessage("");
                  setBugError("");
                }}
                className="shrink-0 rounded-full bg-[#d94f98] px-3.5 py-2 text-[10px] font-bold text-white shadow-sm transition hover:bg-[#ca438b] md:px-5 md:py-3 md:text-[13px]"
              >
                {bugReportOpen ? "フォームを閉じる ∧" : "フォームを開く ∨"}
              </button>
            </div>
          </div>

          {bugReportOpen && (
            <div className="mt-3 rounded-xl border border-[#eadde6] bg-white p-3 text-[#352f34] shadow-sm md:mt-4 md:rounded-[22px] md:p-5">
              <p className="text-[10px] font-medium leading-4 text-[#4f454d] md:text-xs md:leading-5">
                不具合のご報告だけでなく、「こんな機能があるといい」「こうすると使いやすい」などのご要望もお寄せください。いただいた内容は確認し、可能な範囲で改善に努めます。
              </p>

              <label className="mt-3 block">
                <div className="mb-1 text-[11px] font-bold text-[#352f34] md:text-sm">
                  内容の種類
                  <span className="ml-1 text-[#b83f75]">必須</span>
                </div>

                <select
                  value={bugReportType}
                  onChange={(e) => {
                    setBugReportType(
                      e.target.value as "bug" | "request"
                    );
                    setBugMessage("");
                    setBugError("");
                  }}
                  className="w-full rounded-lg border border-[#cdbdca] bg-white px-3 py-2 text-[12px] text-[#2f292e] opacity-100 [color:#2f292e] [-webkit-text-fill-color:#2f292e] md:text-sm"
                >
                  <option value="bug">不具合</option>
                  <option value="request">ご要望・改善案</option>
                </select>
              </label>

              <label className="mt-3 block">
                <div className="mb-1 text-[11px] font-bold text-[#352f34] md:text-sm">
                  {bugReportType === "bug" ? "不具合内容" : "ご要望内容"}
                  <span className="ml-1 text-[#b83f75]">必須</span>
                </div>

                <textarea
                  rows={3}
                  maxLength={1000}
                  value={bugDescription}
                  onChange={(e) =>
                    setBugDescription(e.target.value)
                  }
                  placeholder={bugReportType === "bug" ? "例: 店舗をタップしても反応しない" : "例: こんな機能があると便利、ここをこうすると使いやすい"}
                  className="w-full rounded-lg border border-[#cdbdca] bg-white px-3 py-2 text-[12px] text-[#2f292e] outline-none placeholder:text-[#766c74] focus:border-[#a95e92] focus:ring-1 focus:ring-[#e7cfe0] md:text-sm"
                />
              </label>

              <div className="mt-3 rounded-lg border border-[#cdbdca] bg-[#f8f3f7] p-3">
                <div className="text-[10px] font-medium leading-4 text-[#4b4249] md:text-xs md:leading-5">
                  不具合の場合は、端末・OS・ブラウザ情報があると確認しやすくなります。要望の場合は入力不要です。自動入力を利用したい場合だけ、下のチェックを入れてください。
                  <br />
                  <span className="font-bold text-[#382f36]">
                    チェックを入れるまで表示環境情報は自動入力しません。自動入力した内容も、「送信」を押すまで送信されません。
                  </span>
                  <br />
                  <span className="font-bold text-[#382f36]">
                    取得する情報は表示環境に関するもののみです。不具合の確認・改善のために使用します。
                  </span>
                </div>

                <label className="mt-2 flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={bugAutoDetect}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setBugAutoDetect(checked);

                      if (checked) {
                        void detectBugEnvironment();
                      }
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#8c557c]"
                  />

                  <span className="text-[11px] font-bold leading-4 text-[#382f36] md:text-sm md:leading-5">
                    端末種類・OS・ブラウザ情報を自動入力する
                  </span>
                </label>

                {bugAutoDetect && (
                  <p className="mt-1.5 text-[9px] font-medium leading-4 text-[#514850] md:text-[11px]">
                    端末種類・OSの種類・ブラウザを、ブラウザから確認できる範囲で入力します。機種名とOSバージョンは正確に取得できない場合があるため自動入力しません。ブラウザバージョンは取得できた場合のみ表示します。自動入力後も修正できます。
                  </p>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                <label>
                  <div className="mb-1 text-[10px] font-bold text-[#352f34] md:text-xs">
                    端末種類
                    {bugReportType === "bug" ? (
                      <span className="ml-1 text-[#b83f75]">必須</span>
                    ) : (
                      <span className="ml-1 font-normal text-[#514850]">任意</span>
                    )}
                  </div>

                  <select
                    value={bugDeviceType}
                    onChange={(e) =>
                      setBugDeviceType(e.target.value)
                    }
                    className="w-full rounded-lg border border-[#cdbdca] bg-white px-2 py-2 text-[11px] text-[#2f292e] md:text-sm"
                  >
                    <option value="">選択</option>
                    <option value="iPhone">iPhone</option>
                    <option value="iPad">iPad</option>
                    <option value="Android">Android</option>
                    <option value="PC">PC</option>
                    <option value="その他">その他</option>
                  </select>
                </label>

                <label>
                  <div className="mb-1 text-[10px] font-bold text-[#352f34] md:text-xs">
                    機種名
                    <span className="ml-1 font-normal text-[#514850]">任意</span>
                  </div>

                  <input
                    type="text"
                    maxLength={100}
                    value={bugDeviceModel}
                    onChange={(e) =>
                      setBugDeviceModel(e.target.value)
                    }
                    placeholder="例: Pixel 9 / AQUOS sense9"
                    className="w-full rounded-lg border border-[#cdbdca] bg-white px-2 py-2 text-[11px] text-[#2f292e] placeholder:text-[#766c74] md:text-sm"
                  />
                </label>

                <label className="col-span-2 md:col-span-2">
                  <div className="mb-1 text-[10px] font-bold text-[#352f34] md:text-xs">
                    OS・バージョン
                    {bugReportType === "bug" ? (
                      <span className="ml-1 text-[#b83f75]">必須</span>
                    ) : (
                      <span className="ml-1 font-normal text-[#514850]">任意</span>
                    )}
                  </div>

                  <input
                    type="text"
                    value={bugOsDisplay}
                    onChange={(e) =>
                      handleBugOsDisplayChange(e.target.value)
                    }
                    placeholder="例: iOS 26.5 / Android 15 / Windows 11 / macOS 15.6"
                    className="w-full rounded-lg border border-[#cdbdca] bg-white px-2 py-2 text-[11px] text-[#2f292e] placeholder:text-[#766c74] md:text-sm"
                  />
                  <div className="mt-1 text-[9px] font-medium leading-4 text-[#514850] md:text-[11px]">
                    自動入力を利用した場合も、OSバージョンは手動で入力してください。
                  </div>
                </label>

                <label className="md:col-span-2">
                  <div className="mb-1 text-[10px] font-bold text-[#352f34] md:text-xs">
                    ブラウザ
                    <span className="ml-1 font-normal text-[#514850]">任意</span>
                  </div>

                  <select
                    value={bugBrowser}
                    onChange={(e) => {
                      setBugBrowser(e.target.value);

                      if (e.target.value !== "その他") {
                        setBugBrowserOther("");
                      }
                    }}
                    className="w-full rounded-lg border border-[#cdbdca] bg-white px-2 py-2 text-[11px] text-[#2f292e] md:text-sm"
                  >
                    <option value="">選択</option>
                    <option value="Chrome">Chrome</option>
                    <option value="Safari">Safari</option>
                    <option value="Brave">Brave</option>
                    <option value="Edge">Edge</option>
                    <option value="Opera">Opera</option>
                    <option value="Firefox">Firefox</option>
                    <option value="その他">その他</option>
                  </select>
                </label>

                {bugBrowser === "その他" && (
                  <label className="md:col-span-2">
                    <div className="mb-1 text-[10px] font-bold text-[#352f34] md:text-xs">
                      ブラウザ名
                      <span className="ml-1 text-[#b83f75]">必須</span>
                    </div>

                    <input
                      type="text"
                      maxLength={100}
                      value={bugBrowserOther}
                      onChange={(e) =>
                        setBugBrowserOther(e.target.value)
                      }
                      placeholder="ブラウザ名を入力"
                      className="w-full rounded-lg border border-[#cdbdca] bg-white px-2 py-2 text-[11px] text-[#2f292e] placeholder:text-[#766c74] md:text-sm"
                    />
                  </label>
                )}

                {bugBrowserVersion && (
                  <div className="col-span-2 text-[10px] font-medium text-[#4f454d] md:col-span-4 md:text-xs">
                    ブラウザバージョン: {bugBrowserVersion}
                    <span className="ml-1">
                      (自動入力で取得できた場合のみ表示)
                    </span>
                  </div>
                )}
              </div>

              <details className="mt-3 rounded-lg border border-[#cdbdca] bg-[#faf7f9]">
                <summary className="cursor-pointer list-none px-3 py-2 text-[10px] font-bold text-[#40363e] md:text-xs">
                  端末・OS情報の確認方法を見る ∨
                </summary>

                <div className="border-t border-[#d8cad6] px-3 py-2 text-[10px] font-medium leading-4 text-[#4b4249] md:text-xs md:leading-5">
                  <p>
                    <strong>iPhone / iPad</strong>
                    <br />
                    設定 → 一般 → 情報 → iOSバージョン / iPadOSバージョン
                  </p>

                  <p className="mt-2">
                    <strong>Android</strong>
                    <br />
                    設定 → デバイス情報 / 端末情報 → Androidバージョン
                    <br />
                    ※機種によって「デバイス情報」「端末情報」など表示名が異なります。
                  </p>

                  <p className="mt-2">
                    <strong>機種名</strong>
                    <br />
                    Androidは設定 → デバイス情報 / 端末情報などで確認できます。iPhone / iPadは設定 → 一般 → 情報の「機種名」で確認できます。
                  </p>

                  <p className="mt-2">
                    <strong>ブラウザ</strong>
                    <br />
                    現在このページを開いているChrome / Safari / Brave / Edge / Operaなどを選択してください。
                  </p>
                </div>
              </details>

              <div className="mt-3 rounded-lg border border-[#cdbdca] bg-[#faf7f9] px-3 py-2 text-[10px] font-medium leading-4 text-[#4b4249] md:text-xs md:leading-5">
  <div className="font-bold text-[#352f34]">
    動作環境について
  </div>

  <p className="mt-1">
    本サイトは、比較的新しいOS・ブラウザでのご利用を推奨しています。
    古いOS・ブラウザでは、表示の崩れやタップ操作が反応しないなど、
    一部機能が正常に動作しない場合があります。
  </p>

  <p className="mt-1">
    iPhone・iPadでは、iOS / iPadOS 16.4以降を目安にご利用ください。
    Android・Windows等をご利用の場合も、OSとブラウザを最新の状態にしてご利用ください。
  </p>
</div>

              <label className="mt-3 block">
                <div className="mb-1 text-[10px] font-bold text-[#352f34] md:text-xs">
                  スクリーンショット
                  <span className="ml-1 font-normal text-[#514850]">
                    任意・最大5枚・1枚5MBまで
                  </span>
                </div>

                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);

                    if (files.length > 5) {
                      setBugError("画像は5枚まで添付できます。");
                      setBugImages(files.slice(0, 5));
                      return;
                    }

                    setBugError("");
                    setBugImages(files);
                  }}
                  className="block w-full text-[10px] font-medium text-[#40363e] file:mr-2 file:rounded-full file:border-0 file:bg-[#ead8e6] file:px-3 file:py-2 file:text-[10px] file:font-bold file:text-[#533e4d] md:text-xs md:file:text-xs"
                />

                {bugImages.length > 0 && (
                  <div className="mt-1.5 text-[10px] font-medium text-[#4f454d] md:text-xs">
                    選択中: {bugImages.length}枚
                  </div>
                )}
              </label>

              {bugError && (
                <div className="mt-3 rounded-lg bg-[#fde7ec] px-3 py-2 text-[10px] font-bold leading-4 text-[#7d263f] md:text-xs">
                  {bugError}
                </div>
              )}

              {bugMessage && (
                <div className="mt-3 rounded-lg bg-[#edf5ec] px-3 py-2 text-[10px] font-bold leading-4 text-[#365234] md:text-xs">
                  {bugMessage}
                </div>
              )}

              <button
                type="button"
                onClick={handleBugReport}
                disabled={bugSubmitting}
                className="mt-3 rounded-lg bg-[#5e4b59] px-4 py-2 text-[11px] font-bold text-white transition hover:bg-[#4f3f4b] disabled:opacity-50 md:text-sm"
              >
                {bugSubmitting
                  ? "送信中…"
                  : bugReportType === "bug"
                    ? "不具合報告を送信"
                    : "ご要望を送信"}
              </button>
            </div>
          )}
        </section>
        <section className="rounded-xl border border-[#eaddea] bg-white/80 px-3 py-3 text-[#655764] md:rounded-2xl md:px-5 md:py-4">
          <div className="text-[11px] font-bold text-[#5d4658] md:text-sm">更新履歴</div>
          <div className="mt-2 space-y-1.5 text-[9px] leading-4 md:text-xs md:leading-5">
            <div className="space-y-2">
  <div className="grid grid-cols-[auto_1fr] gap-x-3">
    <span className="font-bold whitespace-nowrap">v3. 2026/9/5</span>
    <div>在庫あり/なし のみの投稿に対応</div>
  </div>

  <div className="grid grid-cols-[auto_1fr] gap-x-3">
    <span className="font-bold whitespace-nowrap">v2. 2026/9/5</span>
    <div className="space-y-0.5">
      <div>オンラインの発送予定/初週見込みを追加</div>
      <div>店舗状況コメント、X共有を追加</div>
      <div>主要オンラインショップの商品別直リンクを追加</div>
      <div>在庫あり／初週見込みの絞り込みに対応</div>
    </div>
  </div>

  <div className="grid grid-cols-[auto_1fr] gap-x-3">
    <span className="font-bold whitespace-nowrap">v1. 2026/9/2</span>
    <div>在庫チェッカー公開</div>
  </div>
</div>
          </div>
        </section>

        <footer className="pb-3 pt-4 text-center md:pb-4 md:pt-5">
          <div className="text-[10px] leading-4 text-[#403940] md:text-sm md:leading-6">
            <p>
  当サイトはファンによる非公式の在庫情報共有サイトです。
  <br className="md:hidden" />
  所属事務所・レコード会社・各販売店等とは無関係です。
</p>

                        <p className="mt-1 text-[9px] text-[#6f686e] md:mt-2 md:text-xs md:text-[#403940]">
              King & Prince 在庫チェッカー
            </p>

            <p className="mt-1 text-[9px] md:mt-2 md:text-xs">
              <a
                href="/privacy"
                className="text-[#6f686e] underline underline-offset-2 hover:text-[#b95489] md:text-[#403940]"
              >
                プライバシーについて
              </a>
            </p>
          </div>
        </footer>
      </div>

      {/* X共有モーダル */}
      {xShareOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="x-share-title"
          onClick={() => setXShareOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-[#e4d6e4] bg-white p-5 shadow-2xl md:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="x-share-title"
                  className="text-lg font-bold text-[#2f2830] md:text-xl"
                >
                  𝕏 在庫情報を共有
                </h2>
                <p className="mt-1 text-[12px] leading-5 text-[#766a74] md:text-sm">
                  投稿する内容を選んでください
                </p>
              </div>

              <button
                type="button"
                onClick={() => setXShareOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f4edf3] text-lg font-bold text-[#6d5a69] transition hover:bg-[#eadde8]"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => openXShare(false)}
                className="w-full rounded-2xl border border-[#d7bdd4] bg-[#fbf7fa] px-4 py-3.5 text-left transition hover:bg-[#f4e9f2]"
              >
                <div className="text-sm font-bold text-[#5f3d59] md:text-base">
                  ハッシュタグだけで投稿
                </div>
                <div className="mt-1 text-[12px] text-[#8a7484] md:text-sm">
                  #KP在庫ここにあるよ
                </div>
              </button>

              <button
                type="button"
                onClick={() => openXShare(true)}
                className="w-full rounded-2xl border border-[#ccb6dd] bg-[#f7f1fb] px-4 py-3.5 text-left transition hover:bg-[#eee3f5]"
              >
                <div className="text-sm font-bold text-[#594169] md:text-base">
                  このページのリンクもつけて投稿
                </div>
                <div className="mt-1 text-[12px] leading-5 text-[#806f88] md:text-sm">
                  #KP在庫ここにあるよ + 在庫チェッカーのURL
                </div>
              </button>
            </div>

            <p className="mt-4 text-center text-[10px] leading-4 text-[#9a8d98] md:text-xs">
              Xの投稿画面が開きます。投稿前に内容を自由に編集できます。
            </p>
          </div>
        </div>
      )}

      {/* トップへ戻る */}
      <a
        href="#top"
        aria-label="サイトトップに戻る"
        className="fixed bottom-4 left-3 z-50 flex h-[56px] w-[56px] flex-col items-center justify-center rounded-full border-[3px] border-white bg-[#d95c9d] text-center text-white shadow-lg transition hover:-translate-y-1 hover:bg-[#c84d8d] md:bottom-7 md:left-7 md:h-[82px] md:w-[82px] md:border-4"
      >
        <span className="text-base leading-none md:text-2xl">↑</span>
        <span className="mt-0.5 text-[8px] font-bold leading-tight md:mt-1 md:text-[11px]">
          サイトトップ
          <br />
          に戻る
        </span>
      </a>
    </main>
  );
}

function getFirstWeekCutoffDisplay(store: Store) {
  return store.first_week_cutoff_note ?? "要確認";
}

function getOnlineStockStatusClass(
  status: OnlineStockStatus
) {
  if (status === "in_stock") {
    return "bg-[#e6f5e9] text-[#21663a] border border-[#a8d7b3]";
  }
  if (status === "low_stock") {
    return "bg-[#fff2d9] text-[#8a5a13] border border-[#e8c77d]";
  }
  if (status === "backorder") {
    return "bg-[#e8eefc] text-[#38588f] border border-[#b8c8ef]";
  }
  return "bg-[#2a252a] text-white border border-[#2a252a]";
}


function getOnlineStockHistoryStatusClass(
  status: OnlineStockStatus
) {
  if (status === "sold_out") {
    return "bg-white text-[#2a252a] border border-[#9b9499]";
  }

  return getOnlineStockStatusClass(status);
}


function StoreCard({
  store,
  products,
  getLatestReport,
  formatDate,
  onDeleteOwnReport,
  deletingOwnReportId,
  onlineProductFirstWeekStatusMap,
  onlineFirstWeekFilter,
  stockOnly,
  commentCount,
  onCommentsChanged,
}: {
  store: Store;
  products: Product[];
  getLatestReport: (
    storeId: number,
    productId: number,
    purchaseVariant?: PurchaseVariant | "unknown"
  ) => InventoryReport | null;
  formatDate: (dateString: string) => string;
  onDeleteOwnReport: (reportId: number) => Promise<void>;
  deletingOwnReportId: number | null;
  onlineProductFirstWeekStatusMap: Map<string, OnlineProductFirstWeekStatusRow>;
  onlineFirstWeekFilter: OnlineFirstWeekFilter;
  stockOnly: boolean;
  commentCount: number;
  onCommentsChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [storeInfoOpen, setStoreInfoOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<StoreComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [deletingOwnCommentId, setDeletingOwnCommentId] = useState<number | null>(null);
  const [applaudingCommentId, setApplaudingCommentId] = useState<number | null>(null);
  const [commentMessage, setCommentMessage] = useState("");
  const [commentError, setCommentError] = useState("");

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    setCommentError("");

    let clientId = localStorage.getItem("kp_inventory_client_id");
    if (!clientId) {
      clientId = crypto.randomUUID();
      localStorage.setItem("kp_inventory_client_id", clientId);
    }

    const { data, error } = await supabase.rpc(
      "get_store_comments",
      { p_store_id: store.id, p_limit: 20, p_client_id: clientId }
    );

    if (error) {
      setCommentError(
        `コメントを読み込めませんでした: ${error.message}`
      );
      setCommentsLoading(false);
      return;
    }

    setComments((data ?? []) as StoreComment[]);
    setCommentsLoading(false);
  }, [store.id]);

  async function toggleComments() {
    const next = !commentsOpen;
    setCommentsOpen(next);
    setCommentMessage("");
    setCommentError("");
    if (next) {
      await loadComments();
    }
  }

  async function handleStoreCommentSubmit() {
    setCommentMessage("");
    setCommentError("");

    const body = commentBody.trim();

    if (!body) {
      setCommentError("コメントを入力してください。");
      return;
    }

    if (body.length > 300) {
      setCommentError("コメントは300文字以内で入力してください。");
      return;
    }

    if (/https?:\/\/|www\./i.test(body)) {
      setCommentError("店舗コメントにはURLを投稿できません。");
      return;
    }

    setCommentSubmitting(true);

    try {
      let clientId = localStorage.getItem("kp_inventory_client_id");
      if (!clientId) {
        clientId = crypto.randomUUID();
        localStorage.setItem("kp_inventory_client_id", clientId);
      }

      const { error } = await supabase.rpc(
        "submit_store_comment",
        {
          p_store_id: store.id,
          p_body: body,
          p_client_id: clientId,
        }
      );

      if (error) {
        setCommentError(error.message);
        return;
      }

      setCommentBody("");
      setCommentMessage("コメントを投稿しました。ありがとうございます。");
      await Promise.all([loadComments(), onCommentsChanged()]);
    } catch (error) {
      console.error(error);
      setCommentError(
        "コメント投稿中にエラーが発生しました。もう一度お試しください。"
      );
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function handleApplause(commentId: number) {
    setCommentError("");
    let clientId = localStorage.getItem("kp_inventory_client_id");

    if (!clientId) {
      clientId = crypto.randomUUID();
      localStorage.setItem("kp_inventory_client_id", clientId);
    }

    setApplaudingCommentId(commentId);

    try {
      const { error } = await supabase.rpc("toggle_store_comment_applause", {
        p_comment_id: commentId,
        p_client_id: clientId,
      });

      if (error) {
        setCommentError(error.message);
        return;
      }

      await loadComments();
    } catch (error) {
      console.error(error);
      setCommentError("応援を更新できませんでした。もう一度お試しください。");
    } finally {
      setApplaudingCommentId(null);
    }
  }

  async function handleDeleteOwnStoreComment(commentId: number) {
    setCommentMessage("");
    setCommentError("");

    if (!window.confirm("自分の店舗コメントを削除しますか?")) return;

    let clientId = localStorage.getItem("kp_inventory_client_id");
    if (!clientId) {
      setCommentError("この端末から投稿したことを確認できないため削除できません。");
      return;
    }

    setDeletingOwnCommentId(commentId);

    try {
      const { error } = await supabase.rpc("delete_own_store_comment", {
        p_comment_id: commentId,
        p_client_id: clientId,
      });

      if (error) {
        setCommentError(error.message);
        return;
      }

      setCommentMessage("自分のコメントを削除しました。");
      await Promise.all([loadComments(), onCommentsChanged()]);
    } catch (error) {
      console.error(error);
      setCommentError("コメント削除中にエラーが発生しました。もう一度お試しください。");
    } finally {
      setDeletingOwnCommentId(null);
    }
  }

  const online = isOnlineStore(store);

  const allStoreProducts = online
    ? products
    : products.filter((product) => !product.online_only);

  const storeProducts = online
    ? allStoreProducts.filter((product) => {
        if (
          isJoshinStore(store) &&
          (product.id === 8 || product.id === 9)
        ) {
          return false;
        }

        const status =
          onlineProductFirstWeekStatusMap.get(
            `${store.id}-${product.id}`
          ) ?? null;
        const value = status?.status ?? "check";
        if (onlineFirstWeekFilter === "all") return true;
        if (onlineFirstWeekFilter === "actionable") return value !== "unlikely";
        return value === onlineFirstWeekFilter;
      })
    : allStoreProducts;

  const displayedStoreProducts = stockOnly
    ? storeProducts.filter((product) =>
        isInventoryReportInStock(
          getLatestReport(store.id, product.id),
          online
        )
      )
    : storeProducts;

  const storeReports = storeProducts
    .map((product) =>
      getLatestReport(store.id, product.id)
    )
    .filter(
      (report): report is InventoryReport =>
        report !== null
    );

  const newestStoreReport =
    storeReports.length > 0
      ? storeReports.reduce((newest, current) =>
          new Date(current.created_at).getTime() >
          new Date(newest.created_at).getTime()
            ? current
            : newest
        )
      : null;

  return (
    <article className="rounded-2xl border border-[#e8d9e7] bg-white p-3.5 shadow-sm md:rounded-3xl md:p-6">
            {/* 店舗基本情報 ＋ 集計対象 */}
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-4">
        {/* 左: 店舗名・所在地・営業時間 */}
        <div className="min-w-0">
          <h3 className="text-base font-bold leading-5 text-[#1d191d] md:text-2xl md:leading-snug">
            {getDisplayStoreName(store)}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#403940] md:text-sm">
            <span className="whitespace-nowrap">
              {online
                ? "🛒 オンラインショップ"
                : `📍 ${store.prefecture}${store.city ? ` ${store.city}` : ""}`}
            </span>

            {!online && store.business_hours && (
              <span className="whitespace-nowrap font-bold text-[#3e373e]">
                🕒 営業時間: {formatBusinessHours(store.business_hours)}
              </span>
            )}
          </div>

          {!online && (() => {
            const cutoff = getFirstWeekCutoffDisplay(store);
            const cutoffConfirmed = cutoff !== "要確認";
            return (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold md:px-3 md:py-1.5 md:text-sm ${
                    cutoffConfirmed
                      ? "border-[#9dbce5] bg-[#eef5ff] text-[#315f96]"
                      : "border-[#d7c7a0] bg-[#fff8e5] text-[#6a5727]"
                  }`}
                >
                  {cutoffConfirmed ? "🔵" : "⏰"} 初週締め時間: {cutoff}
                  {store.first_week_verified_at && (
                    <span className="ml-1 font-normal">({formatDate(store.first_week_verified_at)}確認)</span>
                  )}
                </span>
              </div>
            );
          })()}
        </div>

        {/* スマホ: 下 / PC: 右 */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1 md:mt-0 md:justify-end md:gap-2">
          {store.oricon_target === true && (
            <span className="whitespace-nowrap rounded-md border border-[#bd4f88] bg-[#d9609b] px-2 py-0.5 text-[9px] font-bold text-white md:rounded-xl md:px-4 md:py-2 md:text-base">
              オリコン対象
            </span>
          )}

          {store.billboard_status === "target" && (
            <span className="whitespace-nowrap rounded-md border border-[#7250a5] bg-[#835ab3] px-2 py-0.5 text-[9px] font-bold text-white md:rounded-xl md:px-4 md:py-2 md:text-base">
              Billboard 対象
            </span>
          )}

          {store.billboard_status === "check_store" && (
            <>
              <span className="whitespace-nowrap rounded-md border border-[#9e85b8] bg-[#eee7f4] px-2 py-0.5 text-[9px] font-bold text-[#5b486b] md:rounded-xl md:px-4 md:py-2 md:text-base">
                Billboard 要確認
              </span>
            </>
          )}

          {store.billboard_status === "not_target" && (
            <span className="whitespace-nowrap rounded-md border border-[#a9a2a8] bg-[#ece9ec] px-2 py-0.5 text-[9px] font-bold text-[#595159] md:rounded-xl md:px-4 md:py-2 md:text-base">
              Billboard 対象外
            </span>
          )}
        </div>
      </div>

      <div className="mt-2.5">
        <button
          type="button"
          onClick={() => setStoreInfoOpen((current) => !current)}
          className="rounded-xl border border-[#cdb9ca] bg-white px-3 py-2 text-left text-[#6d4966] shadow-sm transition hover:bg-[#faf4f8] md:rounded-2xl md:px-4 md:py-2.5"
        >
          <span className="block text-[11px] font-bold md:text-sm">
            📨 店舗情報を提供 {storeInfoOpen ? "∧" : "∨"}
          </span>
          <span className="mt-0.5 block text-[9px] font-bold text-[#8b6a83] md:text-xs">
            {online
              ? "Billboard・その他の店舗情報はこちら"
              : "⏰ 初週集計の締め時間をご存じの方はこちら"}
          </span>
        </button>
      </div>

      {storeInfoOpen && (
        <StoreInfoContributionForm
          store={store}
          products={storeProducts}
          onClose={() => setStoreInfoOpen(false)}
        />
      )}

      {/* 在庫 */}
      <div className="mt-3 rounded-xl bg-[#f8f1f7] p-2.5 md:mt-5 md:rounded-2xl md:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] font-bold tracking-[0.12em] text-[#a36494] md:text-sm">
            STOCK
          </div>

          {newestStoreReport && (
            <div className="text-[9px] text-[#8e848d] md:text-sm">
              最終更新 {formatDate(newestStoreReport.created_at)}
            </div>
          )}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-2 lg:mt-4 lg:grid-cols-4 lg:gap-3">
          {displayedStoreProducts.map((product) => {
            const report = getLatestReport(
              store.id,
              product.id
            );
            const hasVariants =
              online && hasPurchaseVariantLinks(store, product);
            const specialReport = hasVariants
              ? getLatestReport(store.id, product.id, "special")
              : null;
            const noSpecialReport = hasVariants
              ? getLatestReport(store.id, product.id, "no_special")
              : null;

            return (
              <div
                key={product.id}
                className="flex min-w-0 flex-col rounded-lg border border-[#e5d7e4] bg-white px-2.5 py-2 md:rounded-2xl md:px-4 md:py-3"
              >
                {(() => {
                  const productLinks = online
                    ? getVerifiedOnlineProductLinks(store, product)
                    : [];

                  if (productLinks.length === 0) {
                    return (
                      <div className="text-[11px] font-bold leading-4 text-[#211c21] md:min-h-[3rem] md:text-[17px] md:leading-6">
                        {product.name}
                      </div>
                    );
                  }

                  if (productLinks.length === 1) {
                    const link = productLinks[0];

                    return (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${product.name}の商品ページを開く`}
                        className="group block rounded-md border border-[#dac8e5] bg-[#fbf7fd] px-2 py-1.5 text-[#5e3f73] transition hover:border-[#b996cf] hover:bg-[#f4ebf9] md:min-h-[3rem] md:rounded-lg md:px-2.5 md:py-2"
                      >
                        <div className="text-[11px] font-bold leading-4 underline decoration-[#b996cf] decoration-1 underline-offset-2 group-hover:decoration-2 md:text-[17px] md:leading-6">
                          {product.name}
                          <span
                            aria-hidden="true"
                            className="ml-1 inline-block text-[10px] no-underline md:text-sm"
                          >
                            ↗︎
                          </span>
                        </div>
                        <div className="mt-1 text-[9px] font-bold text-[#8a6c9d] no-underline md:text-[11px]">
                          {link.label}
                        </div>
                      </a>
                    );
                  }

                  return (
                    <div className="rounded-md border border-[#dac8e5] bg-[#fbf7fd] px-2 py-1.5 md:min-h-[3rem] md:rounded-lg md:px-2.5 md:py-2">
                      <div className="text-[11px] font-bold leading-4 text-[#5e3f73] md:text-[17px] md:leading-6">
                        {product.name}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5 md:mt-2">
                        {productLinks.map((link) => (
                          <a
                            key={link.url}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${product.name} ${link.label}の商品ページを開く`}
                            className="inline-flex items-center rounded-full border border-[#c7add8] bg-white px-2 py-1 text-[9px] font-bold text-[#66447b] underline decoration-[#b996cf] underline-offset-2 transition hover:bg-[#f0e5f6] md:px-2.5 md:text-[11px]"
                          >
                            {link.label}
                            <span aria-hidden="true" className="ml-1 no-underline">
                              ↗︎
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {hasVariants ? (
                  <div className="mt-2 space-y-2">
                    {[
                      ["先着特典あり", specialReport],
                      ["特典なし", noSpecialReport],
                    ].map(([label, variantReport]) => {
                      const currentReport = variantReport as InventoryReport | null;
                      return (
                        <div key={label as string} className="rounded-lg border border-[#eaddea] bg-[#fcf9fc] px-2 py-1.5">
                          <div className="text-[9px] font-bold text-[#6d4966] md:text-xs">
                            {label as string}
                          </div>
                          {!currentReport ? (
                            <div className="mt-0.5 text-[10px] font-bold text-[#746b73] md:text-sm">
                              情報なし
                            </div>
                          ) : currentReport.stock_status ? (
                            <>
                              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold md:text-sm ${getOnlineStockStatusClass(currentReport.stock_status)}`}>
                                {formatStockStatus(currentReport.stock_status)}
                              </span>
                              <div className="mt-0.5 text-[9px] text-[#968d95] md:text-xs">
                                {formatDate(currentReport.created_at)}
                              </div>
                              {currentReport.is_own && (
                                <button
                                  type="button"
                                  disabled={deletingOwnReportId === currentReport.id}
                                  onClick={() => void onDeleteOwnReport(currentReport.id)}
                                  className="mt-2 rounded-full border border-[#d7c7d4] bg-white px-2.5 py-1 text-[9px] font-bold text-[#775f70] opacity-100 [-webkit-text-fill-color:#775f70] disabled:opacity-50 md:px-3 md:py-1.5 md:text-xs"
                                >
                                  {deletingOwnReportId === currentReport.id
                                    ? "削除中…"
                                    : "自分の投稿を削除"}
                                </button>
                              )}
                            </>
                          ) : null}
                        </div>
                      );
                    })}

                  </div>
                ) : !report ? (
                  <div className="mt-1.5 text-[11px] font-bold text-[#625861] md:mt-2 md:text-base">
                    情報なし
                  </div>
                ) : report.stock_status ? (
                  <div className="mt-1.5 md:mt-4">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold md:px-3 md:py-1.5 md:text-base ${getOnlineStockStatusClass(report.stock_status)}`}>
                      {formatStockStatus(report.stock_status)}
                    </span>
                  </div>
                ) : report.quantity === 0 ? (
                  <div className="mt-1.5 md:mt-4">
                    <span className="inline-block rounded-full bg-[#2a252a] px-2 py-0.5 text-[10px] font-bold text-white md:px-3 md:py-1.5 md:text-base">
                      在庫なし
                    </span>
                  </div>
                ) : (
                  <div className="mt-1.5 text-base font-bold text-[#bd568c] md:mt-4 md:text-2xl">
                    {report.quantity}
                    <span className="ml-0.5 text-[10px] md:ml-1 md:text-base">
                      枚
                    </span>
                  </div>
                )}

                {!hasVariants && report && (
                  <div className="mt-0.5 text-[9px] text-[#968d95] md:mt-1 md:text-sm">
                    {formatDate(report.created_at)}
                  </div>
                )}

                {online && (
                  <OnlineProductFirstWeekBadge
                    status={onlineProductFirstWeekStatusMap.get(`${store.id}-${product.id}`) ?? null}
                    formatDate={formatDate}
                  />
                )}

                {!hasVariants && report?.comment && (
                  <div className="mt-auto pt-2 md:pt-3">
                    <div className="rounded-md bg-[#faedf4] px-2 py-1.5 text-[10px] leading-4 text-[#594d56] md:rounded-xl md:px-3 md:py-2.5 md:text-base md:leading-6">
                      💬 {report.comment}
                    </div>
                  </div>
                )}
                {!hasVariants && report?.is_own && (
                  <button
                    type="button"
                    disabled={deletingOwnReportId === report.id}
                    onClick={() => void onDeleteOwnReport(report.id)}
                    className="mt-2 rounded-full border border-[#d7c7d4] bg-white px-2.5 py-1 text-[9px] font-bold text-[#775f70] opacity-100 [-webkit-text-fill-color:#775f70] disabled:opacity-50 md:mt-3 md:px-3 md:py-1.5 md:text-xs"
                  >
                    {deletingOwnReportId === report.id
                      ? "削除中…"
                      : "自分の投稿を削除"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2.5 rounded-xl border border-[#eaddea] bg-[#fbf7fa] md:mt-4 md:rounded-2xl">
        <button
          type="button"
          onClick={() => void toggleComments()}
          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left md:px-4 md:py-3.5"
        >
          <div>
            <div className="text-[11px] font-bold text-[#4e424b] md:text-base">
              💬 店舗コメント({commentCount})
            </div>
            <div className="mt-0.5 text-[9px] text-[#81757f] md:text-xs">
              混雑・レジ・入荷予定・売場状況などを共有できます
            </div>
          </div>
          <span className="shrink-0 text-[#9b6c91]">
            {commentsOpen ? "∧" : "∨"}
          </span>
        </button>

        {commentsOpen && (
          <div className="border-t border-[#eaddea] px-3 pb-3 pt-3 md:px-4 md:pb-4 md:pt-4">
            {commentsLoading ? (
              <div className="text-[11px] text-[#81757f] md:text-sm">
                コメントを読み込み中…
              </div>
            ) : comments.length === 0 ? (
              <div className="rounded-lg bg-white p-3 text-[11px] text-[#81757f] md:rounded-xl md:text-sm">
                まだコメントはありません。
              </div>
            ) : (
              <div className="space-y-2">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-lg border border-[#eee3ec] bg-white px-3 py-2.5 md:rounded-xl md:px-4 md:py-3"
                  >
                    <div className="whitespace-pre-wrap break-words text-[11px] leading-5 text-[#403940] md:text-sm md:leading-6">
                      {comment.body}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[9px] text-[#948a92] md:text-xs">
                        {formatDate(comment.created_at)}
                      </div>
                      <button
                        type="button"
                        disabled={applaudingCommentId === comment.id}
                        onClick={() => void handleApplause(comment.id)}
                        className={`rounded-full border px-2.5 py-1 text-[9px] font-bold disabled:opacity-50 md:px-3 md:py-1.5 md:text-xs ${
                          comment.applauded_by_me
                            ? "border-[#d99abc] bg-[#f8e4ef] text-[#8a466b]"
                            : "border-[#dfd2dc] bg-white text-[#765f70]"
                        }`}
                      >
                        👏 応援 {comment.applause_count > 0 ? comment.applause_count : ""}
                      </button>
                      {comment.is_own && (
                        <button
                          type="button"
                          disabled={deletingOwnCommentId === comment.id}
                          onClick={() => void handleDeleteOwnStoreComment(comment.id)}
                          className="rounded-full border border-[#d7c7d4] bg-white px-2.5 py-1 text-[9px] font-bold text-[#775f70] opacity-100 [-webkit-text-fill-color:#775f70] disabled:opacity-50 md:px-3 md:py-1.5 md:text-xs"
                        >
                          {deletingOwnCommentId === comment.id
                            ? "削除中…"
                            : "自分のコメントを削除"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 rounded-xl bg-white p-3 md:mt-4 md:p-4">
              <div className="text-[10px] font-bold text-[#4e424b] md:text-sm">
                コメントを追加
              </div>
              <textarea
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                maxLength={300}
                rows={3}
                placeholder="例)レジは5人ほど並んでいます／店員さんに再入荷予定ありと確認しました"
                className="mt-2 w-full rounded-lg border border-[#d8cad7] bg-white p-2.5 text-[11px] outline-none focus:border-[#bb79a7] focus:ring-2 focus:ring-[#eedbea] md:rounded-xl md:p-3 md:text-sm"
              />
              <div className="mt-1 text-[9px] leading-4 text-[#81757f] md:text-xs md:leading-5">
                個人情報・URLの投稿はお控えください。リアルタイム情報は時間とともに変わるため、参考情報としてご利用ください。
              </div>

              {commentError && (
                <div className="mt-2 rounded-lg bg-red-50 p-2 text-[10px] font-bold text-red-700 md:text-sm">
                  {commentError}
                </div>
              )}
              {commentMessage && (
                <div className="mt-2 rounded-lg bg-green-50 p-2 text-[10px] font-bold text-green-700 md:text-sm">
                  {commentMessage}
                </div>
              )}

              <button
                type="button"
                disabled={commentSubmitting}
                onClick={() => void handleStoreCommentSubmit()}
                className="mt-2.5 rounded-lg bg-[#6d4966] px-4 py-2 text-[11px] font-bold text-white disabled:opacity-50 md:rounded-xl md:text-sm"
              >
                {commentSubmitting ? "投稿中…" : "コメントを投稿"}
              </button>
            </div>
          </div>
        )}
      </div>

      {!online && (
        <button
          onClick={() => setOpen((current) => !current)}
          className="mt-2.5 rounded-full bg-[#f0dfec] px-3 py-1.5 text-[11px] font-bold text-[#6d4966] md:mt-4 md:px-4 md:py-2.5 md:text-base"
        >
          {open
            ? "店舗情報を閉じる ∧"
            : "店舗情報を見る ∨"}
        </button>
      )}

      {(online || open) && (
        <div className="mt-2 rounded-xl border border-[#e8d9e7] bg-[#fcf9fc] p-3 md:mt-3 md:rounded-2xl md:p-5">
          {online ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
                <div className="text-[12px] font-bold md:text-base">
                  🛒 オンラインショップ
                </div>

                {store.online_url && (
                  <a
                    href={store.online_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-full bg-[#211d21] px-4 py-2 text-[11px] font-bold text-white md:px-5 md:py-2.5 md:text-base"
                  >
                    <span>商品ページを見る</span>
                    <ExternalArrow />
                  </a>
                )}
              </div>

              <div className="mt-3 rounded-xl border border-[#ead7a7] bg-[#fff9e8] px-3 py-2 text-[10px] leading-5 text-[#6f5724] md:px-4 md:py-3 md:text-sm md:leading-6">
                <span className="font-bold">初週集計について: </span>オンラインは在庫や発送・お届け予定が随時変わります。表示は確認時点の目安であり、初週集計への反映を保証するものではありません。<strong>購入前にご自身の配送先で表示される発送・お届け予定を必ずご確認ください。</strong>
              </div>

              {store.id === 308 && (
                <div className="mt-3 rounded-xl border border-[#ead7a7] bg-[#fff9e8] px-3 py-2 text-[10px] font-bold leading-5 text-[#6f5724] md:px-4 md:py-3 md:text-sm md:leading-6">
                  ※Amazonは、販売元・出荷元ともにAmazon.co.jpの商品が集計対象です。購入時にご確認ください。
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-[2fr_1fr] md:gap-4">
                <div>
                  <div className="text-[11px] font-bold text-[#2b252b] md:text-base">
                    📍 住所
                  </div>

                  <div className="mt-0.5 text-[11px] leading-5 text-[#655c64] opacity-100 [-webkit-text-fill-color:#655c64] md:mt-1 md:text-base md:leading-6">
                    {store.address ? (
                      <>
                        <div>{store.address}</div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              store.address
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-[#d8c4d4] bg-white px-3 py-1.5 text-[11px] font-bold text-[#6f4d65] opacity-100 [-webkit-text-fill-color:#6f4d65] hover:bg-[#f7eef5] md:text-sm"
                          >
                            Googleマップ
                          </a>

                          <a
                            href={`https://maps.apple.com/?q=${encodeURIComponent(
                              store.address
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-[#d8c4d4] bg-white px-3 py-1.5 text-[11px] font-bold text-[#6f4d65] opacity-100 [-webkit-text-fill-color:#6f4d65] hover:bg-[#f7eef5] md:text-sm"
                          >
                            Appleマップ
                          </a>
                        </div>
                      </>
                    ) : (
                      "情報なし"
                    )}
                  </div>
                </div>

                <div className="md:border-l md:border-[#eaddea] md:pl-5">
                  <div className="text-[11px] font-bold text-[#2b252b] md:text-base">
                    ☎️ 電話番号
                  </div>

                  {store.phone ? (
                    <a
                      href={`tel:${store.phone}`}
                      className="mt-0.5 inline-block text-[11px] font-bold text-[#ad568a] md:mt-1 md:text-base"
                    >
                      {store.phone}
                    </a>
                  ) : (
                    <div className="mt-0.5 text-[11px] text-[#80777f] md:mt-1 md:text-base">
                      情報なし
                    </div>
                  )}
                </div>
              </div>

              {store.official_url && (
                <div className="mt-3 border-t border-[#eaddea] pt-3 md:mt-4 md:pt-4">
                  <a
                    href={store.official_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-full bg-[#211d21] px-4 py-2 text-[11px] font-bold text-white md:px-5 md:py-2.5 md:text-base"
                  >
                    <span>公式ページを見る</span>
                    <ExternalArrow />
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
}

function OnlineProductFirstWeekBadge({
  status,
  formatDate,
}: {
  status: OnlineProductFirstWeekStatusRow | null;
  formatDate: (dateString: string) => string;
}) {
  if (!status) {
    return (
      <div className="mt-2 rounded-lg border border-[#ead7a7] bg-[#fff9e8] px-2 py-1.5 text-[9px] font-bold leading-4 text-[#6f5724] md:rounded-xl md:px-3 md:py-2 md:text-xs">
        ⏰ 初週集計: 発送・お届け予定を要確認
      </div>
    );
  }

  if (status.status === "check") {
    return (
      <div className="mt-2 rounded-lg border border-[#dfbd68] bg-[#fff7df] px-2 py-1.5 text-[9px] leading-4 text-[#6f5724] md:rounded-xl md:px-3 md:py-2 md:text-xs">
        <div className="font-bold">🟡 初週集計: 要確認</div>
        {status.shipping_note && (
          <div className="mt-0.5">
            発送目安: {status.shipping_note}
          </div>
        )}
        <div className="mt-0.5">
          {formatDate(status.verified_at)}確認
        </div>
      </div>
    );
  }

  const likely = status.status === "likely";
  return (
    <div
      className={`mt-2 rounded-lg border px-2 py-1.5 text-[9px] leading-4 md:rounded-xl md:px-3 md:py-2 md:text-xs ${
        likely
          ? "border-[#9dbce5] bg-[#eef5ff] text-[#315f96]"
          : "border-[#e2a9ae] bg-[#fff0f1] text-[#8a3740]"
      }`}
    >
      <div className="font-bold">
        {likely ? "🔵 初週集計: 間に合う見込み" : "🔴 初週集計: 間に合わない見込み"}
      </div>
      {status.shipping_note && (
        <div className="mt-0.5 font-normal">{status.shipping_note}</div>
      )}
      {status.shipping_basis === "delivery" && (
        <div className="mt-1 font-normal">
          ※表示されたお届け予定日を基準とした見込みです。配送地域等により異なるため、ご自身の配送先で表示されるお届け予定日をご確認ください。
        </div>
      )}
      <div className="mt-0.5 font-normal">{formatDate(status.verified_at)}確認</div>
    </div>
  );
}

function StoreInfoContributionForm({
  store,
  products,
  onClose,
}: {
  store: Store;
  products: Product[];
  onClose: () => void;
}) {
  const online = isOnlineStore(store);
  const [requestType, setRequestType] = useState<
    "billboard" | "first_week_cutoff" | "other"
  >(
    store.billboard_status === "target"
      ? online
        ? "other"
        : "first_week_cutoff"
      : "billboard"
  );
  const [billboardStatus, setBillboardStatus] =
    useState<BillboardInfoStatus>("target");
  const [productId, setProductId] = useState(
    products[0] ? String(products[0].id) : ""
  );
  const [shippingPreset, setShippingPreset] = useState("same_or_next");
  const [shippingDate, setShippingDate] = useState("");
  const [confirmationSource, setConfirmationSource] = useState("product_page");
  const [confirmationSourceDetail, setConfirmationSourceDetail] = useState("");
  const [detail, setDetail] = useState("");
  const [evidence, setEvidence] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (store.billboard_status === "target" && requestType === "billboard") {
      setRequestType(online ? "other" : "first_week_cutoff");
      return;
    }

    if (online && requestType === "first_week_cutoff") {
      setRequestType(
        store.billboard_status === "target"
          ? "other"
          : "billboard"
      );
    }
  }, [online, requestType, store.billboard_status]);

  function getShippingPayload() {
    if (shippingPreset === "date") {
      return {
        shippingType: "date",
        minDays: null,
        maxDays: null,
        date: shippingDate || null,
      };
    }
    if (shippingPreset === "other") {
      return {
        shippingType: "other",
        minDays: null,
        maxDays: null,
        date: null,
      };
    }

    const ranges: Record<string, [number, number]> = {
      same_day: [0, 0],
      same_or_next: [0, 1],
      one_two: [1, 2],
      two_three: [2, 3],
      three_four: [3, 4],
    };
    const [minDays, maxDays] = ranges[shippingPreset] ?? [0, 1];
    return {
      shippingType: "relative",
      minDays,
      maxDays,
      date: null,
    };
  }

  async function submit() {
    setMessage("");
    setError("");

    const cleanDetail = detail.trim();
    const cleanEvidence = evidence.trim();

    if (requestType === "billboard" && !cleanEvidence) {
      setError("Billboard情報は確認方法・ソースを入力してください。");
      return;
    }
    if (
      requestType !== "billboard" &&
      !cleanDetail
    ) {
      setError("提供する内容を入力してください。");
      return;
    }
    if (cleanDetail.length > 1000 || cleanEvidence.length > 1000) {
      setError("内容と確認方法・ソースはそれぞれ1000文字以内で入力してください。");
      return;
    }

    setSubmitting(true);
    try {
      let clientId = localStorage.getItem("kp_inventory_client_id");
      if (!clientId) {
        clientId = crypto.randomUUID();
        localStorage.setItem("kp_inventory_client_id", clientId);
      }

      if (requestType === "billboard") {
        const { error: rpcError } = await supabase.rpc(
          "submit_billboard_info_request",
          {
            p_store_id: store.id,
            p_proposed_status: billboardStatus,
            p_evidence: cleanEvidence,
            p_client_id: clientId,
          }
        );
        if (rpcError) throw rpcError;
      } else {
        const shipping = getShippingPayload();
        const { error: rpcError } = await supabase.rpc(
          "submit_store_info_request_v2",
          {
            p_store_id: store.id,
            p_request_type: requestType,
            p_product_id:
              null,
            p_detail: cleanDetail,
            p_evidence: cleanEvidence || null,
            p_client_id: clientId,
            p_shipping_type:
              null,
            p_shipping_min_days:
              null,
            p_shipping_max_days:
              null,
            p_shipping_date:
              null,
            p_confirmation_source:
              null,
            p_confirmation_source_detail:
              null,
          }
        );
        if (rpcError) throw rpcError;
      }

      setMessage("店舗情報を送信しました。確認後、必要に応じてサイトへ反映します。ありがとうございます。");
      setDetail("");
      setEvidence("");
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "送信できませんでした。時間をおいてもう一度お試しください。"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-[#dfc16f] bg-[#fffaf0] p-3 md:mt-4 md:rounded-2xl md:p-4">
      <div className="text-[11px] font-bold text-[#5d4717] md:text-sm">📨 店舗情報を提供</div>
      <p className="mt-1 text-[10px] leading-5 text-[#77643c] md:text-sm md:leading-6">
        {store.billboard_status === "target"
          ? "この店舗はBillboard対象として確認済みです。初週集計の締め時間やその他の店舗情報を送信できます。"
          : "Billboard集計情報やその他の店舗情報を送信できます。"}
        オンラインの発送・取り寄せ目安は「在庫情報を投稿」から一緒に送信できます。
      </p>

      <label className="mt-3 block">
        <div className="mb-1 text-[11px] font-bold text-[#4d434c] md:text-sm">情報の種類</div>
        <select
          value={requestType}
          onChange={(event) => setRequestType(event.target.value as typeof requestType)}
          className="w-full rounded-lg border border-[#d8cad7] bg-white p-2 text-[12px] text-[#2f292e] opacity-100 [-webkit-text-fill-color:#2f292e] md:rounded-xl md:p-3 md:text-sm"
        >
          {store.billboard_status !== "target" && (
            <option value="billboard">Billboard集計情報</option>
          )}
          {!online && <option value="first_week_cutoff">初週集計の締め時間</option>}
          <option value="other">その他店舗情報</option>
        </select>
      </label>

      {requestType === "billboard" && (
        <label className="mt-3 block">
          <div className="mb-1 text-[11px] font-bold text-[#4d434c] md:text-sm">Billboard情報</div>
          <select
            value={billboardStatus}
            onChange={(event) => setBillboardStatus(event.target.value as BillboardInfoStatus)}
            className="w-full rounded-lg border border-[#d8cad7] bg-white p-2 text-[12px] text-[#2f292e] opacity-100 [-webkit-text-fill-color:#2f292e] md:rounded-xl md:p-3 md:text-sm"
          >
            <option value="target">Billboard 対象</option>
            <option value="not_target">Billboard 対象外</option>
          </select>
        </label>
      )}

      {(requestType === "first_week_cutoff" || requestType === "other") && (
        <label className="mt-3 block">
          <div className="mb-1 text-[11px] font-bold text-[#4d434c] md:text-sm">
            {requestType === "first_week_cutoff" ? "確認した締め時間" : "提供する情報"}
          </div>
          <textarea
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={
              requestType === "first_week_cutoff"
                ? "例)店舗へ電話確認。初週集計は日曜18:00までとの案内"
                : "例)店舗の初週集計や販売に関する補足情報"
            }
            className="w-full rounded-lg border border-[#d8cad7] bg-white p-2 text-[12px] text-[#2f292e] opacity-100 [-webkit-text-fill-color:#2f292e] md:rounded-xl md:p-3 md:text-sm"
          />
        </label>
      )}

      <label className="mt-3 block">
        <div className="mb-1 text-[11px] font-bold text-[#4d434c] md:text-sm">
          確認方法・ソース {requestType === "billboard" && <span className="text-red-600">必須</span>}
        </div>
        <textarea
          value={evidence}
          onChange={(event) => setEvidence(event.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="例)公式ページURL、電話確認、店頭確認など"
          className="w-full rounded-lg border border-[#d8cad7] bg-white p-2 text-[12px] text-[#2f292e] opacity-100 [-webkit-text-fill-color:#2f292e] md:rounded-xl md:p-3 md:text-sm"
        />
      </label>

      {error && <div className="mt-2 rounded-lg bg-red-50 p-2 text-[11px] font-bold text-red-700 md:text-sm">{error}</div>}
      {message && <div className="mt-2 rounded-lg bg-green-50 p-2 text-[11px] font-bold text-green-700 md:text-sm">{message}</div>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={submitting}
          onClick={() => void submit()}
          className="rounded-xl bg-[#6d4966] px-4 py-2 text-[11px] font-bold text-white disabled:opacity-50 md:text-sm"
        >
          {submitting ? "送信中…" : "情報を送信"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-[#d8cad7] bg-white px-4 py-2 text-[11px] font-bold text-[#5b486b] md:text-sm"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

function isInventoryReportInStock(
  report: InventoryReport | null,
  online: boolean
) {
  if (!report) return false;
  if (online) {
    return (
      report.stock_status === "in_stock" ||
      report.stock_status === "low_stock"
    );
  }
  return Number(report.quantity) > 0;
}

function formatStockStatus(status: OnlineStockStatus) {
  const labels: Record<OnlineStockStatus, string> = {
    in_stock: "○ 在庫あり",
    low_stock: "△ 残りわずか",
    backorder: "入荷待ち",
    sold_out: "× 在庫なし",
  };
  return labels[status];
}

function comparePhysicalStores(
  a: Store,
  b: Store,
  selectedPrefecture: string
) {
  if (selectedPrefecture === "全国") {
    const prefectureA =
      PREFECTURE_ORDER.get(a.prefecture) ?? 999;

    const prefectureB =
      PREFECTURE_ORDER.get(b.prefecture) ?? 999;

    if (prefectureA !== prefectureB) {
      return prefectureA - prefectureB;
    }
  }

  const rankA = getChainRank(a);
  const rankB = getChainRank(b);

  if (rankA !== rankB) {
    return rankA - rankB;
  }

  const cityCompare = (a.city ?? "").localeCompare(
    b.city ?? "",
    "ja"
  );

  if (cityCompare !== 0) {
    return cityCompare;
  }

  return getDisplayStoreName(a).localeCompare(
    getDisplayStoreName(b),
    "ja"
  );
}

function isRakutenStore(store: Store) {
  const name = normalizeStoreText(store.name ?? "");

  return (
    name === normalizeStoreText("楽天ブックス") ||
    name === "rakutenbooks"
  );
}

function isSevenStore(store: Store) {
  const name = normalizeStoreText(store.name ?? "");

  return (
    name === normalizeStoreText("セブンネット") ||
    name === normalizeStoreText("セブンネットショッピング") ||
    name === "7netshopping"
  );
}

function isJoshinStore(store: Store) {
  const name = normalizeStoreText(store.name ?? "");

  return (
    name.includes(normalizeStoreText("ジョーシン")) ||
    name.includes("joshin")
  );
}

function hasPurchaseVariantLinks(store: Store, product: Product) {
  if (isRakutenStore(store)) {
    return (RAKUTEN_PRODUCT_LINKS[product.id]?.length ?? 0) > 1;
  }
  if (isSevenStore(store)) {
    return (SEVEN_PRODUCT_LINKS[product.id]?.length ?? 0) > 1;
  }
  return false;
}

function purchaseVariantStoreLabel(store: Store) {
  if (isRakutenStore(store)) return "楽天ブックス";
  if (isSevenStore(store)) return "セブンネット";
  return "オンラインショップ";
}

function purchaseVariantLabel(value: PurchaseVariant | null) {
  if (value === "special") return "先着特典あり";
  if (value === "no_special") return "特典なし";
  return "特典区分不明";
}

function getVerifiedOnlineProductLinks(
  store: Store,
  product: Product
): ProductLinkOption[] {
  const name = normalizeStoreText(store.name ?? "");

  if (isRakutenStore(store)) {
    return RAKUTEN_PRODUCT_LINKS[product.id] ?? [];
  }

  if (isSevenStore(store)) {
    return SEVEN_PRODUCT_LINKS[product.id] ?? [];
  }

  let storeKey:
    | "universal"
    | "tower"
    | "hmv"
    | "amazon"
    | "joshin"
    | "neowing"
    | null = null;

  if (
    name.includes("universal") ||
    name.includes(normalizeStoreText("ユニバーサル"))
  ) {
    storeKey = "universal";
  } else if (
    name.includes(normalizeStoreText("タワーレコード")) ||
    name.includes("towerrecords") ||
    name.includes("towerrecord") ||
    name.includes(normalizeStoreText("タワレコ"))
  ) {
    storeKey = "tower";
  } else if (
    name.includes("hmv")
  ) {
    storeKey = "hmv";
  } else if (
    name === "amazon" ||
    name.includes("amazoncojp") ||
    store.id === 308
  ) {
    storeKey = "amazon";
  } else if (isJoshinStore(store)) {
    storeKey = "joshin";
  } else if (
    name.includes(normalizeStoreText("ネオウィング")) ||
    name.includes("neowing")
  ) {
    storeKey = "neowing";
  }

  if (!storeKey) return [];

  const productUrl =
    VERIFIED_ONLINE_PRODUCT_URLS[storeKey][product.id] ?? null;

  return productUrl
    ? [{ label: "商品ページを開く", url: productUrl }]
    : [];
}

function compareOnlineStores(a: Store, b: Store) {
  const getOnlineRank = (store: Store) => {
    const name = normalizeStoreText(store.name ?? "");

    if (
      name.includes("universal") ||
      name.includes(normalizeStoreText("ユニバーサル"))
    ) return 0;

    if (
      name.includes(normalizeStoreText("タワーレコード")) ||
      name.includes("towerrecords") ||
      name.includes("towerrecord") ||
      name.includes(normalizeStoreText("タワレコ"))
    ) return 1;

    if (name.includes("hmv")) return 2;

    if (isRakutenStore(store)) return 3;

    if (
      name === "amazon" ||
      name.includes("amazoncojp") ||
      store.id === 308
    ) return 4;

    if (isJoshinStore(store)) return 5;

    if (isSevenStore(store)) return 6;

    if (
      name.includes(normalizeStoreText("ネオウィング")) ||
      name.includes("neowing")
    ) return 7;

    if (
      name.includes(normalizeStoreText("ビックカメラ.com")) ||
      name.includes(normalizeStoreText("ビックカメラドットコム")) ||
      name === "biccamera.com" ||
      name === "biccamera"
    ) return 8;

    if (
      name.includes(normalizeStoreText("ヤマダウェブコム")) ||
      name.includes("yamadawebcom") ||
      name.includes("yamadaweb")
    ) return 9;

    return 10;
  };

  const rankA = getOnlineRank(a);
  const rankB = getOnlineRank(b);

  if (rankA !== rankB) {
    return rankA - rankB;
  }

  return getDisplayStoreName(a).localeCompare(
    getDisplayStoreName(b),
    "ja"
  );
}

function getChainRank(store: Store) {
  const text = normalizeStoreText(
    `${store.chain_name ?? ""}${store.name}`
  );

  const index = CHAIN_PRIORITY.findIndex((chain) =>
    text.includes(normalizeStoreText(chain))
  );

  return index === -1
    ? CHAIN_PRIORITY.length
    : index;
}

function normalizeDisplayParentheses(value: string) {
  return value.replace(/（/g, "(").replace(/）/g, ")");
}

function getDisplayStoreName(store: Store) {
  const name = normalizeDisplayParentheses(store.name.trim());
  const rawChain = normalizeDisplayParentheses(
    (store.chain_name ?? "").trim()
  );

  const chain =
    ["なし", "無し", "なし。", "なしです"].includes(rawChain)
      ? ""
      : rawChain;

  if (!chain) {
    return name;
  }

  if (
    storeNameAlreadyContainsBrand(
      name,
      chain
    )
  ) {
    return name;
  }

  return `${chain} ${name}`;
}

function storeNameAlreadyContainsBrand(
  name: string,
  chain: string
) {
  const normalizedName =
    normalizeStoreText(name);

  const normalizedChain =
    normalizeStoreText(chain);

  if (
    normalizedName.includes(
      normalizedChain
    )
  ) {
    return true;
  }

  const aliases: Record<string, string[]> = {
    タワーレコード: [
      "towerrecords",
      "towerrecord",
      "tower",
      "タワレコ",
    ],
    hmv: ["hmv"],
    新星堂: ["新星堂"],
    紀伊國屋書店: [
      "紀伊國屋",
      "紀伊国屋",
      "kinokuniya",
    ],
    tsutaya: [
      "tsutaya",
      "蔦屋書店",
      "蔦屋",
    ],
    アニメイト: [
      "アニメイト",
      "animate",
    ],
    玉光堂: ["玉光堂"],
    バンダレコード: [
      "バンダレコード",
      "vanda",
    ],
    くまざわ書店: [
      "くまざわ書店",
    ],
    academia: ["academia"],
  };

  const normalizedChainLower =
    normalizedChain.toLowerCase();

  for (const [key, values] of Object.entries(aliases)) {
    if (
      normalizedChainLower.includes(
        normalizeStoreText(key)
      )
    ) {
      return values.some((alias) =>
        normalizedName.includes(
          normalizeStoreText(alias)
        )
      );
    }
  }

  return false;
}

function normalizeStoreText(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[・･\-‐-–—―_]/g, "");
}

function getOnlineStoreMatchText(store: Store) {
  return normalizeStoreText(
    `${store.chain_name ?? ""} ${store.name} ${store.online_url ?? ""}`
  );
}

function getOnlineStoreIdentityText(store: Store) {
  return normalizeStoreText(
    `${store.chain_name ?? ""} ${store.name}`
  );
}

function getOnlineStoreUrlText(store: Store) {
  return normalizeStoreText(store.online_url ?? "");
}

function isOnlineStore(store: Store) {
  return (
    store.store_type === "online" ||
    store.prefecture === "オンライン"
  );
}
function isLateClosingOriconChain(store: Store) {
  const chain = (store.chain_name ?? "").toLowerCase();
  const name = store.name.toLowerCase();
  return chain.includes("タワーレコード") || name.includes("タワーレコード") || chain.includes("hmv") || name.includes("hmv");
}

function formatBusinessHours(value: string | null) {
  if (!value) return "";

  return value
    // 10時30分 → 10:30
    .replace(/(\d{1,2})時(\d{1,2})分/g, (_, h, m) => {
      return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
    })

    // 10時 → 10:00
    .replace(/(\d{1,2})時/g, (_, h) => {
      return `${h.padStart(2, "0")}:00`;
    })

    // 10:30 はそのまま。10:3 のような場合だけ 10:03 にする
    .replace(/(\d{1,2}):(\d{1,2})/g, (_, h, m) => {
      return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
    })

    // 区切り記号を ～ に統一
    .replace(/[〜~－―ー-]/g, "～")

    .trim();
}

function shortPrefectureName(prefecture: string) {
  if (prefecture === "北海道") {
    return "北海道";
  }

  if (prefecture === "東京都") {
    return "東京";
  }

  if (prefecture === "京都府") {
    return "京都";
  }

  if (prefecture === "大阪府") {
    return "大阪";
  }

  return prefecture.replace("県", "");
}

function ExternalArrow() {
  return (
    <span aria-hidden="true" className="ml-1 inline-block no-underline">
      ↗︎
    </span>
  );
}

function formatShortSalesDate(
  value: string
) {
  const [, month, day] =
    value.split("-");

  return `${Number(month)}/${Number(day)}`;
}

function StatCard({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: number | null;
}) {
  return (
    <div className="rounded-xl border border-[#eaddea] bg-[#fcf9fc] px-2 py-2 md:rounded-2xl md:px-3 md:py-3">
      <div className="flex items-center justify-center gap-1.5 md:gap-2">
        <span
          className="shrink-0 text-lg leading-none md:text-2xl"
          aria-hidden="true"
        >
          {icon}
        </span>

        <div className="min-w-0 text-left">
          <div className="whitespace-nowrap text-[10px] font-bold leading-4 text-[#9b6c91] opacity-100 [-webkit-text-fill-color:#9b6c91] md:text-sm">
            {title}
          </div>

          <div className="whitespace-nowrap text-base font-bold leading-5 text-[#171417] opacity-100 [-webkit-text-fill-color:#171417] md:text-xl">
            {value === null ? (
              "－"
            ) : (
              <>
                {value.toLocaleString()}
                <span className="ml-0.5 text-[9px] md:text-xs">
                  枚
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingBox({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-[#d8cad7] p-5 text-center text-[12px] text-[#847a83] md:mt-6 md:rounded-2xl md:p-6 md:text-base">
      {text}
    </div>
  );
}

function ErrorBox({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-4 rounded-xl bg-[#fde7ec] p-4 text-[12px] text-[#8a304a] md:mt-6 md:rounded-2xl md:p-6 md:text-base">
      {text}
    </div>
  );
}

function EmptyBox({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-[#d8cad7] p-5 text-center text-[12px] text-[#847a83] md:mt-6 md:rounded-2xl md:p-6 md:text-base">
      {text}
    </div>
  );
}