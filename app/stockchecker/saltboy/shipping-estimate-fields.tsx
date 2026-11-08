"use client";

import { useState } from "react";

const DAYS = Array.from({ length: 31 }, (_, index) => index);

export default function ShippingEstimateFields() {
  const [enabled, setEnabled] = useState(false);
  const [basis, setBasis] = useState("shipping");
  const [kind, setKind] = useState("range");
  const [source, setSource] = useState("product_page");

  return (
    <fieldset className="salt-shipping-fields">
      <legend>オンラインショップの発送・お届け目安</legend>
      <label className="salt-shipping-opt-in">
        <input type="checkbox" name="includeShipping" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        発送・お届け目安も投稿する (任意)
      </label>
      {enabled && <>
        <p>選んだ形態に同じ目安を添えます。案内が異なる形態は、別々に投稿してください。</p>
        <div className="salt-shipping-grid">
          <label>発送・お届けの区分
            <select name="shippingBasis" value={basis} onChange={(event) => {
              setBasis(event.target.value);
              if (event.target.value === "delivery" && kind === "range") setKind("date");
            }}>
              <option value="shipping">発送・出荷</option>
              <option value="delivery">お届け・到着</option>
            </select>
          </label>
          <label>表示されている目安
            <select name="shippingKind" value={kind} onChange={(event) => setKind(event.target.value)}>
              {basis === "shipping" && <option value="range">日数</option>}
              <option value="date">日付</option>
              <option value="other">その他</option>
            </select>
          </label>
        </div>
        {kind === "range" && <div className="salt-shipping-grid">
          <label>から<select name="shippingMinDays" defaultValue="0">
            {DAYS.map((day) => <option key={day} value={day}>{day ? `${day}日` : "当日"}</option>)}
          </select></label>
          <label>まで<select name="shippingMaxDays" defaultValue="1">
            {DAYS.map((day) => <option key={day} value={day}>{day ? `${day}日` : "当日"}</option>)}
          </select></label>
        </div>}
        {kind === "date" && <label>{basis === "shipping" ? "発送・出荷予定日" : "お届け・到着予定日"}
          <input name="shippingDate" type="date" required />
        </label>}
        {kind === "other" && <label>表示されている案内
          <input name="shippingWording" maxLength={200} required placeholder="例: 入荷次第発送" />
        </label>}
        <label>条件・補足 (任意)<input name="shippingCondition" maxLength={200} placeholder="例: 13時までの注文で当日発送" /></label>
        <label>確認場所<select name="shippingSource" value={source} onChange={(event) => setSource(event.target.value)}>
          <option value="product_page">商品ページ</option><option value="cart_order">カート・注文画面</option>
          <option value="email">メール</option><option value="other">その他</option>
        </select></label>
        {source === "other" && <label>確認場所の詳細<input name="shippingSourceDetail" maxLength={100} required /></label>}
        <p>注文時刻や営業日などの条件は、サイトの表記に沿って入力してください。ここに表示する目安は、初週への計上を保証するものではありません。</p>
      </>}
    </fieldset>
  );
}
