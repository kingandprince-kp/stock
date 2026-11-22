"use client";

import { useState } from "react";
import { MAX_SHIPPING_DAYS } from "./shipping-estimate";
import { RETAILER_SHIPPING_NOTES } from "./retailer-shipping-notes";

const DAYS = Array.from({ length: MAX_SHIPPING_DAYS + 1 }, (_, index) => index);

export default function ShippingEstimateFields({ prefix, storeId }: { prefix: string; storeId?: number }) {
  const [enabled, setEnabled] = useState(false);
  const [basis, setBasis] = useState("shipping");
  const [kind, setKind] = useState("range");
  const [source, setSource] = useState("product_page");
  const guidance = storeId ? RETAILER_SHIPPING_NOTES[storeId] : undefined;

  return (
    <fieldset className="salt-shipping-fields">
      <legend>オンラインショップの発送・お届け目安</legend>
      <label className="salt-shipping-opt-in">
        <input type="checkbox" name={prefix + "includeShipping"} checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        発送・お届け目安も投稿する (任意)
      </label>
      {enabled && <>
        {guidance && <details><summary>このショップの発送・お届け案内</summary><p>{guidance.note}</p><p><a href={guidance.url} target="_blank" rel="noopener noreferrer">公式案内を確認</a> (2026/11/22確認)</p></details>}
        <div className="salt-shipping-grid">
          <label>発送・お届けの区分
            <select name={prefix + "shippingBasis"} value={basis} onChange={(event) => {
              setBasis(event.target.value);
            }}>
              <option value="shipping">発送・出荷</option>
              <option value="delivery">お届け・到着</option>
            </select>
          </label>
          <label>表示されている目安
            <select name={prefix + "shippingKind"} value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="range">日数</option>
              <option value="date">日付</option>
              <option value="date_range">日付の範囲</option>
              <option value="other">その他</option>
            </select>
          </label>
        </div>
        {kind === "range" && <div className="salt-shipping-grid">
          <label>から<select name={prefix + "shippingMinDays"} defaultValue="0">
            {DAYS.map((day) => <option key={day} value={day}>{day ? `${day}日` : "当日"}</option>)}
          </select></label>
          <label>まで<select name={prefix + "shippingMaxDays"} defaultValue="1">
            {DAYS.map((day) => <option key={day} value={day}>{day ? `${day}日` : "当日"}</option>)}
          </select></label>
        </div>}
        {kind === "range" && <p>
          ショップに表示されている日数を入力してください。たとえば日曜発送までが対象なら、水曜注文では4日後、金曜注文では2日後が日曜です。営業日表記や7日を超える案内は「その他」に入力してください。
        </p>}
        {kind === "date" && <label>{basis === "shipping" ? "発送・出荷予定日" : "お届け・到着予定日"}
          <input name={prefix + "shippingDate"} type="date" required />
          <span>時刻の表示がある場合のみ (任意)</span><input name={prefix + "shippingTime"} type="time" />
        </label>}
        {kind === "date_range" && <div className="salt-shipping-grid">
          <label>から<input name={prefix + "earliestDate"} type="date" required /><input name={prefix + "earliestTime"} type="time" aria-label="開始時刻 (任意)" /></label>
          <label>まで<input name={prefix + "latestDate"} type="date" required /><input name={prefix + "latestTime"} type="time" aria-label="終了時刻 (任意)" /></label>
        </div>}
        {kind === "range" && <details className="salt-shipping-context"><summary>日付への換算に必要な条件 (任意)</summary>
          <p>分かる場合だけ入力してください。注文日などの前提が不足する場合は「要確認」とします。</p>
          <label>何日から数える案内ですか?<select name={prefix + "anchor"}><option value="order">注文日</option><option value="payment">入金確認日</option><option value="ready">入荷・手配完了日</option></select></label>
          <div className="salt-shipping-grid"><label>起算日<input type="date" name={prefix + "referenceDate"} /></label><label>時刻 (任意)<input type="time" name={prefix + "referenceTime"} /></label></div>
          <label>日数の数え方<select name={prefix + "calendar"}><option value="unknown">不明</option><option value="calendar">暦日 (土日・祝日を含む)</option><option value="business">ショップの営業日</option></select></label>
          <label>商品の手配状況<select name={prefix + "orderType"}><option value="unknown">不明</option><option value="stock">通常の在庫商品</option><option value="preorder">予約商品</option><option value="backorder">取り寄せ商品</option></select></label>
        </details>}
        {kind === "other" && <label>表示されている案内
          <input name={prefix + "shippingWording"} maxLength={200} required placeholder="例: 入荷次第発送" />
        </label>}
        <label>条件・補足 (任意)<input name={prefix + "shippingCondition"} maxLength={200} placeholder="例: 13時までの注文で当日発送" /></label>
        <label><input type="checkbox" name={prefix + "conditionsMet"} />支払い・予約・同梱など、表示の前提条件を確認済み</label>
        <label>ショップに表示された文章 (任意)<input name={prefix + "originalText"} maxLength={300} placeholder="表示どおりに入力できます" /></label>
        <label>確認日時 (任意・日本時間)<input name={prefix + "confirmedAt"} type="datetime-local" /></label>
        <label>確認場所<select name={prefix + "shippingSource"} value={source} onChange={(event) => setSource(event.target.value)}>
          <option value="product_page">商品ページ</option><option value="cart_order">カート・注文画面</option>
          <option value="email">メール</option><option value="other">その他</option>
        </select></label>
        {source === "other" && <label>確認場所の詳細<input name={prefix + "shippingSourceDetail"} maxLength={100} required /></label>}
        <p>注文時刻や営業日などの条件は、サイトの表記に沿って入力してください。ここに表示する目安は、初週への計上を保証するものではありません。</p>
      </>}
    </fieldset>
  );
}
