export type PurchaseVariant = "special" | "no_special" | "bluray_set" | "bluray_set_special" | "dvd_set" | "dvd_set_special";
export const RAKUTEN_BOOKS_STORE_ID = 309;
export const AMAZON_JAPAN_STORE_ID = 308;

const LABELS: Record<PurchaseVariant, string> = {
  special: "限定特典付き",
  no_special: "特典なし",
  bluray_set: "Blu-ray 3形態セット (特典なし)",
  bluray_set_special: "Blu-ray 3形態セット (特典付き)",
  dvd_set: "DVD 3形態セット (特典なし)",
  dvd_set_special: "DVD 3形態セット (特典付き)",
};

export function purchaseLabel(product: string, variant: PurchaseVariant | null) {
  if (!variant) return product;
  return variant === "special" || variant === "no_special" ? `${product} (${LABELS[variant]})` : LABELS[variant];
}

export function stockKey(storeId: number, productId: number, variant: PurchaseVariant | null) {
  return `${storeId}:${productId}:${variant ?? ""}`;
}
