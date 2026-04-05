import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { setSession } from "@/lib/session";
import { validateRegistrationInput } from "@/lib/validators";

export async function POST(request) {
  try {
    const body = await request.json();
    const validated = validateRegistrationInput(body);

    if (!validated.ok) {
      return NextResponse.json({ message: validated.message }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { value } = validated;

    const { data, error } = await supabase.rpc("app_register_participant", {
      p_department: value.department,
      p_student_id: value.studentId,
      p_name: value.name,
      p_phone: value.phone
    });

    if (error) {
      if (error.message?.includes("이미 등록된 학번")) {
        return NextResponse.json(
          { message: "이미 등록된 학번입니다. 재방문 로그인을 이용해주세요." },
          { status: 409 }
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
      message: "등록이 완료되었습니다.",
      participant
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "등록 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
