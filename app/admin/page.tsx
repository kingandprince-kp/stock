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
  today_sales: number | null;
  weekly_sales: number | null;
  total_sales: number | null;
  goal: number;
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
  | "store-history"
  | "requests"
  | "billboard"
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

  const [storeChangeHistory, setStoreChangeHistory] =
    useState<StoreChangeHistory[]>([]);

  const [storeRequests, setStoreRequests] =
    useState<StoreRequest[]>([]);

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
          created_at,
          checked_at
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
  // 不具合報告を確認済みにする
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
      `不具合報告 #${report.id} を確認済みにしました。`
    );
    setBugCheckingId(null);
  }

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
        const formatSalesInputValue = (
          value: number | null | undefined
        ) =>
          value == null || String(value).toLowerCase() === "null"
            ? "-"
            : String(value);

        setTodaySales(
          formatSalesInputValue(latest.today_sales)
        );

        setWeeklySales(
          formatSalesInputValue(latest.weekly_sales)
        );

        setTotalSales(
          formatSalesInputValue(latest.total_sales)
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
        loadReviewReports(),
        loadSecurityEvents(),
        loadDeletionHistory(),
        loadStoreChangeHistory(),
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
      loadStoreChangeHistory,
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
            setStoreChangeHistory([]);
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
    if (!window.confirm(`選択した${ids.length}件の不具合報告を確認済みにしますか？`)) return;
    await runBulkRpc("bulk_mark_bug_reports_checked_admin", { p_report_ids: ids }, `${ids.length}件の不具合報告を確認済みにしました。`);
  }

  async function handleDeleteBugReports(ids: number[]) {
    if (!ids.length) return;
    if (!window.confirm(`選択した${ids.length}件の不具合報告を完全に削除します。\nこの操作は元に戻せません。`)) return;
    await runBulkRpc("bulk_delete_bug_reports_admin", { p_report_ids: ids }, `${ids.length}件の不具合報告を削除しました。`);
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

    function parseSalesValue(
      value: string
    ): number | null | "invalid" {
      const trimmed = value.trim();

      if (
        trimmed === "-" ||
        trimmed === "－" ||
        trimmed === "ー" ||
        trimmed === "―"
      ) {
        return null;
      }

      const number = Number(trimmed);

      if (
        !Number.isInteger(number) ||
        number < 0
      ) {
        return "invalid";
      }

      return number;
    }

    const today = parseSalesValue(todaySales);
    const week = parseSalesValue(weeklySales);
    const total = parseSalesValue(totalSales);
    const goal = Number(salesGoal);

    if (today === "invalid") {
      setErrorMessage(
        "本日の売上は「-」または0以上の整数で入力してください。"
      );
      return;
    }

    if (week === "invalid") {
      setErrorMessage(
        "今週の売上は「-」または0以上の整数で入力してください。"
      );
      return;
    }

    if (total === "invalid") {
      setErrorMessage(
        "累計売上は「-」または0以上の整数で入力してください。"
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

    const displaySales = (
      value: number | null
    ) =>
      value === null
        ? "－"
        : `${value.toLocaleString()}枚`;

    const confirmed = window.confirm(
      `売上情報を更新します。\n\n本日: ${displaySales(today)}\n今週: ${displaySales(week)}\n累計: ${displaySales(total)}\n目標: ${goal.toLocaleString()}枚`
    );

    if (!confirmed) return;

    setSalesUpdating(true);

    const { error } = await supabase.rpc(
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

          {/* 10タブ */}
          <div className="mt-7 grid grid-cols-2 gap-2 rounded-2xl bg-[#f5edf4] p-2 md:grid-cols-3 lg:grid-cols-10">
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
              active={activeTab === "store-history"}
              onClick={() => setActiveTab("store-history")}
            >
              🏪 店舗履歴
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
                activeTab === "billboard"
              }
              onClick={() =>
                setActiveTab("billboard")
              }
            >
              📊 Billboard情報
              {pendingBillboardInfoCount > 0 && (
                <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                  {pendingBillboardInfoCount}
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
              ⚠️ 不具合報告
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
            "store-history" ? (
            <StoreChangeHistoryTab
              history={storeChangeHistory}
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
              formatDate={
                formatDate
              }
            />
          ) : activeTab ===
            "billboard" ? (
            <BillboardInfoRequestsTab
              requests={billboardInfoRequests}
              stores={stores}
              processingId={billboardProcessingId}
              onApprove={handleApproveBillboardInfo}
              onReject={handleRejectBillboardInfo}
              onDeleteProcessed={handleDeleteBillboardHistory}
              formatDate={formatDate}
            />
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

function ReviewReportsTab({ reports, stores, products, processingId, onApprove, onReject, onBulkReview, onDeleteHistory, formatDate }: {
  reports: ReviewReport[]; stores: Store[]; products: Product[]; processingId: number | null;
  onApprove: (report: ReviewReport) => void; onReject: (report: ReviewReport) => void;
  onBulkReview: (ids: number[], action: "approve" | "reject") => void; onDeleteHistory: (ids: number[]) => void; formatDate: (value: string) => string;
}) {
  const [pendingSel,setPendingSel]=useState<number[]>([]); const [historySel,setHistorySel]=useState<number[]>([]);
  const pending=reports.filter(r=>r.review_status==="pending"); const approved=reports.filter(r=>r.review_status==="approved"&&Boolean(r.reviewed_at)); const rejected=reports.filter(r=>r.review_status==="rejected");
  const pids=pending.map(r=>r.id); const hids=[...approved,...rejected].map(r=>r.id);
  useEffect(()=>{setPendingSel(c=>c.filter(id=>pids.includes(id)));setHistorySel(c=>c.filter(id=>hids.includes(id)));},[reports]);
  const storeName=(id:number)=>{const x=stores.find(s=>s.id===id);return x?getDisplayStoreName(x):"店舗不明"}; const productName=(id:number)=>products.find(p=>p.id===id)?.name??"商品不明";
  const tp=(id:number)=>setPendingSel(c=>c.includes(id)?c.filter(x=>x!==id):[...c,id]); const th=(id:number)=>setHistorySel(c=>c.includes(id)?c.filter(x=>x!==id):[...c,id]);
  const hist=(r:ReviewReport,label:"承認"|"却下")=><article key={r.id} className="rounded-xl border border-gray-200 bg-white p-4 text-gray-600"><div className="flex items-start gap-3"><SelectionCheckbox checked={historySel.includes(r.id)} onChange={()=>th(r.id)} label={`履歴 #${r.id} を選択`} /><div><div className="flex flex-wrap items-center gap-2"><b>{storeName(r.store_id)}</b><span className={"rounded-full px-2.5 py-1 text-xs font-bold "+(label==="承認"?"bg-green-100 text-green-700":"bg-red-100 text-red-700")}>{label}済み</span></div><div className="mt-1">{productName(r.product_id)}</div><div className="mt-1">{r.quantity===0?"在庫なし":`${r.quantity}枚`}</div><div className="mt-1 text-sm">投稿: {formatDate(r.created_at)}</div>{r.reviewed_at&&<div className="mt-1 text-sm">{label}: {formatDate(r.reviewed_at)}</div>}{r.review_reason&&<div className="mt-2 text-sm">判定理由: {r.review_reason}</div>}</div></div></article>;
  return <div className="mt-6"><h2 className="text-2xl font-bold">🔎 要確認の在庫投稿</h2><p className="mt-2 text-gray-500">自動判定で保留になった投稿です。承認するまで公開ページには表示されません。</p>
    {pending.length>0&&<div className="mt-5"><BulkSelectionBar count={pendingSel.length} allSelected={pids.every(id=>pendingSel.includes(id))} onToggleAll={()=>setPendingSel(pids.every(id=>pendingSel.includes(id))?[]:pids)}><button disabled={!pendingSel.length} onClick={()=>onBulkReview(pendingSel,"approve")} className="rounded-xl bg-green-700 px-4 py-2 font-bold text-white disabled:opacity-40">一括承認・公開</button><button disabled={!pendingSel.length} onClick={()=>onBulkReview(pendingSel,"reject")} className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white disabled:opacity-40">一括却下</button></BulkSelectionBar></div>}
    {!pending.length?<div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5 text-center font-bold text-green-700">現在、要確認の投稿はありません。</div>:<div className="mt-4 space-y-4">{pending.map(r=><article key={r.id} className="rounded-2xl border border-orange-200 bg-orange-50 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><SelectionCheckbox checked={pendingSel.includes(r.id)} onChange={()=>tp(r.id)} label={`投稿 #${r.id} を選択`} /><div><div className="text-lg font-bold">{storeName(r.store_id)}</div><div className="mt-2">{productName(r.product_id)}</div><div className="mt-1 font-bold text-[#b95489]">{r.quantity===0?"在庫なし":`${r.quantity}枚`}</div><div className="mt-1 text-sm text-gray-500">{formatDate(r.created_at)}</div>{r.comment&&<div className="mt-3 rounded-xl bg-white p-3">💬 {r.comment}</div>}<div className="mt-3 rounded-xl bg-white p-3 text-sm"><b>判定理由: </b>{r.review_reason||"理由なし"}</div></div></div><div className="flex gap-2"><button disabled={processingId===r.id} onClick={()=>onApprove(r)} className="rounded-xl bg-green-700 px-5 py-3 font-bold text-white">承認・公開</button><button disabled={processingId===r.id} onClick={()=>onReject(r)} className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white">却下</button></div></div></article>)}</div>}
    <div className="mt-7"><BulkSelectionBar count={historySel.length} allSelected={hids.length>0&&hids.every(id=>historySel.includes(id))} onToggleAll={()=>setHistorySel(hids.length>0&&hids.every(id=>historySel.includes(id))?[]:hids)}><button disabled={!historySel.length} onClick={()=>onDeleteHistory(historySel)} className="rounded-xl bg-red-700 px-4 py-2 font-bold text-white disabled:opacity-40">選択した履歴を削除</button></BulkSelectionBar></div>
    <div className="mt-3 space-y-3"><details className="rounded-2xl border border-green-200 bg-green-50/50"><summary className="cursor-pointer px-5 py-4 font-bold text-green-700">承認済みの履歴 ({approved.length}件)</summary><div className="space-y-3 border-t border-green-200 p-4">{approved.length?approved.map(r=>hist(r,"承認")):<div className="text-sm text-gray-500">承認済みの履歴はありません。</div>}</div></details><details className="rounded-2xl border border-gray-200 bg-gray-50"><summary className="cursor-pointer px-5 py-4 font-bold text-gray-600">却下済みの履歴 ({rejected.length}件)</summary><div className="space-y-3 border-t border-gray-200 p-4">{rejected.length?rejected.map(r=>hist(r,"却下")):<div className="text-sm text-gray-500">却下済みの履歴はありません。</div>}</div></details></div>
  </div>;
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
                      {event.quantity !== null
                        ? ` / ${event.quantity === 0 ? "在庫なし" : `${event.quantity}枚`}`
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
  if(!reports.length)return <div className="mt-8 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">不具合報告はありません。</div>;
  const wrapped=(r:BugReport,done:boolean)=><div key={r.id} className="flex items-start gap-3"><div className="pt-4"><SelectionCheckbox checked={selected.includes(r.id)} onChange={()=>toggle(r.id)} label={`不具合報告 #${r.id} を選択`} /></div><div className="min-w-0 flex-1"><BugReportCard report={r} imageUrls={imageUrls} checked={done} checking={checkingId===r.id} onCheck={()=>onCheck(r)} formatDate={formatDate}/></div></div>;
  return <div className="mt-6"><h2 className="text-2xl font-bold">⚠️ 不具合報告</h2><p className="mt-2 text-gray-500">未確認の報告だけを上に表示します。複数選択で一括確認・削除もできます。</p><div className="mt-5"><BulkSelectionBar count={selected.length} allSelected={all} onToggleAll={()=>setSelected(all?[]:ids)}><button disabled={!selectedUnchecked.length} onClick={()=>onBulkCheck(selectedUnchecked)} className="rounded-xl bg-green-700 px-4 py-2 font-bold text-white disabled:opacity-40">選択した未確認を一括確認済み</button><button disabled={!selected.length} onClick={()=>onDeleteSelected(selected)} className="rounded-xl bg-red-700 px-4 py-2 font-bold text-white disabled:opacity-40">選択した報告を完全削除</button></BulkSelectionBar></div>{!unchecked.length?<div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-5 text-center font-bold text-green-700">未確認の不具合報告はありません。</div>:<div className="mt-4 space-y-4">{unchecked.map(r=>wrapped(r,false))}</div>}{checked.length>0&&<details className="mt-7 rounded-2xl border border-gray-200 bg-gray-50"><summary className="cursor-pointer px-5 py-4 font-bold text-gray-600">✓ 確認済みの報告 ({checked.length}件)</summary><div className="space-y-3 border-t border-gray-200 p-4">{checked.map(r=>wrapped(r,true))}</div></details>}</div>;
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
            不具合内容
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
  return <div className="mt-6"><h2 className="text-2xl font-bold">📊 Billboard情報提供</h2><p className="mt-2 text-gray-500">「Billboard 要確認」の店舗から寄せられた情報です。ソースURLや電話確認・店頭確認などのエビデンスを確認してから反映してください。</p>{!pending.length?<div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5 text-center font-bold text-green-700">未処理のBillboard情報提供はありません。</div>:<div className="mt-5 space-y-4">{pending.map(r=>card(r))}</div>}<details className="mt-7 rounded-2xl border border-gray-200 bg-gray-50"><summary className="cursor-pointer px-5 py-4 font-bold text-gray-600">処理済みの履歴 ({processed.length}件)</summary><div className="border-t border-gray-200 p-4">{processed.length>0&&<BulkSelectionBar count={selected.length} allSelected={all} onToggleAll={()=>setSelected(all?[]:ids)}><button disabled={!selected.length} onClick={()=>onDeleteProcessed(selected)} className="rounded-xl bg-red-700 px-4 py-2 font-bold text-white disabled:opacity-40">選択した履歴を完全削除</button></BulkSelectionBar>}<div className="mt-3 space-y-3">{processed.length?processed.map(r=>card(r,true)):<div className="py-3 text-center text-sm text-gray-500">処理済みの履歴はありません。</div>}</div></div></details></div>;
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
      return <article key={report.id} className="rounded-2xl border border-[#eaddea] bg-[#fcf9fc] p-4"><div className="flex flex-wrap items-start justify-between gap-5"><div className="flex min-w-0 flex-1 items-start gap-3"><SelectionCheckbox checked={selected.includes(report.id)} onChange={()=>toggle(report.id)} label={`投稿 #${report.id} を選択`} /><div><div className="text-lg font-bold">{store?getDisplayStoreName(store):"店舗不明"}</div><div className="mt-3">{product?.name??"商品不明"}</div><div className="mt-1 font-bold text-[#b95489]">{report.quantity===0?"在庫なし":`${report.quantity}枚`}</div><div className="mt-1 text-sm text-gray-500">{formatDate(report.created_at)}</div>{report.comment&&<div className="mt-3 rounded-xl bg-white p-3">💬 {report.comment}</div>}</div></div><button type="button" disabled={deletingId===report.id} onClick={()=>onDelete(report)} className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white disabled:opacity-50">削除</button></div></article>;
    })}
  </div>;
}

function DeletionHistoryTab({ deletions, stores, products, restoringId, onRestore, onBulkRestore, onDeleteHistory, formatDate }: {
  deletions: DeletionHistory[]; stores: Store[]; products: Product[]; restoringId: number | null; onRestore: (deletion: DeletionHistory) => void; onBulkRestore: (ids: number[]) => void; onDeleteHistory: (ids: number[]) => void; formatDate: (value: string) => string;
}) {
  const [selected,setSelected]=useState<number[]>([]); const ids=deletions.map(d=>d.id); const all=ids.length>0&&ids.every(id=>selected.includes(id));
  useEffect(()=>setSelected(c=>c.filter(id=>ids.includes(id))),[deletions]); const toggle=(id:number)=>setSelected(c=>c.includes(id)?c.filter(x=>x!==id):[...c,id]); const restorable=selected.filter(id=>!deletions.find(d=>d.id===id)?.restored_at);
  return <div className="mt-6 space-y-4">{deletions.length>0&&<BulkSelectionBar count={selected.length} allSelected={all} onToggleAll={()=>setSelected(all?[]:ids)}><button disabled={!restorable.length} onClick={()=>onBulkRestore(restorable)} className="rounded-xl bg-[#6f4b89] px-4 py-2 font-bold text-white disabled:opacity-40">選択した未復元を一括復元</button><button disabled={!selected.length} onClick={()=>onDeleteHistory(selected)} className="rounded-xl bg-red-700 px-4 py-2 font-bold text-white disabled:opacity-40">選択した履歴を完全削除</button></BulkSelectionBar>}{!deletions.length&&<div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">削除履歴はありません。</div>}{deletions.map(d=>{const store=stores.find(x=>x.id===d.store_id);const product=products.find(x=>x.id===d.product_id);const restored=Boolean(d.restored_at);return <article key={d.id} className="rounded-2xl border border-[#eaddea] bg-[#fcf9fc] p-4"><div className="flex flex-wrap items-start justify-between gap-5"><div className="flex items-start gap-3"><SelectionCheckbox checked={selected.includes(d.id)} onChange={()=>toggle(d.id)} label={`削除履歴 #${d.id} を選択`} /><div><div className="text-lg font-bold">{store?getDisplayStoreName(store):"店舗不明"}</div><div className="mt-2">{product?.name??"商品不明"}</div><div className="mt-1 font-bold">{d.quantity===0?"在庫なし":`${d.quantity}枚`}</div><div className="mt-2 text-sm text-gray-500">削除: {formatDate(d.deleted_at)}</div>{restored&&<div className="mt-1 text-sm font-bold text-green-700">復元済み</div>}</div></div>{!restored&&<button disabled={restoringId===d.id} onClick={()=>onRestore(d)} className="rounded-xl bg-[#6f4b89] px-5 py-3 font-bold text-white disabled:opacity-50">復元</button>}</div></article>})}</div>;
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
            onChange={setTodaySales}
            allowDash
          />

          <SalesInput
            label="📅 今週の売上"
            value={weeklySales}
            onChange={setWeeklySales}
            allowDash
          />

          <SalesInput
            label="👑 累計売上"
            value={totalSales}
            onChange={setTotalSales}
            allowDash
          />

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