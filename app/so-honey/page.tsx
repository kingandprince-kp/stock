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
    region: "蛹玲ｵｷ驕薙・譚ｱ蛹・,
    prefectures: [
      "蛹玲ｵｷ驕・,
      "髱呈｣ｮ逵・,
      "蟯ｩ謇狗恁",
      "螳ｮ蝓守恁",
      "遘狗伐逵・,
      "螻ｱ蠖｢逵・,
      "遖丞ｳｶ逵・,
    ],
  },
  {
    region: "髢｢譚ｱ",
    prefectures: [
      "闌ｨ蝓守恁",
      "譬・惠逵・,
      "鄒､鬥ｬ逵・,
      "蝓ｼ邇臥恁",
      "蜊・痩逵・,
      "譚ｱ莠ｬ驛ｽ",
      "逾槫･亥ｷ晉恁",
    ],
  },
  {
    region: "荳ｭ驛ｨ",
    prefectures: [
      "譁ｰ貎溽恁",
      "蟇悟ｱｱ逵・,
      "遏ｳ蟾晉恁",
      "遖丈ｺ慕恁",
      "螻ｱ譴ｨ逵・,
      "髟ｷ驥守恁",
      "蟯宣・逵・,
      "髱吝ｲ｡逵・,
      "諢帷衍逵・,
    ],
  },
  {
    region: "霑醍柄",
    prefectures: [
      "荳蛾㍾逵・,
      "貊玖ｳ逵・,
      "莠ｬ驛ｽ蠎・,
      "螟ｧ髦ｪ蠎・,
      "蜈ｵ蠎ｫ逵・,
      "螂郁憶逵・,
      "蜥梧ｭ悟ｱｱ逵・,
    ],
  },
  {
    region: "荳ｭ蝗ｽ",
    prefectures: [
      "魑･蜿也恁",
      "蟲ｶ譬ｹ逵・,
      "蟯｡螻ｱ逵・,
      "蠎・ｳｶ逵・,
      "螻ｱ蜿｣逵・,
    ],
  },
  {
    region: "蝗帛嵜",
    prefectures: [
      "蠕ｳ蟲ｶ逵・,
      "鬥吝ｷ晉恁",
      "諢帛ｪ帷恁",
      "鬮倡衍逵・,
    ],
  },
  {
    region: "荵晏ｷ槭・豐也ｸ・,
    prefectures: [
      "遖丞ｲ｡逵・,
      "菴占ｳ逵・,
      "髟ｷ蟠守恁",
      "辭頑悽逵・,
      "螟ｧ蛻・恁",
      "螳ｮ蟠守恁",
      "鮖ｿ蜈仙ｳｶ逵・,
      "豐也ｸ・恁",
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
  "繧ｿ繝ｯ繝ｼ繝ｬ繧ｳ繝ｼ繝・,
  "HMV",
  "譁ｰ譏溷・,
  "邏莨雁恚螻区嶌蠎・,
  "TSUTAYA",
  "繧｢繝九Γ繧､繝・,
  "邇牙・蝣・,
  "繝舌Φ繝繝ｬ繧ｳ繝ｼ繝・,
  "縺上∪縺悶ｏ譖ｸ蠎・,
  "ACADEMIA",
];

const ONLINE_STORE_PRIORITY: string[][] = [
  ["universal", "繝ｦ繝九ヰ繝ｼ繧ｵ繝ｫ", "store.universal-music.co.jp"],
  ["繧ｿ繝ｯ繝ｼ繝ｬ繧ｳ繝ｼ繝・, "towerrecords", "towerrecord", "繧ｿ繝ｯ繝ｬ繧ｳ", "tower.jp"],
  ["hmv", "hmv.co.jp"],
  ["讌ｽ螟ｩ繝悶ャ繧ｯ繧ｹ", "rakutenbooks"],
  ["amazon", "amazon.co.jp"],
  ["繧ｸ繝ｧ繝ｼ繧ｷ繝ｳ", "joshin", "joshinweb", "joshinweb.jp"],
  ["繧ｻ繝悶Φ繝阪ャ繝・, "繧ｻ繝悶Φ繝阪ャ繝医す繝ｧ繝・ヴ繝ｳ繧ｰ", "7netshopping"],
  ["繝阪が繧ｦ繧｣繝ｳ繧ｰ", "neowing", "neowing.co.jp"],
  ["繝薙ャ繧ｯ繧ｫ繝｡繝ｩ", "biccamera", "biccamera.com"],
  ["繝､繝槭ム", "yamada", "繧ｦ繧ｧ繝悶さ繝", "webcom", "yamada-denkiweb.com"],
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
    { label: "蜈育捩迚ｹ蜈ｸ縺ゅｊ", url: "https://books.rakuten.co.jp/rb/18695315/" },
    { label: "迚ｹ蜈ｸ縺ｪ縺・, url: "https://books.rakuten.co.jp/rb/18695306/" },
  ],
  2: [
    { label: "蜈育捩迚ｹ蜈ｸ縺ゅｊ", url: "https://books.rakuten.co.jp/rb/18695316/" },
    { label: "迚ｹ蜈ｸ縺ｪ縺・, url: "https://books.rakuten.co.jp/rb/18695307/" },
  ],
  3: [
    { label: "蜈育捩迚ｹ蜈ｸ縺ゅｊ", url: "https://books.rakuten.co.jp/rb/18695317/" },
    { label: "迚ｹ蜈ｸ縺ｪ縺・, url: "https://books.rakuten.co.jp/rb/18695308/" },
  ],
  4: [
    { label: "蜈育捩迚ｹ蜈ｸ縺ゅｊ", url: "https://books.rakuten.co.jp/rb/18695318/" },
    { label: "迚ｹ蜈ｸ縺ｪ縺・, url: "https://books.rakuten.co.jp/rb/18695309/" },
  ],
  5: [
    { label: "蜈育捩迚ｹ蜈ｸ縺ゅｊ", url: "https://books.rakuten.co.jp/rb/18695319/" },
    { label: "迚ｹ蜈ｸ縺ｪ縺・, url: "https://books.rakuten.co.jp/rb/18695310/" },
  ],
  6: [
    { label: "蜈育捩迚ｹ蜈ｸ縺ゅｊ", url: "https://books.rakuten.co.jp/rb/18695320/" },
    { label: "迚ｹ蜈ｸ縺ｪ縺・, url: "https://books.rakuten.co.jp/rb/18695311/" },
  ],
  7: [
    { label: "蜈育捩迚ｹ蜈ｸ縺ゅｊ", url: "https://books.rakuten.co.jp/rb/18695321/" },
    { label: "迚ｹ蜈ｸ縺ｪ縺・, url: "https://books.rakuten.co.jp/rb/18695312/" },
  ],
  8: [
    { label: "蜷梧凾雉ｼ蜈･迚ｹ蜈ｸ+蜈育捩迚ｹ蜈ｸ縺ゅｊ", url: "https://books.rakuten.co.jp/rb/18695313/" },
  ],
  9: [
    { label: "蜷梧凾雉ｼ蜈･迚ｹ蜈ｸ+蜈育捩迚ｹ蜈ｸ縺ゅｊ", url: "https://books.rakuten.co.jp/rb/18695314/" },
  ],
};

const SEVEN_PRODUCT_LINKS: Record<number, ProductLinkOption[]> = {
  1: [
    { label: "蜈育捩迚ｹ蜈ｸ縺ゅｊ", url: "https://7net.omni7.jp/detail/1301601115.html" },
    { label: "迚ｹ蜈ｸ縺ｪ縺・, url: "https://7net.omni7.jp/detail/1301601124.html" },
  ],
  2: [
    { label: "蜈育捩迚ｹ蜈ｸ縺ゅｊ", url: "https://7net.omni7.jp/detail/1301601116.html" },
    { label: "迚ｹ蜈ｸ縺ｪ縺・, url: "https://7net.omni7.jp/detail/1301601125.html" },
  ],
  3: [
    { label: "蜈育捩迚ｹ蜈ｸ縺ゅｊ", url: "https://7net.omni7.jp/detail/1301601117.html" },
    { label: "迚ｹ蜈ｸ縺ｪ縺・, url: "https://7net.omni7.jp/detail/1301601126.html" },
  ],
  4: [
    { label: "蜈育捩迚ｹ蜈ｸ縺ゅｊ", url: "https://7net.omni7.jp/detail/1301601118.html" },
    { label: "迚ｹ蜈ｸ縺ｪ縺・, url: "https://7net.omni7.jp/detail/1301601127.html" },
  ],
  5: [
    { label: "蜈育捩迚ｹ蜈ｸ縺ゅｊ", url: "https://7net.omni7.jp/detail/1301601119.html" },
    { label: "迚ｹ蜈ｸ縺ｪ縺・, url: "https://7net.omni7.jp/detail/1301601128.html" },
  ],
  6: [
    { label: "蜈育捩迚ｹ蜈ｸ縺ゅｊ", url: "https://7net.omni7.jp/detail/1301601120.html" },
    { label: "迚ｹ蜈ｸ縺ｪ縺・, url: "https://7net.omni7.jp/detail/1301601129.html" },
  ],
  7: [
    { label: "蜈育捩迚ｹ蜈ｸ縺ゅｊ", url: "https://7net.omni7.jp/detail/1301601121.html" },
    { label: "迚ｹ蜈ｸ縺ｪ縺・, url: "https://7net.omni7.jp/detail/1301601130.html" },
  ],
  8: [
    { label: "蜷梧凾雉ｼ蜈･迚ｹ蜈ｸ+蜈育捩迚ｹ蜈ｸ縺ゅｊ", url: "https://7net.omni7.jp/detail/1301601122.html" },
  ],
  9: [
    { label: "蜷梧凾雉ｼ蜈･迚ｹ蜈ｸ+蜈育捩迚ｹ蜈ｸ縺ゅｊ", url: "https://7net.omni7.jp/detail/1301601123.html" },
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

const SITE_CLOSED = false;

export default function Home() {
  if (SITE_CLOSED) {
    return (
      <main className="min-h-screen bg-[#fffaf3] px-4 py-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-[#ead7a7] bg-white p-8 text-center shadow-sm">
          <div className="text-3xl">艮</div>
          <h1 className="mt-4 text-xl font-bold text-[#4d434c]">
            迴ｾ蝨ｨ縺ｯ髱槫・髢九〒縺・          </h1>
          <p className="mt-3 text-sm leading-7 text-[#77643c]">
            蛻晞ｱ譛滄俣邨ゆｺ・・縺溘ａ縲∝惠蠎ｫ繝√ぉ繝・き繝ｼ縺ｮ蜈ｬ髢九ｒ邨ゆｺ・＠縺ｾ縺励◆縲・br />
            縺溘￥縺輔ｓ縺ｮ縺泌茜逕ｨ繝ｻ諠・ｱ謠蝉ｾ帙≠繧翫′縺ｨ縺・＃縺悶＞縺ｾ縺励◆縲・          </p>
        </div>
      </main>
    );
  }

  return <InventoryChecker />;
}

function InventoryChecker() {
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reports, setReports] = useState<InventoryReport[]>([]);
  const [deletingOwnReportId, setDeletingOwnReportId] =
    useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState("");

  const [searchMode, setSearchMode] =
    useState<SearchMode>("physical");
  const [prefecture, setPrefecture] = useState("蜈ｨ蝗ｽ");
  const [search, setSearch] = useState("");

  const [reportMode, setReportMode] =
    useState<SearchMode>("physical");
  const [reportPrefecture, setReportPrefecture] =
    useState("蛹玲ｵｷ驕・);
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

  // Android Chromium邉ｻ繝悶Λ繧ｦ繧ｶ縺縺代∝濠騾乗・縺ｮ逋ｽ閭梧勹繝ｻbackdrop-filter繧帝∩縺代ｋ
  // PC / iPhone / iPad 縺ｧ縺ｯ false 縺ｮ縺ｾ縺ｾ縺ｪ縺ｮ縺ｧ縲∝ｾ捺擂縺ｮ隕九◆逶ｮ繧堤ｶｭ謖√☆繧・  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    setIsAndroid(/Android/i.test(navigator.userAgent));
  }, []);

  // 邂｡逅・・髄縺代い繧ｯ繧ｻ繧ｹ髮・ｨ医・P繧｢繝峨Ξ繧ｹ縺ｯ菫晏ｭ倥○縺壹・  // 繝悶Λ繧ｦ繧ｶ隴伜挨蟄舌・譌･蛻･繝ｦ繝九・繧ｯ謨ｰ縺ｮ驥崎､・愛螳壹↓縺縺台ｽｿ逕ｨ縺吶ｋ縲・  useEffect(() => {
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
      )}莉倭
    : "譛ｬ譌･";

const salesWeekLabel =
  salesData?.week_start &&
  salesData?.week_end
    ? `${formatShortSalesDate(
        salesData.week_start
      )}縲・{formatShortSalesDate(
        salesData.week_end
      )}`
    : "莉企ｱ";

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
          `蠎苓・繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ繧√∪縺帙ｓ縺ｧ縺励◆: ${storesResult.error.message}`
        );
        setLoading(false);
        return;
      }

      if (productsResult.error) {
        setDataError(
          `蝠・刀繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ繧√∪縺帙ｓ縺ｧ縺励◆: ${productsResult.error.message}`
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
        store.prefecture !== "繧ｪ繝ｳ繝ｩ繧､繝ｳ"
    );
  }, [stores]);

  const onlineStores = useMemo(() => {
    return stores.filter(
      (store) =>
        store.store_type === "online" ||
        store.prefecture === "繧ｪ繝ｳ繝ｩ繧､繝ｳ"
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
          prefecture === "蜈ｨ蝗ｽ" ||
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

    // 繧ｪ繝ｳ繝ｩ繧､繝ｳ蠎苓・縺ｯ謖・ｮ壹＆繧後◆蝗ｺ螳夐・ｒ譛蜆ｪ蜈医☆繧九・    // 蛻晞ｱ蛻､螳・likely/check/unlikely)縺ｧ縺ｯ蠎苓・閾ｪ菴薙・荳ｦ縺ｳ鬆・ｒ螟峨∴縺ｪ縺・・    return [...filteredByStock].sort(compareOnlineStores);
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

    return store ? getDisplayStoreName(store) : "蠎苓・荳肴・";
  };

  const getProductName = (productId: number) =>
    products.find((product) => product.id === productId)
      ?.name ?? "蝠・刀荳肴・";

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
     setSubmitError("蠎苓・繧帝∈謚槭＠縺ｦ縺上□縺輔＞縲・);
     return;
   }

   if (!reportProductId) {
     setSubmitError("蝠・刀繧帝∈謚槭＠縺ｦ縺上□縺輔＞縲・);
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
       setSubmitError("蝨ｨ蠎ｫ譫壽焚繧貞・蜉帙＠縺ｦ縺上□縺輔＞縲・);
       return;
     }

     quantity = Number(reportQuantity);

     if (
       !Number.isInteger(quantity) ||
       quantity < 0 ||
       quantity > 100
     ) {
       setSubmitError(
         "蝨ｨ蠎ｫ譫壽焚縺ｯ0縲・00縺ｮ謨ｴ謨ｰ縺ｧ蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・
       );
       return;
     }
   }

   if (reportComment.length > 500) {
     setSubmitError(
       "繧ｳ繝｡繝ｳ繝医・500譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・
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
       "50譫壻ｻ･荳翫・蝨ｨ蠎ｫ諠・ｱ縺ｯ遒ｺ隱阪・縺溘ａ繧ｳ繝｡繝ｳ繝亥・蜉帙′蠢・ｦ√〒縺吶ょ・闕ｷ迥ｶ豕√ｄ蠎鈴ｭ縺ｧ遒ｺ隱阪〒縺阪◆蜀・ｮｹ繧偵＃險伜・縺上□縺輔＞縲・
     );
     return;
   }

   if (online && reportShippingEnabled) {
     if (reportShippingBasis === "delivery" && reportShippingMode === "range") {
       setSubmitError("縺雁ｱ翫￠逶ｮ螳峨・譌･莉倥∪縺溘・縺昴・莉悶ｒ驕ｸ謚槭＠縺ｦ縺上□縺輔＞縲・);
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
         minDays > 2 ||
         maxDays > 2
       ) {
         setSubmitError("逋ｺ騾∫岼螳峨・譌･謨ｰ繧帝∈縺ｳ逶ｴ縺励※縺上□縺輔＞縲・);
         return;
       }

       if (maxDays < minDays) {
         setSubmitError("逋ｺ騾∫岼螳峨・縲後∪縺ｧ縲阪・縲後°繧峨堺ｻ･荳翫・譌･謨ｰ繧帝∈繧薙〒縺上□縺輔＞縲・);
         return;
       }
     }

     if (reportShippingMode === "date" && !reportShippingDate) {
       setSubmitError(reportShippingBasis === "delivery" ? "縺雁ｱ翫￠莠亥ｮ壽律繧貞・蜉帙＠縺ｦ縺上□縺輔＞縲・ : "逋ｺ騾∽ｺ亥ｮ壽律繧貞・蜉帙＠縺ｦ縺上□縺輔＞縲・);
       return;
     }

     if (reportShippingMode === "other" && !reportShippingOther.trim()) {
       setSubmitError(reportShippingBasis === "delivery" ? "陦ｨ遉ｺ縺輔ｌ縺ｦ縺・ｋ縺雁ｱ翫￠譯亥・繧貞・蜉帙＠縺ｦ縺上□縺輔＞縲・ : "陦ｨ遉ｺ縺輔ｌ縺ｦ縺・ｋ逋ｺ騾∵｡亥・繧貞・蜉帙＠縺ｦ縺上□縺輔＞縲・);
       return;
     }

     if (reportShippingSource === "other" && !reportShippingSourceDetail.trim()) {
       setSubmitError("遒ｺ隱榊ｴ謇繧貞・蜉帙＠縺ｦ縺上□縺輔＞縲・);
       return;
     }
   }

   if (!turnstileReady || !turnstileToken) {
     setSubmitError(
       "Bot遒ｺ隱阪′螳御ｺ・＠縺ｦ縺・∪縺帙ｓ縲ょｰ代＠蠕・▲縺ｦ縺九ｉ繧ゅ≧荳蠎ｦ縺願ｩｦ縺励￥縺縺輔＞縲・
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
           "謚慕ｨｿ縺ｫ螟ｱ謨励＠縺ｾ縺励◆縲ゅｂ縺・ｸ蠎ｦ縺願ｩｦ縺励￥縺縺輔＞縲・
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
         setSubmitMessage("蝨ｨ蠎ｫ諠・ｱ縺ｯ謚慕ｨｿ縺ｧ縺阪∪縺励◆縲ら匱騾√・縺雁ｱ翫￠逶ｮ螳峨□縺鷹∽ｿ｡縺ｧ縺阪↑縺九▲縺溘◆繧√∝ｿ・ｦ√〒縺ゅｌ縺ｰ繧ゅ≧荳蠎ｦ縺願ｩｦ縺励￥縺縺輔＞縲・);
       } else {
         setSubmitMessage("蝨ｨ蠎ｫ諠・ｱ縺ｨ逋ｺ騾√・縺雁ｱ翫￠逶ｮ螳峨ｒ謚慕ｨｿ縺励∪縺励◆縲ゅ≠繧翫′縺ｨ縺・＃縺悶＞縺ｾ縺・");
       }
     } else {
       setSubmitMessage("蝨ｨ蠎ｫ諠・ｱ繧呈兜遞ｿ縺励∪縺励◆縲ょ惠蠎ｫ繝√ぉ繝・き繝ｼ縺ｸ縺ｮ縺泌鵠蜉帙√≠繧翫′縺ｨ縺・＃縺悶＞縺ｾ縺・");
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
       "謚慕ｨｿ荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲ゅｂ縺・ｸ蠎ｦ縺願ｩｦ縺励￥縺縺輔＞縲・
     );
   } finally {
     setSubmitting(false);
   }
 }

 async function handleDeleteOwnReport(reportId: number) {
   const confirmed = window.confirm(
     "縺薙・蝨ｨ蠎ｫ謚慕ｨｿ繧貞炎髯､縺励∪縺吶°・歃n蜑企勁縺吶ｋ縺ｨ蝨ｨ蠎ｫ荳隕ｧ縺九ｉ蜿悶ｊ豸医＆繧後∪縺吶・
   );

   if (!confirmed) return;

   setDeletingOwnReportId(reportId);

   try {
     const clientId =
       localStorage.getItem("kp_inventory_client_id");

     if (!clientId) {
       window.alert(
         "縺薙・繝悶Λ繧ｦ繧ｶ縺九ｉ謚慕ｨｿ縺励◆縺薙→繧堤｢ｺ隱阪〒縺阪∪縺帙ｓ縺ｧ縺励◆縲・
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
           "謚慕ｨｿ繧貞炎髯､縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆縲・
       );
       return;
     }

     await loadInventoryReports();
   } catch (error) {
     console.error(error);
     window.alert(
       "蜑企勁荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲ゅｂ縺・ｸ蠎ｦ縺願ｩｦ縺励￥縺縺輔＞縲・
     );
   } finally {
     setDeletingOwnReportId(null);
   }
 }


async function handleStoreRequest() {
  setRequestMessage("");
  setRequestError("");

  if (requestName.trim() === "") {
    setRequestError("蠎苓・蜷阪ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・);
    return;
  }

  if (requestName.trim().length > 150) {
    setRequestError("蠎苓・蜷阪・150譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・);
    return;
  }

  if (requestCity.trim().length > 100) {
    setRequestError("蟶ょ玄逕ｺ譚代・100譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・);
    return;
  }

  if (requestChainName.trim().length > 100) {
    setRequestError("繝√ぉ繝ｼ繝ｳ蜷阪・100譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・);
    return;
  }

  if (requestComment.length > 500) {
    setRequestError("繧ｳ繝｡繝ｳ繝医・500譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・);
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
            ? "繧ｪ繝ｳ繝ｩ繧､繝ｳ"
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
      "蠎苓・霑ｽ蜉繝ｪ繧ｯ繧ｨ繧ｹ繝医ｒ騾∽ｿ｡縺励∪縺励◆縲らｮ｡逅・・′遒ｺ隱榊ｾ後∬ｿｽ蜉縺励∪縺吶・
    );

    setRequestName("");
    setRequestChainName("");
    setRequestCity("");
    setRequestComment("");
  } catch (error) {
    console.error(error);

    setRequestError(
      "繝ｪ繧ｯ繧ｨ繧ｹ繝磯∽ｿ｡荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲ゅｂ縺・ｸ蠎ｦ縺願ｩｦ縺励￥縺縺輔＞縲・
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

  setBugOsType("縺昴・莉・);
  setBugOsVersion(trimmed);
}

async function detectBugEnvironment() {
  if (typeof window === "undefined") return;

  const ua = navigator.userAgent;
  let browserVersion = "";

  // 遶ｯ譛ｫ遞ｮ鬘槭□縺代ｒ閾ｪ蜍募愛螳壹☆繧九・  // 蜈ｷ菴鍋噪縺ｪ讖溽ｨｮ蜷阪・繝悶Λ繧ｦ繧ｶ縺九ｉ豁｣遒ｺ縺ｫ蜿門ｾ励〒縺阪↑縺・ｴ蜷医′縺ゅｋ縺溘ａ閾ｪ蜍募・蜉帙＠縺ｪ縺・・  if (/iPhone/i.test(ua)) {
    setBugDeviceType("iPhone");
  } else if (/iPad/i.test(ua)) {
    setBugDeviceType("iPad");
  } else if (/Android/i.test(ua)) {
    setBugDeviceType("Android");
  } else {
    setBugDeviceType("PC");
  }

  // OS縺ｮ遞ｮ鬘槭□縺代ｒ閾ｪ蜍募愛螳壹☆繧九・  // OS繝舌・繧ｸ繝ｧ繝ｳ縺ｯUser-Agent縺悟ｮ滄圀縺ｨ逡ｰ縺ｪ繧句､繧定ｿ斐☆蝣ｴ蜷医′縺ゅｋ縺溘ａ閾ｪ蜍募・蜉帙＠縺ｪ縺・・  if (/iPhone/i.test(ua)) {
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

  // 繝悶Λ繧ｦ繧ｶ繝ｻ繝悶Λ繧ｦ繧ｶ繝舌・繧ｸ繝ｧ繝ｳ
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

    // Brave蝗ｺ譛峨・繝舌・繧ｸ繝ｧ繝ｳ縺ｧ縺ｯ縺ｪ縺修hromium蛛ｴ縺ｮ蛟､縺ｫ縺ｪ繧句ｴ蜷医′縺ゅｋ縲・    const match = ua.match(/Chrome\/([\d.]+)/i);
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
        ? "荳榊・蜷亥・螳ｹ繧貞・蜉帙＠縺ｦ縺上□縺輔＞縲・
        : "縺碑ｦ∵悍蜀・ｮｹ繧貞・蜉帙＠縺ｦ縺上□縺輔＞縲・
    );
    return;
  }

  if (
    bugReportType === "bug" &&
    bugDeviceType.trim() === ""
  ) {
    setBugError("遶ｯ譛ｫ遞ｮ鬘槭ｒ驕ｸ謚槭＠縺ｦ縺上□縺輔＞縲・);
    return;
  }

  if (
    bugReportType === "bug" &&
    bugOsType.trim() === ""
  ) {
    setBugError("OS遞ｮ鬘槭ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・);
    return;
  }

  if (
    bugBrowser === "縺昴・莉・ &&
    bugBrowserOther.trim() === ""
  ) {
    setBugError("繝悶Λ繧ｦ繧ｶ蜷阪ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・);
    return;
  }

  if (bugImages.length > 5) {
    setBugError("逕ｻ蜒上・5譫壹∪縺ｧ豺ｻ莉倥〒縺阪∪縺吶・);
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
      setBugError("逕ｻ蜒上・1譫壹↓縺､縺・MB莉･蜀・〒豺ｻ莉倥＠縺ｦ縺上□縺輔＞縲・);
      return;
    }

    if (
      image.type &&
      !allowedTypes.includes(image.type)
    ) {
      setBugError(
        "逕ｻ蜒上・JPEG繝ｻPNG繝ｻWebP繝ｻHEIC蠖｢蠑上〒豺ｻ莉倥＠縺ｦ縺上□縺輔＞縲・
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
          "逕ｻ蜒上・繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆縲ら判蜒上ｒ貂帙ｉ縺吶°縲∫判蜒上↑縺励〒蜀榊ｺｦ縺願ｩｦ縺励￥縺縺輔＞縲・
        );
        return;
      }

      imagePaths.push(fileName);
    }

    const browserName =
      bugBrowser === "縺昴・莉・
        ? bugBrowserOther.trim()
        : bugBrowser.trim();

    const { error } = await supabase
      .from("bug_reports")
      .insert({
        issue_description:
          `${bugReportType === "request" ? "[隕∵悍] " : "[荳榊・蜷・ "}${bugDescription.trim()}`,
        device_type:
          bugDeviceType.trim() === ""
            ? "譛ｪ蜈･蜉・
            : bugDeviceType.trim(),
        device_model:
          bugDeviceModel.trim() === ""
            ? null
            : bugDeviceModel.trim(),
        os_type:
          bugOsType.trim() === ""
            ? "譛ｪ蜈･蜉・
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
          bugBrowser === "縺昴・莉・ &&
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
        "騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆縲ょｰ代＠譎る俣繧偵♀縺・※縺九ｉ繧ゅ≧荳蠎ｦ縺願ｩｦ縺励￥縺縺輔＞縲・
      );
      return;
    }

    setBugMessage(
      bugReportType === "bug"
        ? "荳榊・蜷亥ｱ蜻翫ｒ騾∽ｿ｡縺励∪縺励◆縲ゅ≠繧翫′縺ｨ縺・＃縺悶＞縺ｾ縺吶・
        : "縺碑ｦ∵悍繧帝∽ｿ｡縺励∪縺励◆縲ゅ≠繧翫′縺ｨ縺・＃縺悶＞縺ｾ縺吶・
    );

    setBugDescription("");
    setBugDeviceModel("");
    setBugBrowserOther("");
    setBugImages([]);
  } catch (error) {
    console.error(error);

    setBugError(
      "騾∽ｿ｡荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲ゅｂ縺・ｸ蠎ｦ縺願ｩｦ縺励￥縺縺輔＞縲・
    );
  } finally {
    setBugSubmitting(false);
  }
}

  function openXShare(includePageLink: boolean) {
    if (typeof window === "undefined") return;

    const hashtag = "#KP蝨ｨ蠎ｫ縺薙％縺ｫ縺ゅｋ繧・;
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
        fontFamily: '"Meiryo", "繝｡繧､繝ｪ繧ｪ", sans-serif',
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

              {/* 繧ｹ繝槭・: 繧ｿ繧､繝医Ν縺ｮ蟾ｦ蜿ｳ縺ｫ陷・*/}
              <div className="mx-auto mt-1 grid w-full max-w-[360px] grid-cols-[78px_minmax(0,1fr)_78px] items-center gap-0 md:block md:max-w-none">
                <img
                  src="/bee-ren.png"
                  alt=""
                  className="h-auto w-full translate-x-2 scale-[1.6] object-contain mix-blend-multiply md:hidden"
                />

                <h1
                  className="text-center text-[22px] font-bold leading-tight text-[#171417] sm:text-[24px] md:mt-6 md:text-[48px]"
                  style={{
                    fontFamily: '"Meiryo", "繝｡繧､繝ｪ繧ｪ", sans-serif',
                  }}
                >
                  <span className="whitespace-nowrap">King & Prince</span>
                  <br />
                  <span className="whitespace-nowrap">蝨ｨ蠎ｫ繝√ぉ繝・き繝ｼ</span>
                </h1>

                <img
                  src="/bee-kaito.png"
                  alt=""
                  className="h-auto w-full -translate-x-2 scale-[1.6] object-contain mix-blend-multiply md:hidden"
                />
              </div>

              <div className="mt-3 flex items-center justify-center gap-2 text-[12px] font-medium leading-5 text-[#655b64] md:mt-4 md:gap-3 md:text-lg md:leading-7">
                <span className="text-base md:text-2xl" aria-hidden="true">
                  艮
                </span>

                <p className="whitespace-nowrap">
  蜈ｨ蝗ｽ縺ｮ螳溷ｺ苓・繝ｻ繧ｪ繝ｳ繝ｩ繧､繝ｳ繧ｷ繝ｧ繝・・縺ｮ蝨ｨ蠎ｫ繧・  <br />
  7遞ｮ鬘槭∪縺ｨ繧√※遒ｺ隱阪〒縺阪∪縺吶・</p>

                <span className="text-base md:text-2xl" aria-hidden="true">
                  艮
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

          {/* 螢ｲ荳・*/}
          <div className="relative z-10 mt-5 rounded-2xl bg-[#211d21] p-4 text-white md:mt-8 md:rounded-3xl md:p-7">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="text-[10px] font-bold tracking-[0.12em] text-[#e8cfe3] md:text-sm">
                TOTAL SALES
              </div>

              <div className="mt-1 text-3xl font-bold md:mt-2 md:text-5xl">
                {sales === null ? (
                  "・・
                ) : (
                  <>
                    {sales.toLocaleString()}
                    <span className="ml-1 text-sm md:text-xl">譫・/span>
                  </>
                )}
              </div>
            </div>

            {SHOW_GOAL_PROGRESS && (
              <>
                <div className="mt-3 text-center">
                  <div className="text-xs text-[#d9cfd8] md:text-base">
                    驕疲・邇・{percent.toFixed(1)}%
                  </div>

                  <div className="mt-0.5 text-sm font-bold text-[#efcbe7] md:mt-1 md:text-lg">
                    縺ゅ→ {remain.toLocaleString()}譫・                  </div>
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
              icon="投"
              title={salesDateLabel}
              value={today}
            />
            <StatCard
              icon="套"
              title={salesWeekLabel}
              value={week}
            />
            <StatCard
              icon="荘"
              title="邏ｯ險・
              value={sales}
            />
          </div>
        </section>

        {/* ===== X蜈ｱ譛・+ 莉頑律縺ｮ謚慕ｨｿ迥ｶ豕・===== */}
        <section
          className={`rounded-2xl border border-[#e2d3e4] px-3 py-3 shadow-sm md:px-5 md:py-4 ${
            isAndroid ? "bg-white" : "bg-white/90"
          }`}
        >
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-center gap-3 md:gap-5">
            <div className="min-w-0">
              <div className="text-[12px] font-bold text-[#3f3340] md:text-base">
                隕九▽縺代◆蝨ｨ蠎ｫ繧偵∩繧薙↑縺ｫ蜈ｱ譛・              </div>
              <div className="mt-0.5 text-[9px] leading-4 text-[#806f7d] md:text-sm md:leading-5">
                #KP蝨ｨ蠎ｫ縺薙％縺ｫ縺ゅｋ繧・繧偵▽縺代※X縺ｸ謚慕ｨｿ縺ｧ縺阪∪縺・              </div>

              <button
                type="button"
                onClick={() => setXShareOpen(true)}
                className="mt-2 w-full rounded-xl border border-[#b986b5] bg-[#f6e8f3] px-3 py-2.5 text-[11px] font-bold text-[#694260] shadow-sm transition hover:bg-[#eedbec] md:px-5 md:py-3 md:text-base"
              >
                撫 蝨ｨ蠎ｫ諠・ｱ繧貞・譛峨☆繧・              </button>
            </div>

            <div className="min-w-0 text-right text-[10px] leading-5 text-[#655764] md:text-sm md:leading-7">
              <div className="font-bold text-[#5f3e57]">莉頑律縺ｮ謚慕ｨｿ迥ｶ豕・/div>
              <div className="whitespace-nowrap">
                蝨ｨ蠎ｫ謚慕ｨｿ{" "}
                <strong className="text-sm text-[#2b2329] md:text-lg">
                  {todayActivity?.inventory_posts == null
                    ? "・・
                    : todayActivity.inventory_posts.toLocaleString()}
                </strong>
                莉ｶ
              </div>
              <div className="whitespace-nowrap">
                譖ｴ譁ｰ蠎苓・{" "}
                <strong className="text-sm text-[#2b2329] md:text-lg">
                  {todayActivity?.updated_stores == null
                    ? "・・
                    : todayActivity.updated_stores.toLocaleString()}
                </strong>
                蠎苓・
              </div>
            </div>
          </div>
        </section>

        {/* ===== 荳企Κ繝翫ン ===== */}
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
              宵 蠎苓・繧呈爾縺・            </a>

            <a
              href="#report"
              className="whitespace-nowrap rounded-lg bg-[#eadff5] px-1 py-2.5 text-center text-[10px] font-bold text-[#654b78] transition hover:bg-[#dfceed] md:rounded-xl md:px-2 md:py-3.5 md:text-base"
            >
              笨搾ｸ・蝨ｨ蠎ｫ諠・ｱ繧呈兜遞ｿ
            </a>

            <a
              href="#latest"
              className="whitespace-nowrap rounded-lg bg-[#f5e7ef] px-1 py-2.5 text-center text-[10px] font-bold text-[#754e66] transition hover:bg-[#ecd6e2] md:rounded-xl md:px-2 md:py-3.5 md:text-base"
            >
              葡 譛譁ｰ縺ｮ蝨ｨ蠎ｫ謚慕ｨｿ
            </a>
          </div>
        </nav>

        {/* ===== 髮・ｨ医↓縺､縺・※ ===== */}
        <details
          className={`rounded-xl border border-[#e3d4e3] shadow-sm md:rounded-2xl ${
            isAndroid ? "bg-white" : "bg-white/90"
          }`}
        >
          <summary className="cursor-pointer list-none px-4 py-3 text-[12px] font-bold text-[#4f414d] md:px-6 md:py-4 md:text-xl">
            <div className="flex items-center justify-between gap-2">
              <span className="whitespace-nowrap">
                投 繧ｪ繝ｪ繧ｳ繝ｳ繝ｻBillboard髮・ｨ医↓縺､縺・※
              </span>
              <span className="text-[#9b6c91]">竏ｨ</span>
            </div>
          </summary>

          <div className="border-t border-[#eaddea] px-4 pb-4 pt-4 md:px-6 md:pb-6 md:pt-5">
            <div>
              <div className="text-base font-bold text-[#2c252b] md:text-lg">
                繧ｪ繝ｪ繧ｳ繝ｳ
              </div>

              <div className="mt-2">
                <span className="inline-block rounded-lg border border-[#bd4f88] bg-[#d9609b] px-2.5 py-1 text-[11px] font-bold text-white md:rounded-xl md:px-3 md:py-1.5 md:text-sm">
                  繧ｪ繝ｪ繧ｳ繝ｳ蟇ｾ雎｡
                </span>
              </div>

              <p className="mt-2 text-[12px] leading-5 text-[#2f2a2f] md:mt-3 md:text-base md:leading-7">
                譛ｬ繧ｵ繧､繝医↓謗ｲ霈峨＠縺ｦ縺・ｋ螳溷ｺ苓・縺ｯ縲∝渕譛ｬ逧・↓繧ｪ繝ｪ繧ｳ繝ｳ
                縲靴D繝ｻDVD/Blu-ray繝ｩ繝ｳ繧ｭ繝ｳ繧ｰ隱ｿ譟ｻ蜊泌鴨蠎励阪→縺励※
                遒ｺ隱阪〒縺阪◆蠎苓・繧呈軸霈峨＠縺ｦ縺・∪縺吶・              </p>

              <div className="mt-3 rounded-lg border border-[#ead7a7] bg-[#fff9e8] p-3 text-[11px] leading-5 text-[#5f512f] md:mt-4 md:rounded-xl md:p-4 md:text-sm md:leading-6">
                <div className="font-bold text-[#4f4021]">竢ｰ 蛻晞ｱ髮・ｨ医・雉ｼ蜈･逶ｮ螳・/div>
                <p className="mt-1.5">蛻晞ｱ髮・ｨ医・邱繧∵凾髢薙・蠎苓・繧・ｳｼ蜈･譁ｹ豕輔↓繧医▲縺ｦ逡ｰ縺ｪ繧句庄閭ｽ諤ｧ縺後≠繧翫∪縺吶ょｺ苓・縺斐→縺ｫ遒ｺ隱阪〒縺阪◆諠・ｱ縺ｮ縺ｿ陦ｨ遉ｺ縺励∵悴遒ｺ隱阪・蝣ｴ蜷医・縲瑚ｦ∫｢ｺ隱阪阪→縺励※縺・∪縺吶′縲∽ｿ晁ｨｼ縺吶ｋ繧ゅ・縺ｧ縺ｯ縺ゅｊ縺ｾ縺帙ｓ縺ｮ縺ｧ縲∝ｮ滄圀縺ｮ蠎苓・縺ｫ縺皮｢ｺ隱阪￥縺縺輔＞縲・/p>
                <p className="mt-1.5">繧ｪ繝ｳ繝ｩ繧､繝ｳ繧ｷ繝ｧ繝・・縺ｯ縲∵ｳｨ譁・律譎ゅ□縺代〒縺ｪ縺冗匱騾∵凾譛溘↑縺ｩ縺ｫ繧医▲縺ｦ髮・ｨ医ち繧､繝溘Φ繧ｰ縺悟､峨ｏ繧九◆繧√・strong>雉ｼ蜈･蜑阪↓蠢・★蜷・す繝ｧ繝・・縺ｮ蝠・刀繝壹・繧ｸ縺ｧ逋ｺ騾∽ｺ亥ｮ壹ｒ縺皮｢ｺ隱阪￥縺縺輔＞縲・/strong></p>
                <p className="mt-1.5 text-[#766744]">窶ｻ陦ｨ遉ｺ縺ｯ逶ｮ螳峨〒縺吶ょｺ苓・繝ｻ繧ｷ繝ｧ繝・・繧・ｳｼ蜈･譁ｹ豕輔∝惠蠎ｫ繝ｻ逋ｺ騾∫憾豕√↓繧医▲縺ｦ螟峨ｏ繧句ｴ蜷医′縺ゅｊ縺ｾ縺吶・/p>
              </div>

              <a
                href="https://biz.oricon.co.jp/coope.asp"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center rounded-full bg-[#f1dfec] px-3 py-2 text-[11px] font-bold text-[#6d4966] transition hover:bg-[#e9d2e4] md:mt-3 md:px-4 md:py-2.5 md:text-base"
              >
                <span>繧ｪ繝ｪ繧ｳ繝ｳ 隱ｿ譟ｻ蜊泌鴨蠎嶺ｸ隕ｧ繧堤｢ｺ隱阪☆繧・/span>
                <ExternalArrow />
              </a>
            </div>

            <div className="mt-5 border-t border-[#eaddea] pt-5 md:mt-6 md:pt-6">
              <div className="text-base font-bold text-[#2c252b] md:text-lg">
                Billboard
              </div>

              <p className="mt-1.5 text-[12px] leading-5 text-[#2f2a2f] md:mt-2 md:text-base md:leading-7">
                蠎苓・縺斐→縺ｫ縲∽ｻ･荳九・3遞ｮ鬘槭〒陦ｨ遉ｺ縺励※縺・∪縺吶・              </p>

              <div className="mt-3 space-y-2 md:mt-4 md:space-y-3">
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <span className="rounded-lg border border-[#7250a5] bg-[#835ab3] px-2.5 py-1 text-[11px] font-bold text-white md:rounded-xl md:px-3 md:py-1.5 md:text-sm">
                    Billboard 蟇ｾ雎｡
                  </span>
                  <span className="text-[12px] text-[#2f2a2f] md:text-base">
                    髮・ｨ亥ｯｾ雎｡縺ｨ縺励※遒ｺ隱阪〒縺阪◆蠎苓・
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <span className="rounded-lg border border-[#a9a2a8] bg-[#ece9ec] px-2.5 py-1 text-[11px] font-bold text-[#595159] md:rounded-xl md:px-3 md:py-1.5 md:text-sm">
                    Billboard 蟇ｾ雎｡螟・                  </span>
                  <span className="text-[12px] text-[#2f2a2f] md:text-base">
                    髮・ｨ亥ｯｾ雎｡螟悶→縺励※遒ｺ隱阪＠縺溷ｺ苓・
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <span className="rounded-lg border border-[#9e85b8] bg-[#eee7f4] px-2.5 py-1 text-[11px] font-bold text-[#5b486b] md:rounded-xl md:px-3 md:py-1.5 md:text-sm">
                    Billboard 隕∫｢ｺ隱・                  </span>
                  <span className="text-[12px] text-[#2f2a2f] md:text-base">
                    蠎苓・縺斐→縺ｮ遒ｺ隱阪′蠢・ｦ√↑蠎苓・
                  </span>
                </div>
              </div>

              <a
                href="https://www.billboard-japan.com/common/special/others/storelist/storelist.html"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center rounded-full bg-[#eee7f4] px-3 py-2 text-[11px] font-bold text-[#5b486b] transition hover:bg-[#e5daee] md:mt-4 md:px-4 md:py-2.5 md:text-base"
              >
                <span>Billboard JAPAN 髮・ｨ亥ｯｾ雎｡蠎励ｒ遒ｺ隱阪☆繧・/span>
                <ExternalArrow />
              </a>

              <div className="mt-4 rounded-lg bg-[#f8f4f7] p-3 text-[11px] leading-5 text-[#2f2a2f] md:mt-5 md:rounded-xl md:p-4 md:text-sm md:leading-6">
                <p>
                  窶ｻ TSUTAYA縺ｪ縺ｩ繝輔Λ繝ｳ繝√Ε繧､繧ｺ蠎苓・縺悟､壹＞繝√ぉ繝ｼ繝ｳ縺ｧ縺ｯ縲∝ｺ苓・縺ｫ繧医▲縺ｦ髮・ｨ亥ｯｾ雎｡迥ｶ豕√′逡ｰ縺ｪ繧句ｴ蜷医′縺ゅｋ縺溘ａ縲√瑚ｦ∫｢ｺ隱阪阪→縺励※縺・ｋ蠎苓・縺後≠繧翫∪縺吶・                </p>

                <p className="mt-2">
  窶ｻ謗ｲ霈画ュ蝣ｱ縺ｯ蜈ｬ蠑乗ュ蝣ｱ遲峨ｒ繧ゅ→縺ｫ蜿ｯ閭ｽ縺ｪ遽・峇縺ｧ遒ｺ隱阪＠縺ｦ縺・∪縺吶′縲∵怙譁ｰ諤ｧ繝ｻ豁｣遒ｺ諤ｧ繧・Λ繝ｳ繧ｭ繝ｳ繧ｰ縺ｸ縺ｮ髮・ｨ医ｒ菫晁ｨｼ縺吶ｋ繧ゅ・縺ｧ縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲ょｺ苓・縺ｮ迥ｶ豕√ｄ髮・ｨ域擅莉ｶ縺悟､画峩縺輔ｌ繧句ｴ蜷医ｂ縺ゅｋ縺溘ａ縲・  <span className="font-bold text-[#4e454d]">
    雉ｼ蜈･蜑阪↓蜷・ｺ苓・繝ｻ蜈ｬ蠑上し繧､繝育ｭ峨〒譛譁ｰ諠・ｱ繧偵＃閾ｪ霄ｫ縺ｧ縺皮｢ｺ隱阪￥縺縺輔＞縲・  </span>
</p>
              </div>
            </div>
          </div>
        </details>

        {/* ===== 蝨ｨ蠎ｫ諠・ｱ縺ｫ縺､縺・※ ===== */}
        <details
          className={`rounded-xl border border-[#e3d4e3] shadow-sm md:rounded-2xl ${
            isAndroid ? "bg-white" : "bg-white/90"
          }`}
        >
          <summary className="cursor-pointer list-none px-4 py-3 text-[12px] font-bold text-[#4f414d] md:px-6 md:py-4 md:text-xl">
            <div className="flex items-center justify-between gap-2">
              <span>逃 蝨ｨ蠎ｫ諠・ｱ縺ｫ縺､縺・※</span>
              <span className="text-[#9b6c91]">竏ｨ</span>
            </div>
          </summary>

          <div className="border-t border-[#eaddea] px-4 pb-4 pt-4 text-[12px] leading-5 text-[#2f2a2f] md:px-6 md:pb-6 md:pt-5 md:text-base md:leading-7">
            <p>
              譛ｬ繧ｵ繧､繝医・蝨ｨ蠎ｫ諠・ｱ縺ｯ縲∝ｺ苓・繝ｻ繧ｪ繝ｳ繝ｩ繧､繝ｳ繧ｷ繝ｧ繝・・縺ｧ遒ｺ隱阪＠縺滓ュ蝣ｱ繧・              繝ｦ繝ｼ繧ｶ繝ｼ縺梧兜遞ｿ縺怜・譛峨☆繧九ｂ縺ｮ縺ｧ縺吶・            </p>

            <p className="mt-2 md:mt-3">
              蝨ｨ蠎ｫ迥ｶ豕√・謚慕ｨｿ蠕後↓螟牙虚縺吶ｋ蝣ｴ蜷医′縺ゅｊ縲・              陦ｨ遉ｺ縺輔ｌ縺ｦ縺・ｋ蝨ｨ蠎ｫ謨ｰ繧・惠蠎ｫ縺ｮ譛臥┌繧剃ｿ晁ｨｼ縺吶ｋ繧ゅ・縺ｧ縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲・              <br />
              縺ｾ縺溘∝ｺ苓・縺ｸ縺ｮ蜿悶ｊ鄂ｮ縺阪・莠育ｴ・・蜿ｯ蜷ｦ縺ｫ縺､縺・※繧ゅ・              蜷・ｺ苓・縺ｸ逶ｴ謗･縺皮｢ｺ隱阪￥縺縺輔＞縲・            </p>

            <div className="mt-3 rounded-lg bg-[#f8f4f7] p-3 text-[11px] leading-5 text-[#2f2a2f] md:mt-4 md:rounded-xl md:p-4 md:text-sm md:leading-6">
              窶ｻ 謗ｲ霈画ュ蝣ｱ縺ｯ蜿り・ュ蝣ｱ縺ｨ縺励※縺泌茜逕ｨ縺上□縺輔＞縲・              <strong className="font-bold">
                雉ｼ蜈･繝ｻ譚･蠎怜燕縺ｫ縺ｯ縲√＃閾ｪ霄ｫ縺ｧ蜷・ｺ苓・繝ｻ繧ｪ繝ｳ繝ｩ繧､繝ｳ繧ｷ繝ｧ繝・・遲峨∈
                譛譁ｰ縺ｮ蝨ｨ蠎ｫ迥ｶ豕√ｒ縺皮｢ｺ隱阪￥縺縺輔＞縲・              </strong>
            </div>
          </div>
        </details>

        {/* ===== 蠎苓・讀懃ｴ｢ ===== */}
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
            小 蠎苓・繧呈爾縺・          </h2>

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
              宵 螳溷ｺ苓・
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
              將 繧ｪ繝ｳ繝ｩ繧､繝ｳ
            </button>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              searchMode === "physical"
                ? "蠎苓・蜷阪・繝√ぉ繝ｼ繝ｳ蜷阪・蟶ょ玄逕ｺ譚代〒讀懃ｴ｢"
                : "繧ｪ繝ｳ繝ｩ繧､繝ｳ繧ｷ繝ｧ繝・・蜷阪〒讀懃ｴ｢"
            }
            className="mt-3 w-full rounded-xl border border-[#d9c9d8] bg-[#fdfafd] p-2.5 text-[12px] outline-none focus:border-[#bb79a7] focus:ring-2 focus:ring-[#eedbea] md:mt-4 md:rounded-2xl md:p-4 md:text-base"
          />

          {searchMode === "physical" && (
            <div className="mt-4 md:mt-7">
              <div className="text-sm font-bold text-[#2c252b] md:text-xl">
                桃 驛ｽ驕灘ｺ懃恁縺九ｉ謗｢縺・              </div>

              <button
                onClick={() => setPrefecture("蜈ｨ蝗ｽ")}
                className={`mt-2.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold md:mt-4 md:px-5 md:py-2.5 md:text-base ${
                  prefecture === "蜈ｨ蝗ｽ"
                    ? "bg-[#211d21] text-white"
                    : "bg-[#f1dfed] text-[#68415f]"
                }`}
              >
                蜈ｨ蝗ｽ
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
                  肢{" "}
                  {searchMode === "physical"
                    ? "蠎苓・蛻･ 蝨ｨ蠎ｫ荳隕ｧ"
                    : "繧ｪ繝ｳ繝ｩ繧､繝ｳ 蝨ｨ蠎ｫ荳隕ｧ"}
                </h3>

                {searchMode === "physical" &&
                  prefecture !== "蜈ｨ蝗ｽ" && (
                    <p className="mt-1 text-[12px] text-[#766a75] md:mt-2 md:text-base">
                      桃 {prefecture}
                    </p>
                  )}
              </div>

              {!loading && !dataError && (
                <div className="rounded-full bg-[#f3dce9] px-2.5 py-1 text-[11px] font-bold text-[#653b56] md:px-4 md:py-2 md:text-base">
                  {displayedStores.length.toLocaleString()}蠎苓・
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
                      笨・                    </span>
                    <span>
                      <span className="block text-[12px] font-bold md:text-sm">
                        蝨ｨ蠎ｫ縺ゅｊ蝠・刀縺ｮ縺ｿ陦ｨ遉ｺ
                      </span>
                      <span className="mt-0.5 block text-[9px] font-normal opacity-75 md:text-xs">
                        蝨ｨ蠎ｫ縺ｪ縺励・蜈･闕ｷ蠕・■縺ｪ縺ｩ繧剃ｸ隕ｧ縺九ｉ髫縺励∪縺・                      </span>
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
                  竢ｰ 蛻晞ｱ髮・ｨ医↓髢薙↓蜷医≧隕玖ｾｼ縺ｿ縺ｧ邨槭ｊ霎ｼ縺ｿ
                </div>
                <p className="mt-1 text-[10px] leading-5 text-[#746443] md:text-sm md:leading-6">
  逋ｺ騾∽ｺ亥ｮ壹↑縺ｩ縺ｮ諠・ｱ繧偵ｂ縺ｨ縺ｫ縲∝・騾ｱ髮・ｨ医↓髢薙↓蜷医≧隕玖ｾｼ縺ｿ縺ｧ邨槭ｊ霎ｼ繧√∪縺吶・  蛻晄悄陦ｨ遉ｺ縺ｧ縺ｯ縲√☆縺ｹ縺ｦ縺ｮ繧ｪ繝ｳ繝ｩ繧､繝ｳ繧ｷ繝ｧ繝・・繧定｡ｨ遉ｺ縺励※縺・∪縺吶・  <br />
  <span className="font-bold">
    窶ｻ縺ゅ￥縺ｾ縺ｧ隕玖ｾｼ縺ｿ縺ｧ縺ゅｊ縲∝・騾ｱ髮・ｨ医∈縺ｮ蜿肴丐繧剃ｿ晁ｨｼ縺吶ｋ繧ゅ・縺ｧ縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲・    雉ｼ蜈･蜑阪↓縲∝推蝠・刀繝壹・繧ｸ縺ｮ譛譁ｰ諠・ｱ繧偵＃遒ｺ隱阪￥縺縺輔＞縲・  </span>
</p>
                <div className="mt-2 flex flex-wrap gap-1.5 md:gap-2">
                  {([
                    ["all", "縺吶∋縺ｦ"],
                    ["likely", "鳩 髢薙↓蜷医≧隕玖ｾｼ縺ｿ"],
                    ["check", "泯 隕∫｢ｺ隱・],
                    ["unlikely", "閥 髢薙↓蜷医ｏ縺ｪ縺・ｦ玖ｾｼ縺ｿ"],
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
              <LoadingBox text="蠎苓・繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ縺ｿ荳ｭ窶ｦ" />
            ) : dataError ? (
              <ErrorBox text={dataError} />
            ) : displayedStores.length === 0 ? (
              <EmptyBox text="隧ｲ蠖薙☆繧句ｺ苓・縺後≠繧翫∪縺帙ｓ" />
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

        {/* ===== 蝨ｨ蠎ｫ謚慕ｨｿ ===== */}
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
            笨搾ｸ・蝨ｨ蠎ｫ諠・ｱ繧呈兜遞ｿ
          </h2>

          <p className="mt-1 text-[12px] text-[#766a75] md:mt-2 md:text-base">
            螳溷ｺ苓・繝ｻ繧ｪ繝ｳ繝ｩ繧､繝ｳ繧ｷ繝ｧ繝・・縺ｧ遒ｺ隱阪＠縺溷惠蠎ｫ繧呈兜遞ｿ縺ｧ縺阪∪縺吶・          </p>

          <div className="mt-3 rounded-xl border border-[#ead7a7] bg-[#fff9e8] p-3 text-[11px] leading-5 text-[#5f512f] md:mt-4 md:rounded-2xl md:p-4 md:text-sm md:leading-6">
            <div className="font-bold text-[#4f4021]">到 隍・焚蠎苓・繧偵∪縺ｨ繧√※遒ｺ隱阪・謚慕ｨｿ縺輔ｌ繧区婿縺ｸ</div>
            <p className="mt-1.5">髮ｻ隧ｱ遒ｺ隱阪↑縺ｩ縺ｧ隍・焚蠎苓・縺ｮ諠・ｱ繧偵∪縺ｨ繧√※謚慕ｨｿ縺励※縺上□縺輔ｋ蝣ｴ蜷医・縲・strong>繧ｳ繝｡繝ｳ繝域ｬ・↓縲碁崕隧ｱ遒ｺ隱阪阪瑚､・焚蠎苓・繧偵∪縺ｨ繧√※遒ｺ隱阪阪↑縺ｩ縲√←縺ｮ繧医≧縺ｫ遒ｺ隱阪＠縺滓ュ蝣ｱ縺倶ｸ險豺ｻ縺医※縺・◆縺縺代ｋ縺ｨ蜉ｩ縺九ｊ縺ｾ縺吶・/strong></p>
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
              宵 螳溷ｺ苓・
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
              將 繧ｪ繝ｳ繝ｩ繧､繝ｳ
            </button>
          </div>

          {reportMode === "physical" && (
            <div className="mt-3 grid gap-3 md:mt-5 md:grid-cols-2 md:gap-4">
              <label className="space-y-1.5 md:space-y-2">
                <span className="text-[12px] font-bold text-[#211d21] opacity-100 md:text-base">
                  桃 驛ｽ驕灘ｺ懃恁
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

              <label className="space-y-1.5 md:space-y-2">
                <span className="text-[12px] font-bold text-[#211d21] opacity-100 md:text-base">
                  珍 蝠・刀
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
          )}

          <label className="mt-3 block space-y-1.5 md:mt-5 md:space-y-2">
            <span className="text-[12px] font-bold text-[#211d21] opacity-100 md:text-base">
              博{" "}
              {reportMode === "online"
                ? "繧ｪ繝ｳ繝ｩ繧､繝ｳ繧ｷ繝ｧ繝・・繧呈､懃ｴ｢"
                : "蠎苓・繧呈､懃ｴ｢"}
            </span>

            <input
              value={reportStoreSearch}
              onChange={(e) => {
                setReportStoreSearch(e.target.value);
                setReportStoreId("");
              }}
              placeholder={
                reportMode === "online"
                  ? "繧ｷ繝ｧ繝・・蜷阪ｒ蜈･蜉・
                  : "蠎苓・蜷阪・繝√ぉ繝ｼ繝ｳ蜷阪・蟶ょ玄逕ｺ譚代ｒ蜈･蜉・
              }
              className="w-full rounded-xl border border-[#d9c9d8] bg-[#fdfafd] p-2.5 text-[12px] text-[#211d21] opacity-100 [color:#211d21] [-webkit-text-fill-color:#211d21] placeholder:text-[#766c74] placeholder:opacity-100 md:rounded-2xl md:p-3.5 md:text-base"
            />
          </label>

          <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-[#eaddea] bg-[#fcf9fc] p-1.5 md:mt-3 md:max-h-72 md:rounded-2xl md:p-2">
            {reportCandidates.length === 0 ? (
              <div className="p-3 text-[12px] text-[#837983] md:p-4 md:text-base">
                隧ｲ蠖薙☆繧句ｺ苓・縺後≠繧翫∪縺帙ｓ
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
                驕ｸ謚樔ｸｭ
              </div>

              <div className="mt-0.5 text-[12px] font-bold text-[#211d21] opacity-100 [color:#211d21] [-webkit-text-fill-color:#211d21] md:mt-1 md:text-base">
                {getDisplayStoreName(selectedReportStore)}
              </div>
            </div>
          )}

          {reportMode === "online" && (
            <label className="mt-3 block space-y-1.5 md:mt-5 md:space-y-2">
              <span className="text-[12px] font-bold text-[#211d21] opacity-100 md:text-base">
                珍 蝠・刀
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
          )}

          {reportMode === "physical" ? (
            <div className="mt-3 md:mt-5">
              <div className="text-[12px] font-bold text-[#211d21] md:text-base">
                箸 蝨ｨ蠎ｫ迥ｶ豕・              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5 md:gap-2">
                {[
                  ["quantity", "譫壽焚繧貞・蜉・],
                  ["in_stock", "笳・蝨ｨ蠎ｫ縺ゅｊ"],
                  ["sold_out", "ﾃ・蝨ｨ蠎ｫ縺ｪ縺・],
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
                  placeholder="萓・ 5"
                  className="mt-2 w-full rounded-xl border border-[#d9c9d8] bg-[#fdfafd] p-2.5 text-[12px] text-[#211d21] opacity-100 [color:#211d21] [-webkit-text-fill-color:#211d21] placeholder:text-[#766c74] placeholder:opacity-100 md:rounded-2xl md:p-3.5 md:text-base"
                />
              ) : (
                <div className="mt-2 rounded-xl bg-[#fbf7fa] px-3 py-2 text-[10px] leading-5 text-[#756873] md:text-sm">
                  譫壽焚縺悟・縺九ｉ縺ｪ縺上※繧よ兜遞ｿ縺ｧ縺阪∪縺吶ょ惠蠎ｫ縺悟､壹＞蝣ｴ蜷医・縲√さ繝｡繝ｳ繝医↓縲悟惠蠎ｫ貎､豐｢縲阪悟ｺ鈴ｭ縺ｫ螟壽焚縺ゅｊ縲阪↑縺ｩ迥ｶ豕√ｒ豺ｻ縺医※縺・◆縺縺代ｋ縺ｨ蜿り・↓縺ｪ繧翫∪縺吶・                </div>
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
                      氏 {purchaseVariantStoreLabel(selectedReportStore)}縺ｮ迚ｹ蜈ｸ蛹ｺ蛻・                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {[
                        ["special", "蜈育捩迚ｹ蜈ｸ縺ゅｊ"],
                        ["no_special", "迚ｹ蜈ｸ縺ｪ縺・],
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
                      蝨ｨ蠎ｫ迥ｶ豕√・迚ｹ蜈ｸ縺ゅｊ繝ｻ縺ｪ縺励〒蛻･縲・↓險倬鹸縺輔ｌ縺ｾ縺吶・                    </p>
                  </div>
                )}

              <div>
                <div className="text-[12px] font-bold text-[#211d21] md:text-base">
                  將 蝨ｨ蠎ｫ迥ｶ豕・                </div>
              <div className="mt-2 grid grid-cols-2 gap-2 md:gap-3">
                {[
                  ["in_stock", "笳・蝨ｨ蠎ｫ縺ゅｊ"],
                  ["low_stock", "笆ｳ 谿九ｊ繧上★縺・],
                  ["backorder", "蜈･闕ｷ蠕・■"],
                  ["sold_out", "ﾃ・蝨ｨ蠎ｫ縺ｪ縺・],
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
                  <span className="block text-[12px] font-bold text-[#4d3d18] [-webkit-text-fill-color:#4d3d18] md:text-base">囹 逋ｺ騾√・縺雁ｱ翫￠逶ｮ螳峨ｂ謚慕ｨｿ縺吶ｋ</span>
                  <span className="mt-0.5 block text-[10px] leading-4 text-[#766744] [-webkit-text-fill-color:#766744] md:text-sm">
                    莉ｻ諢上〒縺吶よ律謨ｰ陦ｨ遉ｺ縺ｪ繧峨後°繧峨阪後∪縺ｧ縲阪ｒ驕ｸ縺ｶ縺縺代〒謚慕ｨｿ縺ｧ縺阪∪縺吶・                  </span>
                </span>
              </label>
              {reportShippingEnabled && (
                <div className="mt-3 space-y-3 border-t border-[#ead9a8] pt-3">
                  <div>
                    <div className="mb-1.5 text-[12px] font-bold text-[#352f34] [-webkit-text-fill-color:#352f34] md:text-base">
                      逋ｺ騾√・縺雁ｱ翫￠縺ｮ縺ｩ縺｡繧峨・陦ｨ遉ｺ縺ｧ縺吶°?
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                      {[
                        ["shipping", "逋ｺ騾√・蜃ｺ闕ｷ"],
                        ["delivery", "縺雁ｱ翫￠繝ｻ蛻ｰ逹"],
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
                      陦ｨ遉ｺ縺輔ｌ縺ｦ縺・ｋ逶ｮ螳・                    </div>
                    <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                      {[
                        ...(reportShippingBasis === "shipping" ? [["range", "譌･謨ｰ"]] : []),
                        ["date", "譌･莉・],
                        ["other", "縺昴・莉・],
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
                      <div className="mb-2 text-[10px] leading-4 text-[#5f523f] md:text-xs">
                        萓・ 縲悟ｽ捺律逋ｺ騾√阪・縲悟ｽ捺律・槫ｽ捺律縲阪√悟ｽ捺律・・譌･縺ｧ逋ｺ騾√阪・縲悟ｽ捺律・・譌･縲阪↓縺励∪縺吶・                      </div>
                      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-bold text-[#4d434c] md:text-xs">
                            縺九ｉ
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
                            <option value="0">蠖捺律</option>
                            <option value="1">1譌･</option>
                            <option value="2">2譌･莉･荳・/option>
                          </select>
                        </label>

                        <div className="pb-2.5 text-sm font-bold text-[#6a5b4f] md:pb-3">
                          ・・                        </div>

                        <label className="block">
                          <span className="mb-1 block text-[10px] font-bold text-[#4d434c] md:text-xs">
                            縺ｾ縺ｧ
                          </span>
                          <select
                            value={reportShippingMaxDays}
                            onChange={(e) => setReportShippingMaxDays(e.target.value)}
                            className="w-full rounded-lg border border-[#d8cad7] bg-white p-2.5 text-[12px] text-[#2f292e] opacity-100 [color:#2f292e] [-webkit-text-fill-color:#2f292e] md:rounded-xl md:p-3 md:text-sm"
                          >
                            <option value="0">蠖捺律</option>
                            <option value="1">1譌･</option>
                            <option value="2">2譌･莉･荳・/option>
                          </select>
                        </label>
                      </div>
                    </div>
                  )}

                  {reportShippingMode === "date" && (
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-bold text-[#4d434c] md:text-sm">
                        {reportShippingBasis === "delivery" ? "縺雁ｱ翫￠莠亥ｮ壽律" : "逋ｺ騾√・蜃ｺ闕ｷ莠亥ｮ壽律"}
                      </span>
                      <input
                        type="date"
                        value={reportShippingDate}
                        onChange={(e) => setReportShippingDate(e.target.value)}
                        className="block w-full min-w-0 max-w-full box-border rounded-lg border border-[#d8cad7] bg-white p-2.5 text-[12px] text-[#2f292e] opacity-100 [color:#2f292e] [-webkit-text-fill-color:#2f292e] md:rounded-xl md:p-3 md:text-sm"
                      />
                    </label>
                  )}

                  {reportShippingMode === "other" && (
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-bold text-[#4d434c] md:text-sm">
                        陦ｨ遉ｺ縺輔ｌ縺ｦ縺・ｋ蜀・ｮｹ
                      </span>
                      <input
                        type="text"
                        maxLength={200}
                        value={reportShippingOther}
                        onChange={(e) => setReportShippingOther(e.target.value)}
                        placeholder={
                          reportShippingBasis === "delivery"
                            ? "萓・ 蝨ｰ蝓溘↓繧医ｊ縺雁ｱ翫￠譌･縺檎焚縺ｪ繧・/ 縺雁ｱ翫￠譌･譛ｪ螳・
                            : "萓・ 縺雁叙繧雁ｯ・○2縲・譌･ / 蜈･闕ｷ谺｡隨ｬ逋ｺ騾・/ 3縲・蝟ｶ讌ｭ譌･"
                        }
                        className="w-full rounded-lg border border-[#d8cad7] bg-white p-2.5 text-[12px] text-[#2f292e] opacity-100 [color:#2f292e] [-webkit-text-fill-color:#2f292e] placeholder:text-[#766c74] md:rounded-xl md:p-3 md:text-sm"
                      />
                      <span className="mt-1 block text-[9px] leading-4 text-[#766744] md:text-xs">
                        譌･謨ｰ縺ｧ陦ｨ縺帙↑縺・｡亥・縺ｯ縺薙■繧峨↓縺昴・縺ｾ縺ｾ蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・                      </span>
                    </label>
                  )}

                  {reportShippingMode !== "other" && (
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-bold text-[#4d434c] md:text-sm">
                        譚｡莉ｶ繝ｻ陬懆ｶｳ
                        <span className="ml-2 text-[10px] font-normal text-[#8a7b70] md:text-xs">
                          莉ｻ諢・                        </span>
                      </span>
                      <input
                        type="text"
                        maxLength={200}
                        value={reportShippingCondition}
                        onChange={(e) => setReportShippingCondition(e.target.value)}
                        placeholder={
                          reportShippingBasis === "delivery"
                            ? "萓・ 驟埼∝・縺ｫ繧医▲縺ｦ縺雁ｱ翫￠譌･縺檎焚縺ｪ繧・
                            : "萓・ 13譎ゅ∪縺ｧ縺ｮ豕ｨ譁・〒蠖捺律逋ｺ騾・
                        }
                        className="w-full rounded-lg border border-[#d8cad7] bg-white p-2.5 text-[12px] text-[#2f292e] opacity-100 [color:#2f292e] [-webkit-text-fill-color:#2f292e] placeholder:text-[#766c74] md:rounded-xl md:p-3 md:text-sm"
                      />
                      <span className="mt-1 block text-[9px] leading-4 text-[#5f523f] md:text-xs">
                        譎ょ綾繝ｻ豕ｨ譁・擅莉ｶ縺ｪ縺ｩ縺瑚｡ｨ遉ｺ縺輔ｌ縺ｦ縺・ｋ蝣ｴ蜷医・縲√◎縺ｮ縺ｾ縺ｾ蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・                      </span>
                    </label>
                  )}

                  <label className="block">
                    <span className="mb-1 block text-[11px] font-bold text-[#4d434c] md:text-sm">遒ｺ隱榊ｴ謇</span>
                    <select value={reportShippingSource} onChange={(e) => setReportShippingSource(e.target.value)} className="w-full rounded-lg border border-[#d8cad7] bg-white p-2.5 text-[12px] text-[#2f292e] opacity-100 [color:#2f292e] [-webkit-text-fill-color:#2f292e] md:rounded-xl md:p-3 md:text-sm"><option value="product_page">蝠・刀繝壹・繧ｸ</option><option value="cart_order">繧ｫ繝ｼ繝医・豕ｨ譁・判髱｢</option><option value="email">繝｡繝ｼ繝ｫ</option><option value="other">縺昴・莉・/option></select>
                  </label>
                  {reportShippingSource === "other" && <input type="text" maxLength={100} value={reportShippingSourceDetail} onChange={(e) => setReportShippingSourceDetail(e.target.value)} placeholder="遒ｺ隱榊ｴ謇繧貞・蜉・ className="w-full rounded-lg border border-[#d8cad7] bg-white p-2.5 text-[12px] text-[#2f292e] opacity-100 [color:#2f292e] [-webkit-text-fill-color:#2f292e] placeholder:text-[#766c74] md:rounded-xl md:p-3 md:text-sm" />}
                  <p className="text-[12px] font-semibold leading-6 text-[#4f4537] [-webkit-text-fill-color:#4f4537] md:text-[15px] md:leading-7">
                    逋ｺ騾√・蜃ｺ闕ｷ縺ｯ9/6縺ｾ縺ｧ縺ｪ繧峨碁俣縺ｫ蜷医≧隕玖ｾｼ縺ｿ縲阪・/7莉･髯阪↑繧峨碁俣縺ｫ蜷医ｏ縺ｪ縺・ｦ玖ｾｼ縺ｿ縲阪∵悄髢薙′縺ｾ縺溘′繧句ｴ蜷医・縲瑚ｦ∫｢ｺ隱阪阪→縺励※陦ｨ遉ｺ縺励∪縺吶ゅ♀螻翫￠莠亥ｮ壽律縺ｯ縲∬｡ｨ遉ｺ縺輔ｌ縺滓律莉倥′9/7縺ｾ縺ｧ縺ｪ繧峨碁俣縺ｫ蜷医≧隕玖ｾｼ縺ｿ縲阪・/8莉･髯阪↑繧峨碁俣縺ｫ蜷医ｏ縺ｪ縺・ｦ玖ｾｼ縺ｿ縲阪→縺励∪縺吶よ律莉倥ｒ迚ｹ螳壹〒縺阪↑縺・♀螻翫￠譯亥・縺ｯ縲瑚ｦ∫｢ｺ隱阪阪〒縺吶・                  </p>
                  {reportShippingBasis === "delivery" && (
                    <p className="rounded-lg bg-[#fff3d6] px-3 py-2.5 text-[12px] font-semibold leading-6 text-[#5a4724] [-webkit-text-fill-color:#5a4724] md:px-4 md:py-3 md:text-[15px] md:leading-7">
                      窶ｻ陦ｨ遉ｺ縺輔ｌ縺溘♀螻翫￠莠亥ｮ壽律繧貞渕貅悶→縺励◆隕玖ｾｼ縺ｿ縺ｧ縺吶る・騾∝慍蝓溽ｭ峨↓繧医ｊ逡ｰ縺ｪ繧九◆繧√√＃閾ｪ霄ｫ縺ｮ驟埼∝・縺ｧ陦ｨ遉ｺ縺輔ｌ繧九♀螻翫￠莠亥ｮ壽律繧偵＃遒ｺ隱阪￥縺縺輔＞縲・                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <label className="mt-3 block space-y-1.5 md:mt-5 md:space-y-2">
            <span className="text-[12px] font-bold text-[#211d21] opacity-100 md:text-base">
              町 繧ｳ繝｡繝ｳ繝・              <span className="ml-2 text-[11px] font-normal text-[#8a8089] md:text-sm">
                莉ｻ諢上・500譁・ｭ励∪縺ｧ
              </span>
            </span>

            <textarea
              rows={3}
              maxLength={500}
              value={reportComment}
              onChange={(e) =>
                setReportComment(e.target.value)
              }
              placeholder="萓・ 蜈･闕ｷ莠亥ｮ壹↑縺励→縺ｮ縺薙→ / 繝舌ャ繧ｯ繝､繝ｼ繝峨↓貎､豐｢ / 蠎怜藤縺輔ｓ縺ｫ蜃ｺ縺励※繧ゅｉ縺・縺ｪ縺ｩ"
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
            {submitting ? "謚慕ｨｿ荳ｭ窶ｦ" : "謚慕ｨｿ縺吶ｋ"}
          </button>

          {/* 蠎苓・霑ｽ蜉繝ｪ繧ｯ繧ｨ繧ｹ繝・*/}
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
                  宵 蠎苓・縺瑚ｦ九▽縺九ｉ縺ｪ縺・ｴ蜷・                </div>

                <div className="mt-1 text-[11px] text-[#766a75] opacity-100 [-webkit-text-fill-color:#766a75] md:mt-2 md:text-base">
                  逋ｻ骭ｲ縺輔ｌ縺ｦ縺・↑縺・ｺ苓・繧定ｿｽ蜉繝ｪ繧ｯ繧ｨ繧ｹ繝医〒縺阪∪縺吶・                </div>
              </div>

              <span className="shrink-0 text-base font-bold text-[#9d6c91] opacity-100 [-webkit-text-fill-color:#9d6c91] md:text-lg">
                {requestOpen ? "竏ｧ" : "竏ｨ"}
              </span>
            </button>

            {requestOpen && (
              <div className="mt-4 border-t border-[#eaddea] pt-4 md:mt-5 md:pt-5">
                <div className="mb-3 rounded-lg bg-[#f2e5f0] p-2.5 text-[11px] leading-5 text-[#64515f] opacity-100 [-webkit-text-fill-color:#64515f] md:mb-5 md:rounded-xl md:p-3 md:text-sm md:leading-6">
                  {reportMode === "online"
                    ? "繧ｪ繝ｳ繝ｩ繧､繝ｳ繧ｷ繝ｧ繝・・縺ｮ霑ｽ蜉繝ｪ繧ｯ繧ｨ繧ｹ繝・
                    : `霑ｽ蜉蜈・ ${reportPrefecture}`}
                </div>

                {reportMode === "physical" && (
                  <label className="mb-3 block md:mb-4">
                    <div className="mb-1.5 text-[12px] font-bold text-[#211d21] opacity-100 [-webkit-text-fill-color:#211d21] md:mb-2 md:text-base">
                      桃 霑ｽ蜉蜈医・驛ｽ驕灘ｺ懃恁
                      <span className="ml-1 text-[11px] text-[#c44f82] opacity-100 [-webkit-text-fill-color:#c44f82] md:text-sm">
                        蠢・・                      </span>
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
                      召 繝√ぉ繝ｼ繝ｳ蜷・                      <span className="ml-2 text-[11px] font-normal text-[#8a8089] opacity-100 [-webkit-text-fill-color:#8a8089] md:text-sm">
                        莉ｻ諢・                      </span>
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
                      placeholder="萓・ 繧ｿ繝ｯ繝ｼ繝ｬ繧ｳ繝ｼ繝・
                      className="w-full rounded-lg border border-[#d9c9d8] bg-white p-2.5 text-[12px] text-[#211d21] opacity-100 [color:#211d21] [-webkit-text-fill-color:#211d21] placeholder:text-[#766c74] placeholder:opacity-100 md:rounded-xl md:p-3.5 md:text-base"
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1.5 text-[12px] font-bold text-[#211d21] opacity-100 [-webkit-text-fill-color:#211d21] md:mb-2 md:text-base">
                      {reportMode === "online"
                        ? "將 繧ｷ繝ｧ繝・・蜷・
                        : "宵 蠎苓・蜷・}
                      <span className="ml-1 text-[11px] text-[#c44f82] opacity-100 [-webkit-text-fill-color:#c44f82] md:text-sm">
                        蠢・・                      </span>
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
                          ? "萓・ UNIVERSAL MUSIC STORE"
                          : "萓・ 譛ｭ蟷後ヱ繝ｫ繧ｳ蠎・
                      }
                      className="w-full rounded-lg border border-[#d9c9d8] bg-white p-2.5 text-[12px] text-[#211d21] opacity-100 [color:#211d21] [-webkit-text-fill-color:#211d21] placeholder:text-[#766c74] placeholder:opacity-100 md:rounded-xl md:p-3.5 md:text-base"
                    />
                  </label>
                </div>

                {reportMode === "physical" && (
                  <label className="mt-3 block md:mt-4">
                    <div className="mb-1.5 text-[12px] font-bold text-[#211d21] opacity-100 [-webkit-text-fill-color:#211d21] md:mb-2 md:text-base">
                      桃 蟶ょ玄逕ｺ譚・                      <span className="ml-2 text-[11px] font-normal text-[#8a8089] opacity-100 [-webkit-text-fill-color:#8a8089] md:text-sm">
                        莉ｻ諢・                      </span>
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
                      placeholder="萓・ 譛ｭ蟷悟ｸゆｸｭ螟ｮ蛹ｺ"
                      className="w-full rounded-lg border border-[#d9c9d8] bg-white p-2.5 text-[12px] text-[#211d21] opacity-100 [color:#211d21] [-webkit-text-fill-color:#211d21] placeholder:text-[#766c74] placeholder:opacity-100 md:rounded-xl md:p-3.5 md:text-base"
                    />
                  </label>
                )}

                <label className="mt-3 block md:mt-4">
                  <div className="mb-1.5 text-[12px] font-bold text-[#211d21] opacity-100 [-webkit-text-fill-color:#211d21] md:mb-2 md:text-base">
                    町 陬懆ｶｳ
                    <span className="ml-2 text-[11px] font-normal text-[#8a8089] opacity-100 [-webkit-text-fill-color:#8a8089] md:text-sm">
                      莉ｻ諢上・500譁・ｭ励∪縺ｧ
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
                    placeholder="萓・ 譁ｰ縺励￥繧ｪ繝ｼ繝励Φ縺励◆蠎苓・縺ｧ縺吶ょ・蠑上し繧､繝医〒CD蜿匁桶縺・ｒ遒ｺ隱阪＠縺ｾ縺励◆縲・
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
                    ? "騾∽ｿ｡荳ｭ窶ｦ"
                    : "蠎苓・霑ｽ蜉繧偵Μ繧ｯ繧ｨ繧ｹ繝・}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ===== 譛譁ｰ謚慕ｨｿ ===== */}
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
            葡 譛譁ｰ縺ｮ蝨ｨ蠎ｫ謚慕ｨｿ
          </h2>

          {latestFiveReports.length === 0 ? (
            <EmptyBox text="縺ｾ縺蝨ｨ蠎ｫ謚慕ｨｿ縺ｯ縺ゅｊ縺ｾ縺帙ｓ" />
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
                          "蝨ｨ蠎ｫ縺ｪ縺・
                        ) : (
                          `${report.quantity}譫啻
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
                        ? "蜑企勁荳ｭ窶ｦ"
                        : "閾ｪ蛻・・謚慕ｨｿ繧貞炎髯､"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===== FOOTER ===== */}
        {/* ===== 荳榊・蜷亥ｱ蜻・===== */}
        <section className="rounded-2xl border-2 border-[#d45a9b] bg-[#fff7fb] p-2.5 shadow-sm md:rounded-[28px] md:p-4">
          <div className="rounded-xl border border-[#eadde6] bg-white px-3.5 py-3.5 shadow-sm md:rounded-[24px] md:px-5 md:py-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] font-bold text-[#963365] md:text-[17px]">
                  庁 荳榊・蜷医・縺碑ｦ∵悍縺ｯ縺薙■繧・                </div>
                <div className="mt-1 text-[9px] leading-4 text-[#655764] md:mt-2 md:text-[13px] md:leading-6">
                  菴ｿ縺・↓縺上＞縺ｨ縺薙ｍ繧・√⊇縺励＞讖溯・縺ｪ縺ｩ繧ゅ♀豌苓ｻｽ縺ｫ縺雁ｯ・○縺上□縺輔＞
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
                {bugReportOpen ? "繝輔か繝ｼ繝繧帝哩縺倥ｋ 竏ｧ" : "繝輔か繝ｼ繝繧帝幕縺・竏ｨ"}
              </button>
            </div>
          </div>

          {bugReportOpen && (
            <div className="mt-3 rounded-xl border border-[#eadde6] bg-white p-3 text-[#352f34] shadow-sm md:mt-4 md:rounded-[22px] md:p-5">
              <p className="text-[10px] font-medium leading-4 text-[#4f454d] md:text-xs md:leading-5">
                荳榊・蜷医・縺泌ｱ蜻翫□縺代〒縺ｪ縺上√後％繧薙↑讖溯・縺後≠繧九→縺・＞縲阪後％縺・☆繧九→菴ｿ縺・ｄ縺吶＞縲阪↑縺ｩ縺ｮ縺碑ｦ∵悍繧ゅ♀蟇・○縺上□縺輔＞縲ゅ＞縺溘□縺・◆蜀・ｮｹ縺ｯ遒ｺ隱阪＠縲∝庄閭ｽ縺ｪ遽・峇縺ｧ謾ｹ蝟・↓蜉ｪ繧√∪縺吶・              </p>

              <label className="mt-3 block">
                <div className="mb-1 text-[11px] font-bold text-[#352f34] md:text-sm">
                  蜀・ｮｹ縺ｮ遞ｮ鬘・                  <span className="ml-1 text-[#b83f75]">蠢・・/span>
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
                  <option value="bug">荳榊・蜷・/option>
                  <option value="request">縺碑ｦ∵悍繝ｻ謾ｹ蝟・｡・/option>
                </select>
              </label>

              <label className="mt-3 block">
                <div className="mb-1 text-[11px] font-bold text-[#352f34] md:text-sm">
                  {bugReportType === "bug" ? "荳榊・蜷亥・螳ｹ" : "縺碑ｦ∵悍蜀・ｮｹ"}
                  <span className="ml-1 text-[#b83f75]">蠢・・/span>
                </div>

                <textarea
                  rows={3}
                  maxLength={1000}
                  value={bugDescription}
                  onChange={(e) =>
                    setBugDescription(e.target.value)
                  }
                  placeholder={bugReportType === "bug" ? "萓・ 蠎苓・繧偵ち繝・・縺励※繧ょ渚蠢懊＠縺ｪ縺・ : "萓・ 縺薙ｓ縺ｪ讖溯・縺後≠繧九→萓ｿ蛻ｩ縲√％縺薙ｒ縺薙≧縺吶ｋ縺ｨ菴ｿ縺・ｄ縺吶＞"}
                  className="w-full rounded-lg border border-[#cdbdca] bg-white px-3 py-2 text-[12px] text-[#2f292e] outline-none placeholder:text-[#766c74] focus:border-[#a95e92] focus:ring-1 focus:ring-[#e7cfe0] md:text-sm"
                />
              </label>

              <div className="mt-3 rounded-lg border border-[#cdbdca] bg-[#f8f3f7] p-3">
                <div className="text-[10px] font-medium leading-4 text-[#4b4249] md:text-xs md:leading-5">
                  荳榊・蜷医・蝣ｴ蜷医・縲∫ｫｯ譛ｫ繝ｻOS繝ｻ繝悶Λ繧ｦ繧ｶ諠・ｱ縺後≠繧九→遒ｺ隱阪＠繧・☆縺上↑繧翫∪縺吶りｦ∵悍縺ｮ蝣ｴ蜷医・蜈･蜉帑ｸ崎ｦ√〒縺吶り・蜍募・蜉帙ｒ蛻ｩ逕ｨ縺励◆縺・ｴ蜷医□縺代∽ｸ九・繝√ぉ繝・け繧貞・繧後※縺上□縺輔＞縲・                  <br />
                  <span className="font-bold text-[#382f36]">
                    繝√ぉ繝・け繧貞・繧後ｋ縺ｾ縺ｧ陦ｨ遉ｺ迺ｰ蠅・ュ蝣ｱ縺ｯ閾ｪ蜍募・蜉帙＠縺ｾ縺帙ｓ縲り・蜍募・蜉帙＠縺溷・螳ｹ繧ゅ√碁∽ｿ｡縲阪ｒ謚ｼ縺吶∪縺ｧ騾∽ｿ｡縺輔ｌ縺ｾ縺帙ｓ縲・                  </span>
                  <br />
                  <span className="font-bold text-[#382f36]">
                    蜿門ｾ励☆繧区ュ蝣ｱ縺ｯ陦ｨ遉ｺ迺ｰ蠅・↓髢｢縺吶ｋ繧ゅ・縺ｮ縺ｿ縺ｧ縺吶ゆｸ榊・蜷医・遒ｺ隱阪・謾ｹ蝟・・縺溘ａ縺ｫ菴ｿ逕ｨ縺励∪縺吶・                  </span>
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
                    遶ｯ譛ｫ遞ｮ鬘槭・OS繝ｻ繝悶Λ繧ｦ繧ｶ諠・ｱ繧定・蜍募・蜉帙☆繧・                  </span>
                </label>

                {bugAutoDetect && (
                  <p className="mt-1.5 text-[9px] font-medium leading-4 text-[#514850] md:text-[11px]">
                    遶ｯ譛ｫ遞ｮ鬘槭・OS縺ｮ遞ｮ鬘槭・繝悶Λ繧ｦ繧ｶ繧偵√ヶ繝ｩ繧ｦ繧ｶ縺九ｉ遒ｺ隱阪〒縺阪ｋ遽・峇縺ｧ蜈･蜉帙＠縺ｾ縺吶よｩ溽ｨｮ蜷阪→OS繝舌・繧ｸ繝ｧ繝ｳ縺ｯ豁｣遒ｺ縺ｫ蜿門ｾ励〒縺阪↑縺・ｴ蜷医′縺ゅｋ縺溘ａ閾ｪ蜍募・蜉帙＠縺ｾ縺帙ｓ縲ゅヶ繝ｩ繧ｦ繧ｶ繝舌・繧ｸ繝ｧ繝ｳ縺ｯ蜿門ｾ励〒縺阪◆蝣ｴ蜷医・縺ｿ陦ｨ遉ｺ縺励∪縺吶り・蜍募・蜉帛ｾ後ｂ菫ｮ豁｣縺ｧ縺阪∪縺吶・                  </p>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                <label>
                  <div className="mb-1 text-[10px] font-bold text-[#352f34] md:text-xs">
                    遶ｯ譛ｫ遞ｮ鬘・                    {bugReportType === "bug" ? (
                      <span className="ml-1 text-[#b83f75]">蠢・・/span>
                    ) : (
                      <span className="ml-1 font-normal text-[#514850]">莉ｻ諢・/span>
                    )}
                  </div>

                  <select
                    value={bugDeviceType}
                    onChange={(e) =>
                      setBugDeviceType(e.target.value)
                    }
                    className="w-full rounded-lg border border-[#cdbdca] bg-white px-2 py-2 text-[11px] text-[#2f292e] md:text-sm"
                  >
                    <option value="">驕ｸ謚・/option>
                    <option value="iPhone">iPhone</option>
                    <option value="iPad">iPad</option>
                    <option value="Android">Android</option>
                    <option value="PC">PC</option>
                    <option value="縺昴・莉・>縺昴・莉・/option>
                  </select>
                </label>

                <label>
                  <div className="mb-1 text-[10px] font-bold text-[#352f34] md:text-xs">
                    讖溽ｨｮ蜷・                    <span className="ml-1 font-normal text-[#514850]">莉ｻ諢・/span>
                  </div>

                  <input
                    type="text"
                    maxLength={100}
                    value={bugDeviceModel}
                    onChange={(e) =>
                      setBugDeviceModel(e.target.value)
                    }
                    placeholder="萓・ Pixel 9 / AQUOS sense9"
                    className="w-full rounded-lg border border-[#cdbdca] bg-white px-2 py-2 text-[11px] text-[#2f292e] placeholder:text-[#766c74] md:text-sm"
                  />
                </label>

                <label className="col-span-2 md:col-span-2">
                  <div className="mb-1 text-[10px] font-bold text-[#352f34] md:text-xs">
                    OS繝ｻ繝舌・繧ｸ繝ｧ繝ｳ
                    {bugReportType === "bug" ? (
                      <span className="ml-1 text-[#b83f75]">蠢・・/span>
                    ) : (
                      <span className="ml-1 font-normal text-[#514850]">莉ｻ諢・/span>
                    )}
                  </div>

                  <input
                    type="text"
                    value={bugOsDisplay}
                    onChange={(e) =>
                      handleBugOsDisplayChange(e.target.value)
                    }
                    placeholder="萓・ iOS 26.5 / Android 15 / Windows 11 / macOS 15.6"
                    className="w-full rounded-lg border border-[#cdbdca] bg-white px-2 py-2 text-[11px] text-[#2f292e] placeholder:text-[#766c74] md:text-sm"
                  />
                  <div className="mt-1 text-[9px] font-medium leading-4 text-[#514850] md:text-[11px]">
                    閾ｪ蜍募・蜉帙ｒ蛻ｩ逕ｨ縺励◆蝣ｴ蜷医ｂ縲＾S繝舌・繧ｸ繝ｧ繝ｳ縺ｯ謇句虚縺ｧ蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・                  </div>
                </label>

                <label className="md:col-span-2">
                  <div className="mb-1 text-[10px] font-bold text-[#352f34] md:text-xs">
                    繝悶Λ繧ｦ繧ｶ
                    <span className="ml-1 font-normal text-[#514850]">莉ｻ諢・/span>
                  </div>

                  <select
                    value={bugBrowser}
                    onChange={(e) => {
                      setBugBrowser(e.target.value);

                      if (e.target.value !== "縺昴・莉・) {
                        setBugBrowserOther("");
                      }
                    }}
                    className="w-full rounded-lg border border-[#cdbdca] bg-white px-2 py-2 text-[11px] text-[#2f292e] md:text-sm"
                  >
                    <option value="">驕ｸ謚・/option>
                    <option value="Chrome">Chrome</option>
                    <option value="Safari">Safari</option>
                    <option value="Brave">Brave</option>
                    <option value="Edge">Edge</option>
                    <option value="Opera">Opera</option>
                    <option value="Firefox">Firefox</option>
                    <option value="縺昴・莉・>縺昴・莉・/option>
                  </select>
                </label>

                {bugBrowser === "縺昴・莉・ && (
                  <label className="md:col-span-2">
                    <div className="mb-1 text-[10px] font-bold text-[#352f34] md:text-xs">
                      繝悶Λ繧ｦ繧ｶ蜷・                      <span className="ml-1 text-[#b83f75]">蠢・・/span>
                    </div>

                    <input
                      type="text"
                      maxLength={100}
                      value={bugBrowserOther}
                      onChange={(e) =>
                        setBugBrowserOther(e.target.value)
                      }
                      placeholder="繝悶Λ繧ｦ繧ｶ蜷阪ｒ蜈･蜉・
                      className="w-full rounded-lg border border-[#cdbdca] bg-white px-2 py-2 text-[11px] text-[#2f292e] placeholder:text-[#766c74] md:text-sm"
                    />
                  </label>
                )}

                {bugBrowserVersion && (
                  <div className="col-span-2 text-[10px] font-medium text-[#4f454d] md:col-span-4 md:text-xs">
                    繝悶Λ繧ｦ繧ｶ繝舌・繧ｸ繝ｧ繝ｳ: {bugBrowserVersion}
                    <span className="ml-1">
                      (閾ｪ蜍募・蜉帙〒蜿門ｾ励〒縺阪◆蝣ｴ蜷医・縺ｿ陦ｨ遉ｺ)
                    </span>
                  </div>
                )}
              </div>

              <details className="mt-3 rounded-lg border border-[#cdbdca] bg-[#faf7f9]">
                <summary className="cursor-pointer list-none px-3 py-2 text-[10px] font-bold text-[#40363e] md:text-xs">
                  遶ｯ譛ｫ繝ｻOS諠・ｱ縺ｮ遒ｺ隱肴婿豕輔ｒ隕九ｋ 竏ｨ
                </summary>

                <div className="border-t border-[#d8cad6] px-3 py-2 text-[10px] font-medium leading-4 text-[#4b4249] md:text-xs md:leading-5">
                  <p>
                    <strong>iPhone / iPad</strong>
                    <br />
                    險ｭ螳・竊・荳闊ｬ 竊・諠・ｱ 竊・iOS繝舌・繧ｸ繝ｧ繝ｳ / iPadOS繝舌・繧ｸ繝ｧ繝ｳ
                  </p>

                  <p className="mt-2">
                    <strong>Android</strong>
                    <br />
                    險ｭ螳・竊・繝・ヰ繧､繧ｹ諠・ｱ / 遶ｯ譛ｫ諠・ｱ 竊・Android繝舌・繧ｸ繝ｧ繝ｳ
                    <br />
                    窶ｻ讖溽ｨｮ縺ｫ繧医▲縺ｦ縲後ョ繝舌う繧ｹ諠・ｱ縲阪檎ｫｯ譛ｫ諠・ｱ縲阪↑縺ｩ陦ｨ遉ｺ蜷阪′逡ｰ縺ｪ繧翫∪縺吶・                  </p>

                  <p className="mt-2">
                    <strong>讖溽ｨｮ蜷・/strong>
                    <br />
                    Android縺ｯ險ｭ螳・竊・繝・ヰ繧､繧ｹ諠・ｱ / 遶ｯ譛ｫ諠・ｱ縺ｪ縺ｩ縺ｧ遒ｺ隱阪〒縺阪∪縺吶ＪPhone / iPad縺ｯ險ｭ螳・竊・荳闊ｬ 竊・諠・ｱ縺ｮ縲梧ｩ溽ｨｮ蜷阪阪〒遒ｺ隱阪〒縺阪∪縺吶・                  </p>

                  <p className="mt-2">
                    <strong>繝悶Λ繧ｦ繧ｶ</strong>
                    <br />
                    迴ｾ蝨ｨ縺薙・繝壹・繧ｸ繧帝幕縺・※縺・ｋChrome / Safari / Brave / Edge / Opera縺ｪ縺ｩ繧帝∈謚槭＠縺ｦ縺上□縺輔＞縲・                  </p>
                </div>
              </details>

              <div className="mt-3 rounded-lg border border-[#cdbdca] bg-[#faf7f9] px-3 py-2 text-[10px] font-medium leading-4 text-[#4b4249] md:text-xs md:leading-5">
  <div className="font-bold text-[#352f34]">
    蜍穂ｽ懃腸蠅・↓縺､縺・※
  </div>

  <p className="mt-1">
    譛ｬ繧ｵ繧､繝医・縲∵ｯ碑ｼ・噪譁ｰ縺励＞OS繝ｻ繝悶Λ繧ｦ繧ｶ縺ｧ縺ｮ縺泌茜逕ｨ繧呈耳螂ｨ縺励※縺・∪縺吶・    蜿､縺ОS繝ｻ繝悶Λ繧ｦ繧ｶ縺ｧ縺ｯ縲∬｡ｨ遉ｺ縺ｮ蟠ｩ繧後ｄ繧ｿ繝・・謫堺ｽ懊′蜿榊ｿ懊＠縺ｪ縺・↑縺ｩ縲・    荳驛ｨ讖溯・縺梧ｭ｣蟶ｸ縺ｫ蜍穂ｽ懊＠縺ｪ縺・ｴ蜷医′縺ゅｊ縺ｾ縺吶・  </p>

  <p className="mt-1">
    iPhone繝ｻiPad縺ｧ縺ｯ縲（OS / iPadOS 16.4莉･髯阪ｒ逶ｮ螳峨↓縺泌茜逕ｨ縺上□縺輔＞縲・    Android繝ｻWindows遲峨ｒ縺泌茜逕ｨ縺ｮ蝣ｴ蜷医ｂ縲＾S縺ｨ繝悶Λ繧ｦ繧ｶ繧呈怙譁ｰ縺ｮ迥ｶ諷九↓縺励※縺泌茜逕ｨ縺上□縺輔＞縲・  </p>
</div>

              <label className="mt-3 block">
                <div className="mb-1 text-[10px] font-bold text-[#352f34] md:text-xs">
                  繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
                  <span className="ml-1 font-normal text-[#514850]">
                    莉ｻ諢上・譛螟ｧ5譫壹・1譫・MB縺ｾ縺ｧ
                  </span>
                </div>

                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);

                    if (files.length > 5) {
                      setBugError("逕ｻ蜒上・5譫壹∪縺ｧ豺ｻ莉倥〒縺阪∪縺吶・);
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
                    驕ｸ謚樔ｸｭ: {bugImages.length}譫・                  </div>
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
                  ? "騾∽ｿ｡荳ｭ窶ｦ"
                  : bugReportType === "bug"
                    ? "荳榊・蜷亥ｱ蜻翫ｒ騾∽ｿ｡"
                    : "縺碑ｦ∵悍繧帝∽ｿ｡"}
              </button>
            </div>
          )}
        </section>
        <section className="rounded-xl border border-[#eaddea] bg-white/80 px-3 py-3 text-[#655764] md:rounded-2xl md:px-5 md:py-4">
          <div className="text-[11px] font-bold text-[#5d4658] md:text-sm">譖ｴ譁ｰ螻･豁ｴ</div>
          <div className="mt-2 space-y-1.5 text-[9px] leading-4 md:text-xs md:leading-5">
            <div className="space-y-2">
  <div className="grid grid-cols-[auto_1fr] gap-x-3">
  <span className="font-bold whitespace-nowrap">v3. 2026/9/5</span>
  <div className="space-y-1">
    <div>蝨ｨ蠎ｫ縺ゅｊ/縺ｪ縺・縺ｮ縺ｿ縺ｮ謚慕ｨｿ縺ｫ蟇ｾ蠢・/div>
    <div>逋ｺ騾√・蜃ｺ闕ｷ莠亥ｮ・縺雁ｱ翫￠莠亥ｮ壹ｒ蛹ｺ蛻･縺励◆蛻晞ｱ隕玖ｾｼ縺ｿ蛻､螳壹↓蟇ｾ蠢・/div>
  </div>
</div>

  <div className="grid grid-cols-[auto_1fr] gap-x-3">
    <span className="font-bold whitespace-nowrap">v2. 2026/9/5</span>
    <div className="space-y-0.5">
      <div>繧ｪ繝ｳ繝ｩ繧､繝ｳ縺ｮ逋ｺ騾∽ｺ亥ｮ・蛻晞ｱ隕玖ｾｼ縺ｿ繧定ｿｽ蜉</div>
      <div>蠎苓・迥ｶ豕√さ繝｡繝ｳ繝医々蜈ｱ譛峨ｒ霑ｽ蜉</div>
      <div>荳ｻ隕√が繝ｳ繝ｩ繧､繝ｳ繧ｷ繝ｧ繝・・縺ｮ蝠・刀蛻･逶ｴ繝ｪ繝ｳ繧ｯ繧定ｿｽ蜉</div>
      <div>蝨ｨ蠎ｫ縺ゅｊ・丞・騾ｱ隕玖ｾｼ縺ｿ縺ｮ邨槭ｊ霎ｼ縺ｿ縺ｫ蟇ｾ蠢・/div>
    </div>
  </div>

  <div className="grid grid-cols-[auto_1fr] gap-x-3">
    <span className="font-bold whitespace-nowrap">v1. 2026/9/2</span>
    <div>蝨ｨ蠎ｫ繝√ぉ繝・き繝ｼ蜈ｬ髢・/div>
  </div>
</div>
          </div>
        </section>

        <footer className="pb-3 pt-4 text-center md:pb-4 md:pt-5">
          <div className="text-[10px] leading-4 text-[#403940] md:text-sm md:leading-6">
            <p>
  蠖薙し繧､繝医・繝輔ぃ繝ｳ縺ｫ繧医ｋ髱槫・蠑上・蝨ｨ蠎ｫ諠・ｱ蜈ｱ譛峨し繧､繝医〒縺吶・  <br className="md:hidden" />
  謇螻樔ｺ句漁謇繝ｻ繝ｬ繧ｳ繝ｼ繝我ｼ夂､ｾ繝ｻ蜷・ｲｩ螢ｲ蠎礼ｭ峨→縺ｯ辟｡髢｢菫ゅ〒縺吶・</p>

                        <p className="mt-1 text-[9px] text-[#6f686e] md:mt-2 md:text-xs md:text-[#403940]">
              King & Prince 蝨ｨ蠎ｫ繝√ぉ繝・き繝ｼ
            </p>

            <p className="mt-1 text-[9px] md:mt-2 md:text-xs">
              <a
                href="/privacy"
                className="text-[#6f686e] underline underline-offset-2 hover:text-[#b95489] md:text-[#403940]"
              >
                繝励Λ繧､繝舌す繝ｼ縺ｫ縺､縺・※
              </a>
            </p>
          </div>
        </footer>
      </div>

      {/* X蜈ｱ譛峨Δ繝ｼ繝繝ｫ */}
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
                  撫 蝨ｨ蠎ｫ諠・ｱ繧貞・譛・                </h2>
                <p className="mt-1 text-[12px] leading-5 text-[#766a74] md:text-sm">
                  謚慕ｨｿ縺吶ｋ蜀・ｮｹ繧帝∈繧薙〒縺上□縺輔＞
                </p>
              </div>

              <button
                type="button"
                onClick={() => setXShareOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f4edf3] text-lg font-bold text-[#6d5a69] transition hover:bg-[#eadde8]"
                aria-label="髢峨§繧・
              >
                ﾃ・              </button>
            </div>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => openXShare(false)}
                className="w-full rounded-2xl border border-[#d7bdd4] bg-[#fbf7fa] px-4 py-3.5 text-left transition hover:bg-[#f4e9f2]"
              >
                <div className="text-sm font-bold text-[#5f3d59] md:text-base">
                  繝上ャ繧ｷ繝･繧ｿ繧ｰ縺縺代〒謚慕ｨｿ
                </div>
                <div className="mt-1 text-[12px] text-[#8a7484] md:text-sm">
                  #KP蝨ｨ蠎ｫ縺薙％縺ｫ縺ゅｋ繧・                </div>
              </button>

              <button
                type="button"
                onClick={() => openXShare(true)}
                className="w-full rounded-2xl border border-[#ccb6dd] bg-[#f7f1fb] px-4 py-3.5 text-left transition hover:bg-[#eee3f5]"
              >
                <div className="text-sm font-bold text-[#594169] md:text-base">
                  縺薙・繝壹・繧ｸ縺ｮ繝ｪ繝ｳ繧ｯ繧ゅ▽縺代※謚慕ｨｿ
                </div>
                <div className="mt-1 text-[12px] leading-5 text-[#806f88] md:text-sm">
                  #KP蝨ｨ蠎ｫ縺薙％縺ｫ縺ゅｋ繧・+ 蝨ｨ蠎ｫ繝√ぉ繝・き繝ｼ縺ｮURL
                </div>
              </button>
            </div>

            <p className="mt-4 text-center text-[10px] leading-4 text-[#9a8d98] md:text-xs">
              X縺ｮ謚慕ｨｿ逕ｻ髱｢縺碁幕縺阪∪縺吶よ兜遞ｿ蜑阪↓蜀・ｮｹ繧定・逕ｱ縺ｫ邱ｨ髮・〒縺阪∪縺吶・            </p>
          </div>
        </div>
      )}

      {/* 繝医ャ繝励∈謌ｻ繧・*/}
      <a
        href="#top"
        aria-label="繧ｵ繧､繝医ヨ繝・・縺ｫ謌ｻ繧・
        className="fixed bottom-4 left-3 z-50 flex h-[56px] w-[56px] flex-col items-center justify-center rounded-full border-[3px] border-white bg-[#d95c9d] text-center text-white shadow-lg transition hover:-translate-y-1 hover:bg-[#c84d8d] md:bottom-7 md:left-7 md:h-[82px] md:w-[82px] md:border-4"
      >
        <span className="text-base leading-none md:text-2xl">竊・/span>
        <span className="mt-0.5 text-[8px] font-bold leading-tight md:mt-1 md:text-[11px]">
          繧ｵ繧､繝医ヨ繝・・
          <br />
          縺ｫ謌ｻ繧・        </span>
      </a>
    </main>
  );
}

function getFirstWeekCutoffDisplay(store: Store) {
  return store.first_week_cutoff_note ?? "隕∫｢ｺ隱・;
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
        `繧ｳ繝｡繝ｳ繝医ｒ隱ｭ縺ｿ霎ｼ繧√∪縺帙ｓ縺ｧ縺励◆: ${error.message}`
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
      setCommentError("繧ｳ繝｡繝ｳ繝医ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・);
      return;
    }

    if (body.length > 300) {
      setCommentError("繧ｳ繝｡繝ｳ繝医・300譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・);
      return;
    }

    if (/https?:\/\/|www\./i.test(body)) {
      setCommentError("蠎苓・繧ｳ繝｡繝ｳ繝医↓縺ｯURL繧呈兜遞ｿ縺ｧ縺阪∪縺帙ｓ縲・);
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
      setCommentMessage("繧ｳ繝｡繝ｳ繝医ｒ謚慕ｨｿ縺励∪縺励◆縲ゅ≠繧翫′縺ｨ縺・＃縺悶＞縺ｾ縺吶・);
      await Promise.all([loadComments(), onCommentsChanged()]);
    } catch (error) {
      console.error(error);
      setCommentError(
        "繧ｳ繝｡繝ｳ繝域兜遞ｿ荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲ゅｂ縺・ｸ蠎ｦ縺願ｩｦ縺励￥縺縺輔＞縲・
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
      setCommentError("蠢懈抄繧呈峩譁ｰ縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆縲ゅｂ縺・ｸ蠎ｦ縺願ｩｦ縺励￥縺縺輔＞縲・);
    } finally {
      setApplaudingCommentId(null);
    }
  }

  async function handleDeleteOwnStoreComment(commentId: number) {
    setCommentMessage("");
    setCommentError("");

    if (!window.confirm("閾ｪ蛻・・蠎苓・繧ｳ繝｡繝ｳ繝医ｒ蜑企勁縺励∪縺吶°?")) return;

    let clientId = localStorage.getItem("kp_inventory_client_id");
    if (!clientId) {
      setCommentError("縺薙・遶ｯ譛ｫ縺九ｉ謚慕ｨｿ縺励◆縺薙→繧堤｢ｺ隱阪〒縺阪↑縺・◆繧∝炎髯､縺ｧ縺阪∪縺帙ｓ縲・);
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

      setCommentMessage("閾ｪ蛻・・繧ｳ繝｡繝ｳ繝医ｒ蜑企勁縺励∪縺励◆縲・);
      await Promise.all([loadComments(), onCommentsChanged()]);
    } catch (error) {
      console.error(error);
      setCommentError("繧ｳ繝｡繝ｳ繝亥炎髯､荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲ゅｂ縺・ｸ蠎ｦ縺願ｩｦ縺励￥縺縺輔＞縲・);
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
            {/* 蠎苓・蝓ｺ譛ｬ諠・ｱ ・・髮・ｨ亥ｯｾ雎｡ */}
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-4">
        {/* 蟾ｦ: 蠎苓・蜷阪・謇蝨ｨ蝨ｰ繝ｻ蝟ｶ讌ｭ譎る俣 */}
        <div className="min-w-0">
          <h3 className="text-base font-bold leading-5 text-[#1d191d] md:text-2xl md:leading-snug">
            {getDisplayStoreName(store)}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#403940] md:text-sm">
            <span className="whitespace-nowrap">
              {online
                ? "將 繧ｪ繝ｳ繝ｩ繧､繝ｳ繧ｷ繝ｧ繝・・"
                : `桃 ${store.prefecture}${store.city ? ` ${store.city}` : ""}`}
            </span>

            {!online && store.business_hours && (
              <span className="whitespace-nowrap font-bold text-[#3e373e]">
                葡 蝟ｶ讌ｭ譎る俣: {formatBusinessHours(store.business_hours)}
              </span>
            )}
          </div>

          {!online && (() => {
            const cutoff = getFirstWeekCutoffDisplay(store);
            const cutoffConfirmed = cutoff !== "隕∫｢ｺ隱・;
            return (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold md:px-3 md:py-1.5 md:text-sm ${
                    cutoffConfirmed
                      ? "border-[#9dbce5] bg-[#eef5ff] text-[#315f96]"
                      : "border-[#d7c7a0] bg-[#fff8e5] text-[#6a5727]"
                  }`}
                >
                  {cutoffConfirmed ? "鳩" : "竢ｰ"} 蛻晞ｱ邱繧∵凾髢・ {cutoff}
                  {store.first_week_verified_at && (
                    <span className="ml-1 font-normal">({formatDate(store.first_week_verified_at)}遒ｺ隱・</span>
                  )}
                </span>
              </div>
            );
          })()}
        </div>

        {/* 繧ｹ繝槭・: 荳・/ PC: 蜿ｳ */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1 md:mt-0 md:justify-end md:gap-2">
          {store.oricon_target === true && (
            <span className="whitespace-nowrap rounded-md border border-[#bd4f88] bg-[#d9609b] px-2 py-0.5 text-[9px] font-bold text-white md:rounded-xl md:px-4 md:py-2 md:text-base">
              繧ｪ繝ｪ繧ｳ繝ｳ蟇ｾ雎｡
            </span>
          )}

          {store.billboard_status === "target" && (
            <span className="whitespace-nowrap rounded-md border border-[#7250a5] bg-[#835ab3] px-2 py-0.5 text-[9px] font-bold text-white md:rounded-xl md:px-4 md:py-2 md:text-base">
              Billboard 蟇ｾ雎｡
            </span>
          )}

          {store.billboard_status === "check_store" && (
            <>
              <span className="whitespace-nowrap rounded-md border border-[#9e85b8] bg-[#eee7f4] px-2 py-0.5 text-[9px] font-bold text-[#5b486b] md:rounded-xl md:px-4 md:py-2 md:text-base">
                Billboard 隕∫｢ｺ隱・              </span>
            </>
          )}

          {store.billboard_status === "not_target" && (
            <span className="whitespace-nowrap rounded-md border border-[#a9a2a8] bg-[#ece9ec] px-2 py-0.5 text-[9px] font-bold text-[#595159] md:rounded-xl md:px-4 md:py-2 md:text-base">
              Billboard 蟇ｾ雎｡螟・            </span>
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
            鐙 蠎苓・諠・ｱ繧呈署萓・{storeInfoOpen ? "竏ｧ" : "竏ｨ"}
          </span>
          <span className="mt-0.5 block text-[9px] font-bold text-[#8b6a83] md:text-xs">
            {online
              ? "Billboard繝ｻ縺昴・莉悶・蠎苓・諠・ｱ縺ｯ縺薙■繧・
              : "竢ｰ 蛻晞ｱ髮・ｨ医・邱繧∵凾髢薙ｒ縺泌ｭ倥§縺ｮ譁ｹ縺ｯ縺薙■繧・}
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

      {/* 蝨ｨ蠎ｫ */}
      <div className="mt-3 rounded-xl bg-[#f8f1f7] p-2.5 md:mt-5 md:rounded-2xl md:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] font-bold tracking-[0.12em] text-[#a36494] md:text-sm">
            STOCK
          </div>

          {newestStoreReport && (
            <div className="text-[9px] text-[#8e848d] md:text-sm">
              譛邨よ峩譁ｰ {formatDate(newestStoreReport.created_at)}
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
                        aria-label={`${product.name}縺ｮ蝠・刀繝壹・繧ｸ繧帝幕縺汁}
                        className="group block rounded-md border border-[#dac8e5] bg-[#fbf7fd] px-2 py-1.5 text-[#5e3f73] transition hover:border-[#b996cf] hover:bg-[#f4ebf9] md:min-h-[3rem] md:rounded-lg md:px-2.5 md:py-2"
                      >
                        <div className="text-[11px] font-bold leading-4 underline decoration-[#b996cf] decoration-1 underline-offset-2 group-hover:decoration-2 md:text-[17px] md:leading-6">
                          {product.name}
                          <span
                            aria-hidden="true"
                            className="ml-1 inline-block text-[10px] no-underline md:text-sm"
                          >
                            竊暦ｸ・                          </span>
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
                            aria-label={`${product.name} ${link.label}縺ｮ蝠・刀繝壹・繧ｸ繧帝幕縺汁}
                            className="inline-flex items-center rounded-full border border-[#c7add8] bg-white px-2 py-1 text-[9px] font-bold text-[#66447b] underline decoration-[#b996cf] underline-offset-2 transition hover:bg-[#f0e5f6] md:px-2.5 md:text-[11px]"
                          >
                            {link.label}
                            <span aria-hidden="true" className="ml-1 no-underline">
                              竊暦ｸ・                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {hasVariants ? (
                  <div className="mt-2 space-y-2">
                    {[
                      ["蜈育捩迚ｹ蜈ｸ縺ゅｊ", specialReport],
                      ["迚ｹ蜈ｸ縺ｪ縺・, noSpecialReport],
                    ].map(([label, variantReport]) => {
                      const currentReport = variantReport as InventoryReport | null;
                      return (
                        <div key={label as string} className="rounded-lg border border-[#eaddea] bg-[#fcf9fc] px-2 py-1.5">
                          <div className="text-[9px] font-bold text-[#6d4966] md:text-xs">
                            {label as string}
                          </div>
                          {!currentReport ? (
                            <div className="mt-0.5 text-[10px] font-bold text-[#746b73] md:text-sm">
                              諠・ｱ縺ｪ縺・                            </div>
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
                                    ? "蜑企勁荳ｭ窶ｦ"
                                    : "閾ｪ蛻・・謚慕ｨｿ繧貞炎髯､"}
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
                    諠・ｱ縺ｪ縺・                  </div>
                ) : report.stock_status ? (
                  <div className="mt-1.5 md:mt-4">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold md:px-3 md:py-1.5 md:text-base ${getOnlineStockStatusClass(report.stock_status)}`}>
                      {formatStockStatus(report.stock_status)}
                    </span>
                  </div>
                ) : report.quantity === 0 ? (
                  <div className="mt-1.5 md:mt-4">
                    <span className="inline-block rounded-full bg-[#2a252a] px-2 py-0.5 text-[10px] font-bold text-white md:px-3 md:py-1.5 md:text-base">
                      蝨ｨ蠎ｫ縺ｪ縺・                    </span>
                  </div>
                ) : (
                  <div className="mt-1.5 text-base font-bold text-[#bd568c] md:mt-4 md:text-2xl">
                    {report.quantity}
                    <span className="ml-0.5 text-[10px] md:ml-1 md:text-base">
                      譫・                    </span>
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
                      町 {report.comment}
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
                      ? "蜑企勁荳ｭ窶ｦ"
                      : "閾ｪ蛻・・謚慕ｨｿ繧貞炎髯､"}
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
    町 蠎苓・繧ｳ繝｡繝ｳ繝・{commentCount})
  </div>
  <div className="mt-0.5 text-[9px] text-[#81757f] md:text-xs">
    {isOnlineStore(store)
      ? "蝨ｨ蠎ｫ迥ｶ豕√・蜀榊・闕ｷ繝ｻ逋ｺ騾∽ｺ亥ｮ壹↑縺ｩ繧貞・譛峨〒縺阪∪縺・
      : "豺ｷ髮代・繝ｬ繧ｸ繝ｻ蜈･闕ｷ莠亥ｮ壹・螢ｲ蝣ｴ迥ｶ豕√↑縺ｩ繧貞・譛峨〒縺阪∪縺・}
  </div>
</div>
          <span className="shrink-0 text-[#9b6c91]">
            {commentsOpen ? "竏ｧ" : "竏ｨ"}
          </span>
        </button>

        {commentsOpen && (
          <div className="border-t border-[#eaddea] px-3 pb-3 pt-3 md:px-4 md:pb-4 md:pt-4">
            {commentsLoading ? (
              <div className="text-[11px] text-[#81757f] md:text-sm">
                繧ｳ繝｡繝ｳ繝医ｒ隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ窶ｦ
              </div>
            ) : comments.length === 0 ? (
              <div className="rounded-lg bg-white p-3 text-[11px] text-[#81757f] md:rounded-xl md:text-sm">
                縺ｾ縺繧ｳ繝｡繝ｳ繝医・縺ゅｊ縺ｾ縺帙ｓ縲・              </div>
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
                        聡 蠢懈抄 {comment.applause_count > 0 ? comment.applause_count : ""}
                      </button>
                      {comment.is_own && (
                        <button
                          type="button"
                          disabled={deletingOwnCommentId === comment.id}
                          onClick={() => void handleDeleteOwnStoreComment(comment.id)}
                          className="rounded-full border border-[#d7c7d4] bg-white px-2.5 py-1 text-[9px] font-bold text-[#775f70] opacity-100 [-webkit-text-fill-color:#775f70] disabled:opacity-50 md:px-3 md:py-1.5 md:text-xs"
                        >
                          {deletingOwnCommentId === comment.id
                            ? "蜑企勁荳ｭ窶ｦ"
                            : "閾ｪ蛻・・繧ｳ繝｡繝ｳ繝医ｒ蜑企勁"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 rounded-xl bg-white p-3 md:mt-4 md:p-4">
              <div className="text-[10px] font-bold text-[#4e424b] md:text-sm">
                繧ｳ繝｡繝ｳ繝医ｒ霑ｽ蜉
              </div>
              <textarea
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                maxLength={300}
                rows={3}
                placeholder="萓・繝ｬ繧ｸ縺ｯ5莠ｺ縺ｻ縺ｩ荳ｦ繧薙〒縺・∪縺呻ｼ丞ｺ怜藤縺輔ｓ縺ｫ蜀榊・闕ｷ莠亥ｮ壹≠繧翫→遒ｺ隱阪＠縺ｾ縺励◆"
                className="mt-2 w-full rounded-lg border border-[#d8cad7] bg-white p-2.5 text-[11px] outline-none focus:border-[#bb79a7] focus:ring-2 focus:ring-[#eedbea] md:rounded-xl md:p-3 md:text-sm"
              />
              <div className="mt-1 text-[9px] leading-4 text-[#81757f] md:text-xs md:leading-5">
                蛟倶ｺｺ諠・ｱ繝ｻURL縺ｮ謚慕ｨｿ縺ｯ縺頑而縺医￥縺縺輔＞縲ゅΜ繧｢繝ｫ繧ｿ繧､繝諠・ｱ縺ｯ譎る俣縺ｨ縺ｨ繧ゅ↓螟峨ｏ繧九◆繧√∝盾閠・ュ蝣ｱ縺ｨ縺励※縺泌茜逕ｨ縺上□縺輔＞縲・              </div>

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
                {commentSubmitting ? "謚慕ｨｿ荳ｭ窶ｦ" : "繧ｳ繝｡繝ｳ繝医ｒ謚慕ｨｿ"}
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
            ? "蠎苓・諠・ｱ繧帝哩縺倥ｋ 竏ｧ"
            : "蠎苓・諠・ｱ繧定ｦ九ｋ 竏ｨ"}
        </button>
      )}

      {(online || open) && (
        <div className="mt-2 rounded-xl border border-[#e8d9e7] bg-[#fcf9fc] p-3 md:mt-3 md:rounded-2xl md:p-5">
          {online ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
                <div className="text-[12px] font-bold md:text-base">
                  將 繧ｪ繝ｳ繝ｩ繧､繝ｳ繧ｷ繝ｧ繝・・
                </div>

                {store.online_url && (
                  <a
                    href={store.online_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-full bg-[#211d21] px-4 py-2 text-[11px] font-bold text-white md:px-5 md:py-2.5 md:text-base"
                  >
                    <span>蝠・刀繝壹・繧ｸ繧定ｦ九ｋ</span>
                    <ExternalArrow />
                  </a>
                )}
              </div>

              <div className="mt-3 rounded-xl border border-[#ead7a7] bg-[#fff9e8] px-3 py-2 text-[10px] leading-5 text-[#6f5724] md:px-4 md:py-3 md:text-sm md:leading-6">
                <span className="font-bold">蛻晞ｱ髮・ｨ医↓縺､縺・※: </span>繧ｪ繝ｳ繝ｩ繧､繝ｳ縺ｯ蝨ｨ蠎ｫ繧・匱騾√・縺雁ｱ翫￠莠亥ｮ壹′髫乗凾螟峨ｏ繧翫∪縺吶り｡ｨ遉ｺ縺ｯ遒ｺ隱肴凾轤ｹ縺ｮ逶ｮ螳峨〒縺ゅｊ縲∝・騾ｱ髮・ｨ医∈縺ｮ蜿肴丐繧剃ｿ晁ｨｼ縺吶ｋ繧ゅ・縺ｧ縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲・strong>雉ｼ蜈･蜑阪↓縺碑・霄ｫ縺ｮ驟埼∝・縺ｧ陦ｨ遉ｺ縺輔ｌ繧狗匱騾√・縺雁ｱ翫￠莠亥ｮ壹ｒ蠢・★縺皮｢ｺ隱阪￥縺縺輔＞縲・/strong>
              </div>

              {store.id === 308 && (
                <div className="mt-3 rounded-xl border border-[#ead7a7] bg-[#fff9e8] px-3 py-2 text-[10px] font-bold leading-5 text-[#6f5724] md:px-4 md:py-3 md:text-sm md:leading-6">
                  窶ｻAmazon縺ｯ縲∬ｲｩ螢ｲ蜈・・蜃ｺ闕ｷ蜈・→繧ゅ↓Amazon.co.jp縺ｮ蝠・刀縺碁寔險亥ｯｾ雎｡縺ｧ縺吶りｳｼ蜈･譎ゅ↓縺皮｢ｺ隱阪￥縺縺輔＞縲・                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-[2fr_1fr] md:gap-4">
                <div>
                  <div className="text-[11px] font-bold text-[#2b252b] md:text-base">
                    桃 菴乗園
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
                            Google繝槭ャ繝・                          </a>

                          <a
                            href={`https://maps.apple.com/?q=${encodeURIComponent(
                              store.address
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-[#d8c4d4] bg-white px-3 py-1.5 text-[11px] font-bold text-[#6f4d65] opacity-100 [-webkit-text-fill-color:#6f4d65] hover:bg-[#f7eef5] md:text-sm"
                          >
                            Apple繝槭ャ繝・                          </a>
                        </div>
                      </>
                    ) : (
                      "諠・ｱ縺ｪ縺・
                    )}
                  </div>
                </div>

                <div className="md:border-l md:border-[#eaddea] md:pl-5">
                  <div className="text-[11px] font-bold text-[#2b252b] md:text-base">
                    笘趣ｸ・髮ｻ隧ｱ逡ｪ蜿ｷ
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
                      諠・ｱ縺ｪ縺・                    </div>
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
                    <span>蜈ｬ蠑上・繝ｼ繧ｸ繧定ｦ九ｋ</span>
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
        竢ｰ 蛻晞ｱ髮・ｨ・ 逋ｺ騾√・縺雁ｱ翫￠莠亥ｮ壹ｒ隕∫｢ｺ隱・      </div>
    );
  }

  if (status.status === "check") {
    return (
      <div className="mt-2 rounded-lg border border-[#dfbd68] bg-[#fff7df] px-2 py-1.5 text-[9px] leading-4 text-[#6f5724] md:rounded-xl md:px-3 md:py-2 md:text-xs">
        <div className="font-bold">泯 蛻晞ｱ髮・ｨ・ 隕∫｢ｺ隱・/div>
        {status.shipping_note && (
          <div className="mt-0.5">
            逋ｺ騾∫岼螳・ {status.shipping_note}
          </div>
        )}
        <div className="mt-0.5">
          {formatDate(status.verified_at)}遒ｺ隱・        </div>
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
        {likely ? "鳩 蛻晞ｱ髮・ｨ・ 髢薙↓蜷医≧隕玖ｾｼ縺ｿ" : "閥 蛻晞ｱ髮・ｨ・ 髢薙↓蜷医ｏ縺ｪ縺・ｦ玖ｾｼ縺ｿ"}
      </div>
      {status.shipping_note && (
        <div className="mt-0.5 font-normal">{status.shipping_note}</div>
      )}
      {status.shipping_basis === "delivery" && (
        <div className="mt-1 font-normal">
          窶ｻ陦ｨ遉ｺ縺輔ｌ縺溘♀螻翫￠莠亥ｮ壽律繧貞渕貅悶→縺励◆隕玖ｾｼ縺ｿ縺ｧ縺吶る・騾∝慍蝓溽ｭ峨↓繧医ｊ逡ｰ縺ｪ繧九◆繧√√＃閾ｪ霄ｫ縺ｮ驟埼∝・縺ｧ陦ｨ遉ｺ縺輔ｌ繧九♀螻翫￠莠亥ｮ壽律繧偵＃遒ｺ隱阪￥縺縺輔＞縲・        </div>
      )}
      <div className="mt-0.5 font-normal">{formatDate(status.verified_at)}遒ｺ隱・/div>
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
  const [cutoffPreset, setCutoffPreset] = useState<"close" | "17:00" | "other">("close");
  const [cutoffTime, setCutoffTime] = useState("");
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

    const cleanEvidence = evidence.trim();
    const cleanDetail =
      requestType === "first_week_cutoff"
        ? cutoffPreset === "close"
          ? "髢牙ｺ励∪縺ｧ"
          : cutoffPreset === "17:00"
            ? "17:00縺ｾ縺ｧ"
            : cutoffTime
              ? `${cutoffTime}縺ｾ縺ｧ`
              : ""
        : detail.trim();

    if (requestType === "billboard" && !cleanEvidence) {
      setError("Billboard諠・ｱ縺ｯ遒ｺ隱肴婿豕輔・繧ｽ繝ｼ繧ｹ繧貞・蜉帙＠縺ｦ縺上□縺輔＞縲・);
      return;
    }
    if (requestType === "first_week_cutoff" && cutoffPreset === "other" && !cutoffTime) {
      setError("邱繧∵凾髢薙ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・);
      return;
    }
    if (requestType === "other" && !cleanDetail) {
      setError("謠蝉ｾ帙☆繧句・螳ｹ繧貞・蜉帙＠縺ｦ縺上□縺輔＞縲・);
      return;
    }
    if (cleanDetail.length > 1000 || cleanEvidence.length > 1000) {
      setError("蜀・ｮｹ縺ｨ遒ｺ隱肴婿豕輔・繧ｽ繝ｼ繧ｹ縺ｯ縺昴ｌ縺槭ｌ1000譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・);
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

      setMessage("蠎苓・諠・ｱ繧帝∽ｿ｡縺励∪縺励◆縲ら｢ｺ隱榊ｾ後∝ｿ・ｦ√↓蠢懊§縺ｦ繧ｵ繧､繝医∈蜿肴丐縺励∪縺吶ゅ≠繧翫′縺ｨ縺・＃縺悶＞縺ｾ縺吶・);
      setDetail("");
      setCutoffPreset("close");
      setCutoffTime("");
      setEvidence("");
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "騾∽ｿ｡縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆縲よ凾髢薙ｒ縺翫＞縺ｦ繧ゅ≧荳蠎ｦ縺願ｩｦ縺励￥縺縺輔＞縲・
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-[#dfc16f] bg-[#fffaf0] p-3 md:mt-4 md:rounded-2xl md:p-4">
      <div className="text-[11px] font-bold text-[#5d4717] md:text-sm">鐙 蠎苓・諠・ｱ繧呈署萓・/div>
      <p className="mt-1 text-[10px] leading-5 text-[#77643c] md:text-sm md:leading-6">
        {store.billboard_status === "target"
          ? "縺薙・蠎苓・縺ｯBillboard蟇ｾ雎｡縺ｨ縺励※遒ｺ隱肴ｸ医∩縺ｧ縺吶ょ・騾ｱ髮・ｨ医・邱繧∵凾髢薙ｄ縺昴・莉悶・蠎苓・諠・ｱ繧帝∽ｿ｡縺ｧ縺阪∪縺吶・
          : "Billboard髮・ｨ域ュ蝣ｱ繧・◎縺ｮ莉悶・蠎苓・諠・ｱ繧帝∽ｿ｡縺ｧ縺阪∪縺吶・}
        繧ｪ繝ｳ繝ｩ繧､繝ｳ縺ｮ逋ｺ騾√・蜿悶ｊ蟇・○逶ｮ螳峨・縲悟惠蠎ｫ諠・ｱ繧呈兜遞ｿ縲阪°繧我ｸ邱偵↓騾∽ｿ｡縺ｧ縺阪∪縺吶・      </p>

      <label className="mt-3 block">
        <div className="mb-1 text-[11px] font-bold text-[#4d434c] md:text-sm">諠・ｱ縺ｮ遞ｮ鬘・/div>
        <select
          value={requestType}
          onChange={(event) => setRequestType(event.target.value as typeof requestType)}
          className="w-full rounded-lg border border-[#d8cad7] bg-white p-2 text-[12px] text-[#2f292e] opacity-100 [-webkit-text-fill-color:#2f292e] md:rounded-xl md:p-3 md:text-sm"
        >
          {store.billboard_status !== "target" && (
            <option value="billboard">Billboard髮・ｨ域ュ蝣ｱ</option>
          )}
          {!online && <option value="first_week_cutoff">蛻晞ｱ髮・ｨ医・邱繧∵凾髢・/option>}
          <option value="other">縺昴・莉門ｺ苓・諠・ｱ</option>
        </select>
      </label>

      {requestType === "billboard" && (
        <label className="mt-3 block">
          <div className="mb-1 text-[11px] font-bold text-[#4d434c] md:text-sm">Billboard諠・ｱ</div>
          <select
            value={billboardStatus}
            onChange={(event) => setBillboardStatus(event.target.value as BillboardInfoStatus)}
            className="w-full rounded-lg border border-[#d8cad7] bg-white p-2 text-[12px] text-[#2f292e] opacity-100 [-webkit-text-fill-color:#2f292e] md:rounded-xl md:p-3 md:text-sm"
          >
            <option value="target">Billboard 蟇ｾ雎｡</option>
            <option value="not_target">Billboard 蟇ｾ雎｡螟・/option>
          </select>
        </label>
      )}

      {requestType === "first_week_cutoff" && (
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-bold text-[#4d434c] md:text-sm">遒ｺ隱阪＠縺溽ｷ繧∵凾髢・/div>
          <select
            value={cutoffPreset}
            onChange={(event) => setCutoffPreset(event.target.value as "close" | "17:00" | "other")}
            className="w-full rounded-lg border border-[#d8cad7] bg-white p-2 text-[12px] text-[#2f292e] opacity-100 [-webkit-text-fill-color:#2f292e] md:rounded-xl md:p-3 md:text-sm"
          >
            <option value="close">髢牙ｺ励∪縺ｧ</option>
            <option value="17:00">17:00縺ｾ縺ｧ</option>
            <option value="other">縺昴・莉悶・譎る俣</option>
          </select>
          {cutoffPreset === "other" && (
            <input
              type="time"
              value={cutoffTime}
              onChange={(event) => setCutoffTime(event.target.value)}
              className="mt-2 w-full rounded-lg border border-[#d8cad7] bg-white p-2 text-[12px] text-[#2f292e] opacity-100 [-webkit-text-fill-color:#2f292e] md:rounded-xl md:p-3 md:text-sm"
            />
          )}
        </div>
      )}

      {requestType === "other" && (
        <label className="mt-3 block">
          <div className="mb-1 text-[11px] font-bold text-[#4d434c] md:text-sm">謠蝉ｾ帙☆繧区ュ蝣ｱ</div>
          <textarea
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="萓・蠎苓・縺ｮ雋ｩ螢ｲ縺ｫ髢｢縺吶ｋ陬懆ｶｳ諠・ｱ"
            className="w-full rounded-lg border border-[#d8cad7] bg-white p-2 text-[12px] text-[#2f292e] opacity-100 [-webkit-text-fill-color:#2f292e] md:rounded-xl md:p-3 md:text-sm"
          />
          <div className="mt-1 text-[10px] font-bold leading-5 text-[#9a5a32] md:text-xs">
            窶ｻ蝨ｨ蠎ｫ縺ゅｊ繝ｻ蝨ｨ蠎ｫ縺ｪ縺励・譫壽焚縺ｪ縺ｩ縺ｮ蝨ｨ蠎ｫ諠・ｱ縺ｯ縲√％縺｡繧峨〒縺ｯ縺ｪ縺上悟惠蠎ｫ諠・ｱ繧呈兜遞ｿ縲阪°繧峨♀鬘倥＞縺励∪縺吶・          </div>
        </label>
      )}

      <label className="mt-3 block">
        <div className="mb-1 text-[11px] font-bold text-[#4d434c] md:text-sm">
          遒ｺ隱肴婿豕輔・繧ｽ繝ｼ繧ｹ {requestType === "billboard" && <span className="text-red-600">蠢・・/span>}
        </div>
        <textarea
          value={evidence}
          onChange={(event) => setEvidence(event.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="萓・蜈ｬ蠑上・繝ｼ繧ｸURL縲・崕隧ｱ遒ｺ隱阪∝ｺ鈴ｭ遒ｺ隱阪↑縺ｩ"
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
          {submitting ? "騾∽ｿ｡荳ｭ窶ｦ" : "諠・ｱ繧帝∽ｿ｡"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-[#d8cad7] bg-white px-4 py-2 text-[11px] font-bold text-[#5b486b] md:text-sm"
        >
          髢峨§繧・        </button>
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
  if (report.stock_status) {
    return report.stock_status === "in_stock";
  }
  return Number(report.quantity) > 0;
}

function formatStockStatus(status: OnlineStockStatus) {
  const labels: Record<OnlineStockStatus, string> = {
    in_stock: "笳・蝨ｨ蠎ｫ縺ゅｊ",
    low_stock: "笆ｳ 谿九ｊ繧上★縺・,
    backorder: "蜈･闕ｷ蠕・■",
    sold_out: "ﾃ・蝨ｨ蠎ｫ縺ｪ縺・,
  };
  return labels[status];
}

function comparePhysicalStores(
  a: Store,
  b: Store,
  selectedPrefecture: string
) {
  if (selectedPrefecture === "蜈ｨ蝗ｽ") {
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
    name === normalizeStoreText("讌ｽ螟ｩ繝悶ャ繧ｯ繧ｹ") ||
    name === "rakutenbooks"
  );
}

function isSevenStore(store: Store) {
  const name = normalizeStoreText(store.name ?? "");

  return (
    name === normalizeStoreText("繧ｻ繝悶Φ繝阪ャ繝・) ||
    name === normalizeStoreText("繧ｻ繝悶Φ繝阪ャ繝医す繝ｧ繝・ヴ繝ｳ繧ｰ") ||
    name === "7netshopping"
  );
}

function isJoshinStore(store: Store) {
  const name = normalizeStoreText(store.name ?? "");

  return (
    name.includes(normalizeStoreText("繧ｸ繝ｧ繝ｼ繧ｷ繝ｳ")) ||
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
  if (isRakutenStore(store)) return "讌ｽ螟ｩ繝悶ャ繧ｯ繧ｹ";
  if (isSevenStore(store)) return "繧ｻ繝悶Φ繝阪ャ繝・;
  return "繧ｪ繝ｳ繝ｩ繧､繝ｳ繧ｷ繝ｧ繝・・";
}

function purchaseVariantLabel(value: PurchaseVariant | null) {
  if (value === "special") return "蜈育捩迚ｹ蜈ｸ縺ゅｊ";
  if (value === "no_special") return "迚ｹ蜈ｸ縺ｪ縺・;
  return "迚ｹ蜈ｸ蛹ｺ蛻・ｸ肴・";
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
    name.includes(normalizeStoreText("繝ｦ繝九ヰ繝ｼ繧ｵ繝ｫ"))
  ) {
    storeKey = "universal";
  } else if (
    name.includes(normalizeStoreText("繧ｿ繝ｯ繝ｼ繝ｬ繧ｳ繝ｼ繝・)) ||
    name.includes("towerrecords") ||
    name.includes("towerrecord") ||
    name.includes(normalizeStoreText("繧ｿ繝ｯ繝ｬ繧ｳ"))
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
    name.includes(normalizeStoreText("繝阪が繧ｦ繧｣繝ｳ繧ｰ")) ||
    name.includes("neowing")
  ) {
    storeKey = "neowing";
  }

  if (!storeKey) return [];

  const productUrl =
    VERIFIED_ONLINE_PRODUCT_URLS[storeKey][product.id] ?? null;

  return productUrl
    ? [{ label: "蝠・刀繝壹・繧ｸ繧帝幕縺・, url: productUrl }]
    : [];
}

function compareOnlineStores(a: Store, b: Store) {
  const getOnlineRank = (store: Store) => {
    const name = normalizeStoreText(store.name ?? "");

    if (
      name.includes("universal") ||
      name.includes(normalizeStoreText("繝ｦ繝九ヰ繝ｼ繧ｵ繝ｫ"))
    ) return 0;

    if (
      name.includes(normalizeStoreText("繧ｿ繝ｯ繝ｼ繝ｬ繧ｳ繝ｼ繝・)) ||
      name.includes("towerrecords") ||
      name.includes("towerrecord") ||
      name.includes(normalizeStoreText("繧ｿ繝ｯ繝ｬ繧ｳ"))
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
      name.includes(normalizeStoreText("繝阪が繧ｦ繧｣繝ｳ繧ｰ")) ||
      name.includes("neowing")
    ) return 7;

    if (
      name.includes(normalizeStoreText("繝薙ャ繧ｯ繧ｫ繝｡繝ｩ.com")) ||
      name.includes(normalizeStoreText("繝薙ャ繧ｯ繧ｫ繝｡繝ｩ繝峨ャ繝医さ繝")) ||
      name === "biccamera.com" ||
      name === "biccamera"
    ) return 8;

    if (
      name.includes(normalizeStoreText("繝､繝槭ム繧ｦ繧ｧ繝悶さ繝")) ||
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
  return value.replace(/・・g, "(").replace(/・・g, ")");
}

function getDisplayStoreName(store: Store) {
  const name = normalizeDisplayParentheses(store.name.trim());
  const rawChain = normalizeDisplayParentheses(
    (store.chain_name ?? "").trim()
  );

  const chain =
    ["縺ｪ縺・, "辟｡縺・, "縺ｪ縺励・, "縺ｪ縺励〒縺・].includes(rawChain)
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
    繧ｿ繝ｯ繝ｼ繝ｬ繧ｳ繝ｼ繝・ [
      "towerrecords",
      "towerrecord",
      "tower",
      "繧ｿ繝ｯ繝ｬ繧ｳ",
    ],
    hmv: ["hmv"],
    譁ｰ譏溷・ ["譁ｰ譏溷・],
    邏莨雁恚螻区嶌蠎・ [
      "邏莨雁恚螻・,
      "邏莨雁嵜螻・,
      "kinokuniya",
    ],
    tsutaya: [
      "tsutaya",
      "阡ｦ螻区嶌蠎・,
      "阡ｦ螻・,
    ],
    繧｢繝九Γ繧､繝・ [
      "繧｢繝九Γ繧､繝・,
      "animate",
    ],
    邇牙・蝣・ ["邇牙・蝣・],
    繝舌Φ繝繝ｬ繧ｳ繝ｼ繝・ [
      "繝舌Φ繝繝ｬ繧ｳ繝ｼ繝・,
      "vanda",
    ],
    縺上∪縺悶ｏ譖ｸ蠎・ [
      "縺上∪縺悶ｏ譖ｸ蠎・,
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
    .replace(/[繝ｻ・･\-窶・窶凪披廟]/g, "");
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
    store.prefecture === "繧ｪ繝ｳ繝ｩ繧､繝ｳ"
  );
}
function isLateClosingOriconChain(store: Store) {
  const chain = (store.chain_name ?? "").toLowerCase();
  const name = store.name.toLowerCase();
  return chain.includes("繧ｿ繝ｯ繝ｼ繝ｬ繧ｳ繝ｼ繝・) || name.includes("繧ｿ繝ｯ繝ｼ繝ｬ繧ｳ繝ｼ繝・) || chain.includes("hmv") || name.includes("hmv");
}

function formatBusinessHours(value: string | null) {
  if (!value) return "";

  return value
    // 10譎・0蛻・竊・10:30
    .replace(/(\d{1,2})譎・\d{1,2})蛻・g, (_, h, m) => {
      return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
    })

    // 10譎・竊・10:00
    .replace(/(\d{1,2})譎・g, (_, h) => {
      return `${h.padStart(2, "0")}:00`;
    })

    // 10:30 縺ｯ縺昴・縺ｾ縺ｾ縲・0:3 縺ｮ繧医≧縺ｪ蝣ｴ蜷医□縺・10:03 縺ｫ縺吶ｋ
    .replace(/(\d{1,2}):(\d{1,2})/g, (_, h, m) => {
      return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
    })

    // 蛹ｺ蛻・ｊ險伜捷繧・・・縺ｫ邨ｱ荳
    .replace(/[縲恠・坂輔・-]/g, "・・)

    .trim();
}

function shortPrefectureName(prefecture: string) {
  if (prefecture === "蛹玲ｵｷ驕・) {
    return "蛹玲ｵｷ驕・;
  }

  if (prefecture === "譚ｱ莠ｬ驛ｽ") {
    return "譚ｱ莠ｬ";
  }

  if (prefecture === "莠ｬ驛ｽ蠎・) {
    return "莠ｬ驛ｽ";
  }

  if (prefecture === "螟ｧ髦ｪ蠎・) {
    return "螟ｧ髦ｪ";
  }

  return prefecture.replace("逵・, "");
}

function ExternalArrow() {
  return (
    <span aria-hidden="true" className="ml-1 inline-block no-underline">
      竊暦ｸ・    </span>
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
              "・・
            ) : (
              <>
                {value.toLocaleString()}
                <span className="ml-0.5 text-[9px] md:text-xs">
                  譫・                </span>
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

