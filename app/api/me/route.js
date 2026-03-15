import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentParticipant } from "@/lib/data";
import { validateParticipantUpdateInput } from "@/lib/validators";

export async function GET() {
  try {
    const participant = await getCurrentParticipant();

    if (!participant) {
      return NextResponse.json({ participant: null }, { status: 401 });
    }

    return NextResponse.json({ participant });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "사용자 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const participant = await getCurrentParticipant();

    if (!participant) {
      return NextResponse.json({ message: "세션이 없습니다." }, { status: 401 });
    }

    const body = await request.json();
    const validated = validateParticipantUpdateInput(body);

    if (!validated.ok) {
      return NextResponse.json({ message: validated.message }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("app_update_participant", {
      p_participant_id: participant.id,
      p_department: validated.value.department,
      p_name: validated.value.name,
      p_phone: validated.value.phone
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: "내 정보가 수정되었습니다.",
      participant: data?.[0] ?? null
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "사용자 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
