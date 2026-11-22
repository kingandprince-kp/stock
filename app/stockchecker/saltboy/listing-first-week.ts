import type { Inventory, SaltInventory } from "./data";
import type { PurchaseVariant } from "./purchase-variants";
import type { ShippingEstimate } from "./shipping-estimate";
import { firstWeekEstimate } from "./first-week-model";

// One source selection and one normalization path for both filtering and display.
export function listingFirstWeek(item: Inventory | undefined, storeId: number, productId: number, variant: PurchaseVariant | null, inventory: SaltInventory | null) {
  const admin = inventory?.firstWeek.find((row) => row.store_id === storeId && row.product_id === productId
    && row.purchase_variant === variant && row.earliest_date && row.latest_date && row.estimate_basis);
  const useAdmin = !!admin && (!item?.shipping_estimate || Date.parse(admin.verified_at) > Date.parse(item.created_at));
  const estimate: ShippingEstimate | null = useAdmin && admin ? {
    basis: admin.estimate_basis === "delivery" ? "delivery" : "shipping", kind: "date_range",
    earliestDate: admin.earliest_date!, latestDate: admin.latest_date!,
    source: "other", sourceDetail: "管理者確認", condition: admin.note ?? "", confirmedAt: admin.verified_at,
  } : item?.shipping_estimate ?? null;
  if (!estimate && (!item || (item.stock_status !== "in_stock" && item.stock_status !== "low_stock" && !(item.quantity && item.quantity > 0)))) return null;
  const rule = inventory?.rules?.find((row) => row.store_id === storeId && row.basis === estimate?.basis);
  return { estimate, rule, result: firstWeekEstimate(estimate, rule),
    recordedAt: estimate?.confirmedAt ?? (useAdmin ? admin?.verified_at : item?.created_at),
    recordedKind: estimate?.confirmedAt || useAdmin ? "確認" : "投稿", evidence: useAdmin ? admin?.evidence : null };
}
