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
};

type Product = {
  id: number;
  name: string;
  sort_order: number | null;
};

type InventoryReport = {
  id: number;
  store_id: number;
  product_id: number;
  quantity: number;
  comment: string | null;
  created_at: string;
};

type SalesSummary = {
  id: number;
  today_sales: number | null;
  weekly_sales: number | null;
  total_sales: number | null;
  goal: number;
  updated_at: string;
};

type BillboardInfoStatus = "target" | "not_target";

type SearchMode = "physical" | "online";

export default function Home() {
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reports, setReports] = useState<InventoryReport[]>([]);

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
  const [bugReportOpen, setBugReportOpen] = useState(false);
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
   const { data, error } = await supabase
  .from("inventory_reports")
  .select(
    "id, store_id, product_id, quantity, comment, created_at"
  )
  .eq("review_status", "approved")
  .order("created_at", { ascending: false })
  .limit(5000);

    if (error) {
      console.error("inventory_reports error:", error);
      return;
    }

    setReports((data ?? []) as InventoryReport[]);
  }, []);
  const loadSalesData = useCallback(async () => {
  const { data, error } = await supabase.rpc(
    "get_sales_summary"
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
            official_url
          `)
          .limit(2000),

        supabase
          .from("products")
          .select("id, name, sort_order")
          .order("sort_order", { ascending: true }),
      ]);

      if (storesResult.error) {
        setDataError(
          `店舗データを読み込めませんでした：${storesResult.error.message}`
        );
        setLoading(false);
        return;
      }

      if (productsResult.error) {
        setDataError(
          `商品データを読み込めませんでした：${productsResult.error.message}`
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
]);

setLoading(false);
    }

    loadInitialData();
  }, [loadInventoryReports, loadSalesData]);

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
      const key = `${report.store_id}-${report.product_id}`;

      if (!map.has(key)) {
        map.set(key, report);
      }
    }

    return map;
  }, [reports]);

  const latestFiveReports = reports.slice(0, 5);

  const getLatestReport = (
    storeId: number,
    productId: number
  ) =>
    latestReportMap.get(`${storeId}-${productId}`) ?? null;

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

  if (reportQuantity.trim() === "") {
    setSubmitError("在庫枚数を入力してください。");
    return;
  }

  const quantity = Number(reportQuantity);

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

  if (reportComment.length > 500) {
    setSubmitError(
      "コメントは500文字以内で入力してください。"
    );
    return;
  }

  if (!turnstileReady || !turnstileToken) {
    setSubmitError(
      "Bot確認が完了していません。少し待ってからもう一度お試しください。"
    );
    return;
  }

  setSubmitting(true);

  try {
    // ブラウザごとの識別ID
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

    // Supabaseをブラウザから直接呼ばず、
    // Next.jsのサーバーAPIを経由する
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
          quantity,
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

    // Turnstileトークンは1回限りなので、
    // 投稿結果にかかわらず次回用にリセット
    const turnstile = (
      window as typeof window & {
        turnstile?: {
          reset: (widgetId?: string) => void;
        };
      }
    ).turnstile;

    if (
      turnstile &&
      turnstileWidgetIdRef.current
    ) {
      turnstile.reset(
        turnstileWidgetIdRef.current
      );
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

    setSubmitMessage(
      "在庫情報を投稿しました。"
    );

    setReportQuantity("");
    setReportComment("");

    await loadInventoryReports();
  } catch (error) {
    console.error(
      "inventory report API error:",
      error
    );

    const turnstile = (
      window as typeof window & {
        turnstile?: {
          reset: (widgetId?: string) => void;
        };
      }
    ).turnstile;

    if (
      turnstile &&
      turnstileWidgetIdRef.current
    ) {
      turnstile.reset(
        turnstileWidgetIdRef.current
      );
    }

    setTurnstileToken("");
    setTurnstileReady(false);

    setSubmitError(
      "投稿中にエラーが発生しました。もう一度お試しください。"
    );
  } finally {
    setSubmitting(false);
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
    setBugError("不具合内容を入力してください。");
    return;
  }

  if (bugDeviceType.trim() === "") {
    setBugError("端末種類を選択してください。");
    return;
  }

  if (bugOsType.trim() === "") {
    setBugError("OS種類を選択してください。");
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
        issue_description: bugDescription.trim(),
        device_type: bugDeviceType.trim(),
        device_model:
          bugDeviceModel.trim() === ""
            ? null
            : bugDeviceModel.trim(),
        os_type: bugOsType.trim(),
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
      "不具合報告を送信しました。ありがとうございます。"
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

              {/* スマホ：タイトルの左右に蜂 */}
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
  7形態まとめて確認できます。
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
            <StatCard icon="📊" title="本日" value={today} />
            <StatCard icon="📅" title="今週" value={week} />
            <StatCard icon="👑" title="累計" value={sales} />
          </div>
        </section>

        {/* ===== 上部ナビ ===== */}
        <nav
          className={`sticky top-2 z-40 rounded-xl border border-[#e3d4e3] p-1.5 shadow-md md:rounded-2xl md:p-2 ${
            isAndroid ? "bg-white" : "bg-white/95 backdrop-blur"
          }`}
        >
          <div className="grid grid-cols-3 gap-1.5 md:gap-2">
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
          <div className="text-[10px] font-bold tracking-[0.12em] text-[#9b6c91] md:text-sm">
            STOCK SEARCH
          </div>

          <h2 className="mt-1 text-lg font-bold text-[#1d191d] md:text-3xl">
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
                <div className="text-[10px] font-bold tracking-[0.12em] text-[#9b6c91] md:text-sm">
                  STOCK LIST
                </div>

                <h3 className="mt-1 text-lg font-bold text-[#1d191d] md:text-3xl">
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
                  {visibleStores.length.toLocaleString()}店舗
                </div>
              )}
            </div>

            {loading ? (
              <LoadingBox text="店舗データを読み込み中…" />
            ) : dataError ? (
              <ErrorBox text={dataError} />
            ) : visibleStores.length === 0 ? (
              <EmptyBox text="該当する店舗がありません" />
            ) : (
              <div className="mt-3 space-y-3 md:mt-6 md:space-y-5">
                {visibleStores.map((store) => (
                  <StoreCard
                    key={store.id}
                    store={store}
                    products={products}
                    getLatestReport={getLatestReport}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ===== 在庫投稿 ===== */}
        <section
          id="report"
          className={`scroll-mt-24 rounded-[20px] border border-white/80 p-3.5 shadow-sm md:rounded-[30px] md:p-6 ${
            isAndroid ? "bg-white" : "bg-white/90"
          }`}
        >
          <div className="text-[10px] font-bold tracking-[0.12em] text-[#9b6c91] md:text-sm">
            REPORT STOCK
          </div>

          <h2 className="mt-1 text-lg font-bold text-[#1d191d] md:text-3xl">
            ✍️ 在庫情報を投稿
          </h2>

          <p className="mt-1 text-[12px] text-[#766a75] md:mt-2 md:text-base">
            実店舗・オンラインショップで確認した在庫を投稿できます。
          </p>

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
                {products.map((product) => (
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

          <label className="mt-3 block space-y-1.5 md:mt-5 md:space-y-2">
            <span className="text-[12px] font-bold text-[#211d21] opacity-100 md:text-base">
              🔢 在庫枚数
            </span>

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
              className="w-full rounded-xl border border-[#d9c9d8] bg-[#fdfafd] p-2.5 text-[12px] text-[#211d21] opacity-100 [color:#211d21] [-webkit-text-fill-color:#211d21] placeholder:text-[#766c74] placeholder:opacity-100 md:rounded-2xl md:p-3.5 md:text-base"
            />
          </label>

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
                <div className="text-[10px] font-bold tracking-[0.12em] text-[#9b6c91] md:text-sm">
                  STORE REQUEST
                </div>

                <div className="mt-0.5 text-sm font-bold text-[#2c252b] md:mt-1 md:text-2xl">
                  🏪 店舗が見つからない場合
                </div>

                <div className="mt-1 text-[11px] text-[#766a75] md:mt-2 md:text-base">
                  登録されていない店舗を追加リクエストできます。
                </div>
              </div>

              <span className="shrink-0 text-base font-bold text-[#9d6c91] md:text-lg">
                {requestOpen ? "∧" : "∨"}
              </span>
            </button>

            {requestOpen && (
              <div className="mt-4 border-t border-[#eaddea] pt-4 md:mt-5 md:pt-5">
                <div className="mb-3 rounded-lg bg-[#f2e5f0] p-2.5 text-[11px] leading-5 text-[#64515f] md:mb-5 md:rounded-xl md:p-3 md:text-sm md:leading-6">
                  {reportMode === "online"
                    ? "オンラインショップの追加リクエスト"
                    : `追加先: ${reportPrefecture}`}
                </div>

                <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                  <label className="block">
                    <div className="mb-1.5 text-[12px] font-bold md:mb-2 md:text-base">
                      🏢 チェーン名
                      <span className="ml-2 text-[11px] font-normal text-[#8a8089] md:text-sm">
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
                      className="w-full rounded-lg border border-[#d9c9d8] bg-white p-2.5 text-[12px] md:rounded-xl md:p-3.5 md:text-base"
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1.5 text-[12px] font-bold md:mb-2 md:text-base">
                      {reportMode === "online"
                        ? "🛒 ショップ名"
                        : "🏪 店舗名"}
                      <span className="ml-1 text-[11px] text-[#c44f82] md:text-sm">
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
                      className="w-full rounded-lg border border-[#d9c9d8] bg-white p-2.5 text-[12px] md:rounded-xl md:p-3.5 md:text-base"
                    />
                  </label>
                </div>

                {reportMode === "physical" && (
                  <label className="mt-3 block md:mt-4">
                    <div className="mb-1.5 text-[12px] font-bold md:mb-2 md:text-base">
                      📍 市区町村
                      <span className="ml-2 text-[11px] font-normal text-[#8a8089] md:text-sm">
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
                      className="w-full rounded-lg border border-[#d9c9d8] bg-white p-2.5 text-[12px] md:rounded-xl md:p-3.5 md:text-base"
                    />
                  </label>
                )}

                <label className="mt-3 block md:mt-4">
                  <div className="mb-1.5 text-[12px] font-bold md:mb-2 md:text-base">
                    💬 補足
                    <span className="ml-2 text-[11px] font-normal text-[#8a8089] md:text-sm">
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
                    className="w-full rounded-lg border border-[#d9c9d8] bg-white p-2.5 text-[12px] md:rounded-xl md:p-3.5 md:text-base"
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
                  className="mt-3 rounded-lg bg-[#b65d92] px-5 py-2.5 text-[12px] font-bold text-white transition hover:bg-[#a84e84] disabled:opacity-50 md:mt-4 md:rounded-xl md:px-6 md:py-3.5 md:text-base"
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
          className={`scroll-mt-24 rounded-[20px] border border-white/80 p-3.5 shadow-sm md:rounded-[30px] md:p-6 ${
            isAndroid ? "bg-white" : "bg-white/90"
          }`}
        >
          <div className="text-[10px] font-bold tracking-[0.12em] text-[#9b6c91] md:text-sm">
            LATEST REPORTS
          </div>

          <h2 className="mt-1 text-lg font-bold text-[#1d191d] md:text-3xl">
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
                      <div className="truncate text-[11px] font-bold leading-4 text-[#241f24] md:text-base md:leading-normal">
                        {getStoreName(report.store_id)}
                      </div>

                      <div className="mt-0.5 truncate text-[10px] leading-4 text-[#766a75] md:mt-1 md:text-base md:leading-normal">
                        {getProductName(report.product_id)}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="whitespace-nowrap text-[12px] font-bold leading-4 md:text-base md:leading-normal">
                        {report.quantity === 0
                          ? "在庫なし"
                          : `${report.quantity}枚`}
                      </div>

                      <div className="mt-0.5 text-[9px] leading-3 text-[#999098] md:mt-0 md:text-sm md:leading-normal">
                        {formatDate(report.created_at)}
                      </div>
                    </div>
                  </div>

                  {report.comment && (
                    <div className="mt-1 rounded-md bg-white px-2 py-1.5 text-[10px] leading-4 text-[#605760] md:mt-3 md:rounded-xl md:p-3 md:text-base md:leading-6">
                      {report.comment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===== FOOTER ===== */}
        {/* ===== 不具合報告 ===== */}
        <section className="rounded-xl border border-[#cdbdca] bg-white p-3 shadow-sm md:rounded-2xl md:p-4">
          <button
            type="button"
            onClick={() => {
              setBugReportOpen((current) => !current);
              setBugMessage("");
              setBugError("");
            }}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="text-[11px] font-bold text-[#40363e] md:text-sm">
              ⚠️ 不具合を報告する
            </span>

            <span className="text-xs font-bold text-[#6d5968]">
              {bugReportOpen ? "∧" : "∨"}
            </span>
          </button>

          {bugReportOpen && (
            <div className="mt-3 border-t border-[#d8cad6] pt-3 text-[#352f34]">
              <p className="text-[10px] font-medium leading-4 text-[#4f454d] md:text-xs md:leading-5">
                いただいた内容は確認し、可能な範囲で改善に努めます。内容やご利用環境によっては、すべての不具合に対応できない場合があります。
              </p>

              <label className="mt-3 block">
                <div className="mb-1 text-[11px] font-bold text-[#352f34] md:text-sm">
                  不具合内容
                  <span className="ml-1 text-[#b83f75]">必須</span>
                </div>

                <textarea
                  rows={3}
                  maxLength={1000}
                  value={bugDescription}
                  onChange={(e) =>
                    setBugDescription(e.target.value)
                  }
                  placeholder="例: 店舗をタップしても反応しない"
                  className="w-full rounded-lg border border-[#cdbdca] bg-white px-3 py-2 text-[12px] text-[#2f292e] outline-none placeholder:text-[#766c74] focus:border-[#a95e92] focus:ring-1 focus:ring-[#e7cfe0] md:text-sm"
                />
              </label>

              <div className="mt-3 rounded-lg border border-[#cdbdca] bg-[#f8f3f7] p-3">
                <div className="text-[10px] font-medium leading-4 text-[#4b4249] md:text-xs md:leading-5">
                  端末・OS・ブラウザ情報は手動で入力できます。自動入力を利用したい場合だけ、下のチェックを入れてください。
                  <br />
                  <span className="font-bold text-[#382f36]">
                    チェックを入れるまで、不具合報告用の表示環境情報は自動入力しません。自動入力した内容も、「不具合報告を送信」を押すまで送信されません。
                  </span>
                  <br />
                  <span className="font-bold text-[#382f36]">
                    取得する情報は表示環境に関するもののみです。不具合の確認・改善以外の目的には使用しません。
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
                    <span className="ml-1 text-[#b83f75]">必須</span>
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
                    <span className="ml-1 text-[#b83f75]">必須</span>
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
                  : "不具合報告を送信"}
              </button>
            </div>
          )}
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

function StoreCard({
  store,
  products,
  getLatestReport,
  formatDate,
}: {
  store: Store;
  products: Product[];
  getLatestReport: (
    storeId: number,
    productId: number
  ) => InventoryReport | null;
  formatDate: (dateString: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [billboardInfoOpen, setBillboardInfoOpen] = useState(false);
  const [billboardProposedStatus, setBillboardProposedStatus] =
    useState<BillboardInfoStatus>("target");
  const [billboardEvidence, setBillboardEvidence] = useState("");
  const [billboardSubmitting, setBillboardSubmitting] = useState(false);
  const [billboardMessage, setBillboardMessage] = useState("");
  const [billboardError, setBillboardError] = useState("");

  async function handleBillboardInfoSubmit() {
    setBillboardMessage("");
    setBillboardError("");

    const evidence = billboardEvidence.trim();

    if (evidence === "") {
      setBillboardError("確認できるソースURLまたはエビデンスを入力してください。");
      return;
    }

    if (evidence.length > 1000) {
      setBillboardError("ソースURL・エビデンスは1000文字以内で入力してください。");
      return;
    }

    setBillboardSubmitting(true);

    try {
      let clientId = localStorage.getItem("kp_inventory_client_id");

      if (!clientId) {
        clientId = crypto.randomUUID();
        localStorage.setItem("kp_inventory_client_id", clientId);
      }

      const { error } = await supabase.rpc(
        "submit_billboard_info_request",
        {
          p_store_id: store.id,
          p_proposed_status: billboardProposedStatus,
          p_evidence: evidence,
          p_client_id: clientId,
        }
      );

      if (error) {
        setBillboardError(
          `情報を送信できませんでした: ${error.message}`
        );
        return;
      }

      setBillboardMessage(
        "情報を送信しました。内容を確認後、サイトへ反映します。"
      );
      setBillboardEvidence("");
    } catch (error) {
      console.error(error);
      setBillboardError(
        "送信中にエラーが発生しました。もう一度お試しください。"
      );
    } finally {
      setBillboardSubmitting(false);
    }
  }

  const storeReports = products
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

  const online = isOnlineStore(store);

  return (
    <article className="rounded-2xl border border-[#e8d9e7] bg-white p-3.5 shadow-sm md:rounded-3xl md:p-6">
            {/* 店舗基本情報 ＋ 集計対象 */}
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-4">
        {/* 左：店舗名・所在地・営業時間 */}
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
        </div>

        {/* スマホ：下 / PC：右 */}
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
              <button
                type="button"
                onClick={() => {
                  setBillboardInfoOpen((current) => !current);
                  setBillboardMessage("");
                  setBillboardError("");
                }}
                className="whitespace-nowrap rounded-md border border-[#9e85b8] bg-white px-2 py-0.5 text-[9px] font-bold text-[#5b486b] md:rounded-xl md:px-3 md:py-2 md:text-sm"
              >
                情報提供する
              </button>
            </>
          )}

          {store.billboard_status === "not_target" && (
            <span className="whitespace-nowrap rounded-md border border-[#a9a2a8] bg-[#ece9ec] px-2 py-0.5 text-[9px] font-bold text-[#595159] md:rounded-xl md:px-4 md:py-2 md:text-base">
              Billboard 対象外
            </span>
          )}
        </div>
      </div>

      {store.billboard_status === "check_store" && billboardInfoOpen && (
        <div className="mt-3 rounded-xl border border-[#d9c8df] bg-[#faf7fc] p-3 md:mt-4 md:rounded-2xl md:p-4">
          <div className="text-sm font-bold text-[#5b486b] md:text-base">
            Billboard集計対象情報を提供する
          </div>
          <p className="mt-1 text-[10px] leading-5 text-[#6d626c] md:text-sm md:leading-6">
            Billboard集計対象についての情報をお寄せください。
公式サイトなどのURLのほか、店舗への電話・店頭で確認した情報もご投稿いただけます。
お寄せいただいた情報は、内容を確認したうえで反映します。確認できる情報が十分でない場合など、反映を見送ることがありますのでご了承ください。
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-[11px] font-bold text-[#4d434c] md:text-sm">
                情報の内容
              </div>
              <select
                value={billboardProposedStatus}
                onChange={(event) =>
                  setBillboardProposedStatus(
                    event.target.value as BillboardInfoStatus
                  )
                }
                className="w-full rounded-lg border border-[#d8cad7] bg-white p-2 text-[12px] md:rounded-xl md:p-3 md:text-sm"
              >
                <option value="target">Billboard 対象</option>
                <option value="not_target">Billboard 対象外</option>
              </select>
            </label>
          </div>

          <label className="mt-3 block">
            <div className="mb-1 text-[11px] font-bold text-[#4d434c] md:text-sm">
              確認できるURL・エビデンス <span className="text-red-600">必須</span>
            </div>
            <textarea
              value={billboardEvidence}
              onChange={(event) => setBillboardEvidence(event.target.value)}
              maxLength={1000}
              rows={4}
              placeholder={"例) https://...\n9/1、店舗へ電話で確認。店員さんよりBillboard集計対象との回答あり。\n店頭掲示でBillboard集計対象と確認 など"}
              className="w-full rounded-lg border border-[#d8cad7] bg-white p-2 text-[12px] md:rounded-xl md:p-3 md:text-sm"
            />
          </label>

          {billboardError && (
            <div className="mt-2 rounded-lg bg-red-50 p-2 text-[11px] font-bold text-red-700 md:text-sm">
              {billboardError}
            </div>
          )}

          {billboardMessage && (
            <div className="mt-2 rounded-lg bg-green-50 p-2 text-[11px] font-bold text-green-700 md:text-sm">
              {billboardMessage}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={billboardSubmitting}
              onClick={handleBillboardInfoSubmit}
              className="rounded-lg bg-[#6d4966] px-4 py-2 text-[11px] font-bold text-white disabled:opacity-50 md:rounded-xl md:text-sm"
            >
              {billboardSubmitting ? "送信中…" : "情報を送信"}
            </button>
            <button
              type="button"
              onClick={() => setBillboardInfoOpen(false)}
              className="rounded-lg border border-[#d8cad7] bg-white px-4 py-2 text-[11px] font-bold text-[#5b486b] md:rounded-xl md:text-sm"
            >
              閉じる
            </button>
          </div>
        </div>
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
          {products.map((product) => {
            const report = getLatestReport(
              store.id,
              product.id
            );

            return (
              <div
                key={product.id}
                className="flex min-w-0 flex-col rounded-lg border border-[#e5d7e4] bg-white px-2.5 py-2 md:rounded-2xl md:px-4 md:py-3"
              >
                <div className="text-[11px] font-bold leading-4 text-[#211c21] md:min-h-[3rem] md:text-[17px] md:leading-6">
                  {product.name}
                </div>

                {!report ? (
                  <div className="mt-1.5 text-[11px] font-bold text-[#625861] md:mt-2 md:text-base">
                    情報なし
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

                {report && (
                  <div className="mt-0.5 text-[9px] text-[#968d95] md:mt-1 md:text-sm">
                    {formatDate(report.created_at)}
                  </div>
                )}

                {report?.comment && (
                  <div className="mt-auto pt-2 md:pt-3">
                    <div className="rounded-md bg-[#faedf4] px-2 py-1.5 text-[10px] leading-4 text-[#594d56] md:rounded-xl md:px-3 md:py-2.5 md:text-base md:leading-6">
                      💬 {report.comment}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => setOpen((current) => !current)}
        className="mt-2.5 rounded-full bg-[#f0dfec] px-3 py-1.5 text-[11px] font-bold text-[#6d4966] md:mt-4 md:px-4 md:py-2.5 md:text-base"
      >
        {open
          ? "店舗情報を閉じる ∧"
          : "店舗情報を見る ∨"}
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-[#e8d9e7] bg-[#fcf9fc] p-3 md:mt-3 md:rounded-2xl md:p-5">
          {online ? (
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
                  <span>公式サイトを見る</span>
                  <ExternalArrow />
                </a>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-[2fr_1fr] md:gap-4">
                <div>
                  <div className="text-[11px] font-bold text-[#2b252b] md:text-base">
                    📍 住所
                  </div>

                  <div className="mt-0.5 text-[11px] leading-5 text-[#655c64] md:mt-1 md:text-base md:leading-6">
                    {store.address || "情報なし"}
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

function compareOnlineStores(a: Store, b: Store) {
  const nameA = normalizeStoreText(
    `${a.chain_name ?? ""}${a.name}`
  );

  const nameB = normalizeStoreText(
    `${b.chain_name ?? ""}${b.name}`
  );

  const universalA =
    nameA.includes("universal") ? 0 : 1;

  const universalB =
    nameB.includes("universal") ? 0 : 1;

  // UNIVERSALをオンラインの最上位にする
  if (universalA !== universalB) {
    return universalA - universalB;
  }

  // UNIVERSAL以外は今までの順番をそのまま維持
  const rankA = getChainRank(a);
  const rankB = getChainRank(b);

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

function getDisplayStoreName(store: Store) {
  const name = store.name.trim();
  const chain = (store.chain_name ?? "").trim();

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

function isOnlineStore(store: Store) {
  return (
    store.store_type === "online" ||
    store.prefecture === "オンライン"
  );
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
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="ml-1 inline-block h-[0.9em] w-[0.9em] align-[-0.08em]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 11L11 5" />
      <path d="M6.5 5H11V9.5" />
    </svg>
  );
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
          <div className="whitespace-nowrap text-[10px] font-bold leading-4 text-[#9b6c91] md:text-sm">
            {title}
          </div>

          <div className="whitespace-nowrap text-base font-bold leading-5 text-[#171417] md:text-xl">
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