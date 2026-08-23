export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f9eef7] via-[#f2ebfa] to-[#fcf9fc] p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-[28px] border border-white/80 bg-white/90 p-6 text-center shadow-sm md:p-10">
          <div className="text-sm font-bold tracking-[0.14em] text-[#9b6c91]">
            King & Prince
          </div>

          <h1 className="mt-2 text-3xl font-bold text-[#1d191d] md:text-5xl">
            在庫チェッカー
          </h1>

          <p className="mt-4 text-sm leading-6 text-[#6f646d] md:text-base">
            作品を選択してください。
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <a
              href="/so-honey"
              className="block rounded-2xl border border-[#e4cfe0] bg-[#fffafd] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md md:p-6"
            >
              <div className="text-xs font-bold tracking-[0.12em] text-[#a26796]">
                EP
              </div>

              <div className="mt-1 text-2xl font-bold text-[#1d191d]">
                So Honey
              </div>

              <div className="mt-2 text-sm text-[#756b74]">
                在庫情報を見る →
              </div>
            </a>
          </div>

          <div className="mt-8 text-xs leading-5 text-[#8a8089]">
            今後の作品もここから追加できます。
          </div>
        </section>
      </div>
    </main>
  );
}