import type { Metadata } from "next";
import { loadDirectory, loadInventory, serialSearchUrl } from "./data";
import StockChecker from "./stock-checker";
import "./stock-checker.css";

export const metadata: Metadata = {
  title: "SALT BOY 在庫チェッカー",
  description: "SALT BOYの実店舗・オンラインショップの在庫情報を確認できます。",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SaltBoyPage() {
  const [directory, inventory] = await Promise.allSettled([loadDirectory(), loadInventory()]);
  const campaign = directory.status === "fulfilled"
    ? directory.value.campaigns?.find((item) => item.id === "salt-boy-2026-serial")
    : undefined;
  return (
    <main className="salt-boy">
      <div className="salt-wrap">
        <header id="top" className="salt-heading">
          <h1>SALT BOY <span>在庫チェッカー</span></h1>
          <p>全国の実店舗・オンラインショップの在庫情報を確認できます。</p>
        </header>
        <aside className="salt-notice">
          <strong>予約・購入前にご確認ください</strong>
          <p>在庫とシリアルの配布状況は、各店舗・ショップでご確認ください。</p>
          <a href={serialSearchUrl}>CD取扱店舗検索</a>
        </aside>
        {directory.status === "fulfilled" ? (
          <StockChecker
            physical={directory.value.stores}
            online={directory.value.online_stores}
            campaign={campaign}
            inventory={inventory.status === "fulfilled" ? inventory.value : null}
          />
        ) : (
          <p role="alert">CD取扱店舗ページの店舗データを取得できませんでした。再読み込みしてください。</p>
        )}
        <footer><p>非公式の在庫情報ツールです。</p><small>© 2026 KP Music Data</small></footer>
      </div>
    </main>
  );
}
