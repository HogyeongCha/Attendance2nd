import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";

export async function ensureAdmin() {
  const session = await getAdminSession();

  if (session?.role === "admin") {
    return null;
  }

  return NextResponse.json(
    { message: "관리자 로그인이 필요합니다." },
    { status: 401 }
  );
}
