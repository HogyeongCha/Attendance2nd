import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

function createToken() {
  return crypto.randomBytes(18).toString("base64url");
}

export async function POST(_request, context) {
  const unauthorized = await ensureAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { dayNumber } = await context.params;
    const parsedDayNumber = Number(dayNumber);

    if (!Number.isInteger(parsedDayNumber) || parsedDayNumber < 1) {
      return NextResponse.json({ message: "유효한 일차가 아닙니다." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const nextToken = createToken();

    const { data, error } = await supabase.rpc("app_admin_regenerate_day_token", {
      p_day_number: parsedDayNumber,
      p_qr_token: nextToken
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: `DAY ${parsedDayNumber} QR 토큰이 재발급되었습니다.`,
      day: data?.[0]
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "QR 토큰 재발급 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
