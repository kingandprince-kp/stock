import { validDate, validTime, type ShippingBasis, type ShippingEstimate } from "./shipping-estimate";

export type FirstWeekSettings = { release_date: string; cutoff_date: string | null; delivery_cutoff_date: string | null };
export type RetailerRule = {
  store_id: number; basis: ShippingBasis; cutoff_date: string; cutoff_time: string | null;
  whole_day: boolean; evidence: string; verified_at: string;
  order_cutoff_kind: "unknown" | "none" | "time"; order_cutoff_time: string | null;
  business_weekdays: number[] | null; excluded_dates: string[] | null; calendar_verified_from: string | null; calendar_verified_until: string | null;
};
export type PhysicalCutoff = {
  cutoff_date: string | null; cutoff_kind: string | null; cutoff_time: string | null;
  closing_time?: string | null; closing_verified_date?: string | null; evidence?: string | null; verified_at?: string;
};
export type NormalizedTiming = {
  earliestDate: string | null; latestDate: string | null;
  earliestTime?: string; latestTime?: string; basis: ShippingBasis; missing: string | null;
};
export type FirstWeekEstimate = {
  status: "likely" | "check" | "unlikely"; reason: string; normalized?: NormalizedTiming;
};
export const FIRST_WEEK_LABELS = {
  likely: "初週に間に合う見込み", check: "初週は要確認", unlikely: "初週に間に合わない見込み",
} as const;
export const DEFAULT_FIRST_WEEK_SETTINGS: FirstWeekSettings = {
  release_date: "2026-11-25", cutoff_date: "2026-11-29", delivery_cutoff_date: "2026-11-30",
};
export function japanDate(now: number | string = Date.now()) {
  const ms = typeof now === "number" ? now : Date.parse(now);
  return new Date(ms + 9 * 3600000).toISOString().slice(0, 10);
}
export function jstMillis(date: string, time: string) {
  return Date.parse(`${date}T${time.length === 5 ? time + ":00" : time}+09:00`);
}
function shiftDate(date: string, days: number) {
  return new Date(Date.parse(date + "T00:00:00Z") + days * 86400000).toISOString().slice(0, 10);
}
export function normalizeTiming(estimate: ShippingEstimate, rule?: RetailerRule): NormalizedTiming {
  const result: NormalizedTiming = { earliestDate: null, latestDate: null, basis: estimate.basis, missing: null };
  const missing = (reason: string) => ({ ...result, missing: reason });
  if (estimate.kind === "date") return { ...result, earliestDate: estimate.date, latestDate: estimate.date, earliestTime: estimate.time, latestTime: estimate.time };
  if (estimate.kind === "date_range") return { ...result, earliestDate: estimate.earliestDate, latestDate: estimate.latestDate, earliestTime: estimate.earliestTime, latestTime: estimate.latestTime };
  if (estimate.kind === "other") return missing("日付を特定できる案内を確認");
  const context = estimate.relative;
  if (!context) return missing("起算日・注文時刻・日数の数え方が未確認");
  if (context.calendar === "unknown") return missing("暦日・営業日の区分が未確認");
  if (context.orderType === "unknown") return missing("通常在庫・予約・取り寄せの区分が未確認");
  if (context.orderType !== "stock" && context.anchor !== "ready") return missing("予約・取り寄せ商品の手配完了日が未確認");
  if (!rule || rule.basis !== estimate.basis || rule.order_cutoff_kind === "unknown") return missing("ショップの注文締め時刻の扱いが未確認");
  const weekdays = rule.business_weekdays;
  if (context.calendar === "business" && (!weekdays?.length || !validDate(rule.calendar_verified_from) || !validDate(rule.calendar_verified_until))) return missing("ショップの営業日・休業日が未確認");
  const eligible = (date: string) => context.calendar !== "business" ||
    (!!weekdays?.includes(new Date(date + "T00:00:00Z").getUTCDay()) && !rule.excluded_dates?.includes(date));
  let base = context.referenceDate;
  if (rule.order_cutoff_kind === "time") {
    if (!context.referenceTime || !validTime(rule.order_cutoff_time)) return missing("注文時刻・注文締め時刻が未確認");
    if (jstMillis(base, context.referenceTime) > jstMillis(base, rule.order_cutoff_time)) base = shiftDate(base, 1);
  }
  let guard = 0;
  while (!eligible(base) && guard++ < 370) base = shiftDate(base, 1);
  const plusDays = (count: number) => {
    let date = base, added = 0, scanned = 0;
    while (added < count && scanned++ < 370) { date = shiftDate(date, 1); if (eligible(date)) added++; }
    return added === count ? date : null;
  };
  const earliestDate = plusDays(estimate.minDays), latestDate = plusDays(estimate.maxDays);
  if (guard >= 370 || !earliestDate || !latestDate) return missing("営業日を特定できません");
  if (context.calendar === "business" && (context.referenceDate < (rule.calendar_verified_from ?? "") || latestDate > (rule.calendar_verified_until ?? ""))) return missing("確認済みの営業日カレンダーの範囲外");
  return { ...result, earliestDate, latestDate };
}
export function firstWeekEstimate(estimate: ShippingEstimate | null, rule?: RetailerRule, settings: FirstWeekSettings = DEFAULT_FIRST_WEEK_SETTINGS): FirstWeekEstimate {
  if (!estimate) return { status: "check", reason: "発送・お届け目安の投稿なし" };
  const verifiedRule = rule?.basis === estimate.basis && rule.evidence?.trim() && rule.verified_at && validDate(rule.cutoff_date) ? rule : undefined;
  const normalized = normalizeTiming(estimate, verifiedRule);
  const check = (reason: string): FirstWeekEstimate => ({ status: "check", reason, normalized });
  if (estimate.condition && estimate.conditionsMet !== true) return check("支払い・予約・同梱などの注文条件を確認");
  if (normalized.missing) return check(normalized.missing);
  // Explicit shipping dates can be compared with the published site deadline.
  // Retailer verification remains necessary for delivery-based and relative-day assumptions.
  const deadline = verifiedRule ?? (estimate.basis === "shipping" && validDate(settings.cutoff_date)
    ? { cutoff_date: settings.cutoff_date, cutoff_time: null, whole_day: false } : null);
  if (!deadline) return check(estimate.basis === "delivery"
    ? "到着予定だけでは発送日を判断できません。お届け先を設定してご確認ください"
    : "サイトの発送締切日が未設定");
  const { earliestDate, latestDate } = normalized;
  if (!earliestDate || !latestDate) return check("根拠となる日付が未確認");
  const basis = estimate.basis === "shipping" ? "発送" : "到着";
  const label = `${deadline.cutoff_date.replaceAll("-", "/")} ${deadline.whole_day ? "終日" : deadline.cutoff_time?.slice(0, 5) ?? "時刻要確認"}${basis}まで`;
  // Day-only ranges are compared as full-day intervals, never as midnight.
  if (latestDate < deadline.cutoff_date) return { status: "likely", reason: `${verifiedRule ? "ショップの基準" : "サイトの発送目安"}: ${label}`, normalized };
  if (earliestDate > deadline.cutoff_date) return { status: "unlikely", reason: `${verifiedRule ? "ショップの基準" : "サイトの発送目安"}: ${label}`, normalized };
  if (!deadline.whole_day && !validTime(deadline.cutoff_time)) return check(`締切当日の${basis}時刻を確認`);
  const cutoff = jstMillis(deadline.cutoff_date, deadline.whole_day ? "23:59:59.999" : deadline.cutoff_time!);
  const earliest = jstMillis(earliestDate, normalized.earliestTime ?? "00:00:00");
  const latest = jstMillis(latestDate, normalized.latestTime ?? "23:59:59.999");
  if (latest <= cutoff) return { status: "likely", reason: `${verifiedRule ? "ショップの基準" : "サイトの発送目安"}: ${label}`, normalized };
  if (earliest > cutoff) return { status: "unlikely", reason: `${verifiedRule ? "ショップの基準" : "サイトの発送目安"}: ${label}`, normalized };
  return check(`期間が締切をまたぐか、締切当日の${basis}時刻が未確認`);
}
export function physicalFirstWeek(info: PhysicalCutoff | undefined, now = Date.now()): FirstWeekEstimate & { cutoffLabel: string } {
  const check = (reason: string, cutoffLabel = "初週締め時間: 要確認") => ({ status: "check" as const, reason, cutoffLabel });
  if (!info || !validDate(info.cutoff_date)) return check("店舗の締切日が未確認");
  if (info.cutoff_kind !== "closing" && info.cutoff_kind !== "time") return check("店舗の締切区分が未確認");
  const closing = info.cutoff_kind === "closing";
  const time = closing ? (info.closing_verified_date === info.cutoff_date ? info.closing_time : null) : info.cutoff_time;
  const label = `初週締め時間: ${info.cutoff_date.replaceAll("-", "/")} ${closing ? "閉店まで" : (info.cutoff_time?.slice(0, 5) ?? "時刻要確認") + "まで"}`;
  if (!info.evidence?.trim() || !info.verified_at) return check("店舗の確認方法・確認時点が未登録", label);
  if (!validTime(time)) return check(closing ? "締切当日の確認済み閉店時刻が未登録" : "指定時刻が未確認", label);
  const cutoff = jstMillis(info.cutoff_date, time);
  return { status: now <= cutoff ? "likely" : "unlikely", reason: `日本時間 ${time.slice(0, 5)}まで${closing ? " (締切当日の閉店時刻)" : ""}`, cutoffLabel: label };
}
