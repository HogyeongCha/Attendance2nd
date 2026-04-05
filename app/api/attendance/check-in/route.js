import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentParticipant } from "@/lib/data";
import { getEventConfig } from "@/lib/event";

export async function POST(request) {
  try {
    const participant = await getCurrentParticipant();

    if (!participant) {
      return NextResponse.json(
        { message: "먼저 참가자 등록 또는 로그인을 해주세요." },
        { status: 401 }
      );
    }

    if (participant.status === "eliminated") {
      return NextResponse.json(
        { message: "이미 연속 출석 대상에서 제외된 계정입니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const qrToken = String(body.qrToken ?? "").trim();
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

    if (!qrToken) {
      return NextResponse.json(
        { message: "유효한 QR로 접속한 경우에만 출석할 수 있습니다." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { message: "유효한 위치 정보가 필요합니다." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const config = getEventConfig();
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || null;
    const userAgent = request.headers.get("user-agent");

    const { data, error } = await supabase.rpc("app_check_in", {
      p_participant_id: participant.id,
      p_qr_token: qrToken,
      p_latitude: latitude,
      p_longitude: longitude,
      p_center_lat: config.centerLat,
      p_center_lng: config.centerLng,
      p_radius_meters: config.radiusMeters,
      p_ip_address: ipAddress,
      p_user_agent: userAgent
    });

    if (error) {
      if (error.message?.includes("유효하지 않은 QR입니다.")) {
        return NextResponse.json({ message: "유효하지 않은 QR입니다." }, { status: 400 });
      }
      if (error.message?.includes("오늘 날짜용 QR이 아닙니다.")) {
        return NextResponse.json({ message: "오늘 날짜용 QR이 아닙니다." }, { status: 400 });
      }
      if (error.message?.includes("출석 가능 시간이 아닙니다.")) {
        return NextResponse.json({ message: "출석 가능 시간이 아닙니다." }, { status: 400 });
      }
      if (error.message?.includes("이전 출석 누락으로 연속 출석 대상에서 제외되었습니다.")) {
        return NextResponse.json(
          { message: "이전 출석 누락으로 연속 출석 대상에서 제외되었습니다." },
          { status: 403 }
        );
      }
      if (error.message?.includes("허용 반경을 벗어났습니다.")) {
        return NextResponse.json({ message: error.message }, { status: 400 });
      }
      if (error.message?.includes("오늘은 이미 출석이 완료되었습니다.")) {
        return NextResponse.json(
          { message: "오늘은 이미 출석이 완료되었습니다." },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "출석 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
