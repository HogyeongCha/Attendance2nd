import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { setAdminSession } from "@/lib/session";

export async function POST(request) {
  try {
    const { password } = await request.json();
    const adminPassword = getServerEnv().adminPassword;

    if (!password) {
      return NextResponse.json({ message: "비밀번호를 입력해주세요." }, { status: 400 });
    }

    if (!adminPassword) {
      return NextResponse.json(
        { message: "서버에 ADMIN_PASSWORD가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { message: "관리자 비밀번호가 일치하지 않습니다." },
        { status: 401 }
      );
    }

    await setAdminSession({
      role: "admin",
      loggedInAt: new Date().toISOString()
    });

    return NextResponse.json({ message: "관리자 로그인 완료" });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "관리자 로그인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
