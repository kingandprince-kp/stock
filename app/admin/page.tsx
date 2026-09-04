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
  stock_status: "in_stock" | "low_stock" | "backorder" | "sold_out" | null;
  comment: string | null;
  created_at: string;
};

type ReviewReport = InventoryReport & {
  review_status: "approved" | "pending" | "rejected";
  review_reason: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

type SecurityEvent = {
  id: number;
  report_id: number | null;
  event_type: string;
  ip_address: string | null;
  ip_hash: string | null;
  client_hash: string | null;
  store_id: number | null;
  product_id: number | null;
  quantity: number | null;
  stock_status: "in_stock" | "low_stock" | "backorder" | "sold_out" | null;
  comment: string | null;
  review_status: "approved" | "pending" | "rejected" | null;
  reason: string | null;
  created_at: string;
};

type DeletionHistory = {
  id: number;
  original_report_id: number;
  store_id: number;
  product_id: number;
  quantity: number;
  stock_status: "in_stock" | "low_stock" | "backorder" | "sold_out" | null;
  comment: string | null;
  original_created_at: string;
  deleted_by: string;
  deleted_at: string;
  restored_at: string | null;
  restored_by: string | null;
  restored_report_id: number | null;
};

type UserDeletionHistory = {
  id: number;
  original_report_id: number;
  store_id: number;
  product_id: number;
  quantity: number;
  stock_status: "in_stock" | "low_stock" | "backorder" | "sold_out" | null;
  comment: string | null;
  original_created_at: string;
  deleted_at: string;
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

type BillboardInfoRequest = {
  id: number;
  store_id: number;
  proposed_status: "target" | "not_target";
  evidence: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
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
  checked_at: string | null;
};

type StoreChangeHistory = {
  id: number;
  store_id: number;
  action_type: "UPDATE" | "DELETE";
  old_data: Record<string, unknown>;
  new_data: Record<string, unknown> | null;
  changed_by: string | null;
  changed_at: string;
};

type StoreInfoRequestAdmin = {
  id: number;
  store_id: number;
  store_name: string;
  request_type: "billboard" | "first_week_cutoff" | "online_product_first_week" | "other";
  product_id: number | null;
  product_name: string | null;
  proposed_billboard_status: "target" | "not_target" | null;
  proposed_first_week_status: "likely" | "check" | "unlikely" | null;
  detail: string;
  evidence: string | null;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  shipping_type: "relative" | "date" | "other" | null;
  shipping_min_days: number | null;
  shipping_max_days: number | null;
  shipping_date: string | null;
  confirmation_source: "product_page" | "cart_order" | "email" | "other" | null;
  confirmation_source_detail: string | null;
  updated_at: string;
};

type StoreInfoRequestChangeHistory = {
  id: number;
  request_id: number;
  old_data: Record<string, unknown>;
  new_data: Record<string, unknown>;
  changed_by: string | null;
  changed_at: string;
};

type StoreCommentAdmin = {
  id: number;
  store_id: number;
  store_name: string;
  body: string;
  created_at: string;
  is_deleted: boolean;
};

type Store = {
  id: number;
  name: string;
  chain_name: string | null;
  prefecture: string;
  city: string | null;
  store_type: string | null;
};

type EditableStore = {
  id: number;
  prefecture: string;
  city: string | null;
  name: string;
  chain_name: string | null;
  store_type: "physical" | "online";
  address: string | null;
  phone: string | null;
  business_hours: string | null;
  official_url: string | null;
  online_url: string | null;
  oricon_target: boolean;
  billboard_status:
    | "target"
    | "check_store"
    | "not_target";
};

type Product = {
  id: number;
  name: string;
};

type SalesSummary = {
  id: number;
  today_sales: number | null;
  weekly_sales: number | null;
  total_sales: number | null;
  goal: number;
  sales_date: string;
  week_start: string;
  week_end: string;
  updated_at: string;
};

type SalesDaily = {
  sales_date: string;
  sales: number | null;
  updated_at: string;
};

type AccessDaily = {
  access_date: string;
  path: string;
  views: number;
  unique_visitors: number;
};

type AdminTab =
  | "reports"
  | "review"
  | "security"
  | "deletions"
  | "user-deletions"
  | "store-history"
  | "store-comments"
  | "requests"
  | "store-info"
  | "bugs"
  | "access"
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

function formatInventoryValue(
  quantity: number | null,
  stockStatus: "in_stock" | "low_stock" | "backorder" | "sold_out" | null
) {
  if (stockStatus) {
    const labels = {
      in_stock: "○ 在庫あり",
      low_stock: "△ 残りわずか",
      backorder: "入荷待ち",
      sold_out: "× 売り切れ",
    } as const;
    return labels[stockStatus];
  }
  if (quantity === null) return "数量不明";
  return quantity === 0 ? "在庫なし" : `${quantity}枚`;
}

function formatSalesInputValue(
  value: number | null | undefined
) {
  return value == null ? "-" : String(value);
}

function parseDateKey(value: string) {
  const [year, month, day] =
    value.split("-").map(Number);

  return new Date(
    Date.UTC(year, month - 1, day)
  );
}

function addDaysToDateKey(
  value: string,
  days: number
) {
  const date = parseDateKey(value);

  date.setUTCDate(
    date.getUTCDate() + days
  );

  return [
    date.getUTCFullYear(),
    String(
      date.getUTCMonth() + 1
    ).padStart(2, "0"),
    String(
      date.getUTCDate()
    ).padStart(2, "0"),
  ].join("-");
}

function formatShortDateKey(
  value: string
) {
  const [, month, day] =
    value.split("-");

  return `${Number(month)}/${Number(day)}`;
}

function getWeekRangeFromDateKey(
  value: string
) {
  const date = parseDateKey(value);
  const daysFromMonday =
    (date.getUTCDay() + 6) % 7;

  date.setUTCDate(
    date.getUTCDate() - daysFromMonday
  );

  const start = [
    date.getUTCFullYear(),
    String(
      date.getUTCMonth() + 1
    ).padStart(2, "0"),
    String(
      date.getUTCDate()
    ).padStart(2, "0"),
  ].join("-");

  return {
    start,
    end: addDaysToDateKey(
      start,
      6
    ),
  };
}

export default function AdminPage() {
  const [reports, setReports] =
    useState<InventoryReport[]>([]);

  const [reviewReports, setReviewReports] =
    useState<ReviewReport[]>([]);

  const [securityEvents, setSecurityEvents] =
    useState<SecurityEvent[]>([]);

  const [reviewProcessingId, setReviewProcessingId] =
    useState<number | null>(null);

  const [deletions, setDeletions] =
    useState<DeletionHistory[]>([]);

  const [userDeletions, setUserDeletions] =
    useState<UserDeletionHistory[]>([]);

  const [storeChangeHistory, setStoreChangeHistory] =
    useState<StoreChangeHistory[]>([]);

  const [storeInfoRequests, setStoreInfoRequests] =
    useState<StoreInfoRequestAdmin[]>([]);
  const [storeInfoRequestHistory, setStoreInfoRequestHistory] =
    useState<StoreInfoRequestChangeHistory[]>([]);

  const [storeComments, setStoreComments] =
    useState<StoreCommentAdmin[]>([]);

  const [storeRequests, setStoreRequests] =
    useState<StoreRequest[]>([]);

  const [approvedStoreEdit, setApprovedStoreEdit] =
    useState<EditableStore | null>(null);

  const [approvedStoreEditLoading, setApprovedStoreEditLoading] =
    useState(false);

  const [approvedStoreSaving, setApprovedStoreSaving] =
    useState(false);

  const [billboardInfoRequests, setBillboardInfoRequests] =
    useState<BillboardInfoRequest[]>([]);

  const [billboardProcessingId, setBillboardProcessingId] =
    useState<number | null>(null);

  const [bugReports, setBugReports] =
    useState<BugReport[]>([]);

  const [bugCheckingId, setBugCheckingId] =
    useState<number | null>(null);

  const [stores, setStores] =
    useState<Store[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [salesData, setSalesData] =
    useState<SalesSummary | null>(null);

  const [salesDaily, setSalesDaily] =
    useState<SalesDaily[]>([]);

  const [salesDate, setSalesDate] =
    useState("2026-09-02");

  const [accessDaily, setAccessDaily] =
    useState<AccessDaily[]>([]);

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
  // 要確認投稿
  // =========================================

  const loadReviewReports =
    useCallback(async () => {
      const { data, error } =
        await supabase.rpc(
          "get_inventory_review_reports_admin"
        );

      if (error) {
        console.error(error);
        setErrorMessage(
          `要確認投稿を取得できませんでした: ${error.message}`
        );
        return;
      }

      setReviewReports(
        (data ?? []) as ReviewReport[]
      );
    }, []);

  // =========================================
  // セキュリティ履歴
  // =========================================

  const loadSecurityEvents =
    useCallback(async () => {
      const { data, error } =
        await supabase.rpc(
          "get_inventory_security_events_admin"
        );

      if (error) {
        console.error(error);
        setErrorMessage(
          `セキュリティ履歴を取得できませんでした: ${error.message}`
        );
        return;
      }

      setSecurityEvents(
        (data ?? []) as SecurityEvent[]
      );
    }, []);

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
  // ユーザー自己削除履歴
  // =========================================

  const loadUserDeletionHistory =
    useCallback(async () => {
      const { data, error } =
        await supabase.rpc(
          "get_inventory_user_deletions_admin"
        );

      if (error) {
        console.error(error);
        setErrorMessage(
          `ユーザー自己削除履歴を取得できませんでした: ${error.message}`
        );
        return;
      }

      setUserDeletions(
        (data ?? []) as UserDeletionHistory[]
      );
    }, []);

  // =========================================
  // 店舗変更・削除履歴
  // =========================================

  const loadStoreChangeHistory =
    useCallback(async () => {
      const { data, error } = await supabase.rpc(
        "get_store_change_history_admin"
      );

      if (error) {
        console.error(error);
        setErrorMessage(
          `店舗変更履歴を取得できませんでした: ${error.message}`
        );
        return;
      }

      setStoreChangeHistory(
        (data ?? []) as StoreChangeHistory[]
      );
    }, []);

  // =========================================
  // 店舗情報提供・店舗コメント
  // =========================================

  const loadStoreInfoRequests =
    useCallback(async () => {
      const { data, error } = await supabase.rpc(
        "get_store_info_requests_admin"
      );
      if (error) {
        setErrorMessage(
          `店舗情報提供を取得できませんでした: ${error.message}`
        );
        return;
      }
      setStoreInfoRequests((data ?? []) as StoreInfoRequestAdmin[]);
    }, []);

  const loadStoreInfoRequestHistory =
    useCallback(async () => {
      const { data, error } = await supabase.rpc(
        "get_store_info_request_change_history_admin"
      );
      if (error) {
        console.error(error);
        setErrorMessage(
          `店舗情報変更履歴を取得できませんでした: ${error.message}`
        );
        return;
      }
      setStoreInfoRequestHistory(
        (data ?? []) as StoreInfoRequestChangeHistory[]
      );
    }, []);

  const loadStoreComments =
    useCallback(async () => {
      const { data, error } = await supabase.rpc(
        "get_store_comments_admin"
      );
      if (error) {
        setErrorMessage(
          `店舗コメントを取得できませんでした: ${error.message}`
        );
        return;
      }
      setStoreComments((data ?? []) as StoreCommentAdmin[]);
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
  // Billboard情報提供
  // =========================================

  const loadBillboardInfoRequests =
    useCallback(async () => {
      const { data, error } = await supabase.rpc(
        "get_billboard_info_requests_admin"
      );

      if (error) {
        console.error(error);
        setErrorMessage(
          `Billboard情報提供を取得できませんでした: ${error.message}`
        );
        return;
      }

      setBillboardInfoRequests(
        (data ?? []) as BillboardInfoRequest[]
      );
    }, []);

  // =========================================
  // 不具合・要望
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
          created_at,
          checked_at
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        console.error(error);
        setErrorMessage(
          `不具合・要望を取得できませんでした: ${error.message}`
        );
        return;
      }

      setBugReports((data ?? []) as BugReport[]);
    }, []);

  // =========================================
  // 不具合・要望を確認済みにする
  // =========================================

  async function handleCheckBugReport(
    report: BugReport
  ) {
    const confirmed = window.confirm(
      `報告 #${report.id} を確認済みにしますか？`
    );

    if (!confirmed) return;

    setBugCheckingId(report.id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "mark_bug_report_checked_admin",
      {
        p_report_id: report.id,
      }
    );

    if (error) {
      console.error(error);
      setErrorMessage(
        `確認済みにできませんでした: ${error.message}`
      );
      setBugCheckingId(null);
      return;
    }

    await loadBugReports();

    setMessage(
      `不具合・要望 #${report.id} を確認済みにしました。`
    );
    setBugCheckingId(null);
  }

  // =========================================
  // 売上
  // =========================================

  const loadSalesData =
    useCallback(async () => {
      const [summaryResult, dailyResult] =
        await Promise.all([
          supabase.rpc(
            "get_sales_summary_v2"
          ),
          supabase.rpc(
            "get_sales_daily_admin"
          ),
        ]);

      if (summaryResult.error) {
        console.error(summaryResult.error);
        setErrorMessage(
          `売上データを取得できませんでした: ${summaryResult.error.message}`
        );
        return;
      }

      if (dailyResult.error) {
        console.error(dailyResult.error);
        setErrorMessage(
          `日別売上を取得できませんでした: ${dailyResult.error.message}`
        );
        return;
      }

      const latest =
        Array.isArray(
          summaryResult.data
        ) &&
        summaryResult.data.length > 0
          ? (summaryResult.data[0] as SalesSummary)
          : null;

      const daily =
        (dailyResult.data ?? []) as SalesDaily[];

      setSalesData(latest);
      setSalesDaily(daily);

      const nextDate =
        latest?.sales_date
          ? addDaysToDateKey(
              latest.sales_date,
              1
            )
          : "2026-09-01";

      setSalesDate(nextDate);

      const existingNext =
        daily.find(
          (item) =>
            item.sales_date === nextDate
        );

      setTodaySales(
        existingNext
          ? formatSalesInputValue(
              existingNext.sales
            )
          : "-"
      );

      if (latest) {
        setWeeklySales(
          formatSalesInputValue(
            latest.weekly_sales
          )
        );

        setTotalSales(
          formatSalesInputValue(
            latest.total_sales
          )
        );

        setSalesGoal(
          String(latest.goal)
        );
      }
    }, []);

  const loadAccessData =
    useCallback(async () => {
      const { data, error } = await supabase.rpc(
        "get_page_access_admin",
        { p_days: 30 }
      );

      if (error) {
        setErrorMessage(
          `アクセス数を取得できませんでした: ${error.message}`
        );
        return;
      }

      setAccessDaily((data ?? []) as AccessDaily[]);
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
            stock_status,
            comment,
            created_at
          `)
          .eq("review_status", "approved")
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
            city,
            store_type
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
        loadReviewReports(),
        loadSecurityEvents(),
        loadDeletionHistory(),
        loadUserDeletionHistory(),
        loadStoreChangeHistory(),
        loadStoreInfoRequests(),
        loadStoreInfoRequestHistory(),
        loadStoreComments(),
        loadStoreRequests(),
        loadBillboardInfoRequests(),
        loadBugReports(),
        loadAccessData(),
        loadSalesData(),
      ]);

      setLoading(false);
    }, [
      loadReviewReports,
      loadSecurityEvents,
      loadDeletionHistory,
      loadUserDeletionHistory,
      loadStoreChangeHistory,
      loadStoreInfoRequests,
      loadStoreInfoRequestHistory,
      loadStoreComments,
      loadStoreRequests,
      loadBillboardInfoRequests,
      loadBugReports,
      loadAccessData,
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
            setReviewReports([]);
            setSecurityEvents([]);
            setDeletions([]);
            setUserDeletions([]);
            setStoreChangeHistory([]);
            setStoreInfoRequests([]);
            setStoreInfoRequestHistory([]);
            setStoreComments([]);
            setStoreRequests([]);
            setBillboardInfoRequests([]);
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
  // 要確認投稿 承認・却下
  // =========================================

  async function handleApproveReview(
    report: ReviewReport
  ) {
    const confirmed = window.confirm(
      `${getStoreName(report.store_id)}\n${getProductName(report.product_id)}\n${report.quantity === 0 ? "在庫なし" : `${report.quantity}枚`}\n\nこの投稿を承認して公開しますか？`
    );

    if (!confirmed) return;

    setReviewProcessingId(report.id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "approve_inventory_report_admin",
      { p_report_id: report.id }
    );

    if (error) {
      setErrorMessage(
        `承認できませんでした: ${error.message}`
      );
      setReviewProcessingId(null);
      return;
    }

    await loadAdminData();
    setMessage(
      `要確認投稿 #${report.id} を承認しました。`
    );
    setReviewProcessingId(null);
  }

  async function handleRejectReview(
    report: ReviewReport
  ) {
    const confirmed = window.confirm(
      `${getStoreName(report.store_id)}\n${getProductName(report.product_id)}\n${report.quantity === 0 ? "在庫なし" : `${report.quantity}枚`}\n\nこの投稿を却下しますか？\n却下後も履歴には残ります。`
    );

    if (!confirmed) return;

    setReviewProcessingId(report.id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "reject_inventory_report_admin",
      { p_report_id: report.id }
    );

    if (error) {
      setErrorMessage(
        `却下できませんでした: ${error.message}`
      );
      setReviewProcessingId(null);
      return;
    }

    await Promise.all([
      loadReviewReports(),
      loadSecurityEvents(),
    ]);
    setMessage(
      `要確認投稿 #${report.id} を却下しました。`
    );
    setReviewProcessingId(null);
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
      formatInventoryValue(report.quantity, report.stock_status);

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
      formatInventoryValue(deletion.quantity, deletion.stock_status);

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
            ["", "なし", "無し", "なし。", "なしです"].includes(
              requestEdit.chainName.trim()
            )
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
  // 管理画面 一括処理
  // =========================================

  async function runBulkRpc(
    rpcName: string,
    params: Record<string, unknown>,
    successMessage: string
  ) {
    setMessage("");
    setErrorMessage("");
    const { error } = await supabase.rpc(rpcName, params);
    if (error) {
      setErrorMessage(`一括処理に失敗しました: ${error.message}`);
      return;
    }
    await loadAdminData();
    setMessage(successMessage);
  }

  async function handleBulkDeleteReports(ids: number[]) {
    if (!ids.length) return;
    if (!window.confirm(`選択した${ids.length}件の在庫投稿を削除します。\n削除履歴から復元できます。`)) return;
    await runBulkRpc("bulk_delete_inventory_reports_admin", { p_report_ids: ids }, `${ids.length}件の在庫投稿を削除しました。削除履歴から復元できます。`);
  }

  async function handleBulkReview(ids: number[], action: "approve" | "reject") {
    if (!ids.length) return;
    const label = action === "approve" ? "承認・公開" : "却下";
    if (!window.confirm(`選択した${ids.length}件を${label}しますか？`)) return;
    await runBulkRpc(action === "approve" ? "bulk_approve_inventory_reports_admin" : "bulk_reject_inventory_reports_admin", { p_report_ids: ids }, `${ids.length}件を${label}しました。`);
  }

  async function handleDeleteReviewHistory(ids: number[]) {
    if (!ids.length) return;
    if (!window.confirm(`選択した${ids.length}件の処理済み履歴を削除します。\nこの操作は元に戻せません。\n\n※承認済みの在庫投稿そのものは削除されません。`)) return;
    await runBulkRpc("bulk_delete_inventory_review_history_admin", { p_report_ids: ids }, `${ids.length}件の処理済み履歴を削除しました。`);
  }

  async function handleDeleteSecurityEvents(ids: number[]) {
    if (!ids.length) return;
    if (!window.confirm(`選択した${ids.length}件のセキュリティ履歴を完全に削除します。\nこの操作は元に戻せません。`)) return;
    await runBulkRpc("bulk_delete_security_events_admin", { p_event_ids: ids }, `${ids.length}件のセキュリティ履歴を削除しました。`);
  }

  async function handleBulkRestore(ids: number[]) {
    if (!ids.length) return;
    if (!window.confirm(`選択した${ids.length}件の削除済み投稿を復元しますか？`)) return;
    await runBulkRpc("bulk_restore_inventory_reports_admin", { p_deletion_ids: ids }, `${ids.length}件の削除済み投稿を復元しました。`);
  }

  async function handleDeleteDeletionHistory(ids: number[]) {
    if (!ids.length) return;
    if (!window.confirm(`選択した${ids.length}件の削除履歴を完全に削除します。\nこの操作は元に戻せません。\n未復元の履歴を削除すると、その履歴からは復元できなくなります。`)) return;
    await runBulkRpc("bulk_delete_inventory_deletion_history_admin", { p_deletion_ids: ids }, `${ids.length}件の削除履歴を完全に削除しました。`);
  }

  async function handleOpenApprovedStoreEdit(
    storeId: number
  ) {
    setMessage("");
    setErrorMessage("");
    setApprovedStoreEditLoading(true);

    const { data, error } =
      await supabase.rpc(
        "get_store_admin",
        { p_store_id: storeId }
      );

    setApprovedStoreEditLoading(false);

    if (error) {
      setErrorMessage(
        `登録店舗を取得できませんでした: ${error.message}`
      );
      return;
    }

    const row =
      Array.isArray(data) && data.length > 0
        ? (data[0] as EditableStore)
        : null;

    if (!row) {
      setErrorMessage(
        "登録店舗が見つかりませんでした。"
      );
      return;
    }

    setApprovedStoreEdit({
      ...row,
      store_type:
        row.store_type === "online"
          ? "online"
          : "physical",
      billboard_status:
        row.billboard_status === "target" ||
        row.billboard_status === "not_target"
          ? row.billboard_status
          : "check_store",
    });
  }

  async function handleSaveApprovedStore() {
    if (!approvedStoreEdit) return;

    if (!approvedStoreEdit.name.trim()) {
      setErrorMessage("店舗名は必須です。");
      return;
    }

    setApprovedStoreSaving(true);
    setMessage("");
    setErrorMessage("");

    const chain =
      approvedStoreEdit.chain_name?.trim() ?? "";

    const { error } =
      await supabase.rpc(
        "update_store_admin",
        {
          p_store_id: approvedStoreEdit.id,
          p_prefecture: approvedStoreEdit.prefecture,
          p_city: approvedStoreEdit.city,
          p_name: approvedStoreEdit.name,
          p_chain_name:
            ["", "なし", "無し", "なし。", "なしです"].includes(chain)
              ? null
              : chain,
          p_store_type: approvedStoreEdit.store_type,
          p_address: approvedStoreEdit.address,
          p_phone: approvedStoreEdit.phone,
          p_business_hours: approvedStoreEdit.business_hours,
          p_official_url: approvedStoreEdit.official_url,
          p_online_url: approvedStoreEdit.online_url,
          p_oricon_target: approvedStoreEdit.oricon_target,
          p_billboard_status: approvedStoreEdit.billboard_status,
        }
      );

    setApprovedStoreSaving(false);

    if (error) {
      setErrorMessage(
        `店舗情報を更新できませんでした: ${error.message}`
      );
      return;
    }

    setApprovedStoreEdit(null);

    // 店舗一覧を含む管理画面データを再取得。
    // loadAdminData 内で店舗変更履歴も再読込されます。
    await loadAdminData();

    setMessage(
      "登録店舗を更新しました。変更履歴にも記録されています。"
    );
  }

  async function handleDeleteStoreRequestHistory(ids: number[]) {
    if (!ids.length) return;
    if (!window.confirm(`選択した${ids.length}件の処理済み店舗リクエスト履歴を完全に削除します。\nこの操作は元に戻せません。`)) return;
    await runBulkRpc("bulk_delete_store_request_history_admin", { p_request_ids: ids }, `${ids.length}件の店舗リクエスト履歴を削除しました。`);
  }

  async function handleDeleteBillboardHistory(ids: number[]) {
    if (!ids.length) return;
    if (!window.confirm(`選択した${ids.length}件の処理済みBillboard情報履歴を完全に削除します。\nこの操作は元に戻せません。`)) return;
    await runBulkRpc("bulk_delete_billboard_info_history_admin", { p_request_ids: ids }, `${ids.length}件のBillboard情報履歴を削除しました。`);
  }

  async function handleBulkCheckBugReports(ids: number[]) {
    if (!ids.length) return;
    if (!window.confirm(`選択した${ids.length}件の不具合・要望を確認済みにしますか？`)) return;
    await runBulkRpc("bulk_mark_bug_reports_checked_admin", { p_report_ids: ids }, `${ids.length}件の不具合・要望を確認済みにしました。`);
  }

  async function handleDeleteBugReports(ids: number[]) {
    if (!ids.length) return;
    if (!window.confirm(`選択した${ids.length}件の不具合・要望を完全に削除します。\nこの操作は元に戻せません。`)) return;
    await runBulkRpc("bulk_delete_bug_reports_admin", { p_report_ids: ids }, `${ids.length}件の不具合・要望を削除しました。`);
  }

  // =========================================
  // オンライン初週判定・店舗コメント管理
  // =========================================

  async function handleApproveStoreInfoRequest(requestId: number) {
    if (!window.confirm("この店舗情報を承認して反映しますか?")) return;
    setMessage("");
    setErrorMessage("");
    const { error } = await supabase.rpc(
      "approve_store_info_request_admin",
      { p_request_id: requestId }
    );
    if (error) {
      setErrorMessage(`店舗情報を承認できませんでした: ${error.message}`);
      return;
    }
    await Promise.all([loadStoreInfoRequests(), loadAdminData()]);
    setMessage("店舗情報を承認しました。");
  }

  async function handleRejectStoreInfoRequest(requestId: number) {
    if (!window.confirm("この店舗情報を却下しますか?")) return;
    setMessage("");
    setErrorMessage("");
    const { error } = await supabase.rpc(
      "reject_store_info_request_admin",
      { p_request_id: requestId }
    );
    if (error) {
      setErrorMessage(`店舗情報を却下できませんでした: ${error.message}`);
      return;
    }
    await loadStoreInfoRequests();
    setMessage("店舗情報を却下しました。");
  }

  async function handleUpdateStoreInfoRequest(
    request: StoreInfoRequestAdmin,
    values: {
      productId: number | null;
      detail: string;
      evidence: string;
      shippingType: string | null;
      shippingMinDays: number | null;
      shippingMaxDays: number | null;
      shippingDate: string | null;
      confirmationSource: string | null;
      confirmationSourceDetail: string | null;
    }
  ) {
    setMessage("");
    setErrorMessage("");
    const { error } = await supabase.rpc(
      "update_store_info_request_admin_v2",
      {
        p_request_id: request.id,
        p_product_id: values.productId,
        p_detail: values.detail,
        p_evidence: values.evidence || null,
        p_shipping_type: values.shippingType,
        p_shipping_min_days: values.shippingMinDays,
        p_shipping_max_days: values.shippingMaxDays,
        p_shipping_date: values.shippingDate,
        p_confirmation_source: values.confirmationSource,
        p_confirmation_source_detail: values.confirmationSourceDetail,
      }
    );
    if (error) {
      setErrorMessage(`店舗情報を更新できませんでした: ${error.message}`);
      return;
    }
    await Promise.all([
      loadStoreInfoRequests(),
      loadStoreInfoRequestHistory(),
      loadAdminData(),
    ]);
    setMessage("店舗情報を更新しました。");
  }

  async function handleWithdrawStoreInfoRequest(requestId: number) {
    if (!window.confirm("この承認済み情報を公開から取り下げますか? 履歴は残ります。")) return;
    setMessage("");
    setErrorMessage("");
    const { error } = await supabase.rpc(
      "withdraw_store_info_request_admin",
      { p_request_id: requestId }
    );
    if (error) {
      setErrorMessage(`公開を取り下げられませんでした: ${error.message}`);
      return;
    }
    await Promise.all([
      loadStoreInfoRequests(),
      loadStoreInfoRequestHistory(),
      loadAdminData(),
    ]);
    setMessage("承認済み情報を公開から取り下げました。");
  }

  async function handleDeleteStoreInfoHistory(ids: number[]) {
    if (!ids.length) return;
    if (!window.confirm(`選択した${ids.length}件の処理済み店舗情報履歴を完全に削除します。
この操作は元に戻せません。`)) return;
    await runBulkRpc(
      "bulk_delete_store_info_request_history_admin",
      { p_request_ids: ids },
      `${ids.length}件の店舗情報履歴を削除しました。`
    );
  }

  async function handleDeleteStoreComment(commentId: number) {
    if (!window.confirm("この店舗コメントを非表示にしますか?")) return;
    const { error } = await supabase.rpc(
      "set_store_comment_deleted_admin",
      { p_comment_id: commentId, p_deleted: true }
    );
    if (error) {
      setErrorMessage(
        `コメントを非表示にできませんでした: ${error.message}`
      );
      return;
    }
    await loadStoreComments();
    setMessage("店舗コメントを非表示にしました。");
  }

  async function handleRestoreStoreComment(commentId: number) {
    const { error } = await supabase.rpc(
      "set_store_comment_deleted_admin",
      { p_comment_id: commentId, p_deleted: false }
    );
    if (error) {
      setErrorMessage(
        `コメントを復元できませんでした: ${error.message}`
      );
      return;
    }
    await loadStoreComments();
    setMessage("店舗コメントを復元しました。");
  }

  // =========================================
  // Billboard情報提供 承認・却下
  // =========================================

  async function handleApproveBillboardInfo(
    request: BillboardInfoRequest
  ) {
    const storeName = getStoreName(request.store_id);
    const statusLabel =
      request.proposed_status === "target"
        ? "Billboard 対象"
        : "Billboard 対象外";

    const confirmed = window.confirm(
      `${storeName}\n${statusLabel}\n\nソースを確認済みとして、この内容を店舗情報へ反映しますか？`
    );

    if (!confirmed) return;

    setBillboardProcessingId(request.id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "approve_billboard_info_request_admin",
      { p_request_id: request.id }
    );

    if (error) {
      setErrorMessage(
        `Billboard情報を承認できませんでした: ${error.message}`
      );
      setBillboardProcessingId(null);
      return;
    }

    await loadAdminData();
    setMessage(
      `${storeName} を「${statusLabel}」として反映しました。`
    );
    setBillboardProcessingId(null);
  }

  async function handleRejectBillboardInfo(
    request: BillboardInfoRequest
  ) {
    const confirmed = window.confirm(
      `${getStoreName(request.store_id)}\n\nこのBillboard情報提供を却下しますか？`
    );

    if (!confirmed) return;

    setBillboardProcessingId(request.id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "reject_billboard_info_request_admin",
      { p_request_id: request.id }
    );

    if (error) {
      setErrorMessage(
        `Billboard情報を却下できませんでした: ${error.message}`
      );
      setBillboardProcessingId(null);
      return;
    }

    await loadBillboardInfoRequests();
    setMessage("Billboard情報提供を却下しました。");
    setBillboardProcessingId(null);
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
      !salesDate ||
      todaySales.trim() === "" ||
      salesGoal.trim() === ""
    ) {
      setErrorMessage(
        "売上対象日・その日の売上・目標枚数を入力してください。"
      );
      return;
    }

    function parseSalesValue(
      value: string
    ): number | null | "invalid" {
      const trimmed =
        value.trim();

      if (
        trimmed === "-" ||
        trimmed === "－" ||
        trimmed === "ー" ||
        trimmed === "―"
      ) {
        return null;
      }

      const number =
        Number(trimmed);

      if (
        !Number.isInteger(number) ||
        number < 0
      ) {
        return "invalid";
      }

      return number;
    }

    const daySales =
      parseSalesValue(todaySales);

    const goal =
      Number(salesGoal);

    if (daySales === "invalid") {
      setErrorMessage(
        "売上は「-」または0以上の整数で入力してください。"
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

    const {
      data: previewData,
      error: previewError,
    } = await supabase.rpc(
      "preview_sales_day_admin",
      {
        p_sales_date:
          salesDate,
        p_sales:
          daySales,
      }
    );

    if (previewError) {
      setErrorMessage(
        `売上の自動計算に失敗しました: ${previewError.message}`
      );
      return;
    }

    const preview =
      Array.isArray(
        previewData
      ) &&
      previewData.length > 0
        ? previewData[0] as {
            week_start: string;
            week_end: string;
            weekly_sales: number | null;
            total_sales: number | null;
          }
        : null;

    if (!preview) {
      setErrorMessage(
        "売上の自動計算結果を取得できませんでした。"
      );
      return;
    }

    const displaySales = (
      value: number | null
    ) =>
      value === null
        ? "－"
        : `${value.toLocaleString()}枚`;

    const confirmed =
      window.confirm(
        `売上情報を更新します。\n\n対象日: ${formatShortDateKey(salesDate)}付\nその日の売上: ${displaySales(daySales)}\n週 (${formatShortDateKey(preview.week_start)}〜${formatShortDateKey(preview.week_end)}): ${displaySales(preview.weekly_sales)}\n累計: ${displaySales(preview.total_sales)}\n目標: ${goal.toLocaleString()}枚`
      );

    if (!confirmed) return;

    setSalesUpdating(true);

    const { error } =
      await supabase.rpc(
        "upsert_sales_day_admin",
        {
          p_sales_date:
            salesDate,
          p_sales:
            daySales,
          p_goal:
            goal,
        }
      );

    if (error) {
      setErrorMessage(
        `売上情報を更新できませんでした: ${error.message}`
      );
      setSalesUpdating(false);
      return;
    }

    const savedDate =
      salesDate;

    await loadSalesData();

    setMessage(
      `${formatShortDateKey(savedDate)}付の売上を反映しました。次の入力日は自動で${formatShortDateKey(addDaysToDateKey(savedDate, 1))}に進みます。`
    );

    setSalesUpdating(false);
  }

  function handleSalesDateChange(
    value: string
  ) {
    setSalesDate(value);

    const existing =
      salesDaily.find(
        (item) =>
          item.sales_date === value
      );

    setTodaySales(
      existing
        ? formatSalesInputValue(
            existing.sales
          )
        : "-"
    );
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

  const pendingReviewCount =
    useMemo(
      () =>
        reviewReports.filter(
          (report) =>
            report.review_status === "pending"
        ).length,
      [reviewReports]
    );

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

  const pendingBillboardInfoCount =
    useMemo(
      () =>
        billboardInfoRequests.filter(
          (request) => request.status === "pending"
        ).length,
      [billboardInfoRequests]
    );

  const pendingStoreInfoCount = useMemo(
    () => storeInfoRequests.filter((request) => request.status === "pending").length,
    [storeInfoRequests]
  );

  const uncheckedBugReportCount =
    useMemo(
      () =>
        bugReports.filter(
          (report) => !report.checked_at
        ).length,
      [bugReports]
    );

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
      className="admin-compact min-h-screen bg-[#f8f1f7] p-3 md:p-5"
      style={{
        fontFamily:
          '"Meiryo", "メイリオ", sans-serif',
      }}
    >
      <style jsx global>{`
        .admin-compact {
          font-size: 14px;
          line-height: 1.45;
        }
        .admin-compact h1,
        .admin-compact .text-3xl {
          font-size: 1.35rem !important;
          line-height: 1.25 !important;
        }
        .admin-compact h2,
        .admin-compact .text-2xl {
          font-size: 1.15rem !important;
          line-height: 1.3 !important;
        }
        .admin-compact h3,
        .admin-compact .text-xl {
          font-size: 1rem !important;
          line-height: 1.35 !important;
        }
        .admin-compact .text-lg {
          font-size: 0.95rem !important;
          line-height: 1.4 !important;
        }
        @media (max-width: 767px) {
          .admin-compact {
            font-size: 12px;
            line-height: 1.4;
          }
          .admin-compact h1,
          .admin-compact .text-3xl {
            font-size: 1.1rem !important;
          }
          .admin-compact h2,
          .admin-compact .text-2xl {
            font-size: 1rem !important;
          }
          .admin-compact h3,
          .admin-compact .text-xl,
          .admin-compact .text-lg {
            font-size: 0.9rem !important;
          }
          .admin-compact button,
          .admin-compact input,
          .admin-compact select,
          .admin-compact textarea {
            font-size: 12px;
            line-height: 1.3;
          }
        }
      `}</style>
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

          {/* 12タブ */}
          <div className="mt-7 grid grid-cols-2 gap-2 rounded-2xl bg-[#f5edf4] p-2 md:grid-cols-3 lg:grid-cols-12">
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
                activeTab === "review"
              }
              onClick={() =>
                setActiveTab("review")
              }
            >
              🔎 要確認
              {pendingReviewCount > 0 && (
                <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                  {pendingReviewCount}
                </span>
              )}
            </AdminTabButton>

            <AdminTabButton
              active={
                activeTab === "security"
              }
              onClick={() =>
                setActiveTab("security")
              }
            >
              🛡️ セキュリティ
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
                "user-deletions"
              }
              onClick={() =>
                setActiveTab(
                  "user-deletions"
                )
              }
            >
              👤 自己削除履歴
            </AdminTabButton>

            <AdminTabButton
              active={activeTab === "store-history"}
              onClick={() => setActiveTab("store-history")}
            >
              🏪 店舗履歴
            </AdminTabButton>


            <AdminTabButton
              active={activeTab === "store-comments"}
              onClick={() => setActiveTab("store-comments")}
            >
              💬 店舗コメント
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
                activeTab === "store-info"
              }
              onClick={() =>
                setActiveTab("store-info")
              }
            >
              📨 店舗情報
              {pendingBillboardInfoCount + pendingStoreInfoCount > 0 && (
                <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                  {pendingBillboardInfoCount + pendingStoreInfoCount}
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
              ⚠️ 不具合・要望
              {uncheckedBugReportCount > 0 && (
                <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                  {uncheckedBugReportCount}
                </span>
              )}
            </AdminTabButton>

            <AdminTabButton
              active={
                activeTab === "access"
              }
              onClick={() =>
                setActiveTab("access")
              }
            >
              👀 アクセス
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
              onDelete={handleDelete}
              onBulkDelete={handleBulkDeleteReports}
              formatDate={
                formatDate
              }
            />
          ) : activeTab ===
            "review" ? (
            <ReviewReportsTab
              reports={reviewReports}
              events={securityEvents}
              stores={stores}
              products={products}
              processingId={reviewProcessingId}
              onApprove={handleApproveReview}
              onReject={handleRejectReview}
              onBulkReview={handleBulkReview}
              onDeleteHistory={handleDeleteReviewHistory}
              formatDate={formatDate}
            />
          ) : activeTab ===
            "security" ? (
            <SecurityEventsTab
              events={securityEvents}
              stores={stores}
              products={products}
              onDeleteSelected={handleDeleteSecurityEvents}
              formatDate={formatDate}
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
              onRestore={handleRestore}
              onBulkRestore={handleBulkRestore}
              onDeleteHistory={handleDeleteDeletionHistory}
              formatDate={
                formatDate
              }
            />
          ) : activeTab ===
            "user-deletions" ? (
            <UserDeletionHistoryTab
              deletions={userDeletions}
              stores={stores}
              products={products}
              formatDate={formatDate}
            />
          ) : activeTab ===
            "store-history" ? (
            <StoreChangeHistoryTab
              history={storeChangeHistory}
              formatDate={formatDate}
            />
          ) : activeTab ===
            "store-comments" ? (
            <StoreCommentsAdminTab
              comments={storeComments}
              onDelete={handleDeleteStoreComment}
              onRestore={handleRestoreStoreComment}
              formatDate={formatDate}
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
              processingId={requestProcessingId}
              onDeleteProcessed={handleDeleteStoreRequestHistory}
              onEditApprovedStore={handleOpenApprovedStoreEdit}
              approvedStoreEdit={approvedStoreEdit}
              setApprovedStoreEdit={setApprovedStoreEdit}
              approvedStoreEditLoading={approvedStoreEditLoading}
              approvedStoreSaving={approvedStoreSaving}
              onSaveApprovedStore={handleSaveApprovedStore}
              formatDate={
                formatDate
              }
            />
          ) : activeTab ===
            "store-info" ? (
            <div>
              <StoreInfoRequestsAdminTab
                requests={storeInfoRequests}
                history={storeInfoRequestHistory}
                products={products}
                onApprove={handleApproveStoreInfoRequest}
                onReject={handleRejectStoreInfoRequest}
                onUpdate={handleUpdateStoreInfoRequest}
                onWithdraw={handleWithdrawStoreInfoRequest}
                onDeleteProcessed={handleDeleteStoreInfoHistory}
                formatDate={formatDate}
              />
              <div className="mt-10 border-t border-gray-200 pt-8">
                <BillboardInfoRequestsTab
                  requests={billboardInfoRequests}
                  stores={stores}
                  processingId={billboardProcessingId}
                  onApprove={handleApproveBillboardInfo}
                  onReject={handleRejectBillboardInfo}
                  onDeleteProcessed={handleDeleteBillboardHistory}
                  formatDate={formatDate}
                />
              </div>
            </div>
          ) : activeTab ===
            "bugs" ? (
            <BugReportsTab
              reports={bugReports}
              checkingId={bugCheckingId}
              onCheck={handleCheckBugReport}
              onBulkCheck={handleBulkCheckBugReports}
              onDeleteSelected={handleDeleteBugReports}
              formatDate={formatDate}
            />
          ) : activeTab ===
            "access" ? (
            <AccessTab
              rows={accessDaily}
            />
          ) : (
            <SalesTab
              salesData={salesData}
              salesDate={salesDate}
              todaySales={todaySales}
              weeklySales={weeklySales}
              totalSales={totalSales}
              salesGoal={salesGoal}
              setSalesDate={
                handleSalesDateChange
              }
              setTodaySales={
                setTodaySales
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

function StoreInfoRequestsAdminTab({
  requests,
  history,
  products,
  onApprove,
  onReject,
  onUpdate,
  onWithdraw,
  onDeleteProcessed,
  formatDate,
}: {
  requests: StoreInfoRequestAdmin[];
  history: StoreInfoRequestChangeHistory[];
  products: Product[];
  onApprove: (id: number) => Promise<void>;
  onReject: (id: number) => Promise<void>;
  onUpdate: (
    request: StoreInfoRequestAdmin,
    values: {
      productId: number | null;
      detail: string;
      evidence: string;
      shippingType: string | null;
      shippingMinDays: number | null;
      shippingMaxDays: number | null;
      shippingDate: string | null;
      confirmationSource: string | null;
      confirmationSourceDetail: string | null;
    }
  ) => Promise<void>;
  onWithdraw: (id: number) => Promise<void>;
  onDeleteProcessed: (ids: number[]) => Promise<void>;
  formatDate: (value: string) => string;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editProductId, setEditProductId] = useState("");
  const [editDetail, setEditDetail] = useState("");
  const [editEvidence, setEditEvidence] = useState("");
  const [editShippingPreset, setEditShippingPreset] = useState("same_or_next");
  const [editShippingDate, setEditShippingDate] = useState("");
  const [editConfirmationSource, setEditConfirmationSource] = useState("product_page");
  const [editConfirmationSourceDetail, setEditConfirmationSourceDetail] = useState("");

  const pending = requests.filter((request) => request.status === "pending");
  const processed = requests.filter((request) => request.status !== "pending");
  const processedIds = processed.map((request) => request.id);
  const allSelected = processedIds.length > 0 && processedIds.every((id) => selected.includes(id));

  function typeLabel(request: StoreInfoRequestAdmin) {
    if (request.request_type === "billboard") return "Billboard集計情報";
    if (request.request_type === "first_week_cutoff") return "初週集計の締め時間";
    if (request.request_type === "online_product_first_week") return "商品別の発送・初週情報";
    return "その他店舗情報";
  }

  function statusLabel(status: StoreInfoRequestAdmin["proposed_first_week_status"]) {
    if (status === "likely") return "間に合う見込み";
    if (status === "unlikely") return "間に合わない見込み";
    if (status === "check") return "要確認";
    return null;
  }

  function requestStatusLabel(status: StoreInfoRequestAdmin["status"]) {
    if (status === "approved") return "承認済み";
    if (status === "rejected") return "却下済み";
    if (status === "withdrawn") return "公開取り下げ";
    return "未処理";
  }

  function shippingPresetFromRequest(request: StoreInfoRequestAdmin) {
    if (request.shipping_type === "date") return "date";
    if (request.shipping_type === "other") return "other";
    if (request.shipping_min_days === 0 && request.shipping_max_days === 0) return "same_day";
    if (request.shipping_min_days === 0 && request.shipping_max_days === 1) return "same_or_next";
    if (request.shipping_min_days === 1 && request.shipping_max_days === 2) return "one_two";
    if (request.shipping_min_days === 2 && request.shipping_max_days === 3) return "two_three";
    if (request.shipping_min_days === 3 && request.shipping_max_days === 4) return "three_four";
    if (request.shipping_min_days === 2 && request.shipping_max_days === 7) return "backorder_2_7";
    return "other";
  }

  function startEdit(request: StoreInfoRequestAdmin) {
    setEditingId(request.id);
    setEditProductId(request.product_id ? String(request.product_id) : "");
    setEditDetail(request.detail ?? "");
    setEditEvidence(request.evidence ?? "");
    setEditShippingPreset(shippingPresetFromRequest(request));
    setEditShippingDate(request.shipping_date ?? "");
    setEditConfirmationSource(request.confirmation_source ?? "product_page");
    setEditConfirmationSourceDetail(request.confirmation_source_detail ?? "");
  }

  function getShippingEditPayload() {
    if (editShippingPreset === "date") {
      return { type: "date", min: null, max: null, date: editShippingDate || null };
    }
    if (editShippingPreset === "other") {
      return { type: "other", min: null, max: null, date: null };
    }
    const ranges: Record<string, [number, number]> = {
      same_day: [0, 0],
      same_or_next: [0, 1],
      one_two: [1, 2],
      two_three: [2, 3],
      three_four: [3, 4],
      backorder_2_7: [2, 7],
    };
    const [min, max] = ranges[editShippingPreset] ?? [0, 1];
    return { type: "relative", min, max, date: null };
  }

  async function saveEdit(request: StoreInfoRequestAdmin) {
    const shipping = getShippingEditPayload();
    await onUpdate(request, {
      productId:
        request.request_type === "online_product_first_week"
          ? Number(editProductId) || null
          : null,
      detail: editDetail,
      evidence: editEvidence,
      shippingType:
        request.request_type === "online_product_first_week"
          ? shipping.type
          : null,
      shippingMinDays:
        request.request_type === "online_product_first_week"
          ? shipping.min
          : null,
      shippingMaxDays:
        request.request_type === "online_product_first_week"
          ? shipping.max
          : null,
      shippingDate:
        request.request_type === "online_product_first_week"
          ? shipping.date
          : null,
      confirmationSource:
        request.request_type === "online_product_first_week"
          ? editConfirmationSource
          : null,
      confirmationSourceDetail:
        request.request_type === "online_product_first_week"
          ? editConfirmationSourceDetail || null
          : null,
    });
    setEditingId(null);
  }

  function historyFor(requestId: number) {
    return history.filter((item) => item.request_id === requestId);
  }

  function changedFields(item: StoreInfoRequestChangeHistory) {
    const labels: Array<[string, string]> = [
      ["status", "状態"],
      ["product_id", "商品"],
      ["proposed_first_week_status", "初週判定"],
      ["detail", "内容"],
      ["evidence", "確認方法・ソース"],
      ["shipping_type", "発送形式"],
      ["shipping_min_days", "最短日数"],
      ["shipping_max_days", "最長日数"],
      ["shipping_date", "発送予定日"],
      ["confirmation_source", "確認場所"],
      ["confirmation_source_detail", "確認場所補足"],
    ];
    return labels.filter(([key]) => item.old_data[key] !== item.new_data[key]);
  }

  function card(request: StoreInfoRequestAdmin, processedRow = false) {
    const firstWeekLabel = statusLabel(request.proposed_first_week_status);
    const requestHistory = historyFor(request.id);
    const isEditing = editingId === request.id;

    return (
      <div key={request.id} className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-bold">{request.store_name}</div>
            <div className="mt-1 text-xs text-gray-500">
              #{request.id} / {formatDate(request.requested_at)}
            </div>
          </div>
          <span className="rounded-full bg-[#f3e9f1] px-3 py-1 text-xs font-bold text-[#6d4966]">
            {typeLabel(request)}
          </span>
        </div>

        {request.product_name && (
          <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm">
            <span className="font-bold">商品: </span>{request.product_name}
          </div>
        )}
        {firstWeekLabel && (
          <div className="mt-2 rounded-xl bg-[#fff9e8] p-3 text-sm">
            <span className="font-bold">初週集計: </span>{firstWeekLabel}
          </div>
        )}
        <div className="mt-2 whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-sm leading-6">
          <span className="font-bold">内容: </span>{request.detail}
        </div>
        {request.evidence && (
          <div className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-[#f8f1f7] p-3 text-sm leading-6">
            <span className="font-bold">確認方法・ソース: </span>{request.evidence}
          </div>
        )}

        {isEditing && (
          <div className="mt-3 space-y-3 rounded-2xl border border-[#d8cad7] bg-[#fbf7fa] p-4">
            <div className="font-bold text-[#5b486b]">編集</div>
            {request.request_type === "online_product_first_week" && (
              <>
                <label className="block">
                  <div className="mb-1 text-sm font-bold">商品</div>
                  <select value={editProductId} onChange={(e) => setEditProductId(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-white p-2 text-gray-900">
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </select>
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <div className="mb-1 text-sm font-bold">発送予定の表示</div>
                    <select value={editShippingPreset} onChange={(e) => setEditShippingPreset(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-white p-2 text-gray-900">
                      <option value="same_day">当日</option>
                      <option value="same_or_next">当日〜翌日</option>
                      <option value="one_two">1〜2日後</option>
                      <option value="two_three">2〜3日後</option>
                      <option value="three_four">3〜4日後</option>
                      <option value="backorder_2_7">お取り寄せ2〜7日</option>
                      <option value="date">日付指定</option>
                      <option value="other">その他の表示</option>
                    </select>
                  </label>
                  <label className="block">
                    <div className="mb-1 text-sm font-bold">確認場所</div>
                    <select value={editConfirmationSource} onChange={(e) => setEditConfirmationSource(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-white p-2 text-gray-900">
                      <option value="product_page">商品ページ</option>
                      <option value="cart_order">カート・注文画面</option>
                      <option value="email">メール</option>
                      <option value="other">その他</option>
                    </select>
                  </label>
                </div>
                {editShippingPreset === "date" && (
                  <input type="date" value={editShippingDate} onChange={(e) => setEditShippingDate(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-white p-2 text-gray-900" />
                )}
                {editConfirmationSource === "other" && (
                  <input type="text" value={editConfirmationSourceDetail} onChange={(e) => setEditConfirmationSourceDetail(e.target.value)} placeholder="確認場所" className="w-full rounded-xl border border-gray-300 bg-white p-2 text-gray-900" />
                )}
                {editShippingPreset === "other" && (
                  <textarea value={editDetail} onChange={(e) => setEditDetail(e.target.value)} rows={2} className="w-full rounded-xl border border-gray-300 bg-white p-2 text-gray-900" />
                )}
              </>
            )}
            {request.request_type !== "online_product_first_week" && (
              <textarea value={editDetail} onChange={(e) => setEditDetail(e.target.value)} rows={3} className="w-full rounded-xl border border-gray-300 bg-white p-2 text-gray-900" />
            )}
            <textarea value={editEvidence} onChange={(e) => setEditEvidence(e.target.value)} rows={2} placeholder="確認方法・ソース" className="w-full rounded-xl border border-gray-300 bg-white p-2 text-gray-900" />
            <div className="flex gap-2">
              <button type="button" onClick={() => void saveEdit(request)} className="rounded-xl bg-[#6d4966] px-4 py-2 text-sm font-bold text-white">保存</button>
              <button type="button" onClick={() => setEditingId(null)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold">キャンセル</button>
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {request.status !== "rejected" && (
            <button type="button" onClick={() => startEdit(request)} className="rounded-xl border border-[#bba7b8] bg-white px-4 py-2 text-sm font-bold text-[#5b486b]">編集</button>
          )}
          {request.status === "pending" && (
            <>
              <button type="button" onClick={() => void onApprove(request.id)} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white">{request.request_type === "other" ? "確認・処理済みにする" : "承認・反映"}</button>
              <button type="button" onClick={() => void onReject(request.id)} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white">却下</button>
            </>
          )}
          {request.status === "approved" && request.request_type !== "other" && (
            <button type="button" onClick={() => void onWithdraw(request.id)} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white">公開を取り下げる</button>
          )}
          {request.status === "withdrawn" && (
            <button type="button" onClick={() => void onApprove(request.id)} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white">再承認・反映</button>
          )}
        </div>

        {processedRow && (
          <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
            <input
              type="checkbox"
              checked={selected.includes(request.id)}
              onChange={() => setSelected((current) => current.includes(request.id) ? current.filter((id) => id !== request.id) : [...current, request.id])}
            />
            <span>{requestStatusLabel(request.status)}</span>
            {request.reviewed_at && <span>{formatDate(request.reviewed_at)}</span>}
          </div>
        )}

        {requestHistory.length > 0 && (
          <details className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <summary className="cursor-pointer text-sm font-bold">変更履歴({requestHistory.length})</summary>
            <div className="mt-2 space-y-2">
              {requestHistory.map((item) => {
                const changes = changedFields(item);
                return (
                  <div key={item.id} className="rounded-lg bg-white p-2 text-xs leading-5">
                    <div className="font-bold">{formatDate(item.changed_at)}</div>
                    {changes.length === 0 ? (
                      <div className="text-gray-500">管理情報を更新</div>
                    ) : (
                      changes.map(([key, label]) => (
                        <div key={key} className="mt-1 break-words">
                          <span className="font-bold">{label}: </span>
                          {String(item.old_data[key] ?? "-")} → {String(item.new_data[key] ?? "-")}
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div>
        <h2 className="text-2xl font-bold">📨 店舗情報提供</h2>
        <p className="mt-1 text-sm text-gray-600">
          初週情報は承認前・承認後とも編集できます。承認後の情報は公開を取り下げても履歴が残ります。
        </p>
      </div>

      <div className="mt-5">
        <h3 className="text-lg font-bold">未処理({pending.length})</h3>
        {pending.length === 0 ? (
          <div className="mt-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">未処理の店舗情報提供はありません。</div>
        ) : (
          <div className="mt-3 space-y-3">{pending.map((request) => card(request))}</div>
        )}
      </div>

      <div className="mt-7 border-t border-gray-200 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold">処理済み({processed.length})</h3>
          {processed.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setSelected(allSelected ? [] : processedIds)} className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-bold">{allSelected ? "全解除" : "全選択"}</button>
              <button type="button" disabled={!selected.length} onClick={() => void onDeleteProcessed(selected)} className="rounded-xl bg-red-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">選択履歴を削除</button>
            </div>
          )}
        </div>
        <div className="mt-3 space-y-3">{processed.map((request) => card(request, true))}</div>
      </div>
    </div>
  );
}

function StoreCommentsAdminTab({
  comments,
  onDelete,
  onRestore,
  formatDate,
}: {
  comments: StoreCommentAdmin[];
  onDelete: (id: number) => Promise<void>;
  onRestore: (id: number) => Promise<void>;
  formatDate: (value: string) => string;
}) {
  const [search, setSearch] = useState("");
  const visible = comments.filter((comment) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      comment.store_name.toLowerCase().includes(q) ||
      comment.body.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">💬 店舗コメント管理</h2>
          <p className="mt-1 text-sm text-gray-600">
            実店舗・オンラインショップに投稿されたコメントを確認できます。
          </p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="店舗名・コメント検索"
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-5 space-y-3">
        {visible.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-4 text-gray-500">コメントはありません。</div>
        ) : (
          visible.map((comment) => (
            <div
              key={comment.id}
              className={`rounded-2xl border p-4 ${comment.is_deleted ? "border-gray-200 bg-gray-50 opacity-70" : "border-[#eaddea] bg-white"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-bold">{comment.store_name}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    #{comment.id} / {formatDate(comment.created_at)}
                  </div>
                </div>
                {comment.is_deleted ? (
                  <button
                    type="button"
                    onClick={() => void onRestore(comment.id)}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-bold"
                  >
                    復元
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onDelete(comment.id)}
                    className="rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white"
                  >
                    非表示
                  </button>
                )}
              </div>
              <div className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-[#faf7fa] p-3 text-sm leading-6">
                {comment.body}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StoreChangeHistoryTab({
  history,
  formatDate,
}: {
  history: StoreChangeHistory[];
  formatDate: (value: string) => string;
}) {
  const fieldLabels: Record<string, string> = {
    name: "店舗名",
    chain_name: "チェーン名",
    prefecture: "都道府県",
    city: "市区町村",
    store_type: "店舗種別",
    address: "住所",
    phone: "電話番号",
    business_hours: "営業時間",
    official_url: "公式店舗URL",
    online_url: "オンラインURL",
    oricon_target: "オリコン",
    billboard_status: "Billboard",
    is_active: "有効状態",
    source: "登録元",
  };

  const ignoredFields = new Set(["id", "created_at", "updated_at"]);

  const displayValue = (value: unknown) => {
    if (value === null || value === undefined || value === "") return "－";
    if (typeof value === "boolean") return value ? "はい" : "いいえ";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const storeName = (row: StoreChangeHistory) => {
    const data = row.new_data ?? row.old_data;
    const name = displayValue(data?.name);
    const chain = displayValue(data?.chain_name);
    if (chain === "－" || name.includes(chain)) return name;
    return `${chain} ${name}`;
  };

  const changes = (row: StoreChangeHistory) => {
    if (row.action_type === "DELETE" || !row.new_data) return [];
    const keys = Array.from(
      new Set([...Object.keys(row.old_data ?? {}), ...Object.keys(row.new_data ?? {})])
    );
    return keys
      .filter((key) => !ignoredFields.has(key))
      .filter((key) => JSON.stringify(row.old_data?.[key]) !== JSON.stringify(row.new_data?.[key]));
  };

  return (
    <div className="mt-6">
      <h2 className="text-2xl font-bold">🏪 店舗変更・削除履歴</h2>
      <p className="mt-2 text-gray-500">
        stores の変更・削除を自動記録しています。削除された店舗も、削除直前の情報を確認できます。
      </p>

      {history.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
          店舗の変更・削除履歴はまだありません。
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {history.map((row) => {
            const changedFields = changes(row);
            return (
              <details key={row.id} className="rounded-2xl border border-[#eaddea] bg-[#fcf9fc]">
                <summary className="cursor-pointer select-none p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-bold">{storeName(row)}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${row.action_type === "DELETE" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                          {row.action_type === "DELETE" ? "削除" : "変更"}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                          店舗ID {row.store_id}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-500">{formatDate(row.changed_at)}</div>
                      {row.action_type === "UPDATE" && (
                        <div className="mt-2 text-sm text-gray-600">
                          変更項目: {changedFields.length ? changedFields.map((key) => fieldLabels[key] ?? key).join("、") : "詳細を確認"}
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-bold text-gray-500">詳細 ▼</div>
                  </div>
                </summary>

                <div className="border-t border-[#eaddea] p-4">
                  {row.action_type === "DELETE" ? (
                    <div>
                      <div className="mb-3 font-bold text-red-700">削除直前の店舗情報</div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {Object.entries(row.old_data ?? {})
                          .filter(([key]) => !ignoredFields.has(key))
                          .map(([key, value]) => (
                            <div key={key} className="rounded-xl bg-white p-3">
                              <div className="text-xs font-bold text-gray-500">{fieldLabels[key] ?? key}</div>
                              <div className="mt-1 break-words font-bold">{displayValue(value)}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : changedFields.length === 0 ? (
                    <div className="text-gray-500">変更内容を特定できませんでした。</div>
                  ) : (
                    <div className="space-y-3">
                      {changedFields.map((key) => (
                        <div key={key} className="rounded-xl bg-white p-4">
                          <div className="text-sm font-bold text-gray-600">{fieldLabels[key] ?? key}</div>
                          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                            <div className="rounded-lg bg-red-50 p-3">
                              <div className="text-xs font-bold text-red-600">変更前</div>
                              <div className="mt-1 break-words">{displayValue(row.old_data?.[key])}</div>
                            </div>
                            <div className="text-center font-bold text-gray-400">→</div>
                            <div className="rounded-lg bg-green-50 p-3">
                              <div className="text-xs font-bold text-green-700">変更後</div>
                              <div className="mt-1 break-words">{displayValue(row.new_data?.[key])}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 text-xs text-gray-500">
                    操作者: {row.changed_by ?? "SQL Editor / システム処理"} ・ 履歴ID #{row.id}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AccessTab({
  rows,
}: {
  rows: AccessDaily[];
}) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const todayRows = rows.filter((row) => row.access_date === today);
  const todayViews = todayRows.reduce((sum, row) => sum + Number(row.views), 0);
  const todayUnique = todayRows.reduce(
    (sum, row) => sum + Number(row.unique_visitors),
    0
  );
  const totalViews = rows.reduce((sum, row) => sum + Number(row.views), 0);

  const byDate = Array.from(
    rows.reduce((map, row) => {
      const current = map.get(row.access_date) ?? { views: 0, unique: 0 };
      current.views += Number(row.views);
      current.unique += Number(row.unique_visitors);
      map.set(row.access_date, current);
      return map;
    }, new Map<string, { views: number; unique: number }>())
  ).sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold">👀 アクセス数</h2>
      <p className="mt-2 text-sm text-gray-600">
        管理画面だけに表示されます。PVはページ表示回数、訪問者数は同じブラウザを日ごとに重複除外した目安です。IPアドレスはアクセス集計には保存しません。
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-gray-500">今日のPV</div>
          <div className="mt-1 text-3xl font-bold">{todayViews.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-gray-500">今日の訪問者数</div>
          <div className="mt-1 text-3xl font-bold">{todayUnique.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-gray-500">直近30日のPV</div>
          <div className="mt-1 text-3xl font-bold">{totalViews.toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-[#f5edf4]">
            <tr>
              <th className="p-3">日付</th>
              <th className="p-3 text-right">PV</th>
              <th className="p-3 text-right">訪問者数</th>
            </tr>
          </thead>
          <tbody>
            {byDate.map(([date, value]) => (
              <tr key={date} className="border-t">
                <td className="p-3">{date}</td>
                <td className="p-3 text-right">{value.views.toLocaleString()}</td>
                <td className="p-3 text-right">{value.unique.toLocaleString()}</td>
              </tr>
            ))}
            {byDate.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-gray-500">
                  まだアクセス記録はありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReviewReportsTab({
  reports,
  events,
  stores,
  products,
  processingId,
  onApprove,
  onReject,
  onBulkReview,
  onDeleteHistory,
  formatDate,
}: {
  reports: ReviewReport[];
  events: SecurityEvent[];
  stores: Store[];
  products: Product[];
  processingId: number | null;
  onApprove: (report: ReviewReport) => void;
  onReject: (report: ReviewReport) => void;
  onBulkReview: (
    ids: number[],
    action: "approve" | "reject"
  ) => void;
  onDeleteHistory: (ids: number[]) => void;
  formatDate: (value: string) => string;
}) {
  const [pendingSel, setPendingSel] =
    useState<number[]>([]);
  const [historySel, setHistorySel] =
    useState<number[]>([]);

  const pending = reports.filter(
    (r) =>
      r.review_status === "pending"
  );

  const approved = reports.filter(
    (r) =>
      r.review_status === "approved" &&
      Boolean(r.reviewed_at)
  );

  const rejected = reports.filter(
    (r) =>
      r.review_status === "rejected"
  );

  const pids = pending.map((r) => r.id);
  const hids = [
    ...approved,
    ...rejected,
  ].map((r) => r.id);

  useEffect(() => {
    setPendingSel((current) =>
      current.filter((id) =>
        pids.includes(id)
      )
    );

    setHistorySel((current) =>
      current.filter((id) =>
        hids.includes(id)
      )
    );
  }, [reports]);

  const storeName = (id: number) => {
    const store = stores.find(
      (item) => item.id === id
    );

    return store
      ? getDisplayStoreName(store)
      : "店舗不明";
  };

  const productName = (
    id: number
  ) =>
    products.find(
      (item) => item.id === id
    )?.name ?? "商品不明";

  const togglePending = (
    id: number
  ) =>
    setPendingSel((current) =>
      current.includes(id)
        ? current.filter(
            (item) => item !== id
          )
        : [...current, id]
    );

  const toggleHistory = (
    id: number
  ) =>
    setHistorySel((current) =>
      current.includes(id)
        ? current.filter(
            (item) => item !== id
          )
        : [...current, id]
    );

  function getJstDateKey(
    value: string | Date
  ) {
    const date =
      value instanceof Date
        ? value
        : new Date(value);

    const parts =
      new Intl.DateTimeFormat(
        "ja-JP",
        {
          timeZone: "Asia/Tokyo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }
      ).formatToParts(date);

    const year =
      parts.find(
        (part) =>
          part.type === "year"
      )?.value ?? "";

    const month =
      parts.find(
        (part) =>
          part.type === "month"
      )?.value ?? "";

    const day =
      parts.find(
        (part) =>
          part.type === "day"
      )?.value ?? "";

    return `${year}-${month}-${day}`;
  }

  /*
   * submitted / pending は
   * 「登録に成功した時点」で1投稿につき1件だけ残る。
   * auto_rollback_pending は後から追加される履歴なので、
   * 今日の投稿数には二重計上しない。
   */
  const todayKey =
    getJstDateKey(new Date());

  const todaySuccessfulEvents =
    events.filter(
      (event) =>
        (
          event.event_type ===
            "submitted" ||
          event.event_type ===
            "pending"
        ) &&
        getJstDateKey(
          event.created_at
        ) === todayKey
    );

  const todayPostCount =
    todaySuccessfulEvents.length;

  const todayStoreCount =
    new Set(
      todaySuccessfulEvents
        .map(
          (event) =>
            event.store_id
        )
        .filter(
          (
            id
          ): id is number =>
            id !== null
        )
    ).size;

  const todayInitialPendingCount =
    todaySuccessfulEvents.filter(
      (event) =>
        event.event_type ===
        "pending"
    ).length;

  /*
   * 強い連続投稿制限で巻き戻された一連をまとめる。
   * auto_rollback_pending は、同一IPハッシュ +
   * 同一ブラウザハッシュで1件ずつ記録される。
   * 2分以内のものを同じ自動保留処理として扱う。
   */
  type RollbackSeries = {
    key: string;
    events: SecurityEvent[];
    startedAt: string;
    endedAt: string;
  };

  const rollbackSeries =
    useMemo(() => {
      const rollbackEvents =
        events
          .filter(
            (event) =>
              event.event_type ===
                "auto_rollback_pending" &&
              event.report_id !== null
          )
          .sort(
            (a, b) =>
              new Date(
                a.created_at
              ).getTime() -
              new Date(
                b.created_at
              ).getTime()
          );

      const result:
        RollbackSeries[] = [];

      for (
        const event of
        rollbackEvents
      ) {
        const identity =
          `${
            event.client_hash ??
            "no-client"
          }::${
            event.ip_hash ??
            "no-ip"
          }`;

        const last =
          result[
            result.length - 1
          ];

        const eventTime =
          new Date(
            event.created_at
          ).getTime();

        const lastTime =
          last
            ? new Date(
                last.endedAt
              ).getTime()
            : 0;

        const sameIdentity =
          last?.key.startsWith(
            `${identity}::`
          ) ?? false;

        const withinTwoMinutes =
          eventTime - lastTime <=
          2 * 60 * 1000;

        if (
          last &&
          sameIdentity &&
          withinTwoMinutes
        ) {
          last.events.push(
            event
          );
          last.endedAt =
            event.created_at;
        } else {
          result.push({
            key:
              `${identity}::${event.created_at}`,
            events: [event],
            startedAt:
              event.created_at,
            endedAt:
              event.created_at,
          });
        }
      }

      return result.reverse();
    }, [events]);

  const visibleRollbackSeries =
    rollbackSeries.filter(
      (series) =>
        series.events.some(
          (event) =>
            event.report_id !==
              null &&
            reports.some(
              (report) =>
                report.id ===
                event.report_id
            )
        )
    );

  function getPendingContext(
    report: ReviewReport
  ) {
    const targetEvent =
      events.find(
        (event) =>
          event.report_id ===
            report.id &&
          (
            event.event_type ===
              "pending" ||
            event.event_type ===
              "submitted"
          )
      );

    if (!targetEvent) {
      return [];
    }

    const targetTime =
      new Date(
        targetEvent.created_at
      ).getTime();

    const windowStart =
      targetTime -
      10 * 60 * 1000;

    return events
      .filter((event) => {
        if (
          event.report_id === null
        ) {
          return false;
        }

        if (
          event.event_type !==
            "submitted" &&
          event.event_type !==
            "pending"
        ) {
          return false;
        }

        const eventTime =
          new Date(
            event.created_at
          ).getTime();

        const sameClient =
          Boolean(
            targetEvent.client_hash
          ) &&
          event.client_hash ===
            targetEvent.client_hash;

        const sameIp =
          Boolean(
            targetEvent.ip_hash
          ) &&
          event.ip_hash ===
            targetEvent.ip_hash;

        return (
          sameClient &&
          sameIp &&
          eventTime >=
            windowStart &&
          eventTime <=
            targetTime
        );
      })
      .sort(
        (a, b) =>
          new Date(
            a.created_at
          ).getTime() -
          new Date(
            b.created_at
          ).getTime()
      );
  }

  function getCurrentStatus(
    reportId: number | null
  ) {
    if (reportId === null) {
      return "削除済み";
    }

    const report =
      reports.find(
        (item) =>
          item.id === reportId
      );

    if (!report) {
      return "現在状態不明";
    }

    if (
      report.review_status ===
      "approved"
    ) {
      return report.reviewed_at
        ? "承認済み"
        : "公開済み";
    }

    if (
      report.review_status ===
      "pending"
    ) {
      return "Pending";
    }

    return "却下済み";
  }

  function renderSeries(
    series: RollbackSeries
  ) {
    const byStore =
      new Map<
        number,
        SecurityEvent[]
      >();

    for (
      const event of
      series.events
    ) {
      if (
        event.store_id ===
        null
      ) {
        continue;
      }

      const current =
        byStore.get(
          event.store_id
        ) ?? [];

      current.push(event);

      byStore.set(
        event.store_id,
        current
      );
    }

    const storeGroups = [
      ...byStore.entries(),
    ];

    return (
      <details
        key={series.key}
        className="rounded-2xl border border-orange-200 bg-orange-50/60"
      >
        <summary className="cursor-pointer px-5 py-4 font-bold text-[#8a4b20]">
          ⚠️ 連続投稿グループ
          (
          {
            series.events
              .length
          }
          件・
          {
            storeGroups
              .length
          }
          店舗)
          <span className="ml-2 text-sm font-normal text-gray-600">
            {formatDate(
              series.startedAt
            )}
          </span>
        </summary>

        <div className="border-t border-orange-200 p-4">
          <p className="mb-4 text-sm leading-6 text-gray-600">
            この一覧には、自動保留になる前に一度公開されていた投稿も含みます。
            同じブラウザ・同じIPからの自動巻き戻し履歴をまとめています。
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            {storeGroups.map(
              ([
                storeId,
                storeEvents,
              ]) => (
                <div
                  key={
                    storeId
                  }
                  className="rounded-xl border border-orange-100 bg-white p-4"
                >
                  <div className="font-bold text-[#2c252b]">
                    {
                      storeName(
                        storeId
                      )
                    }
                    <span className="ml-2 rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-700">
                      {
                        storeEvents
                          .length
                      }
                      件
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {storeEvents.map(
                      (
                        event
                      ) => (
                        <div
                          key={
                            event.id
                          }
                          className="rounded-lg bg-[#faf7fa] p-3 text-sm"
                        >
                          <div className="font-bold">
                            {event.product_id !==
                            null
                              ? productName(
                                  event.product_id
                                )
                              : "商品不明"}
                          </div>

                          <div className="mt-1 text-[#b95489]">
                            {formatInventoryValue(
                              event.quantity ??
                                0,
                              event.stock_status
                            )}
                          </div>

                          <div className="mt-1 text-xs text-gray-500">
                            投稿: 
                            {formatDate(
                              event.created_at
                            )}
                          </div>

                          <div className="mt-1 text-xs">
                            現在: 
                            <b>
                              {getCurrentStatus(
                                event.report_id
                              )}
                            </b>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </details>
    );
  }

  const hist = (
    r: ReviewReport,
    label: "承認" | "却下"
  ) => (
    <article
      key={r.id}
      className="rounded-xl border border-gray-200 bg-white p-4 text-gray-600"
    >
      <div className="flex items-start gap-3">
        <SelectionCheckbox
          checked={historySel.includes(
            r.id
          )}
          onChange={() =>
            toggleHistory(r.id)
          }
          label={`履歴 #${r.id} を選択`}
        />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <b>
              {storeName(
                r.store_id
              )}
            </b>

            <span
              className={
                "rounded-full px-2.5 py-1 text-xs font-bold " +
                (label === "承認"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700")
              }
            >
              {label}済み
            </span>
          </div>

          <div className="mt-1">
            {productName(
              r.product_id
            )}
          </div>

          <div className="mt-1">
            {formatInventoryValue(
              r.quantity,
              r.stock_status
            )}
          </div>

          <div className="mt-1 text-sm">
            投稿: 
            {formatDate(
              r.created_at
            )}
          </div>

          {r.reviewed_at && (
            <div className="mt-1 text-sm">
              {label}: 
              {formatDate(
                r.reviewed_at
              )}
            </div>
          )}

          {r.review_reason && (
            <div className="mt-2 text-sm">
              判定理由: 
              {r.review_reason}
            </div>
          )}
        </div>
      </div>
    </article>
  );

  return (
    <div className="mt-6">
      <h2 className="text-2xl font-bold">
        🔎 要確認の在庫投稿
      </h2>

      <p className="mt-2 text-gray-500">
        自動判定で保留になった投稿です。
        承認するまで公開ページには表示されません。
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[#e8d7e4] bg-white p-4">
          <div className="text-sm font-bold text-[#8b6881]">
            📊 今日の在庫投稿
          </div>
          <div className="mt-1 text-3xl font-bold text-[#211d21]">
            {todayPostCount.toLocaleString()}
            <span className="ml-1 text-base">
              件
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            JST 0:00〜現在・登録成功分
          </div>
        </div>

        <div className="rounded-2xl border border-[#e8d7e4] bg-white p-4">
          <div className="text-sm font-bold text-[#8b6881]">
            🏬 今日投稿された店舗
          </div>
          <div className="mt-1 text-3xl font-bold text-[#211d21]">
            {todayStoreCount.toLocaleString()}
            <span className="ml-1 text-base">
              店舗
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e8d7e4] bg-white p-4">
          <div className="text-sm font-bold text-[#8b6881]">
            ⚠️ 最初からPending
          </div>
          <div className="mt-1 text-3xl font-bold text-[#211d21]">
            {todayInitialPendingCount.toLocaleString()}
            <span className="ml-1 text-base">
              件
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            後から自動保留へ変わった分は別
          </div>
        </div>
      </div>

      {visibleRollbackSeries.length >
        0 && (
        <div className="mt-6">
          <h3 className="text-lg font-bold text-[#6f4d65]">
            🔗 連続投稿のまとまり
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            自動保留になった一連の投稿を、
            店舗ごとの件数までまとめて確認できます。
          </p>

          <div className="mt-3 space-y-3">
            {visibleRollbackSeries.map(
              renderSeries
            )}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="mt-5">
          <BulkSelectionBar
            count={
              pendingSel.length
            }
            allSelected={pids.every(
              (id) =>
                pendingSel.includes(
                  id
                )
            )}
            onToggleAll={() =>
              setPendingSel(
                pids.every((id) =>
                  pendingSel.includes(
                    id
                  )
                )
                  ? []
                  : pids
              )
            }
          >
            <button
              disabled={
                !pendingSel.length
              }
              onClick={() =>
                onBulkReview(
                  pendingSel,
                  "approve"
                )
              }
              className="rounded-xl bg-green-700 px-4 py-2 font-bold text-white disabled:opacity-40"
            >
              一括承認・公開
            </button>

            <button
              disabled={
                !pendingSel.length
              }
              onClick={() =>
                onBulkReview(
                  pendingSel,
                  "reject"
                )
              }
              className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white disabled:opacity-40"
            >
              一括却下
            </button>
          </BulkSelectionBar>
        </div>
      )}

      {!pending.length ? (
        <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5 text-center font-bold text-green-700">
          現在、要確認の投稿はありません。
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {pending.map((r) => (
            <article
              key={r.id}
              className="rounded-2xl border border-orange-200 bg-orange-50 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <SelectionCheckbox
                    checked={pendingSel.includes(
                      r.id
                    )}
                    onChange={() =>
                      togglePending(
                        r.id
                      )
                    }
                    label={`投稿 #${r.id} を選択`}
                  />

                  <div>
                    <div className="text-lg font-bold">
                      {storeName(
                        r.store_id
                      )}
                    </div>

                    <div className="mt-2">
                      {productName(
                        r.product_id
                      )}
                    </div>

                    <div className="mt-1 font-bold text-[#b95489]">
                      {formatInventoryValue(
                        r.quantity,
                        r.stock_status
                      )}
                    </div>

                    <div className="mt-1 text-sm text-gray-500">
                      {formatDate(
                        r.created_at
                      )}
                    </div>

                    {r.comment && (
                      <div className="mt-3 rounded-xl bg-white p-3">
                        💬 {r.comment}
                      </div>
                    )}

                    <div className="mt-3 rounded-xl bg-white p-3 text-sm">
                      <b>
                        判定理由: 
                      </b>
                      {r.review_reason ||
                        "理由なし"}
                    </div>

                    {(() => {
                      const contextEvents =
                        getPendingContext(
                          r
                        );

                      const contextStoreCount =
                        new Set(
                          contextEvents
                            .map(
                              (event) =>
                                event.store_id
                            )
                            .filter(
                              (
                                id
                              ): id is number =>
                                id !==
                                null
                            )
                        ).size;

                      const publicBeforeCount =
                        contextEvents.filter(
                          (event) =>
                            event.report_id !==
                              r.id &&
                            getCurrentStatus(
                              event.report_id
                            ) ===
                              "公開済み"
                        ).length;

                      if (
                        contextEvents.length <=
                        1
                      ) {
                        return (
                          <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-500">
                            直前10分の同一ブラウザ・同一IP投稿は、この投稿以外に確認できません。
                          </div>
                        );
                      }

                      return (
                        <details
                          open
                          className="mt-3 rounded-xl border border-[#e6c987] bg-[#fffaf0]"
                        >
                          <summary className="cursor-pointer px-3 py-3 font-bold text-[#7b5720]">
                            🔗 承認判断用: 直前10分の一連の投稿
                            (
                            {
                              contextEvents.length
                            }
                            件・
                            {
                              contextStoreCount
                            }
                            店舗)
                          </summary>

                          <div className="border-t border-[#e6c987] p-3">
                            <div className="mb-3 rounded-lg bg-white p-3 text-xs leading-5 text-gray-600">
                              このPending投稿と同じブラウザ・同じIPから、
                              直前10分以内に登録された投稿です。
                              <b className="ml-1 text-[#8a4b20]">
                                Pendingになる前に公開されていた投稿も
                                {publicBeforeCount}
                                件含みます。
                              </b>
                            </div>

                            <div className="space-y-2">
                              {contextEvents.map(
                                (event) => {
                                  const isCurrent =
                                    event.report_id ===
                                    r.id;

                                  const currentStatus =
                                    getCurrentStatus(
                                      event.report_id
                                    );

                                  return (
                                    <div
                                      key={
                                        event.id
                                      }
                                      className={
                                        "rounded-lg border p-3 text-sm " +
                                        (isCurrent
                                          ? "border-orange-300 bg-orange-50"
                                          : "border-gray-200 bg-white")
                                      }
                                    >
                                      <div className="flex flex-wrap items-center gap-2">
                                        <b>
                                          {event.store_id !==
                                          null
                                            ? storeName(
                                                event.store_id
                                              )
                                            : "店舗不明"}
                                        </b>

                                        {isCurrent && (
                                          <span className="rounded-full bg-orange-200 px-2 py-0.5 text-xs font-bold text-orange-800">
                                            このPending
                                          </span>
                                        )}

                                        {!isCurrent && (
                                          <span
                                            className={
                                              "rounded-full px-2 py-0.5 text-xs font-bold " +
                                              (currentStatus ===
                                              "公開済み"
                                                ? "bg-green-100 text-green-700"
                                                : currentStatus ===
                                                  "Pending"
                                                ? "bg-orange-100 text-orange-700"
                                                : "bg-gray-100 text-gray-600")
                                            }
                                          >
                                            {currentStatus}
                                          </span>
                                        )}
                                      </div>

                                      <div className="mt-1">
                                        {event.product_id !==
                                        null
                                          ? productName(
                                              event.product_id
                                            )
                                          : "商品不明"}
                                      </div>

                                      <div className="mt-1 font-bold text-[#b95489]">
                                        {formatInventoryValue(
                                          event.quantity ??
                                            0,
                                          event.stock_status
                                        )}
                                      </div>

                                      {event.comment && (
                                        <div className="mt-1 text-xs text-gray-600">
                                          💬 {event.comment}
                                        </div>
                                      )}

                                      <div className="mt-1 text-xs text-gray-500">
                                        {formatDate(
                                          event.created_at
                                        )}
                                      </div>
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          </div>
                        </details>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={
                      processingId ===
                      r.id
                    }
                    onClick={() =>
                      onApprove(r)
                    }
                    className="rounded-xl bg-green-700 px-5 py-3 font-bold text-white"
                  >
                    承認・公開
                  </button>

                  <button
                    disabled={
                      processingId ===
                      r.id
                    }
                    onClick={() =>
                      onReject(r)
                    }
                    className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white"
                  >
                    却下
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-7">
        <BulkSelectionBar
          count={
            historySel.length
          }
          allSelected={
            hids.length > 0 &&
            hids.every((id) =>
              historySel.includes(
                id
              )
            )
          }
          onToggleAll={() =>
            setHistorySel(
              hids.length > 0 &&
                hids.every((id) =>
                  historySel.includes(
                    id
                  )
                )
                ? []
                : hids
            )
          }
        >
          <button
            disabled={
              !historySel.length
            }
            onClick={() =>
              onDeleteHistory(
                historySel
              )
            }
            className="rounded-xl bg-red-700 px-4 py-2 font-bold text-white disabled:opacity-40"
          >
            選択した履歴を削除
          </button>
        </BulkSelectionBar>
      </div>

      <div className="mt-3 space-y-3">
        <details className="rounded-2xl border border-green-200 bg-green-50/50">
          <summary className="cursor-pointer px-5 py-4 font-bold text-green-700">
            承認済みの履歴
            (
            {approved.length}
            件)
          </summary>

          <div className="space-y-3 border-t border-green-200 p-4">
            {approved.length ? (
              approved.map((r) =>
                hist(r, "承認")
              )
            ) : (
              <div className="text-sm text-gray-500">
                承認済みの履歴はありません。
              </div>
            )}
          </div>
        </details>

        <details className="rounded-2xl border border-gray-200 bg-gray-50">
          <summary className="cursor-pointer px-5 py-4 font-bold text-gray-600">
            却下済みの履歴
            (
            {rejected.length}
            件)
          </summary>

          <div className="space-y-3 border-t border-gray-200 p-4">
            {rejected.length ? (
              rejected.map((r) =>
                hist(r, "却下")
              )
            ) : (
              <div className="text-sm text-gray-500">
                却下済みの履歴はありません。
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}

function SecurityEventsTab({
  events,
  stores,
  products,
  onDeleteSelected,
  formatDate,
}: {
  events: SecurityEvent[];
  stores: Store[];
  products: Product[];
  onDeleteSelected: (ids: number[]) => void;
  formatDate: (value: string) => string;
}) {
  const [eventFilter, setEventFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [selected, setSelected] = useState<number[]>([]);

  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const blockedTypes = [
    "rate_limit_client",
    "rate_limit_ip",
    "same_item_block",
    "turnstile_block",
    "invalid_request",
  ];

  const last24h = events.filter(
    (event) => new Date(event.created_at).getTime() >= dayAgo
  ).length;
  const last7d = events.filter(
    (event) => new Date(event.created_at).getTime() >= weekAgo
  ).length;
  const blocked24h = events.filter(
    (event) =>
      new Date(event.created_at).getTime() >= dayAgo &&
      blockedTypes.includes(event.event_type)
  ).length;
  const pending24h = events.filter(
    (event) =>
      new Date(event.created_at).getTime() >= dayAgo &&
      event.event_type === "pending"
  ).length;

  const storeName = (id: number | null) => {
    if (id === null) return "店舗なし";
    const store = stores.find((item) => item.id === id);
    return store ? getDisplayStoreName(store) : `店舗ID ${id}`;
  };

  const productName = (id: number | null) => {
    if (id === null) return "商品なし";
    return (
      products.find((item) => item.id === id)?.name ??
      `商品ID ${id}`
    );
  };

  const label: Record<string, string> = {
    submitted: "正常投稿",
    pending: "要確認 (Pending)",
    rate_limit_client: "Browser制限",
    rate_limit_ip: "IP制限",
    same_item_block: "同一商品制限",
    turnstile_block: "Turnstile拒否",
    invalid_request: "不正リクエスト",
    approved_by_admin: "管理者承認",
    rejected_by_admin: "管理者却下",
  };

  const filterOptions = [
    ["all", "すべて"],
    ["submitted", "正常投稿"],
    ["pending", "要確認 (Pending)"],
    ["approved_by_admin", "管理者承認"],
    ["rejected_by_admin", "管理者却下"],
    ["same_item_block", "同一商品制限"],
    ["rate_limit_client", "Browser制限"],
    ["rate_limit_ip", "IP制限"],
    ["turnstile_block", "Turnstile拒否"],
    ["invalid_request", "不正リクエスト"],
    ["blocked", "拒否・制限をまとめて表示"],
  ];

  const visibleEvents = useMemo(() => {
    const filtered = events.filter((event) => {
      if (eventFilter === "all") return true;
      if (eventFilter === "blocked") {
        return blockedTypes.includes(event.event_type);
      }
      return event.event_type === eventFilter;
    });

    return [...filtered].sort((a, b) => {
      if (sortOrder === "oldest") {
        return (
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
        );
      }
      if (sortOrder === "type") {
        return (label[a.event_type] ?? a.event_type).localeCompare(
          label[b.event_type] ?? b.event_type,
          "ja"
        );
      }
      if (sortOrder === "store") {
        return storeName(a.store_id).localeCompare(
          storeName(b.store_id),
          "ja"
        );
      }
      if (sortOrder === "report") {
        return (b.report_id ?? -1) - (a.report_id ?? -1);
      }
      return (
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
      );
    });
  }, [events, eventFilter, sortOrder, stores]);

  const visibleIds = visibleEvents.map((event) => event.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  useEffect(() => { setSelected((current) => current.filter((id) => events.some((event) => event.id === id))); }, [events]);
  const toggleSelected = (id: number) => setSelected((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);

  const originalEventFor = (event: SecurityEvent) => {
    if (event.report_id === null) return null;
    return (
      events.find(
        (item) =>
          item.report_id === event.report_id &&
          (item.event_type === "pending" ||
            item.event_type === "submitted")
      ) ?? null
    );
  };

  const linkedEventFor = (event: SecurityEvent) => {
    if (event.report_id === null) return null;
    if (
      event.event_type !== "pending" &&
      event.event_type !== "submitted"
    ) {
      return null;
    }
    return (
      events.find(
        (item) =>
          item.report_id === event.report_id &&
          (item.event_type === "approved_by_admin" ||
            item.event_type === "rejected_by_admin")
      ) ?? null
    );
  };

  return (
    <div className="mt-6">
      <h2 className="text-2xl font-bold">
        🛡️ セキュリティ履歴
      </h2>
      <p className="mt-2 text-gray-500">
        正常投稿を含め、投稿試行を種類別に絞り込み・並べ替えて確認できます。
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SecuritySummary label="24時間の全記録" value={last24h} />
        <SecuritySummary label="7日間の全記録" value={last7d} />
        <SecuritySummary label="24時間の拒否" value={blocked24h} />
        <SecuritySummary label="24時間の要確認" value={pending24h} />
      </div>

      <div className="mt-5 rounded-2xl border border-[#eaddea] bg-[#fcf9fc] p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-gray-600">
              種類で絞り込み
            </span>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#d9cbd7] bg-white px-3 py-2.5"
            >
              {filterOptions.map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-gray-600">
              並び順
            </span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#d9cbd7] bg-white px-3 py-2.5"
            >
              <option value="newest">新しい順</option>
              <option value="oldest">古い順</option>
              <option value="type">種類順</option>
              <option value="store">店舗名順</option>
              <option value="report">投稿番号順</option>
            </select>
          </label>
        </div>
        <div className="mt-3 text-sm text-gray-500">
          表示中: {visibleEvents.length.toLocaleString()}件 / 全{events.length.toLocaleString()}件
        </div>
      </div>

      {visibleEvents.length > 0 && <div className="mt-4"><BulkSelectionBar count={selected.length} allSelected={allVisibleSelected} onToggleAll={() => { if (allVisibleSelected) setSelected((c)=>c.filter(id=>!visibleIds.includes(id))); else setSelected((c)=>Array.from(new Set([...c,...visibleIds]))); }}><button disabled={!selected.length} onClick={()=>onDeleteSelected(selected)} className="rounded-xl bg-red-700 px-4 py-2 font-bold text-white disabled:opacity-40">選択した履歴を完全削除</button></BulkSelectionBar><div className="mt-2 text-xs text-gray-500">「全選択」は現在の絞り込み結果だけを選択します。</div></div>}

      {events.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
          セキュリティ履歴はまだありません。
        </div>
      ) : visibleEvents.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
          この条件に該当する履歴はありません。
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {visibleEvents.map((event) => (
            <details
              key={event.id}
              className="rounded-2xl border border-[#eaddea] bg-[#fcf9fc]"
            >
              <summary className="cursor-pointer select-none p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <SelectionCheckbox checked={selected.includes(event.id)} onChange={() => toggleSelected(event.id)} label={`セキュリティ履歴 #${event.id} を選択`} />
                    <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">
                        {label[event.event_type] ?? event.event_type}
                      </span>
                      {event.report_id !== null && (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                          投稿 #{event.report_id}
                        </span>
                      )}
                      {event.review_status && (
                        <span className="rounded-full bg-[#f0dfec] px-2.5 py-1 text-xs font-bold text-[#6d4966]">
                          {event.review_status}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {formatDate(event.created_at)}
                    </div>
                    <div className="mt-2 font-bold">
                      {storeName(event.store_id)}
                    </div>
                    <div className="mt-1 text-sm">
                      {productName(event.product_id)}
                      {event.stock_status
                        ? ` / ${formatInventoryValue(event.quantity,event.stock_status)}`
                        : event.quantity !== null
                          ? ` / ${formatInventoryValue(event.quantity,null)}`
                          : ""}
                    </div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-gray-500">
                    詳細 ▼
                  </div>
                </div>
              </summary>

              {event.report_id !== null && (
                <div className="mx-4 mb-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-sm">
                  <div className="font-bold text-blue-800">
                    投稿 #{event.report_id} の関連履歴
                  </div>
                  {(() => {
                    const original = originalEventFor(event);
                    const linked = linkedEventFor(event);
                    const source =
                      event.event_type === "approved_by_admin" ||
                      event.event_type === "rejected_by_admin"
                        ? original
                        : event;

                    return (
                      <div className="mt-2 space-y-1 text-gray-600">
                        {linked && (
                          <div>
                            処理結果:{" "}
                            <span className="font-bold">
                              {label[linked.event_type] ?? linked.event_type}
                            </span>{" "}
                            ({formatDate(linked.created_at)})
                          </div>
                        )}
                        {(event.event_type === "approved_by_admin" ||
                          event.event_type === "rejected_by_admin") &&
                          original && (
                            <div>
                              元の投稿記録:{" "}
                              {label[original.event_type] ??
                                original.event_type}{" "}
                              ({formatDate(original.created_at)})
                            </div>
                          )}
                        {source?.ip_address && (
                          <div>元投稿IP: {source.ip_address}</div>
                        )}
                        {source?.ip_hash && (
                          <div className="break-all">
                            元投稿IP hash: {source.ip_hash}
                          </div>
                        )}
                        {source?.client_hash && (
                          <div className="break-all">
                            元投稿Browser hash: {source.client_hash}
                          </div>
                        )}
                        {!linked &&
                          (event.event_type === "pending" ||
                            event.event_type === "submitted") && (
                            <div>
                              管理者処理: まだ関連する承認・却下記録はありません。
                            </div>
                          )}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="border-t border-[#eaddea] p-4">
                {event.reason && (
                  <div className="rounded-xl bg-white p-3">
                    <span className="font-bold">理由: </span>
                    {event.reason}
                  </div>
                )}
                {event.comment && (
                  <div className="mt-3 rounded-xl bg-white p-3">
                    💬 {event.comment}
                  </div>
                )}
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <SecurityValue label="生IP" value={event.ip_address} />
                  <SecurityValue label="IPハッシュ" value={event.ip_hash} mono />
                  <SecurityValue label="Browserハッシュ" value={event.client_hash} mono />
                  <SecurityValue label="イベントID" value={String(event.id)} />
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function SecuritySummary({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-[#eaddea] bg-[#fcf9fc] p-4">
      <div className="text-sm font-bold text-gray-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">
        {value.toLocaleString()}件
      </div>
    </div>
  );
}

function SecurityValue({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white p-3">
      <div className="text-xs font-bold text-gray-500">
        {label}
      </div>
      <div
        className={`mt-1 break-all text-sm ${mono ? "font-mono" : "font-bold"}`}
      >
        {value || "情報なし"}
      </div>
    </div>
  );
}

function BugReportsTab({ reports, checkingId, onCheck, onBulkCheck, onDeleteSelected, formatDate }: { reports: BugReport[]; checkingId: number | null; onCheck: (report: BugReport) => void; onBulkCheck: (ids: number[]) => void; onDeleteSelected: (ids: number[]) => void; formatDate: (value: string) => string; }) {
  const [imageUrls,setImageUrls]=useState<Record<string,string>>({}); const [selected,setSelected]=useState<number[]>([]); const unchecked=useMemo(()=>reports.filter(r=>!r.checked_at),[reports]); const checked=useMemo(()=>reports.filter(r=>Boolean(r.checked_at)),[reports]); const ids=reports.map(r=>r.id); const all=ids.length>0&&ids.every(id=>selected.includes(id)); const selectedUnchecked=selected.filter(id=>unchecked.some(r=>r.id===id));
  useEffect(()=>setSelected(c=>c.filter(id=>ids.includes(id))),[reports]); const toggle=(id:number)=>setSelected(c=>c.includes(id)?c.filter(x=>x!==id):[...c,id]);
  useEffect(()=>{let cancelled=false;async function load(){const paths=Array.from(new Set(reports.flatMap(r=>Array.isArray(r.image_urls)&&r.image_urls.length?r.image_urls:r.image_url?[r.image_url]:[])));const next:Record<string,string>={};await Promise.all(paths.map(async path=>{const {data,error}=await supabase.storage.from("bug-report-images").createSignedUrl(path,3600);if(!error&&data?.signedUrl)next[path]=data.signedUrl}));if(!cancelled)setImageUrls(next)}load();return()=>{cancelled=true}},[reports]);
  if(!reports.length)return <div className="mt-8 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">不具合・要望はありません。</div>;
  const wrapped=(r:BugReport,done:boolean)=><div key={r.id} className="flex items-start gap-3"><div className="pt-4"><SelectionCheckbox checked={selected.includes(r.id)} onChange={()=>toggle(r.id)} label={`不具合・要望 #${r.id} を選択`} /></div><div className="min-w-0 flex-1"><BugReportCard report={r} imageUrls={imageUrls} checked={done} checking={checkingId===r.id} onCheck={()=>onCheck(r)} formatDate={formatDate}/></div></div>;
  return <div className="mt-6"><h2 className="text-2xl font-bold">⚠️ 不具合・要望</h2><p className="mt-2 text-gray-500">未確認の報告だけを上に表示します。複数選択で一括確認・削除もできます。</p><div className="mt-5"><BulkSelectionBar count={selected.length} allSelected={all} onToggleAll={()=>setSelected(all?[]:ids)}><button disabled={!selectedUnchecked.length} onClick={()=>onBulkCheck(selectedUnchecked)} className="rounded-xl bg-green-700 px-4 py-2 font-bold text-white disabled:opacity-40">選択した未確認を一括確認済み</button><button disabled={!selected.length} onClick={()=>onDeleteSelected(selected)} className="rounded-xl bg-red-700 px-4 py-2 font-bold text-white disabled:opacity-40">選択した報告を完全削除</button></BulkSelectionBar></div>{!unchecked.length?<div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-5 text-center font-bold text-green-700">未確認の不具合・要望はありません。</div>:<div className="mt-4 space-y-4">{unchecked.map(r=>wrapped(r,false))}</div>}{checked.length>0&&<details className="mt-7 rounded-2xl border border-gray-200 bg-gray-50"><summary className="cursor-pointer px-5 py-4 font-bold text-gray-600">✓ 確認済みの報告 ({checked.length}件)</summary><div className="space-y-3 border-t border-gray-200 p-4">{checked.map(r=>wrapped(r,true))}</div></details>}</div>;
}

function BugReportCard({
  report,
  imageUrls,
  checked,
  checking,
  onCheck,
  formatDate,
}: {
  report: BugReport;
  imageUrls: Record<string, string>;
  checked: boolean;
  checking: boolean;
  onCheck: () => void;
  formatDate: (value: string) => string;
}) {
  const paths =
    Array.isArray(report.image_urls) &&
    report.image_urls.length > 0
      ? report.image_urls
      : report.image_url
        ? [report.image_url]
        : [];

  const browserName =
    report.browser === "その他" &&
    report.browser_other
      ? report.browser_other
      : report.browser;

  return (
    <details
      className={`rounded-2xl border ${
        checked
          ? "border-gray-200 bg-white/60 text-gray-600"
          : "border-[#e0c9db] bg-[#fcf9fc]"
      }`}
    >
      <summary className="cursor-pointer select-none list-none p-4 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`font-bold ${
                checked ? "text-gray-600" : "text-[#6d4966]"
              }`}>
                報告 #{report.id}
              </span>

              {checked ? (
                <span className="rounded-full bg-gray-200 px-2.5 py-1 text-xs font-bold text-gray-600">
                  確認済み
                </span>
              ) : (
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                  未確認
                </span>
              )}
            </div>

            <div className="mt-1 text-sm text-gray-500">
              {formatDate(report.created_at)}
            </div>

            <div className="mt-2 line-clamp-2 font-bold">
              {report.issue_description}
            </div>
          </div>

          <div className="text-sm font-bold text-gray-500">
            タップして開く ▼
          </div>
        </div>
      </summary>

      <div className="border-t border-[#eaddea] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {report.page_path && (
            <span className="rounded-full bg-[#f0dfec] px-3 py-1 text-xs font-bold text-[#6d4966]">
              {report.page_path}
            </span>
          )}

          {checked && report.checked_at && (
            <div className="text-sm text-gray-500">
              確認日時: {formatDate(report.checked_at)}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-xl bg-white p-4">
          <div className="text-sm font-bold text-gray-500">
            内容
          </div>
          <div className="mt-2 whitespace-pre-wrap text-base leading-7 text-[#211d21]">
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
              browserName,
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
            <div className="mt-2 whitespace-pre-wrap text-[#211d21]">
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
                      alt={`不具合・要望 ${report.id} 添付画像 ${index + 1}`}
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

        {!checked && (
          <div className="mt-5 border-t border-[#eaddea] pt-4">
            <button
              type="button"
              disabled={checking}
              onClick={onCheck}
              className="rounded-xl bg-[#211d21] px-5 py-3 font-bold text-white disabled:opacity-50"
            >
              {checking
                ? "処理中…"
                : "✓ 確認済みにする"}
            </button>
          </div>
        )}
      </div>
    </details>
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

function BillboardInfoRequestsTab({ requests, stores, processingId, onApprove, onReject, onDeleteProcessed, formatDate }: { requests: BillboardInfoRequest[]; stores: Store[]; processingId: number | null; onApprove: (request: BillboardInfoRequest) => void; onReject: (request: BillboardInfoRequest) => void; onDeleteProcessed: (ids: number[]) => void; formatDate: (value: string) => string; }) {
  const [selected,setSelected]=useState<number[]>([]); const pending=requests.filter(x=>x.status==="pending"); const processed=requests.filter(x=>x.status!=="pending"); const ids=processed.map(x=>x.id); const all=ids.length>0&&ids.every(id=>selected.includes(id));
  useEffect(()=>setSelected(c=>c.filter(id=>ids.includes(id))),[requests]); const toggle=(id:number)=>setSelected(c=>c.includes(id)?c.filter(x=>x!==id):[...c,id]); const storeName=(id:number)=>{const x=stores.find(s=>s.id===id);return x?getDisplayStoreName(x):`店舗ID ${id}`};
  const card=(r:BillboardInfoRequest,selectable=false)=><article key={r.id} className="rounded-2xl border border-[#e5d7e6] bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 flex-1 items-start gap-3">{selectable&&<SelectionCheckbox checked={selected.includes(r.id)} onChange={()=>toggle(r.id)} label={`Billboard履歴 #${r.id} を選択`} />}<div className="min-w-0 flex-1"><div className="text-lg font-bold">{storeName(r.store_id)}</div><div className="mt-2"><span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800">{r.proposed_status==="target"?"Billboard 対象":"Billboard 対象外"}</span>{r.status!=="pending"&&<span className={"ml-2 rounded-full px-3 py-1 text-xs font-bold "+(r.status==="approved"?"bg-green-100 text-green-700":"bg-red-100 text-red-700")}>{r.status==="approved"?"承認済み":"却下済み"}</span>}</div><div className="mt-3 text-sm font-bold text-gray-600">確認できるソースURL・エビデンス</div><div className="mt-1 whitespace-pre-wrap break-words rounded-xl bg-[#f8f4f7] p-3 text-sm">{r.evidence}</div><div className="mt-3 text-xs text-gray-500">受付: {formatDate(r.requested_at)}</div>{r.reviewed_at&&<div className="mt-1 text-xs text-gray-500">処理: {formatDate(r.reviewed_at)}</div>}</div></div>{r.status==="pending"&&<div className="flex gap-2"><button disabled={processingId===r.id} onClick={()=>onApprove(r)} className="rounded-xl bg-green-700 px-5 py-3 font-bold text-white">内容確認済み・反映</button><button disabled={processingId===r.id} onClick={()=>onReject(r)} className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white">却下</button></div>}</div></article>;
  return <div className="mt-6"><h2 className="text-2xl font-bold">📊 Billboard情報提供</h2><p className="mt-2 text-gray-500">以前のBillboard情報提供機能から送信された履歴です。未処理のものがある場合はこちらで確認してください。</p>{!pending.length?<div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5 text-center font-bold text-green-700">未処理のBillboard情報提供はありません。</div>:<div className="mt-5 space-y-4">{pending.map(r=>card(r))}</div>}<details className="mt-7 rounded-2xl border border-gray-200 bg-gray-50"><summary className="cursor-pointer px-5 py-4 font-bold text-gray-600">処理済みの履歴 ({processed.length}件)</summary><div className="border-t border-gray-200 p-4">{processed.length>0&&<BulkSelectionBar count={selected.length} allSelected={all} onToggleAll={()=>setSelected(all?[]:ids)}><button disabled={!selected.length} onClick={()=>onDeleteProcessed(selected)} className="rounded-xl bg-red-700 px-4 py-2 font-bold text-white disabled:opacity-40">選択した履歴を完全削除</button></BulkSelectionBar>}<div className="mt-3 space-y-3">{processed.length?processed.map(r=>card(r,true)):<div className="py-3 text-center text-sm text-gray-500">処理済みの履歴はありません。</div>}</div></div></details></div>;
}

function StoreRequestsTab({
  requests,
  edit,
  setEdit,
  startEdit,
  onApprove,
  onReject,
  processingId,
  onDeleteProcessed,
  onEditApprovedStore,
  approvedStoreEdit,
  setApprovedStoreEdit,
  approvedStoreEditLoading,
  approvedStoreSaving,
  onSaveApprovedStore,
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
  onDeleteProcessed: (ids: number[]) => void;
  onEditApprovedStore: (storeId: number) => void;
  approvedStoreEdit: EditableStore | null;
  setApprovedStoreEdit: React.Dispatch<
    React.SetStateAction<EditableStore | null>
  >;
  approvedStoreEditLoading: boolean;
  approvedStoreSaving: boolean;
  onSaveApprovedStore: () => void;
  formatDate: (
    value: string
  ) => string;
}) {
  const pendingRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status === "pending"
      ),
    [requests]
  );

  const [selectedProcessed, setSelectedProcessed] = useState<number[]>([]);

  const processedRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status !== "pending"
      ),
    [requests]
  );

  const processedIds = processedRequests.map((request) => request.id);
  const allProcessedSelected = processedIds.length > 0 && processedIds.every((id) => selectedProcessed.includes(id));
  useEffect(() => { setSelectedProcessed((current) => current.filter((id) => processedIds.includes(id))); }, [requests]);
  const toggleProcessed = (id: number) => setSelectedProcessed((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);

  return (
    <div className="mt-6">
      <div className="mb-5">
        <h2 className="text-2xl font-bold">
          🏪 店舗追加リクエスト
        </h2>

        <p className="mt-2 text-gray-500">
          未処理のリクエストだけを上に表示します。承認・却下後は履歴に移動します。
        </p>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center font-bold text-green-700">
          未処理の店舗追加リクエストはありません。
        </div>
      ) : (
        <div className="space-y-5">
          {pendingRequests.map(
            (request) => (
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
                        status={request.status}
                      />
                    </div>

                    <div className="mt-2 text-sm text-gray-600">
                      📍 {request.prefecture}
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
                        💬 {request.comment}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        startEdit(request)
                      }
                      className="rounded-xl bg-[#6f4b89] px-4 py-2.5 font-bold text-white"
                    >
                      内容を確認・編集
                    </button>

                    <button
                      type="button"
                      disabled={
                        processingId === request.id
                      }
                      onClick={() =>
                        onReject(request)
                      }
                      className="rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white disabled:opacity-50"
                    >
                      却下
                    </button>
                  </div>
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
                        value={edit.chainName}
                        onChange={(value) =>
                          setEdit({
                            ...edit,
                            chainName: value,
                          })
                        }
                      />

                      <AdminInput
                        label="店舗名"
                        value={edit.name}
                        onChange={(value) =>
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
                          value={edit.storeType}
                          onChange={(event) => {
                            const type =
                              event.target.value as
                                | "physical"
                                | "online";

                            setEdit({
                              ...edit,
                              storeType: type,
                              prefecture:
                                type === "online"
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
                        value={edit.prefecture}
                        disabled={
                          edit.storeType ===
                          "online"
                        }
                        onChange={(value) =>
                          setEdit({
                            ...edit,
                            prefecture: value,
                          })
                        }
                      />

                      {edit.storeType ===
                        "physical" && (
                        <AdminInput
                          label="市区町村"
                          value={edit.city}
                          onChange={(value) =>
                            setEdit({
                              ...edit,
                              city: value,
                            })
                          }
                        />
                      )}

                      <AdminInput
                        label="住所"
                        value={edit.address}
                        onChange={(value) =>
                          setEdit({
                            ...edit,
                            address: value,
                          })
                        }
                      />

                      <AdminInput
                        label="電話番号"
                        value={edit.phone}
                        onChange={(value) =>
                          setEdit({
                            ...edit,
                            phone: value,
                          })
                        }
                      />

                      <AdminInput
                        label="営業時間"
                        placeholder="例: 10:00～21:00"
                        value={edit.businessHours}
                        onChange={(value) =>
                          setEdit({
                            ...edit,
                            businessHours: value,
                          })
                        }
                      />

                      <AdminInput
                        label="公式店舗URL"
                        value={edit.officialUrl}
                        onChange={(value) =>
                          setEdit({
                            ...edit,
                            officialUrl: value,
                          })
                        }
                      />

                      <AdminInput
                        label="オンラインURL"
                        value={edit.onlineUrl}
                        onChange={(value) =>
                          setEdit({
                            ...edit,
                            onlineUrl: value,
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
                          onChange={(event) =>
                            setEdit({
                              ...edit,
                              oriconTarget:
                                event.target
                                  .value === "true",
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
                          onChange={(event) =>
                            setEdit({
                              ...edit,
                              billboardStatus:
                                event.target
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
                        onClick={onApprove}
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
            )
          )}
        </div>
      )}

      {approvedStoreEdit && (
        <div className="mt-7 rounded-2xl border-2 border-[#b98aaf] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold">
                ✏️ 登録済み店舗を編集
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                店舗ID: {approvedStoreEdit.id}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setApprovedStoreEdit(null)}
              className="rounded-xl border border-gray-300 px-4 py-2 font-bold"
            >
              閉じる
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              ["店舗名", "name"],
              ["チェーン名", "chain_name"],
              ["都道府県", "prefecture"],
              ["市区町村", "city"],
              ["住所", "address"],
              ["電話番号", "phone"],
              ["営業時間", "business_hours"],
              ["公式URL", "official_url"],
              ["オンラインURL", "online_url"],
            ].map(([label, key]) => (
              <label
                key={key}
                className={
                  key === "address" ||
                  key === "official_url" ||
                  key === "online_url"
                    ? "md:col-span-2"
                    : ""
                }
              >
                <div className="mb-1 font-bold">
                  {label}
                </div>
                <input
                  value={
                    String(
                      approvedStoreEdit[
                        key as keyof EditableStore
                      ] ?? ""
                    )
                  }
                  onChange={(event) =>
                    setApprovedStoreEdit(
                      (current) =>
                        current
                          ? {
                              ...current,
                              [key]: event.target.value,
                            }
                          : current
                    )
                  }
                  placeholder={
                    key === "chain_name"
                      ? "チェーン店でなければ空欄"
                      : undefined
                  }
                  className="w-full rounded-xl border border-[#d9c9d8] bg-white p-3 text-[#211d21]"
                />
                {key === "chain_name" && (
                  <div className="mt-1 text-xs text-gray-500">
                    チェーン店でなければ空欄。「なし」は保存時に空欄扱いです。
                  </div>
                )}
              </label>
            ))}
          </div>

          <button
            type="button"
            disabled={approvedStoreSaving}
            onClick={onSaveApprovedStore}
            className="mt-5 rounded-xl bg-[#211d21] px-6 py-3 font-bold text-white disabled:opacity-50"
          >
            {approvedStoreSaving
              ? "保存中…"
              : "この内容で店舗情報を更新"}
          </button>
        </div>
      )}

      {processedRequests.length > 0 && (
        <details className="mt-7 rounded-2xl border border-gray-200 bg-gray-50">
          <summary className="cursor-pointer select-none px-5 py-4 font-bold text-gray-600">
            履歴: 承認済み・却下 ({processedRequests.length}件)
          </summary>

          <div className="border-t border-gray-200 p-4">
            <BulkSelectionBar count={selectedProcessed.length} allSelected={allProcessedSelected} onToggleAll={() => setSelectedProcessed(allProcessedSelected ? [] : processedIds)}><button disabled={!selectedProcessed.length} onClick={() => onDeleteProcessed(selectedProcessed)} className="rounded-xl bg-red-700 px-4 py-2 font-bold text-white disabled:opacity-40">選択した履歴を完全削除</button></BulkSelectionBar>
            <div className="mt-3 space-y-3">
            {processedRequests.map(
              (request) => (
                <details
                  key={request.id}
                  className="rounded-xl border border-gray-200 bg-white/60 text-gray-600"
                >
                  <summary className="cursor-pointer select-none p-4">
                    <div className="inline-flex flex-wrap items-center gap-2">
                      <SelectionCheckbox checked={selectedProcessed.includes(request.id)} onChange={() => toggleProcessed(request.id)} label={`店舗リクエスト履歴 #${request.id} を選択`} />
                      <span className="font-bold">
                        {request.chain_name
                          ? `${request.chain_name} `
                          : ""}
                        {request.name}
                      </span>
                      <RequestStatus
                        status={request.status}
                      />
                    </div>
                  </summary>

                  <div className="border-t border-gray-200 px-4 pb-4 pt-3 text-sm">
                    <div>
                      📍 {request.prefecture}
                      {request.city
                        ? ` ${request.city}`
                        : ""}
                    </div>

                    <div className="mt-1">
                      申請日時:{" "}
                      {formatDate(
                        request.requested_at
                      )}
                    </div>

                    {request.reviewed_at && (
                      <div className="mt-1">
                        対応日時:{" "}
                        {formatDate(
                          request.reviewed_at
                        )}
                      </div>
                    )}

                    {request.comment && (
                      <div className="mt-3 rounded-lg bg-gray-50 p-3">
                        💬 {request.comment}
                      </div>
                    )}

                    {request.status === "approved" &&
                      request.approved_store_id && (
                        <button
                          type="button"
                          disabled={approvedStoreEditLoading}
                          onClick={() =>
                            onEditApprovedStore(
                              request.approved_store_id as number
                            )
                          }
                          className="mt-4 rounded-xl bg-[#6f4b89] px-4 py-2.5 font-bold text-white disabled:opacity-50"
                        >
                          {approvedStoreEditLoading
                            ? "読み込み中…"
                            : "登録した店舗を編集"}
                        </button>
                      )}
                  </div>
                </details>
              )
            )}
            </div>
          </div>
        </details>
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

function SelectionCheckbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="inline-flex shrink-0 cursor-pointer items-center gap-2" onClick={(event) => event.stopPropagation()}>
      <input type="checkbox" checked={checked} onChange={onChange} className="h-5 w-5 accent-[#6f4b89]" aria-label={label} />
    </label>
  );
}

function BulkSelectionBar({ count, allSelected, onToggleAll, children }: { count: number; allSelected: boolean; onToggleAll: () => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#e4d7e3] bg-[#f8f3f7] p-3">
      <label className="inline-flex cursor-pointer items-center gap-2 font-bold text-[#6d4966]">
        <input type="checkbox" checked={allSelected} onChange={onToggleAll} className="h-5 w-5 accent-[#6f4b89]" />
        全選択
      </label>
      <span className="text-sm text-gray-500">選択中 {count}件</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
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
  reports, stores, products, deletingId, onDelete, onBulkDelete, formatDate,
}: {
  reports: InventoryReport[]; stores: Store[]; products: Product[]; deletingId: number | null;
  onDelete: (report: InventoryReport) => void; onBulkDelete: (ids: number[]) => void; formatDate: (value: string) => string;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const ids = reports.map((r) => r.id);
  const allSelected = ids.length > 0 && ids.every((id) => selected.includes(id));
  useEffect(() => { setSelected((current) => current.filter((id) => ids.includes(id))); }, [reports]);
  const toggle = (id: number) => setSelected((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  if (!reports.length) return <div className="mt-8 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">在庫投稿はありません。</div>;
  return <div className="mt-6 space-y-4">
    <BulkSelectionBar count={selected.length} allSelected={allSelected} onToggleAll={() => setSelected(allSelected ? [] : ids)}>
      <button type="button" disabled={!selected.length} onClick={() => onBulkDelete(selected)} className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white disabled:opacity-40">選択した投稿を削除</button>
    </BulkSelectionBar>
    {reports.map((report) => {
      const store=stores.find((x)=>x.id===report.store_id); const product=products.find((x)=>x.id===report.product_id);
      return <article key={report.id} className="rounded-2xl border border-[#eaddea] bg-[#fcf9fc] p-4"><div className="flex flex-wrap items-start justify-between gap-5"><div className="flex min-w-0 flex-1 items-start gap-3"><SelectionCheckbox checked={selected.includes(report.id)} onChange={()=>toggle(report.id)} label={`投稿 #${report.id} を選択`} /><div><div className="text-lg font-bold">{store?getDisplayStoreName(store):"店舗不明"}</div><div className="mt-3">{product?.name??"商品不明"}</div><div className="mt-1 font-bold text-[#b95489]">{formatInventoryValue(report.quantity,report.stock_status)}</div><div className="mt-1 text-sm text-gray-500">{formatDate(report.created_at)}</div>{report.comment&&<div className="mt-3 rounded-xl bg-white p-3">💬 {report.comment}</div>}</div></div><button type="button" disabled={deletingId===report.id} onClick={()=>onDelete(report)} className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white disabled:opacity-50">削除</button></div></article>;
    })}
  </div>;
}

function UserDeletionHistoryTab({
  deletions,
  stores,
  products,
  formatDate,
}: {
  deletions: UserDeletionHistory[];
  stores: Store[];
  products: Product[];
  formatDate: (value: string) => string;
}) {
  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl border border-[#eaddea] bg-[#fcf9fc] p-4">
        <h2 className="text-xl font-bold">
          👤 ユーザー自己削除履歴
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          ユーザーが「自分の投稿を削除」から取り消した在庫投稿です。
          ブラウザ識別用のハッシュ値は管理画面には表示しません。
        </p>
      </div>

      {deletions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
          ユーザーによる自己削除履歴はまだありません。
        </div>
      ) : (
        deletions.map((deletion) => {
          const store = stores.find(
            (item) => item.id === deletion.store_id
          );

          const product = products.find(
            (item) => item.id === deletion.product_id
          );

          return (
            <article
              key={deletion.id}
              className="rounded-2xl border border-[#eaddea] bg-[#fcf9fc] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold">
                    {store
                      ? getDisplayStoreName(store)
                      : `店舗ID: ${deletion.store_id}`}
                  </div>

                  <div className="mt-2">
                    {product?.name ??
                      `商品ID: ${deletion.product_id}`}
                  </div>

                  <div className="mt-1 font-bold text-[#6d4966]">
                    {formatInventoryValue(
                      deletion.quantity,
                      deletion.stock_status
                    )}
                  </div>

                  {deletion.comment && (
                    <div className="mt-3 rounded-xl bg-white p-3 text-sm leading-6 text-gray-700">
                      💬 {deletion.comment}
                    </div>
                  )}

                  <div className="mt-3 space-y-1 text-sm text-gray-500">
                    <div>
                      元の投稿日時: 
                      {formatDate(
                        deletion.original_created_at
                      )}
                    </div>
                    <div>
                      自己削除日時: 
                      {formatDate(deletion.deleted_at)}
                    </div>
                    <div>
                      元投稿ID: #{deletion.original_report_id}
                    </div>
                  </div>
                </div>

                <span className="rounded-full bg-[#f0dfec] px-3 py-1.5 text-xs font-bold text-[#6d4966]">
                  ユーザー自身が削除
                </span>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}

function DeletionHistoryTab({ deletions, stores, products, restoringId, onRestore, onBulkRestore, onDeleteHistory, formatDate }: {
  deletions: DeletionHistory[]; stores: Store[]; products: Product[]; restoringId: number | null; onRestore: (deletion: DeletionHistory) => void; onBulkRestore: (ids: number[]) => void; onDeleteHistory: (ids: number[]) => void; formatDate: (value: string) => string;
}) {
  const [selected,setSelected]=useState<number[]>([]); const ids=deletions.map(d=>d.id); const all=ids.length>0&&ids.every(id=>selected.includes(id));
  useEffect(()=>setSelected(c=>c.filter(id=>ids.includes(id))),[deletions]); const toggle=(id:number)=>setSelected(c=>c.includes(id)?c.filter(x=>x!==id):[...c,id]); const restorable=selected.filter(id=>!deletions.find(d=>d.id===id)?.restored_at);
  return <div className="mt-6 space-y-4">{deletions.length>0&&<BulkSelectionBar count={selected.length} allSelected={all} onToggleAll={()=>setSelected(all?[]:ids)}><button disabled={!restorable.length} onClick={()=>onBulkRestore(restorable)} className="rounded-xl bg-[#6f4b89] px-4 py-2 font-bold text-white disabled:opacity-40">選択した未復元を一括復元</button><button disabled={!selected.length} onClick={()=>onDeleteHistory(selected)} className="rounded-xl bg-red-700 px-4 py-2 font-bold text-white disabled:opacity-40">選択した履歴を完全削除</button></BulkSelectionBar>}{!deletions.length&&<div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">削除履歴はありません。</div>}{deletions.map(d=>{const store=stores.find(x=>x.id===d.store_id);const product=products.find(x=>x.id===d.product_id);const restored=Boolean(d.restored_at);return <article key={d.id} className="rounded-2xl border border-[#eaddea] bg-[#fcf9fc] p-4"><div className="flex flex-wrap items-start justify-between gap-5"><div className="flex items-start gap-3"><SelectionCheckbox checked={selected.includes(d.id)} onChange={()=>toggle(d.id)} label={`削除履歴 #${d.id} を選択`} /><div><div className="text-lg font-bold">{store?getDisplayStoreName(store):"店舗不明"}</div><div className="mt-2">{product?.name??"商品不明"}</div><div className="mt-1 font-bold">{formatInventoryValue(d.quantity,d.stock_status)}</div><div className="mt-2 text-sm text-gray-500">削除: {formatDate(d.deleted_at)}</div>{restored&&<div className="mt-1 text-sm font-bold text-green-700">復元済み</div>}</div></div>{!restored&&<button disabled={restoringId===d.id} onClick={()=>onRestore(d)} className="rounded-xl bg-[#6f4b89] px-5 py-3 font-bold text-white disabled:opacity-50">復元</button>}</div></article>})}</div>;
}

function SalesTab({
  salesData,
  salesDate,
  todaySales,
  weeklySales,
  totalSales,
  salesGoal,
  setSalesDate,
  setTodaySales,
  setSalesGoal,
  salesUpdating,
  onSubmit,
  formatDate,
}: {
  salesData: SalesSummary | null;
  salesDate: string;
  todaySales: string;
  weeklySales: string;
  totalSales: string;
  salesGoal: string;
  setSalesDate: (
    value: string
  ) => void;
  setTodaySales: (
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
  const displayAutoValue = (
    value: string
  ) => {
    const trimmed =
      value.trim();

    if (
      trimmed === "" ||
      trimmed === "-" ||
      trimmed === "－" ||
      trimmed === "ー" ||
      trimmed === "―"
    ) {
      return "－";
    }

    const number =
      Number(trimmed);

    return Number.isFinite(number)
      ? `${number.toLocaleString()}枚`
      : "－";
  };

  const selectedWeek =
    getWeekRangeFromDateKey(
      salesDate
    );

  return (
    <div className="mt-6 rounded-3xl border border-[#eaddea] bg-[#fcf9fc] p-5 md:p-7">
      <h2 className="text-2xl font-bold">
        📈 売上情報
      </h2>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        「何日付の売上か」を指定して入力します。
        登録後は次の日へ自動で進みます。
        過去の日付を選べば、その日の数字を修正できます。
        週は月曜日〜日曜日で自動集計します。
      </p>

      {salesData && (
        <div className="mt-3 rounded-xl bg-white p-3 text-sm text-gray-600">
          <div>
            現在公開中: 
            <b className="ml-1">
              {formatShortDateKey(
                salesData.sales_date
              )}付
            </b>
          </div>

          <div className="mt-1">
            週: 
            {formatShortDateKey(
              salesData.week_start
            )}
            〜
            {formatShortDateKey(
              salesData.week_end
            )}
          </div>

          <div className="mt-1 text-xs text-gray-500">
            最終更新: 
            {formatDate(
              salesData.updated_at
            )}
          </div>
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="mt-6"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label className="rounded-xl border border-[#e3d6e2] bg-white p-4">
            <div className="font-bold">
              📅 売上対象日
            </div>

            <input
              type="date"
              value={salesDate}
              onChange={(event) =>
                setSalesDate(
                  event.target.value
                )
              }
              className="mt-3 w-full rounded-xl border border-[#d9c9d8] bg-white p-3 text-base text-[#211d21]"
            />

            <div className="mt-2 text-xs text-gray-500">
              保存後、次の入力日は自動で
              {formatShortDateKey(
                addDaysToDateKey(
                  salesDate,
                  1
                )
              )}
              に進みます。
            </div>
          </label>

          <SalesInput
            label={`📊 ${formatShortDateKey(salesDate)}付の売上`}
            value={todaySales}
            onChange={setTodaySales}
            allowDash
          />

          <div className="rounded-xl border border-[#e3d6e2] bg-[#f5eef4] p-4">
            <div className="font-bold">
              📅 対象週(月〜日)
            </div>

            <div className="mt-2 text-xl font-bold text-[#6d4966]">
              {formatShortDateKey(
                selectedWeek.start
              )}
              〜
              {formatShortDateKey(
                selectedWeek.end
              )}
            </div>

            <div className="mt-1 text-xs text-gray-500">
              保存時に日別売上から自動再計算
            </div>
          </div>

          <div className="rounded-xl border border-[#e3d6e2] bg-[#f5eef4] p-4">
            <div className="font-bold">
              📊 現在公開中の週売上
            </div>

            <div className="mt-2 text-2xl font-bold text-[#6d4966]">
              {displayAutoValue(
                weeklySales
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[#e3d6e2] bg-[#f5eef4] p-4">
            <div className="font-bold">
              👑 現在の累計売上
            </div>

            <div className="mt-2 text-2xl font-bold text-[#6d4966]">
              {displayAutoValue(
                totalSales
              )}
            </div>

            <div className="mt-1 text-xs text-gray-500">
              保存後、自動で再計算
            </div>
          </div>

          <SalesInput
            label="🎯 目標枚数"
            value={salesGoal}
            onChange={setSalesGoal}
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
            : `${formatShortDateKey(salesDate)}付の売上を反映`}
        </button>
      </form>
    </div>
  );
}

function SalesInput({
  label,
  value,
  onChange,
  allowDash = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowDash?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-2 font-bold">
        {label}
      </div>

      <input
        type="text"
        inputMode={allowDash ? "text" : "numeric"}
        value={value}
        onChange={(event) => {
          const next = event.target.value;

          if (next === "") {
            onChange("");
            return;
          }

          if (
            allowDash &&
            ["-", "－", "ー", "―"].includes(next)
          ) {
            onChange("-");
            return;
          }

          if (/^[0-9]+$/.test(next)) {
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

  const rawChain =
    (
      store.chain_name ??
      ""
    ).trim();

  const chain =
    ["なし", "無し", "なし。", "なしです"].includes(
      rawChain
    )
      ? ""
      : rawChain;

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