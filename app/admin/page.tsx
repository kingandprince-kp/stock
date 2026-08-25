"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/app/lib/supabase";

type InventoryReport = {
  id: number;
  store_id: number;
  product_id: number;
  quantity: number;
  comment: string | null;
  created_at: string;
};

type DeletionHistory = {
  id: number;
  original_report_id: number;
  store_id: number;
  product_id: number;
  quantity: number;
  comment: string | null;
  original_created_at: string;
  deleted_by: string;
  deleted_at: string;
  restored_at: string | null;
  restored_by: string | null;
  restored_report_id: number | null;
};

type StoreRequest = {
  id: number;
  prefecture: string;
  city: string | null;
  name: string;
  chain_name: string | null;
  comment: string | null;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  approved_store_id: number | null;
};

type BugReport = {
  id: number;
  issue_description: string;
  device_type: string;
  device_model: string | null;
  os_type: string;
  os_version: string | null;
  browser: string | null;
  browser_other: string | null;
  browser_version: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  supplemental_comment: string | null;
  page_path: string | null;
  created_at: string;
};

type Store = {
  id: number;
  name: string;
  chain_name: string | null;
  prefecture: string;
  city: string | null;
};

type Product = {
  id: number;
  name: string;
};

type SalesSummary = {
  id: number;
  today_sales: number;
  weekly_sales: number;
  total_sales: number;
  goal: number;
  updated_at: string;
};

type AdminTab =
  | "reports"
  | "deletions"
  | "requests"
  | "bugs"
  | "sales";

type RequestEdit = {
  requestId: number;
  prefecture: string;
  city: string;
  name: string;
  chainName: string;
  storeType: "physical" | "online";
  address: string;
  phone: string;
  businessHours: string;
  officialUrl: string;
  onlineUrl: string;
  oriconTarget: boolean;
  billboardStatus:
    | "target"
    | "check_store"
    | "not_target";
};

export default function AdminPage() {
  const [reports, setReports] =
    useState<InventoryReport[]>([]);

  const [deletions, setDeletions] =
    useState<DeletionHistory[]>([]);

  const [storeRequests, setStoreRequests] =
    useState<StoreRequest[]>([]);

  const [bugReports, setBugReports] =
    useState<BugReport[]>([]);

  const [stores, setStores] =
    useState<Store[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [salesData, setSalesData] =
    useState<SalesSummary | null>(null);

  const [todaySales, setTodaySales] =
    useState("");

  const [weeklySales, setWeeklySales] =
    useState("");

  const [totalSales, setTotalSales] =
    useState("");

  const [salesGoal, setSalesGoal] =
    useState("300000");

  const [activeTab, setActiveTab] =
    useState<AdminTab>("reports");

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [restoringId, setRestoringId] =
    useState<number | null>(null);

  const [salesUpdating, setSalesUpdating] =
    useState(false);

  const [requestProcessingId, setRequestProcessingId] =
    useState<number | null>(null);

  const [requestEdit, setRequestEdit] =
    useState<RequestEdit | null>(null);

  const [userEmail, setUserEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loggedIn, setLoggedIn] =
    useState(false);

  const [loginLoading, setLoginLoading] =
    useState(true);

  const [loginError, setLoginError] =
    useState("");

  // =========================================
  // 削除履歴
  // =========================================

  const loadDeletionHistory =
    useCallback(async () => {
      const { data, error } =
        await supabase.rpc(
          "get_inventory_report_deletions_admin"
        );

      if (error) {
        console.error(error);

        setErrorMessage(
          `削除履歴を取得できませんでした: ${error.message}`
        );

        return;
      }

      setDeletions(
        (data ?? []) as DeletionHistory[]
      );
    }, []);

  // =========================================
  // 店舗追加リクエスト
  // =========================================

  const loadStoreRequests =
    useCallback(async () => {
      const { data, error } =
        await supabase.rpc(
          "get_store_requests_admin"
        );

      if (error) {
        console.error(error);

        setErrorMessage(
          `店舗追加リクエストを取得できませんでした: ${error.message}`
        );

        return;
      }

      setStoreRequests(
        (data ?? []) as StoreRequest[]
      );
    }, []);

  // =========================================
  // 不具合報告
  // =========================================

  const loadBugReports =
    useCallback(async () => {
      const { data, error } = await supabase
        .from("bug_reports")
        .select(`
          id,
          issue_description,
          device_type,
          device_model,
          os_type,
          os_version,
          browser,
          browser_other,
          browser_version,
          image_url,
          image_urls,
          supplemental_comment,
          page_path,
          created_at
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        console.error(error);
        setErrorMessage(
          `不具合報告を取得できませんでした: ${error.message}`
        );
        return;
      }

      setBugReports((data ?? []) as BugReport[]);
    }, []);

  // =========================================
  // 売上
  // =========================================

  const loadSalesData =
    useCallback(async () => {
      const { data, error } =
        await supabase.rpc(
          "get_sales_summary"
        );

      if (error) {
        console.error(error);

        setErrorMessage(
          `売上データを取得できませんでした: ${error.message}`
        );

        return;
      }

      const latest =
        Array.isArray(data) &&
        data.length > 0
          ? (data[0] as SalesSummary)
          : null;

      setSalesData(latest);

      if (latest) {
        setTodaySales(
          String(latest.today_sales)
        );

        setWeeklySales(
          String(latest.weekly_sales)
        );

        setTotalSales(
          String(latest.total_sales)
        );

        setSalesGoal(
          String(latest.goal)
        );
      }
    }, []);

  // =========================================
  // 管理画面全体読み込み
  // =========================================

  const loadAdminData =
    useCallback(async () => {
      setLoading(true);
      setErrorMessage("");

      const [
        reportsResult,
        storesResult,
        productsResult,
      ] = await Promise.all([
        supabase
          .from("inventory_reports")
          .select(`
            id,
            store_id,
            product_id,
            quantity,
            comment,
            created_at
          `)
          .order("created_at", {
            ascending: false,
          })
          .limit(200),

        supabase
          .from("stores")
          .select(`
            id,
            name,
            chain_name,
            prefecture,
            city
          `),

        supabase
          .from("products")
          .select("id, name"),
      ]);

      if (reportsResult.error) {
        setErrorMessage(
          `投稿一覧を取得できませんでした: ${reportsResult.error.message}`
        );
        setLoading(false);
        return;
      }

      if (storesResult.error) {
        setErrorMessage(
          `店舗データを取得できませんでした: ${storesResult.error.message}`
        );
        setLoading(false);
        return;
      }

      if (productsResult.error) {
        setErrorMessage(
          `商品データを取得できませんでした: ${productsResult.error.message}`
        );
        setLoading(false);
        return;
      }

      setReports(
        (reportsResult.data ??
          []) as InventoryReport[]
      );

      setStores(
        (storesResult.data ??
          []) as Store[]
      );

      setProducts(
        (productsResult.data ??
          []) as Product[]
      );

      await Promise.all([
        loadDeletionHistory(),
        loadStoreRequests(),
        loadBugReports(),
        loadSalesData(),
      ]);

      setLoading(false);
    }, [
      loadDeletionHistory,
      loadStoreRequests,
      loadBugReports,
      loadSalesData,
    ]);

  // =========================================
  // ログイン状態
  // =========================================

  useEffect(() => {
    async function checkLogin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setLoggedIn(true);
        setUserEmail(user.email ?? "");
        await loadAdminData();
      }

      setLoginLoading(false);
    }

    checkLogin();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        async (_event, session) => {
          if (session?.user) {
            setLoggedIn(true);

            setUserEmail(
              session.user.email ?? ""
            );

            await loadAdminData();
          } else {
            setLoggedIn(false);
            setReports([]);
            setDeletions([]);
            setStoreRequests([]);
            setBugReports([]);
            setSalesData(null);
          }
        }
      );

    return () => {
      subscription.unsubscribe();
    };
  }, [loadAdminData]);

  async function handleLogin(
    event: React.FormEvent
  ) {
    event.preventDefault();
    setLoginError("");

    const { error } =
      await supabase.auth.signInWithPassword(
        {
          email: userEmail,
          password,
        }
      );

    if (error) {
      setLoginError(
        "メールアドレスまたはパスワードを確認してください。"
      );
      return;
    }

    setPassword("");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // =========================================
  // 在庫投稿削除
  // =========================================

  async function handleDelete(
    report: InventoryReport
  ) {
    const storeName =
      getStoreName(report.store_id);

    const productName =
      getProductName(report.product_id);

    const displayQuantity =
      report.quantity === 0
        ? "在庫なし"
        : `${report.quantity}枚`;

    const confirmed =
      window.confirm(
        `${storeName}\n${productName}\n${displayQuantity}\n\nこの投稿を削除しますか？`
      );

    if (!confirmed) return;

    setDeletingId(report.id);
    setMessage("");
    setErrorMessage("");

    const { error } =
      await supabase.rpc(
        "delete_inventory_report_admin",
        {
          p_report_id: report.id,
        }
      );

    if (error) {
      setErrorMessage(
        `削除できませんでした: ${error.message}`
      );

      setDeletingId(null);
      return;
    }

    setReports((current) =>
      current.filter(
        (item) =>
          item.id !== report.id
      )
    );

    await loadDeletionHistory();

    setMessage(
      "在庫投稿を削除しました。削除履歴から復元できます。"
    );

    setDeletingId(null);
  }

  // =========================================
  // 在庫投稿復元
  // =========================================

  async function handleRestore(
    deletion: DeletionHistory
  ) {
    if (deletion.restored_at) return;

    const storeName =
      getStoreName(deletion.store_id);

    const productName =
      getProductName(deletion.product_id);

    const displayQuantity =
      deletion.quantity === 0
        ? "在庫なし"
        : `${deletion.quantity}枚`;

    const confirmed =
      window.confirm(
        `${storeName}\n${productName}\n${displayQuantity}\n\nこの削除済み投稿を復元しますか？`
      );

    if (!confirmed) return;

    setRestoringId(deletion.id);
    setMessage("");
    setErrorMessage("");

    const { error } =
      await supabase.rpc(
        "restore_inventory_report_admin",
        {
          p_deletion_id:
            deletion.id,
        }
      );

    if (error) {
      setErrorMessage(
        `復元できませんでした: ${error.message}`
      );

      setRestoringId(null);
      return;
    }

    await loadAdminData();

    setMessage(
      "削除した投稿を復元しました。"
    );

    setRestoringId(null);
  }

  // =========================================
  // 店舗リクエスト編集開始
  // =========================================

  function startRequestEdit(
    request: StoreRequest
  ) {
    const online =
      request.prefecture ===
      "オンライン";

    setRequestEdit({
      requestId: request.id,

      prefecture: online
        ? "オンライン"
        : request.prefecture,

      city:
        request.city ?? "",

      name:
        request.name ?? "",

      chainName:
        request.chain_name ?? "",

      storeType: online
        ? "online"
        : "physical",

      address: "",
      phone: "",
      businessHours: "",
      officialUrl: "",
      onlineUrl: "",
      oriconTarget: false,
      billboardStatus:
        "check_store",
    });

    setMessage("");
    setErrorMessage("");
  }

  // =========================================
  // 店舗リクエスト承認
  // =========================================

  async function handleApproveRequest() {
    if (!requestEdit) return;

    if (
      requestEdit.name.trim() === ""
    ) {
      setErrorMessage(
        "店舗名を入力してください。"
      );
      return;
    }

    if (
      requestEdit.prefecture.trim() ===
      ""
    ) {
      setErrorMessage(
        "都道府県を入力してください。"
      );
      return;
    }

    const confirmed =
      window.confirm(
        `${requestEdit.chainName ? `${requestEdit.chainName} ` : ""}${requestEdit.name}\n\nこの内容で店舗を正式登録しますか？`
      );

    if (!confirmed) return;

    setRequestProcessingId(
      requestEdit.requestId
    );

    setMessage("");
    setErrorMessage("");

    const { error } =
      await supabase.rpc(
        "approve_store_request_admin",
        {
          p_request_id:
            requestEdit.requestId,

          p_prefecture:
            requestEdit.storeType ===
            "online"
              ? "オンライン"
              : requestEdit.prefecture,

          p_city:
            requestEdit.storeType ===
              "online" ||
            requestEdit.city.trim() ===
              ""
              ? null
              : requestEdit.city.trim(),

          p_name:
            requestEdit.name.trim(),

          p_chain_name:
            requestEdit.chainName.trim() ===
            ""
              ? null
              : requestEdit.chainName.trim(),

          p_store_type:
            requestEdit.storeType,

          p_address:
            requestEdit.address.trim() ===
            ""
              ? null
              : requestEdit.address.trim(),

          p_phone:
            requestEdit.phone.trim() ===
            ""
              ? null
              : requestEdit.phone.trim(),

          p_business_hours:
            requestEdit.businessHours.trim() ===
            ""
              ? null
              : requestEdit.businessHours.trim(),

          p_official_url:
            requestEdit.officialUrl.trim() ===
            ""
              ? null
              : requestEdit.officialUrl.trim(),

          p_online_url:
            requestEdit.onlineUrl.trim() ===
            ""
              ? null
              : requestEdit.onlineUrl.trim(),

          p_oricon_target:
            requestEdit.oriconTarget,

          p_billboard_status:
            requestEdit.billboardStatus,
        }
      );

    if (error) {
      console.error(error);

      setErrorMessage(
        `店舗を追加できませんでした: ${error.message}`
      );

      setRequestProcessingId(null);
      return;
    }

    setRequestEdit(null);

    await loadAdminData();

    setMessage(
      "店舗追加リクエストを承認し、storesに正式登録しました。"
    );

    setRequestProcessingId(null);
  }

  // =========================================
  // 店舗リクエスト却下
  // =========================================

  async function handleRejectRequest(
    request: StoreRequest
  ) {
    const confirmed =
      window.confirm(
        `${request.chain_name ? `${request.chain_name} ` : ""}${request.name}\n\nこの店舗追加リクエストを却下しますか？`
      );

    if (!confirmed) return;

    setRequestProcessingId(
      request.id
    );

    setMessage("");
    setErrorMessage("");

    const { error } =
      await supabase.rpc(
        "reject_store_request_admin",
        {
          p_request_id:
            request.id,
        }
      );

    if (error) {
      setErrorMessage(
        `却下できませんでした: ${error.message}`
      );

      setRequestProcessingId(null);
      return;
    }

    if (
      requestEdit?.requestId ===
      request.id
    ) {
      setRequestEdit(null);
    }

    await loadStoreRequests();

    setMessage(
      "店舗追加リクエストを却下しました。"
    );

    setRequestProcessingId(null);
  }

  // =========================================
  // 売上更新
  // =========================================

  async function handleSalesUpdate(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (
      todaySales.trim() === "" ||
      weeklySales.trim() === "" ||
      totalSales.trim() === "" ||
      salesGoal.trim() === ""
    ) {
      setErrorMessage(
        "売上・目標枚数をすべて入力してください。"
      );
      return;
    }

    const today =
      Number(todaySales);

    const week =
      Number(weeklySales);

    const total =
      Number(totalSales);

    const goal =
      Number(salesGoal);

    if (
      !Number.isInteger(today) ||
      today < 0
    ) {
      setErrorMessage(
        "本日の売上は0以上の整数で入力してください。"
      );
      return;
    }

    if (
      !Number.isInteger(week) ||
      week < 0
    ) {
      setErrorMessage(
        "今週の売上は0以上の整数で入力してください。"
      );
      return;
    }

    if (
      !Number.isInteger(total) ||
      total < 0
    ) {
      setErrorMessage(
        "累計売上は0以上の整数で入力してください。"
      );
      return;
    }

    if (
      !Number.isInteger(goal) ||
      goal <= 0
    ) {
      setErrorMessage(
        "目標枚数は1以上の整数で入力してください。"
      );
      return;
    }

    const confirmed =
      window.confirm(
        `売上情報を更新します。\n\n本日: ${today.toLocaleString()}枚\n今週: ${week.toLocaleString()}枚\n累計: ${total.toLocaleString()}枚\n目標: ${goal.toLocaleString()}枚`
      );

    if (!confirmed) return;

    setSalesUpdating(true);

    const { error } =
      await supabase.rpc(
        "update_sales_admin",
        {
          p_today_sales: today,
          p_weekly_sales: week,
          p_total_sales: total,
          p_goal: goal,
        }
      );

    if (error) {
      setErrorMessage(
        `売上情報を更新できませんでした: ${error.message}`
      );

      setSalesUpdating(false);
      return;
    }

    await loadSalesData();

    setMessage(
      "売上情報を更新しました。"
    );

    setSalesUpdating(false);
  }

  function getStore(
    storeId: number
  ) {
    return stores.find(
      (store) =>
        store.id === storeId
    );
  }

  function getStoreName(
    storeId: number
  ) {
    const store =
      getStore(storeId);

    return store
      ? getDisplayStoreName(store)
      : "店舗不明";
  }

  function getProductName(
    productId: number
  ) {
    return (
      products.find(
        (product) =>
          product.id ===
          productId
      )?.name ?? "商品不明"
    );
  }

  function formatDate(
    dateString: string
  ) {
    return new Intl.DateTimeFormat(
      "ja-JP",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(
      new Date(dateString)
    );
  }

  const pendingRequestCount =
    useMemo(
      () =>
        storeRequests.filter(
          (request) =>
            request.status ===
            "pending"
        ).length,
      [storeRequests]
    );

  const bugReportCount = bugReports.length;

  if (loginLoading) {
    return (
      <main
        className="min-h-screen bg-[#f8f1f7] p-6"
        style={{
          fontFamily:
            '"Meiryo", "メイリオ", sans-serif',
        }}
      >
        読み込み中…
      </main>
    );
  }

  if (!loggedIn) {
    return (
      <main
        className="min-h-screen bg-[#f8f1f7] p-4 md:p-8"
        style={{
          fontFamily:
            '"Meiryo", "メイリオ", sans-serif',
        }}
      >
        <div className="mx-auto max-w-md">
          <section className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
            <div className="text-sm font-bold tracking-[0.12em] text-[#9b6c91]">
              ADMIN
            </div>

            <h1 className="mt-2 text-3xl font-bold">
              管理者ログイン
            </h1>

            <form
              onSubmit={handleLogin}
              className="mt-6 space-y-4"
            >
              <label className="block">
                <div className="mb-2 font-bold">
                  メールアドレス
                </div>

                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(event) =>
                    setUserEmail(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-[#d9c9d8] p-3"
                />
              </label>

              <label className="block">
                <div className="mb-2 font-bold">
                  パスワード
                </div>

                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-[#d9c9d8] p-3"
                />
              </label>

              {loginError && (
                <div className="rounded-xl bg-red-50 p-3 font-bold text-red-700">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-[#211d21] px-5 py-3 font-bold text-white"
              >
                ログイン
              </button>
            </form>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-[#f8f1f7] p-4 md:p-8"
      style={{
        fontFamily:
          '"Meiryo", "メイリオ", sans-serif',
      }}
    >
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl bg-white p-5 shadow-sm md:p-8">

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-bold tracking-[0.12em] text-[#9b6c91]">
                ADMIN
              </div>

              <h1 className="mt-1 text-3xl font-bold">
                在庫チェッカー 管理
              </h1>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-500">
                {userEmail}
              </div>

              <button
                onClick={handleLogout}
                className="mt-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold"
              >
                ログアウト
              </button>
            </div>
          </div>

          {/* 5タブ */}
          <div className="mt-7 grid grid-cols-2 gap-2 rounded-2xl bg-[#f5edf4] p-2 md:grid-cols-5">
            <AdminTabButton
              active={
                activeTab === "reports"
              }
              onClick={() =>
                setActiveTab("reports")
              }
            >
              📋 投稿一覧
            </AdminTabButton>

            <AdminTabButton
              active={
                activeTab ===
                "deletions"
              }
              onClick={() =>
                setActiveTab(
                  "deletions"
                )
              }
            >
              🗑️ 削除履歴
            </AdminTabButton>

            <AdminTabButton
              active={
                activeTab ===
                "requests"
              }
              onClick={() =>
                setActiveTab(
                  "requests"
                )
              }
            >
              🏪 店舗追加
              {pendingRequestCount >
                0 && (
                <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                  {
                    pendingRequestCount
                  }
                </span>
              )}
            </AdminTabButton>

            <AdminTabButton
              active={
                activeTab === "bugs"
              }
              onClick={() =>
                setActiveTab("bugs")
              }
            >
              🐞 不具合報告
              {bugReportCount > 0 && (
                <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                  {bugReportCount}
                </span>
              )}
            </AdminTabButton>

            <AdminTabButton
              active={
                activeTab === "sales"
              }
              onClick={() =>
                setActiveTab("sales")
              }
            >
              📈 売上管理
            </AdminTabButton>
          </div>

          {message && (
            <div className="mt-5 rounded-xl bg-green-50 p-4 font-bold text-green-700">
              {message}
            </div>
          )}

          {errorMessage && (
            <div className="mt-5 rounded-xl bg-red-50 p-4 font-bold text-red-700">
              {errorMessage}
            </div>
          )}

          <button
            onClick={loadAdminData}
            className="mt-5 rounded-xl bg-[#f0dfec] px-5 py-3 font-bold text-[#6d4966]"
          >
            ↻ 最新の状態に更新
          </button>

          {loading ? (
            <div className="mt-8">
              読み込み中…
            </div>
          ) : activeTab ===
            "reports" ? (
            <ReportsTab
              reports={reports}
              stores={stores}
              products={products}
              deletingId={
                deletingId
              }
              onDelete={
                handleDelete
              }
              formatDate={
                formatDate
              }
            />
          ) : activeTab ===
            "deletions" ? (
            <DeletionHistoryTab
              deletions={deletions}
              stores={stores}
              products={products}
              restoringId={
                restoringId
              }
              onRestore={
                handleRestore
              }
              formatDate={
                formatDate
              }
            />
          ) : activeTab ===
            "requests" ? (
            <StoreRequestsTab
              requests={
                storeRequests
              }
              edit={requestEdit}
              setEdit={
                setRequestEdit
              }
              startEdit={
                startRequestEdit
              }
              onApprove={
                handleApproveRequest
              }
              onReject={
                handleRejectRequest
              }
              processingId={
                requestProcessingId
              }
              formatDate={
                formatDate
              }
            />
          ) : activeTab ===
            "bugs" ? (
            <BugReportsTab
              reports={bugReports}
              formatDate={formatDate}
            />
          ) : (
            <SalesTab
              salesData={salesData}
              todaySales={
                todaySales
              }
              weeklySales={
                weeklySales
              }
              totalSales={
                totalSales
              }
              salesGoal={
                salesGoal
              }
              setTodaySales={
                setTodaySales
              }
              setWeeklySales={
                setWeeklySales
              }
              setTotalSales={
                setTotalSales
              }
              setSalesGoal={
                setSalesGoal
              }
              salesUpdating={
                salesUpdating
              }
              onSubmit={
                handleSalesUpdate
              }
              formatDate={
                formatDate
              }
            />
          )}
        </section>
      </div>
    </main>
  );
}

function BugReportsTab({
  reports,
  formatDate,
}: {
  reports: BugReport[];
  formatDate: (value: string) => string;
}) {
  const [imageUrls, setImageUrls] =
    useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadImageUrls() {
      const paths = Array.from(
        new Set(
          reports.flatMap((report) => {
            if (
              Array.isArray(report.image_urls) &&
              report.image_urls.length > 0
            ) {
              return report.image_urls;
            }

            return report.image_url
              ? [report.image_url]
              : [];
          })
        )
      );

      if (paths.length === 0) {
        setImageUrls({});
        return;
      }

      const next: Record<string, string> = {};

      await Promise.all(
        paths.map(async (path) => {
          const { data, error } =
            await supabase.storage
              .from("bug-report-images")
              .createSignedUrl(path, 60 * 60);

          if (!error && data?.signedUrl) {
            next[path] = data.signedUrl;
          }
        })
      );

      if (!cancelled) {
        setImageUrls(next);
      }
    }

    loadImageUrls();

    return () => {
      cancelled = true;
    };
  }, [reports]);

  if (reports.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
        不具合報告はありません。
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-5">
        <h2 className="text-2xl font-bold">
          🐞 不具合報告
        </h2>
        <p className="mt-2 text-gray-500">
          本番サイトの不具合報告フォームから届いた内容です。
        </p>
      </div>

      <div className="space-y-5">
        {reports.map((report) => {
          const paths =
            Array.isArray(report.image_urls) &&
            report.image_urls.length > 0
              ? report.image_urls
              : report.image_url
                ? [report.image_url]
                : [];

          return (
            <article
              key={report.id}
              className="rounded-2xl border border-[#eaddea] bg-[#fcf9fc] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-[#9b6c91]">
                    報告 #{report.id}
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    {formatDate(report.created_at)}
                  </div>
                </div>

                {report.page_path && (
                  <span className="rounded-full bg-[#f0dfec] px-3 py-1 text-xs font-bold text-[#6d4966]">
                    {report.page_path}
                  </span>
                )}
              </div>

              <div className="mt-4 rounded-xl bg-white p-4">
                <div className="text-sm font-bold text-gray-500">
                  不具合内容
                </div>
                <div className="mt-2 whitespace-pre-wrap text-base leading-7">
                  {report.issue_description}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <BugInfo
                  label="端末種類"
                  value={report.device_type}
                />
                <BugInfo
                  label="機種名"
                  value={report.device_model}
                />
                <BugInfo
                  label="OS"
                  value={[
                    report.os_type,
                    report.os_version,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
                <BugInfo
                  label="ブラウザ"
                  value={[
                    report.browser,
                    report.browser_version,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              </div>

              {report.supplemental_comment && (
                <div className="mt-4 rounded-xl bg-white p-4">
                  <div className="text-sm font-bold text-gray-500">
                    補足
                  </div>
                  <div className="mt-2 whitespace-pre-wrap">
                    {report.supplemental_comment}
                  </div>
                </div>
              )}

              {paths.length > 0 && (
                <div className="mt-5">
                  <div className="mb-3 font-bold">
                    📷 添付画像 ({paths.length}枚)
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {paths.map((path, index) => {
                      const url = imageUrls[path];

                      return url ? (
                        <a
                          key={path}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-xl border border-[#eaddea] bg-white"
                        >
                          <img
                            src={url}
                            alt={`不具合報告 ${report.id} 添付画像 ${index + 1}`}
                            className="h-56 w-full object-contain"
                          />
                        </a>
                      ) : (
                        <div
                          key={path}
                          className="flex h-32 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-3 text-center text-sm text-gray-500"
                        >
                          画像URLを取得中…
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function BugInfo({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-xl bg-white p-3">
      <div className="text-xs font-bold text-gray-500">
        {label}
      </div>
      <div className="mt-1 font-bold">
        {value || "情報なし"}
      </div>
    </div>
  );
}

function StoreRequestsTab({
  requests,
  edit,
  setEdit,
  startEdit,
  onApprove,
  onReject,
  processingId,
  formatDate,
}: {
  requests: StoreRequest[];
  edit: RequestEdit | null;
  setEdit: React.Dispatch<
    React.SetStateAction<RequestEdit | null>
  >;
  startEdit: (
    request: StoreRequest
  ) => void;
  onApprove: () => void;
  onReject: (
    request: StoreRequest
  ) => void;
  processingId: number | null;
  formatDate: (
    value: string
  ) => string;
}) {
  return (
    <div className="mt-6">
      <div className="mb-5">
        <h2 className="text-2xl font-bold">
          🏪 店舗追加リクエスト
        </h2>

        <p className="mt-2 text-gray-500">
          ユーザーから届いた店舗情報を確認・修正してから登録します。
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
          店舗追加リクエストはありません。
        </div>
      ) : (
        <div className="space-y-5">
          {requests.map(
            (request) => {
              const pending =
                request.status ===
                "pending";

              return (
                <article
                  key={request.id}
                  className="rounded-2xl border border-[#eaddea] bg-[#fcf9fc] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xl font-bold">
                          {request.chain_name
                            ? `${request.chain_name} `
                            : ""}
                          {request.name}
                        </div>

                        <RequestStatus
                          status={
                            request.status
                          }
                        />
                      </div>

                      <div className="mt-2 text-sm text-gray-600">
                        📍{" "}
                        {
                          request.prefecture
                        }
                        {request.city
                          ? ` ${request.city}`
                          : ""}
                      </div>

                      <div className="mt-1 text-sm text-gray-500">
                        申請日時:{" "}
                        {formatDate(
                          request.requested_at
                        )}
                      </div>

                      {request.comment && (
                        <div className="mt-3 rounded-xl bg-white p-3">
                          💬{" "}
                          {
                            request.comment
                          }
                        </div>
                      )}
                    </div>

                    {pending && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            startEdit(
                              request
                            )
                          }
                          className="rounded-xl bg-[#6f4b89] px-4 py-2.5 font-bold text-white"
                        >
                          内容を確認・編集
                        </button>

                        <button
                          type="button"
                          disabled={
                            processingId ===
                            request.id
                          }
                          onClick={() =>
                            onReject(
                              request
                            )
                          }
                          className="rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white disabled:opacity-50"
                        >
                          却下
                        </button>
                      </div>
                    )}
                  </div>

                  {edit?.requestId ===
                    request.id && (
                    <div className="mt-6 border-t border-[#eaddea] pt-6">
                      <h3 className="text-xl font-bold">
                        登録内容を確認
                      </h3>

                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <AdminInput
                          label="チェーン名"
                          value={
                            edit.chainName
                          }
                          onChange={(
                            value
                          ) =>
                            setEdit({
                              ...edit,
                              chainName:
                                value,
                            })
                          }
                        />

                        <AdminInput
                          label="店舗名"
                          value={
                            edit.name
                          }
                          onChange={(
                            value
                          ) =>
                            setEdit({
                              ...edit,
                              name: value,
                            })
                          }
                        />

                        <label className="block">
                          <div className="mb-2 font-bold">
                            店舗種別
                          </div>

                          <select
                            value={
                              edit.storeType
                            }
                            onChange={(
                              event
                            ) => {
                              const type =
                                event
                                  .target
                                  .value as
                                  | "physical"
                                  | "online";

                              setEdit({
                                ...edit,
                                storeType:
                                  type,
                                prefecture:
                                  type ===
                                  "online"
                                    ? "オンライン"
                                    : edit.prefecture ===
                                        "オンライン"
                                      ? ""
                                      : edit.prefecture,
                              });
                            }}
                            className="w-full rounded-xl border border-[#d9c9d8] bg-white p-3"
                          >
                            <option value="physical">
                              実店舗
                            </option>
                            <option value="online">
                              オンライン
                            </option>
                          </select>
                        </label>

                        <AdminInput
                          label="都道府県"
                          value={
                            edit.prefecture
                          }
                          disabled={
                            edit.storeType ===
                            "online"
                          }
                          onChange={(
                            value
                          ) =>
                            setEdit({
                              ...edit,
                              prefecture:
                                value,
                            })
                          }
                        />

                        {edit.storeType ===
                          "physical" && (
                          <AdminInput
                            label="市区町村"
                            value={
                              edit.city
                            }
                            onChange={(
                              value
                            ) =>
                              setEdit({
                                ...edit,
                                city: value,
                              })
                            }
                          />
                        )}

                        <AdminInput
                          label="住所"
                          value={
                            edit.address
                          }
                          onChange={(
                            value
                          ) =>
                            setEdit({
                              ...edit,
                              address:
                                value,
                            })
                          }
                        />

                        <AdminInput
                          label="電話番号"
                          value={
                            edit.phone
                          }
                          onChange={(
                            value
                          ) =>
                            setEdit({
                              ...edit,
                              phone: value,
                            })
                          }
                        />

                        <AdminInput
                          label="営業時間"
                          placeholder="例: 10:00～21:00"
                          value={
                            edit.businessHours
                          }
                          onChange={(
                            value
                          ) =>
                            setEdit({
                              ...edit,
                              businessHours:
                                value,
                            })
                          }
                        />

                        <AdminInput
                          label="公式店舗URL"
                          value={
                            edit.officialUrl
                          }
                          onChange={(
                            value
                          ) =>
                            setEdit({
                              ...edit,
                              officialUrl:
                                value,
                            })
                          }
                        />

                        <AdminInput
                          label="オンラインURL"
                          value={
                            edit.onlineUrl
                          }
                          onChange={(
                            value
                          ) =>
                            setEdit({
                              ...edit,
                              onlineUrl:
                                value,
                            })
                          }
                        />

                        <label className="block">
                          <div className="mb-2 font-bold">
                            オリコン
                          </div>

                          <select
                            value={
                              edit.oriconTarget
                                ? "true"
                                : "false"
                            }
                            onChange={(
                              event
                            ) =>
                              setEdit({
                                ...edit,
                                oriconTarget:
                                  event
                                    .target
                                    .value ===
                                  "true",
                              })
                            }
                            className="w-full rounded-xl border border-[#d9c9d8] bg-white p-3"
                          >
                            <option value="false">
                              対象外
                            </option>
                            <option value="true">
                              集計対象
                            </option>
                          </select>
                        </label>

                        <label className="block">
                          <div className="mb-2 font-bold">
                            Billboard
                          </div>

                          <select
                            value={
                              edit.billboardStatus
                            }
                            onChange={(
                              event
                            ) =>
                              setEdit({
                                ...edit,
                                billboardStatus:
                                  event
                                    .target
                                    .value as RequestEdit["billboardStatus"],
                              })
                            }
                            className="w-full rounded-xl border border-[#d9c9d8] bg-white p-3"
                          >
                            <option value="target">
                              集計対象
                            </option>

                            <option value="check_store">
                              要確認
                            </option>

                            <option value="not_target">
                              対象外
                            </option>
                          </select>
                        </label>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={
                            processingId ===
                            request.id
                          }
                          onClick={
                            onApprove
                          }
                          className="rounded-xl bg-[#211d21] px-6 py-3 font-bold text-white disabled:opacity-50"
                        >
                          {processingId ===
                          request.id
                            ? "登録中…"
                            : "この内容で承認・店舗登録"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setEdit(null)
                          }
                          className="rounded-xl border border-gray-300 px-6 py-3 font-bold"
                        >
                          編集を閉じる
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

function RequestStatus({
  status,
}: {
  status: StoreRequest["status"];
}) {
  if (status === "approved") {
    return (
      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
        承認済み
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-bold text-gray-600">
        却下
      </span>
    );
  }

  return (
    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
      未処理
    </span>
  );
}

function AdminInput({
  label,
  value,
  onChange,
  placeholder = "",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-2 font-bold">
        {label}
      </div>

      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-xl border border-[#d9c9d8] bg-white p-3 disabled:bg-gray-100"
      />
    </label>
  );
}

function AdminTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-3 font-bold transition ${
        active
          ? "bg-[#211d21] text-white shadow-sm"
          : "text-[#715f6e]"
      }`}
    >
      {children}
    </button>
  );
}

function ReportsTab({
  reports,
  stores,
  products,
  deletingId,
  onDelete,
  formatDate,
}: {
  reports: InventoryReport[];
  stores: Store[];
  products: Product[];
  deletingId: number | null;
  onDelete: (
    report: InventoryReport
  ) => void;
  formatDate: (
    value: string
  ) => string;
}) {
  if (reports.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
        在庫投稿はありません。
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {reports.map((report) => {
        const store =
          stores.find(
            (item) =>
              item.id ===
              report.store_id
          );

        const product =
          products.find(
            (item) =>
              item.id ===
              report.product_id
          );

        return (
          <article
            key={report.id}
            className="rounded-2xl border border-[#eaddea] bg-[#fcf9fc] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <div className="text-lg font-bold">
                  {store
                    ? getDisplayStoreName(
                        store
                      )
                    : "店舗不明"}
                </div>

                <div className="mt-3">
                  {product?.name ??
                    "商品不明"}
                </div>

                <div className="mt-1 font-bold text-[#b95489]">
                  {report.quantity ===
                  0
                    ? "在庫なし"
                    : `${report.quantity}枚`}
                </div>

                <div className="mt-1 text-sm text-gray-500">
                  {formatDate(
                    report.created_at
                  )}
                </div>

                {report.comment && (
                  <div className="mt-3 rounded-xl bg-white p-3">
                    💬{" "}
                    {report.comment}
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={
                  deletingId ===
                  report.id
                }
                onClick={() =>
                  onDelete(report)
                }
                className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white disabled:opacity-50"
              >
                削除
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function DeletionHistoryTab({
  deletions,
  stores,
  products,
  restoringId,
  onRestore,
  formatDate,
}: {
  deletions: DeletionHistory[];
  stores: Store[];
  products: Product[];
  restoringId: number | null;
  onRestore: (
    deletion: DeletionHistory
  ) => void;
  formatDate: (
    value: string
  ) => string;
}) {
  return (
    <div className="mt-6 space-y-4">
      {deletions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
          削除履歴はありません。
        </div>
      )}

      {deletions.map(
        (deletion) => {
          const store =
            stores.find(
              (item) =>
                item.id ===
                deletion.store_id
            );

          const product =
            products.find(
              (item) =>
                item.id ===
                deletion.product_id
            );

          const restored =
            Boolean(
              deletion.restored_at
            );

          return (
            <article
              key={deletion.id}
              className="rounded-2xl border border-[#eaddea] bg-[#fcf9fc] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <div className="text-lg font-bold">
                    {store
                      ? getDisplayStoreName(
                          store
                        )
                      : "店舗不明"}
                  </div>

                  <div className="mt-2">
                    {product?.name ??
                      "商品不明"}
                  </div>

                  <div className="mt-1 font-bold">
                    {deletion.quantity ===
                    0
                      ? "在庫なし"
                      : `${deletion.quantity}枚`}
                  </div>

                  <div className="mt-2 text-sm text-gray-500">
                    削除:{" "}
                    {formatDate(
                      deletion.deleted_at
                    )}
                  </div>

                  {restored && (
                    <div className="mt-1 text-sm font-bold text-green-700">
                      復元済み
                    </div>
                  )}
                </div>

                {!restored && (
                  <button
                    type="button"
                    disabled={
                      restoringId ===
                      deletion.id
                    }
                    onClick={() =>
                      onRestore(
                        deletion
                      )
                    }
                    className="rounded-xl bg-[#6f4b89] px-5 py-3 font-bold text-white disabled:opacity-50"
                  >
                    復元
                  </button>
                )}
              </div>
            </article>
          );
        }
      )}
    </div>
  );
}

function SalesTab({
  salesData,
  todaySales,
  weeklySales,
  totalSales,
  salesGoal,
  setTodaySales,
  setWeeklySales,
  setTotalSales,
  setSalesGoal,
  salesUpdating,
  onSubmit,
  formatDate,
}: {
  salesData: SalesSummary | null;
  todaySales: string;
  weeklySales: string;
  totalSales: string;
  salesGoal: string;
  setTodaySales: (
    value: string
  ) => void;
  setWeeklySales: (
    value: string
  ) => void;
  setTotalSales: (
    value: string
  ) => void;
  setSalesGoal: (
    value: string
  ) => void;
  salesUpdating: boolean;
  onSubmit: (
    event: React.FormEvent
  ) => void;
  formatDate: (
    value: string
  ) => string;
}) {
  return (
    <div className="mt-6 rounded-3xl border border-[#eaddea] bg-[#fcf9fc] p-5 md:p-7">
      <h2 className="text-2xl font-bold">
        📈 売上情報
      </h2>

      {salesData && (
        <div className="mt-2 text-sm text-gray-500">
          最終更新:{" "}
          {formatDate(
            salesData.updated_at
          )}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="mt-6"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <SalesInput
            label="📊 本日の売上"
            value={todaySales}
            onChange={
              setTodaySales
            }
          />

          <SalesInput
            label="📅 今週の売上"
            value={weeklySales}
            onChange={
              setWeeklySales
            }
          />

          <SalesInput
            label="👑 累計売上"
            value={totalSales}
            onChange={
              setTotalSales
            }
          />

          <SalesInput
            label="🎯 目標枚数"
            value={salesGoal}
            onChange={
              setSalesGoal
            }
          />
        </div>

        <button
          type="submit"
          disabled={
            salesUpdating
          }
          className="mt-6 rounded-xl bg-[#211d21] px-7 py-3.5 font-bold text-white disabled:opacity-50"
        >
          {salesUpdating
            ? "更新中…"
            : "売上情報を更新"}
        </button>
      </form>
    </div>
  );
}

function SalesInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
}) {
  return (
    <label className="block">
      <div className="mb-2 font-bold">
        {label}
      </div>

      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(event) => {
          const next =
            event.target.value;

          if (
            next === "" ||
            /^[0-9]+$/.test(next)
          ) {
            onChange(next);
          }
        }}
        className="w-full rounded-xl border border-[#d9c9d8] bg-white p-3 text-lg font-bold"
      />
    </label>
  );
}

function getDisplayStoreName(
  store: Store
) {
  const name =
    store.name.trim();

  const chain =
    (
      store.chain_name ??
      ""
    ).trim();

  if (!chain) return name;

  const normalizedName =
    normalizeStoreText(name);

  const normalizedChain =
    normalizeStoreText(chain);

  if (
    normalizedName.includes(
      normalizedChain
    )
  ) {
    return name;
  }

  return `${chain} ${name}`;
}

function normalizeStoreText(
  value: string
) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(
      /[・･\-‐-–—―_]/g,
      ""
    );
}