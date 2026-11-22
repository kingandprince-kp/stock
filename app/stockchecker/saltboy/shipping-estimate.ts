export type ShippingBasis = "shipping" | "delivery";
export const MAX_SHIPPING_DAYS = 7;
type ShippingSource = "product_page" | "cart_order" | "email" | "other";

const SOURCE_LABELS: Record<ShippingSource, string> = {
  product_page: "商品ページ",
  cart_order: "カート・注文画面",
  email: "メール",
  other: "その他",
};

export type RelativeContext = {
  referenceDate: string; referenceTime: string;
  anchor: "order" | "payment" | "ready";
  calendar: "calendar" | "business" | "unknown";
  orderType: "stock" | "preorder" | "backorder" | "unknown";
};
export type ShippingEstimate = {
  basis: ShippingBasis;
  condition: string;
  source: ShippingSource;
  sourceDetail: string;
  originalText?: string;
  confirmedAt?: string;
  conditionsMet?: boolean;
} & (
  | { kind: "range"; minDays: number; maxDays: number; relative?: RelativeContext }
  | { kind: "date"; date: string; time?: string }
  | { kind: "date_range"; earliestDate: string; latestDate: string; earliestTime?: string; latestTime?: string }
  | { kind: "other"; wording: string }
);

export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}
export function validTime(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
}

export function parseShippingEstimate(value: unknown, maxRangeDays = MAX_SHIPPING_DAYS): ShippingEstimate | null {
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

  const common: { basis: ShippingBasis; condition: string; source: ShippingSource; sourceDetail: string; originalText?: string; confirmedAt?: string; conditionsMet?: boolean } = { basis: basis as ShippingBasis, condition, source: source as ShippingSource, sourceDetail };
  if (input.originalText != null) {
    if (typeof input.originalText !== "string" || input.originalText.length > 300) return null;
    if (input.originalText.trim()) common.originalText = input.originalText.trim();
  }
  if (input.conditionsMet != null) {
    if (typeof input.conditionsMet !== "boolean") return null;
    common.conditionsMet = input.conditionsMet;
  }
  if (input.confirmedAt) {
    if (typeof input.confirmedAt !== "string" || !validDate(input.confirmedAt.slice(0, 10)) || !validTime(input.confirmedAt.slice(11, 19).split(".")[0]) || !/(Z|[+-]\d{2}:\d{2})$/i.test(input.confirmedAt) || !Number.isFinite(Date.parse(input.confirmedAt))) return null;
    common.confirmedAt = new Date(input.confirmedAt).toISOString();
  }
  for (const key of ["time", "earliestTime", "latestTime"]) if (input[key] && !validTime(input[key])) return null;
  if (kind === "range"
    && typeof minDays === "number" && Number.isInteger(minDays) && minDays >= 0
    && typeof maxDays === "number" && Number.isInteger(maxDays) && maxDays >= minDays && maxDays <= maxRangeDays) {
    let relative: RelativeContext | undefined;
    if (input.relative != null) {
      if (typeof input.relative !== "object" || Array.isArray(input.relative)) return null;
      const context = input.relative as Record<string, unknown>;
      if (!validDate(context.referenceDate) || (context.referenceTime !== "" && !validTime(context.referenceTime))
        || !["order", "payment", "ready"].includes(String(context.anchor))
        || !["calendar", "business", "unknown"].includes(String(context.calendar))
        || !["stock", "preorder", "backorder", "unknown"].includes(String(context.orderType))) return null;
      relative = context as RelativeContext;
    }
    return { ...common, kind, minDays, maxDays, ...(relative ? { relative } : {}) };
  }
  if (kind === "date" && typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const time = Date.parse(date);
    if (Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date) {
      return { ...common, kind, date, ...(input.time ? { time: String(input.time) } : {}) };
    }
  }
  if (kind === "date_range" && validDate(input.earliestDate) && validDate(input.latestDate) && input.earliestDate <= input.latestDate) {
    const timeKey = (value: unknown) => String(value).length === 5 ? String(value) + ":00" : String(value);
    if (input.earliestDate === input.latestDate && input.earliestTime && input.latestTime && timeKey(input.earliestTime) > timeKey(input.latestTime)) return null;
    return { ...common, kind, earliestDate: input.earliestDate, latestDate: input.latestDate,
      ...(input.earliestTime ? { earliestTime: String(input.earliestTime) } : {}), ...(input.latestTime ? { latestTime: String(input.latestTime) } : {}) };
  }
  return kind === "other" && wording ? { ...common, kind, wording } : null;
}

export function shippingEstimateText(estimate: ShippingEstimate) {
  const basis = estimate.basis === "shipping" ? "発送・出荷目安" : "お届け・到着目安";
  const dayLabel = (days: number) => days === 0 ? "当日" : `${days}日`;
  const timing = estimate.kind === "date" ? estimate.date.replaceAll("-", "/") + (estimate.time ? " " + estimate.time : "")
    : estimate.kind === "date_range" ? `${estimate.earliestDate.replaceAll("-", "/")}${estimate.earliestTime ? " " + estimate.earliestTime : ""}〜${estimate.latestDate.replaceAll("-", "/")}${estimate.latestTime ? " " + estimate.latestTime : ""}`
    : estimate.kind === "other" ? estimate.wording
    : estimate.minDays === estimate.maxDays ? dayLabel(estimate.minDays)
    : `${dayLabel(estimate.minDays)}〜${dayLabel(estimate.maxDays)}`;
  const context = estimate.kind === "range" && estimate.relative ? ` / 起算: ${estimate.relative.referenceDate} ${estimate.relative.referenceTime} (${estimate.relative.anchor === "payment" ? "入金確認" : estimate.relative.anchor === "ready" ? "手配完了" : "注文"}・${estimate.relative.calendar === "business" ? "営業日" : estimate.relative.calendar === "calendar" ? "暦日" : "日数区分不明"})` : "";
  return `${basis}: ${timing}${context} (確認場所: ${estimate.sourceDetail || SOURCE_LABELS[estimate.source]})`;
}

export function readShippingEstimate(form: FormData, prefix = "") {
  const field = (name: string) => String(form.get(prefix + name) ?? "").trim();
  return parseShippingEstimate({
    basis: form.get(prefix + "shippingBasis"),
    kind: form.get(prefix + "shippingKind"),
    minDays: form.get(prefix + "shippingMinDays") ? Number(form.get(prefix + "shippingMinDays")) : null,
    maxDays: form.get(prefix + "shippingMaxDays") ? Number(form.get(prefix + "shippingMaxDays")) : null,
    date: form.get(prefix + "shippingDate"),
    condition: form.get(prefix + "shippingCondition"),
    wording: form.get(prefix + "shippingWording"),
    source: form.get(prefix + "shippingSource"),
    sourceDetail: form.get(prefix + "shippingSourceDetail"),
    time: field("shippingTime"), earliestDate: field("earliestDate"), latestDate: field("latestDate"),
    earliestTime: field("earliestTime"), latestTime: field("latestTime"), originalText: field("originalText"),
    conditionsMet: form.has(prefix + "conditionsMet"),
    confirmedAt: field("confirmedAt") ? field("confirmedAt") + ":00+09:00" : undefined,
    ...(field("referenceDate") ? { relative: {
      referenceDate: field("referenceDate"), referenceTime: field("referenceTime"),
      anchor: field("anchor"), calendar: field("calendar"), orderType: field("orderType"),
    } } : {}),
  });
}
