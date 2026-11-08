import type { Metadata } from "next";
import { loadDirectory, loadInventory } from "./data";
import StockChecker from "./stock-checker";
import "./stock-checker.css";
import "./salt-boy-theme.css";

export const metadata: Metadata = {
  title: "SALT BOY 在庫チェッカー",
  description: "SALT BOYの実店舗・オンラインショップの在庫情報を確認できます。",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SaltBoyPage() {
  const [directory, inventory] = await Promise.allSettled([loadDirectory(), loadInventory()]);
  return (
    <main className="salt-boy">
      <div className="salt-wrap">
        <header id="top" className="salt-design-hero salt-design-wave">
        <svg className="salt-design-waves" viewBox="0 0 1000 220" preserveAspectRatio="none" aria-hidden="true">
          <path fill="#d8eaf5" d="M0 65C158 36 234 165 431 169C648 175 776 25 1000 64V220H0Z" />
          <path fill="#cde4f2" d="M0 144C187 199 298 187 478 174C691 159 846 200 1000 124V220H0Z" />
        </svg>
        <div className="salt-design-art salt-design-art-left" aria-hidden="true">
          <img className="salt-art-hen" src="/salt-boy/hen.png" alt="" />
          <img className="salt-art-crab" src="/salt-boy/crab.png" alt="" />
        </div>
        <div className="salt-design-copy">
          <div className="salt-design-brand">KAITO STOCK CHECKER</div>
          <h1>SALT BOY<span>在庫チェッカー</span></h1>
          <p>全国の実店舗・オンラインショップの在庫情報を確認できます。</p>
        </div>
        <div className="salt-design-art salt-design-art-right" aria-hidden="true">
          <img className="salt-art-betta" src="/salt-boy/betta.png" alt="" />
        </div>
      </header>
        <aside className="salt-notice">
          <strong>予約・購入前にご確認ください</strong>
          <p>最新の在庫状況は、各店舗・ショップでご確認ください。</p>
        </aside>
        {directory.status === "fulfilled" ? (
          <StockChecker
            physical={directory.value.stores}
            online={directory.value.online_stores}
            inventory={inventory.status === "fulfilled" ? inventory.value : null}
          />
        ) : (
          <p role="alert">CD取扱店舗ページの店舗データを取得できませんでした。再読み込みしてください。</p>
        )}
        <footer>
          <p>当サイトはファンによる非公式の在庫情報共有サイトです。<br />所属事務所・レコード会社・各販売店等とは無関係です。</p>
          <p>King &amp; Prince 在庫チェッカー</p>
          <p><a href="/privacy">プライバシーについて</a></p>
          <small>© 2026 KP Music Data</small>
        </footer>
      </div>
    </main>
  );
}
