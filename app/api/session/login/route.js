import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { setSession } from "@/lib/session";
import { validateLoginInput } from "@/lib/validators";

export async function POST(request) {
  try {
    const body = await request.json();
    const validated = validateLoginInput(body);

    if (!validated.ok) {
      return NextResponse.json({ message: validated.message }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { value } = validated;

    const { data, error } = await supabase.rpc("app_login_participant", {
      p_student_id: value.studentId,
      p_name: value.name || null,
      p_phone_last4: value.phoneLast4 || null
    });

    if (error) {
      if (error.message?.includes("등록된 참가자를 찾을 수 없습니다.")) {
        return NextResponse.json(
          { message: "등록된 참가자를 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      if (error.message?.includes("이름 또는 전화번호 뒤 4자리가 일치하지 않습니다.")) {
        return NextResponse.json(
          { message: "이름 또는 전화번호 뒤 4자리가 일치하지 않습니다." },
          { status: 401 }
        );
      }
      throw error;
    }

    const participant = data?.[0];

    await setSession({
      participantId: participant.id,
      studentId: participant.student_id
    });

    return NextResponse.json({
      message: "로그인되었습니다.",
      participant: {
        id: participant.id,
        studentId: participant.student_id,
        name: participant.name
      }
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
