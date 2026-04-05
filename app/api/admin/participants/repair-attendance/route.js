import { NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { normalizeStudentId } from "@/lib/validators";

function buildAttendedAt(dayNumber, attendanceDate) {
  if (dayNumber === 1) {
    return `${attendanceDate}T15:00:00+09:00`;
  }

  if (dayNumber <= 3) {
    return `${attendanceDate}T15:30:00+09:00`;
  }

  return `${attendanceDate}T09:00:00+09:00`;
}

export async function POST(request) {
  const unauthorized = await ensureAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const studentId = normalizeStudentId(body.studentId);
    const requestedDays = Array.isArray(body.days)
      ? body.days
          .map((value) => Number.parseInt(String(value), 10))
          .filter((value) => Number.isInteger(value) && value >= 1 && value <= 5)
      : [1, 2, 3, 4, 5];

    if (!studentId) {
      return NextResponse.json({ message: "학번이 필요합니다." }, { status: 400 });
    }

    if (requestedDays.length === 0) {
      return NextResponse.json({ message: "복구할 일차가 없습니다." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const participantResult = await supabase
      .from("participants")
      .select("id, student_id, name, status, created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (participantResult.error) throw participantResult.error;

    const participant = participantResult.data?.[0];
    if (!participant) {
      return NextResponse.json({ message: "해당 학번 참가자를 찾을 수 없습니다." }, { status: 404 });
    }

    const daysResult = await supabase
      .from("attendance_days")
      .select("id, day_number, attendance_date")
      .in("day_number", requestedDays)
      .order("day_number", { ascending: true });

    if (daysResult.error) throw daysResult.error;

    const days = daysResult.data ?? [];
    const existingResult = await supabase
      .from("attendance_records")
      .select("attendance_day_id")
      .eq("participant_id", participant.id)
      .eq("status", "success");

    if (existingResult.error) throw existingResult.error;

    const existingDayIds = new Set((existingResult.data ?? []).map((row) => row.attendance_day_id));
    const missingRows = days
      .filter((day) => !existingDayIds.has(day.id))
      .map((day) => ({
        participant_id: participant.id,
        attendance_day_id: day.id,
        attended_at: buildAttendedAt(day.day_number, day.attendance_date),
        status: "success"
      }));

    let inserted = [];
    if (missingRows.length > 0) {
      const insertResult = await supabase
        .from("attendance_records")
        .insert(missingRows)
        .select("id, attendance_day_id");

      if (insertResult.error) throw insertResult.error;
      inserted = insertResult.data ?? [];
    }

    const shouldComplete = requestedDays.length === 5 || requestedDays.includes(5);
    if (shouldComplete) {
      const updateResult = await supabase
        .from("participants")
        .update({
          status: "completed",
          eliminated_on_day: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", participant.id)
        .select("id, student_id, name, status");

      if (updateResult.error) throw updateResult.error;
    }

    return NextResponse.json({
      message: "참가자 출석 복구가 완료되었습니다.",
      participantId: participant.id,
      studentId: participant.student_id,
      insertedCount: inserted.length,
      requestedDays
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "출석 복구 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
