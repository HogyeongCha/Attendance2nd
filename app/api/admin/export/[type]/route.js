import { NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/admin-auth";
import { getAdminDashboardData } from "@/lib/admin-data";

function escapeCell(value) {
  const normalized = String(value ?? "");
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }
  return normalized;
}

function toCsv(rows) {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\n");
}

export async function GET(_request, context) {
  const unauthorized = await ensureAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { type } = await context.params;
    const dashboard = await getAdminDashboardData();

    if (type === "participants") {
      const csv = toCsv([
        ["student_id", "department", "name", "phone", "status", "created_at"],
        ...(dashboard.participants ?? []).map((item) => [
          item.student_id,
          item.department,
          item.name,
          item.phone,
          item.status,
          item.created_at
        ])
      ]);

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="participants.csv"'
        }
      });
    }

    if (type === "attendance") {
      const csv = toCsv([
        [
          "attended_at",
          "student_id",
          "name",
          "day_number",
          "attendance_date",
          "distance_meters",
          "status",
          "reject_reason"
        ],
        ...(dashboard.records ?? []).map((item) => [
          item.attended_at,
          item.participant?.student_id,
          item.participant?.name,
          item.day?.day_number,
          item.day?.attendance_date,
          item.distance_meters,
          item.status,
          item.reject_reason
        ])
      ]);

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="attendance.csv"'
        }
      });
    }

    return NextResponse.json({ message: "지원하지 않는 export 타입입니다." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "CSV 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
