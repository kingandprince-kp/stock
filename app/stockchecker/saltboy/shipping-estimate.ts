type ShippingBasis = "shipping" | "delivery";
type ShippingSource = "product_page" | "cart_order" | "email" | "other";

const SOURCE_LABELS: Record<ShippingSource, string> = {
  product_page: "商品ページ",
  cart_order: "カート・注文画面",
  email: "メール",
  other: "その他",
};

export type ShippingEstimate = {
  basis: ShippingBasis;
  condition: string;
  source: ShippingSource;
  sourceDetail: string;
} & (
  | { kind: "range"; minDays: number; maxDays: number }
  | { kind: "date"; date: string }
  | { kind: "other"; wording: string }
);

export function parseShippingEstimate(value: unknown): ShippingEstimate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const { basis, kind, source, minDays, maxDays, date } = input;
  const condition = typeof input.condition === "string" ? input.condition.trim() : "";
  const sourceDetail = typeof input.sourceDetail === "string" ? input.sourceDetail.trim() : "";
  const wording = typeof input.wording === "string" ? input.wording.trim() : "";

  if ((basis !== "shipping" && basis !== "delivery")
    || typeof source !== "string" || !Object.hasOwn(SOURCE_LABELS, source)
    || (source === "other" && !sourceDetail)
    || sourceDetail.length > 100 || condition.length > 200 || wording.length > 200) return null;

  const common = { basis: basis as ShippingBasis, condition, source: source as ShippingSource, sourceDetail };
  if (kind === "range" && basis === "shipping"
    && typeof minDays === "number" && Number.isInteger(minDays) && minDays >= 0
    && typeof maxDays === "number" && Number.isInteger(maxDays) && maxDays >= minDays && maxDays <= 30) {
    return { ...common, kind, minDays, maxDays };
  }
  if (kind === "date" && typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const time = Date.parse(date);
    if (Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date) {
      return { ...common, kind, date };
    }
  }
  return kind === "other" && wording ? { ...common, kind, wording } : null;
}

export function shippingEstimateText(estimate: ShippingEstimate) {
  const basis = estimate.basis === "shipping" ? "発送・出荷目安" : "お届け・到着目安";
  const dayLabel = (days: number) => days === 0 ? "当日" : `${days}日`;
  const timing = estimate.kind === "date" ? estimate.date.replaceAll("-", "/")
    : estimate.kind === "other" ? estimate.wording
    : estimate.minDays === estimate.maxDays ? dayLabel(estimate.minDays)
    : `${dayLabel(estimate.minDays)}〜${dayLabel(estimate.maxDays)}`;
  return `${basis}: ${timing} (確認場所: ${estimate.sourceDetail || SOURCE_LABELS[estimate.source]})`;
}

export function readShippingEstimate(form: FormData) {
  return parseShippingEstimate({
    basis: form.get("shippingBasis"),
    kind: form.get("shippingKind"),
    minDays: form.get("shippingMinDays") ? Number(form.get("shippingMinDays")) : null,
    maxDays: form.get("shippingMaxDays") ? Number(form.get("shippingMaxDays")) : null,
    date: form.get("shippingDate"),
    condition: form.get("shippingCondition"),
    wording: form.get("shippingWording"),
    source: form.get("shippingSource"),
    sourceDetail: form.get("shippingSourceDetail"),
  });
}
