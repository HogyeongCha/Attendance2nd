import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

function buildCheckUrl(token, request) {
  const url = new URL("/check", request.url);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function GET(request, context) {
  const unauthorized = await ensureAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { dayNumber } = await context.params;
    const parsedDayNumber = Number(dayNumber);
    const format = request.nextUrl.searchParams.get("format") === "svg" ? "svg" : "png";

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("app_admin_get_day", {
      p_day_number: parsedDayNumber
    });

    if (error) {
      throw error;
    }

    const day = data?.[0];
    if (!day) {
      return NextResponse.json({ message: "해당 일차를 찾을 수 없습니다." }, { status: 404 });
    }

    const qrUrl = buildCheckUrl(day.qr_token, request);

    if (format === "svg") {
      const svg = await QRCode.toString(qrUrl, {
        type: "svg",
        margin: 1,
        color: {
          dark: "#0E4A84",
          light: "#FFFFFFFF"
        }
      });

      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Content-Disposition": `attachment; filename="day-${day.day_number}.svg"`
        }
      });
    }

    const png = await QRCode.toBuffer(qrUrl, {
      type: "png",
      width: 960,
      margin: 2,
      color: {
        dark: "#0E4A84",
        light: "#FFFFFFFF"
      }
    });

    return new NextResponse(png, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="day-${day.day_number}.png"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "QR 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
