import { createClient } from "@supabase/supabase-js";

export type Store = {
  id: number;
  name: string;
  chain_name: string | null;
  prefecture: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  business_hours: string | null;
  official_url: string | null;
  online_url: string | null;
  oricon_target: boolean | null;
  billboard_status: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type Product = { id: number; name: string; catalog_number: string };
export type Inventory = {
  store_id: number;
  product_id: number;
  quantity: number | null;
  stock_status: string | null;
  created_at: string;
};
export type FirstWeek = {
  store_id: number;
  product_id: number | null;
  note: string | null;
  cutoff_date: string | null;
  cutoff_time: string | null;
};
export type Directory = {
  stores: Store[];
  online_stores: Store[];
  campaigns: {
    id: string;
    title: string;
    notice: string;
    conditions_url: string;
    matches: { id: number; status: string }[];
  }[];
};

export const directoryUrl = "https://studio.kp-music-data.workers.dev/stores/data.json";
export const serialSearchUrl = "https://studio.kp-music-data.workers.dev/stores/serial/?campaign=salt-boy-2026-serial&serial=target";

export async function loadDirectory() {
  const response = await fetch(directoryUrl, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("店舗情報を取得できませんでした。");
  const directory = (await response.json()) as Directory;
  if (!Array.isArray(directory.stores) || !Array.isArray(directory.online_stores)) {
    throw new Error("店舗情報の形式が変わりました。");
  }
  return directory;
}

export function inventoryDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SALT BOYの在庫接続設定がありません。");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(9000), cache: "no-store" }) },
  });
}

export async function loadInventory() {
  const db = inventoryDb();
  const [products, firstWeek] = await Promise.all([
    db.from("salt_boy_products").select("id,name,catalog_number").eq("is_active", true).order("sort_order"),
    db.from("salt_boy_first_week_info").select("store_id,product_id,note,cutoff_date,cutoff_time"),
  ]);
  if (products.error || firstWeek.error) throw new Error("SALT BOYの商品・初週情報を取得できませんでした。");

  const latest = new Map<string, Inventory>();
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const result = await db.from("salt_boy_inventory_reports")
      .select("store_id,product_id,quantity,stock_status,created_at")
      .eq("review_status", "approved").is("deleted_at", null)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (result.error) throw new Error("SALT BOYの在庫情報を取得できませんでした。");
    for (const report of result.data) {
      const key = `${report.store_id}:${report.product_id}`;
      if (!latest.has(key)) latest.set(key, report);
    }
    if (result.data.length < pageSize) break;
  }
  return { products: products.data as Product[], reports: [...latest.values()], firstWeek: firstWeek.data as FirstWeek[] };
}
