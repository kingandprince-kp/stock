import type { ShippingEstimate } from "./shipping-estimate";

// SALT BOYの初週購入目安。日付はショップに表示された日本時間の日付として比較する。
const SHIPMENT_DEADLINE = "2026-11-29";
const SHIPMENT_DEADLINE_LABEL = "11/29(日)出荷";

type FirstWeekEstimate = {
  status: "likely" | "check" | "unlikely";
  reason: string;
};

export const FIRST_WEEK_LABELS = {
  likely: "初週に間に合う見込み",
  check: "初週は要確認",
  unlikely: "初週に間に合わない見込み",
} as const;

export function firstWeekEstimate(estimate: ShippingEstimate | null): FirstWeekEstimate {
  if (!estimate) return { status: "check", reason: "発送・お届け目安の投稿なし" };
  if (estimate.condition) return { status: "check", reason: "ショップの注文条件を確認" };
  if (estimate.kind === "range") return { status: "check", reason: "注文日・営業日によって変わるため、出荷日を確認" };
  if (estimate.kind === "other") return { status: "check", reason: "出荷日を特定できる案内を確認" };
  if (estimate.basis === "delivery" && estimate.date > SHIPMENT_DEADLINE) {
    return { status: "check", reason: `${SHIPMENT_DEADLINE_LABEL}までに発送されるか確認` };
  }
  return {
    status: estimate.date <= SHIPMENT_DEADLINE ? "likely" : "unlikely",
    reason: estimate.basis === "delivery"
      ? `出荷締切の11/29(日)までに到着する目安`
      : `基準: ${SHIPMENT_DEADLINE_LABEL}まで`,
  };
}
