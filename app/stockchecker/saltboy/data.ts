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
export type RecentReport = Inventory & { id: number; comment: string | null };
export type FirstWeek = {
  store_id: number;
  product_id: number | null;
  note: string | null;
  cutoff_date: string | null;
  cutoff_time: string | null;
  cutoff_kind: string | null;
  estimate_basis: string | null;
  earliest_date: string | null;
  latest_date: string | null;
};
export type SaltInventory = { products: Product[]; reports: Inventory[]; recentReports: RecentReport[]; firstWeek: FirstWeek[] };
export type Directory = {
  stores: Store[];
  online_stores: Store[];
};

export const directoryUrl = "https://studio.kp-music-data.workers.dev/stores/data.json";

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
    global: {
      fetch: async (input, init) => {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const response = await fetch(input, { ...init, signal: AbortSignal.timeout(9000), cache: "no-store" });
          if (response.status !== 401) return response;
          const body = await response.clone().json().catch(() => null) as { code?: string } | null;
          if (body?.code !== "PGRST303" || attempt === 2) return response;
          await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
        }
        throw new Error("SALT BOY Supabase request retry limit reached.");
      },
    },
  });
}

export async function loadInventory(): Promise<SaltInventory> {
  const db = inventoryDb();
  const [products, firstWeek] = await Promise.all([
    db.from("salt_boy_products").select("id,name,catalog_number").eq("is_active", true).order("sort_order"),
    db.from("salt_boy_first_week_info").select("store_id,product_id,note,cutoff_date,cutoff_time,cutoff_kind,estimate_basis,earliest_date,latest_date"),
  ]);
  if (products.error || firstWeek.error) throw new Error("SALT BOYの商品・初週情報を取得できませんでした。");

  const latest = new Map<string, Inventory>();
  const recentReports: RecentReport[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const result = await db.from("salt_boy_inventory_reports")
      .select("id,store_id,product_id,quantity,stock_status,created_at,comment")
      .eq("review_status", "approved").is("deleted_at", null)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (result.error) throw new Error("SALT BOYの在庫情報を取得できませんでした。");
    for (const report of result.data) {
      if (recentReports.length < 5) recentReports.push(report);
      const key = `${report.store_id}:${report.product_id}`;
      if (!latest.has(key)) {
        const { store_id, product_id, quantity, stock_status, created_at } = report;
        latest.set(key, { store_id, product_id, quantity, stock_status, created_at });
      }
    }
    if (result.data.length < pageSize) break;
  }
  return { products: products.data as Product[], reports: [...latest.values()], recentReports, firstWeek: firstWeek.data as FirstWeek[] };
}
