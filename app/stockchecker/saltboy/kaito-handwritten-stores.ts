// SALT BOY: the 13 locations in the KAITO announcement provided by the user.
// Match exact directory IDs so nearby branches and other chains are not tagged.
export const KAITO_HANDWRITTEN_STORE_IDS = [
  64, 57, 55, // 福岡: HMV&BOOKS HAKATA、タワー博多・福岡パルコ
  100, 42, // 大阪: HMVグランフロント大阪、タワー梅田NU茶屋町
  96, 35, // 愛知: HMV栄、タワー名古屋パルコ
  71, 2, 1, // 北海道: HMV札幌ステラプレイス、タワーアリオ札幌・札幌パルコ
  61, 587, 6, // 東京: HMV&BOOKS SHIBUYA、SHIBUYA TSUTAYA、タワー渋谷
] as const;

const handwrittenStores = new Set<number>(KAITO_HANDWRITTEN_STORE_IDS);
export function hasKaitoHandwrittenComment(storeId: number) {
  return handwrittenStores.has(storeId);
}
