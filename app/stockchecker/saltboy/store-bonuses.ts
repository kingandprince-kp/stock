import type { Store } from "./data";

export const STORE_BONUS_SOURCE = "https://www.universal-music.co.jp/kaito/news/2026-10-30/";

// Official retailer bonus types, not confirmation of remaining bonus stock.
// Do not infer the generic sticker for unconfirmed retailers.
const ONLINE_BONUSES: Readonly<Record<number, string>> = {
  307: "フォンタブ",
  308: "デイリーユースA5ノート",
  309: "A4ミニポスター",
  310: "缶バッジ",
  311: "チケットホルダー",
  312: "A4クリアファイル",
};

const CHAIN_BONUSES: Readonly<Record<string, string>> = {
  "タワーレコード": "チケットホルダー",
  HMV: "A4クリアファイル",
  TSUTAYA: "ましかくフォト<89mm>",
};

export function storeBonus(store: Pick<Store, "id" | "chain_name">): string | null {
  return ONLINE_BONUSES[store.id] ?? CHAIN_BONUSES[store.chain_name ?? ""] ?? null;
}
