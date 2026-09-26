import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type StoreLookupCandidate = {
  name: string;
  chainName: string;
  prefecture: string;
  city: string;
  address: string;
  phone: string;
  businessHours: string;
  officialUrl: string;
};

const IMAI_SHOPS_URL =
  "https://imaibooks.co.jp/shops/";

function normalizeStoreText(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[・･\-‐-–—―_]/g, "");
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(
        Number.parseInt(code, 16)
      )
    );
}

function htmlToLines(html: string) {
  const text = decodeHtml(
    html
      .replace(
        /<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi,
        ""
      )
      .replace(
        /<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi,
        "\n"
      )
      .replace(/<[^>]+>/g, " ")
  );

  return text
    .split(/\r?\n/)
    .map((line) =>
      line.replace(/\s+/g, " ").trim()
    )
    .filter(Boolean);
}

function cleanupAddress(value: string) {
  return value
    .replace(/^住所[：:\s]*/i, "")
    .replace(/^〒?\s*\d{3}-\d{4}\s*/, "")
    .trim();
}

async function lookupImaiStore(params: {
  prefecture: string;
  city: string;
  name: string;
  chainName: string;
}): Promise<StoreLookupCandidate | null> {
  const combined = normalizeStoreText(
    `${params.chainName}${params.name}`
  );

  if (
    !combined.includes(
      normalizeStoreText("今井書店")
    )
  ) {
    return null;
  }

  const response = await fetch(
    IMAI_SHOPS_URL,
    {
      headers: {
        Accept: "text/html",
        "User-Agent":
          "KingAndPrinceStockChecker/1.0",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `今井書店公式サイト取得失敗: ${response.status}`
    );
  }

  const html = await response.text();
  const lines = htmlToLines(html);

  const targetName = normalizeStoreText(
    params.name.replace(
      /^今井書店\s*/,
      ""
    )
  );

  const index = lines.findIndex((line) => {
    const normalized =
      normalizeStoreText(line);

    return (
      normalized === targetName ||
      normalized.includes(targetName)
    );
  });

  if (index < 0) {
    return null;
  }

  const nearby = lines.slice(
    index,
    index + 20
  );

  const addressLine =
    nearby.find((line) =>
      /〒?\s*\d{3}-\d{4}/.test(line)
    ) ?? "";

  const hoursLine =
    nearby.find((line) =>
      /営業時間/.test(line)
    ) ?? "";

  const phoneLine =
    nearby.find((line) =>
      /(?:TEL|電話)[：:\s]*\d{2,4}-\d{2,4}-\d{3,4}/i.test(
        line
      )
    ) ?? "";

  const phone =
    phoneLine.match(
      /\d{2,4}-\d{2,4}-\d{3,4}/
    )?.[0] ?? "";

  return {
    name: params.name,
    chainName: "今井書店",
    prefecture: params.prefecture,
    city: params.city,
    address: cleanupAddress(
      addressLine
    ),
    phone,
    businessHours: hoursLine
      .replace(/^営業時間[：:\s]*/i, "")
      .trim(),
    officialUrl:
      IMAI_SHOPS_URL,
  };
}

export async function POST(
  request: Request
) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "サーバー設定に問題があります。",
        },
        { status: 500 }
      );
    }

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "ログインが必要です。",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authorization
        .slice("Bearer ".length)
        .trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          message: "ログインが必要です。",
        },
        { status: 401 }
      );
    }

    const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
      {
        global: {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(
      accessToken
    );

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: "ログインが必要です。",
        },
        { status: 401 }
      );
    }

    const {
      data: isAdmin,
      error: adminError,
    } = await supabase.rpc(
      "is_inventory_admin"
    );

    if (adminError) {
      console.error(
        "store lookup admin check error:",
        adminError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "管理者権限を確認できませんでした。",
        },
        { status: 500 }
      );
    }

    if (isAdmin !== true) {
      return NextResponse.json(
        {
          success: false,
          message:
            "管理者権限が必要です。",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const prefecture =
      typeof body.prefecture === "string"
        ? body.prefecture.trim()
        : "";

    const city =
      typeof body.city === "string"
        ? body.city.trim()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const chainName =
      typeof body.chainName === "string"
        ? body.chainName.trim()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "店舗名がありません。",
        },
        { status: 400 }
      );
    }

    const candidate =
      await lookupImaiStore({
        prefecture,
        city,
        name,
        chainName,
      });

    return NextResponse.json({
      success: true,
      candidate,
    });
  } catch (error) {
    console.error(
      "store lookup error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "公式店舗情報を取得できませんでした。",
      },
      { status: 500 }
    );
  }
}