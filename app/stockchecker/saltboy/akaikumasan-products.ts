import type { PurchaseVariant } from "./purchase-variants";

const SINGLE_JANS: Readonly<Record<string, string>> = {
  "UPCH-7909": "4988031927465",
  "UPCH-7910": "4988031927472",
  "UPCH-7911": "4988031927489",
  "UPCH-7912": "4988031927496",
  "UPCH-7913": "4988031927502",
};
const SINGLE_WITHOUT_A_DVD = ["4988031927465", "4988031927489", "4988031927496", "4988031927502"];
const SHOPS: Readonly<Record<number, { base: string; suffix: string; singles: readonly string[]; dvdSet: boolean }>> = {
  862: { base: "https://onlineshop.akaikumasan.jp/products/", suffix: "", singles: SINGLE_WITHOUT_A_DVD, dvdSet: false },
  864: { base: "https://item.rakuten.co.jp/akaikumasan/", suffix: "/", singles: SINGLE_WITHOUT_A_DVD, dvdSet: false },
  865: { base: "https://store.shopping.yahoo.co.jp/akaikumasan/", suffix: ".html", singles: Object.values(SINGLE_JANS), dvdSet: true },
};

export function akaikumasanSingleUrl(storeId: number, catalog: string): string | undefined {
  const shop = SHOPS[storeId], jan = SINGLE_JANS[catalog];
  return shop && shop.singles.includes(jan) ? shop.base + jan + shop.suffix : undefined;
}

export function akaikumasanBundles(storeId: number): { variant: PurchaseVariant; url: string }[] {
  const shop = SHOPS[storeId];
  if (!shop) return [];
  return [
    { variant: "bluray_set_special", url: shop.base + "2000000130016" + shop.suffix },
    ...(shop.dvdSet ? [{ variant: "dvd_set_special" as const, url: shop.base + "2000000130017" + shop.suffix }] : []),
  ];
}
