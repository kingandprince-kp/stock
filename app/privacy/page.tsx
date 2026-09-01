export default function PrivacyPage() {
  return (
    <main
      className="min-h-screen bg-[#f8f1f7] px-4 py-10"
      style={{
        fontFamily:
          '"Meiryo", "メイリオ", sans-serif',
      }}
    >
      <div className="mx-auto max-w-3xl">
        <section className="rounded-3xl bg-white p-6 shadow-sm md:p-10">
          <h1 className="text-lg font-bold text-[#211d21]">
            プライバシーについて
          </h1>

          <div className="mt-6 space-y-5 text-sm leading-6 text-[#4f454d]">
  <section>
    <h2 className="font-bold text-[#211d21]">
      アクセス情報の取得について
    </h2>

    <p className="mt-2">
      当サイトでは、不正投稿・連続投稿等の防止およびセキュリティ確保のため、在庫情報の投稿時にIPアドレス等のアクセス情報を取得する場合があります。これらの情報を、氏名・住所など個人を特定する目的で利用することはありません。
    </p>
  </section>

  <section>
    <h2 className="font-bold text-[#211d21]">
      利用目的
    </h2>

    <p className="mt-2">
      取得した情報は、不正利用の検知・防止、投稿状況の確認、セキュリティ上の問題が発生した際の調査・対応のためにのみ利用します。
    </p>
  </section>

  <section>
    <h2 className="font-bold text-[#211d21]">
      保存期間
    </h2>

    <p className="mt-2">
      取得したIPアドレスは、取得から180日を経過した後に削除します。
    </p>
    
  </section>

  <section>
    <h2 className="font-bold text-[#211d21]">
      情報の管理
    </h2>

    <p className="mt-2">
      取得した情報を第三者への提供や、利用者個人を特定する目的で利用することはありません。
    </p>
  </section>
</div>

          <a
  href="/so-honey"
  className="mt-6 inline-block rounded-lg bg-[#f0dfec] px-4 py-2 text-sm font-bold text-[#6d4966]"
>
  So Honey 在庫チェッカーに戻る
</a>
        </section>
      </div>
    </main>
  );
}