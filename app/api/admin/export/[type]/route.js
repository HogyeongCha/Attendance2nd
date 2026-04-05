import { NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/admin-auth";
import { getAdminDashboardData } from "@/lib/admin-data";
import { createAdminClient } from "@/lib/supabase/server";

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

export async function GET(request, context) {
  const unauthorized = await ensureAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { type } = await context.params;

    if (type === "participants") {
      const dashboard = await getAdminDashboardData();
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
      const dashboard = await getAdminDashboardData();
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

    if (type === "db") {
      const supabase = createAdminClient();
      const searchParams = request.nextUrl.searchParams;
      const table = searchParams.get("table");
      const limit = Math.min(
        Math.max(Number.parseInt(searchParams.get("limit") ?? "50", 10), 1),
        200
      );
      const offset = Math.max(Number.parseInt(searchParams.get("offset") ?? "0", 10), 0);
      const dayNumber = Number.parseInt(searchParams.get("dayNumber") ?? "", 10);

      if (!table) {
        return NextResponse.json(
          { message: "table 쿼리 파라미터가 필요합니다." },
          { status: 400 }
        );
      }

      if (table === "attendance_days") {
        const result = await supabase
          .from("attendance_days")
          .select("*")
          .order("day_number", { ascending: true })
          .range(offset, offset + limit - 1);

        if (result.error) throw result.error;

        return NextResponse.json({
          table,
          rows: result.data ?? [],
          nextOffset: (result.data?.length ?? 0) < limit ? null : offset + limit
        });
      }

      if (table === "participants") {
        const result = await supabase
          .from("participants")
          .select("*")
          .order("created_at", { ascending: true })
          .range(offset, offset + limit - 1);

        if (result.error) throw result.error;

        return NextResponse.json({
          table,
          rows: result.data ?? [],
          nextOffset: (result.data?.length ?? 0) < limit ? null : offset + limit
        });
      }

      if (table === "attendance_records") {
        let query = supabase
          .from("attendance_records")
          .select("*")
          .order("created_at", { ascending: true });

        if (Number.isInteger(dayNumber)) {
          const dayResult = await supabase
            .from("attendance_days")
            .select("id")
            .eq("day_number", dayNumber)
            .maybeSingle();

          if (dayResult.error) throw dayResult.error;
          if (!dayResult.data) {
            return NextResponse.json(
              { message: "해당 day_number를 찾을 수 없습니다." },
              { status: 404 }
            );
          }

          query = query.eq("attendance_day_id", dayResult.data.id);
        }

        const result = await query.range(offset, offset + limit - 1);

        if (result.error) throw result.error;

        return NextResponse.json({
          table,
          rows: result.data ?? [],
          nextOffset: (result.data?.length ?? 0) < limit ? null : offset + limit
        });
      }

      if (table === "admin_logs") {
        const result = await supabase
          .from("admin_logs")
          .select("*")
          .order("created_at", { ascending: true })
          .range(offset, offset + limit - 1);

        if (result.error) throw result.error;

        return NextResponse.json({
          table,
          rows: result.data ?? [],
          nextOffset: (result.data?.length ?? 0) < limit ? null : offset + limit
        });
      }

      return NextResponse.json({ message: "지원하지 않는 table입니다." }, { status: 400 });
    }

    return NextResponse.json({ message: "지원하지 않는 export 타입입니다." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "CSV 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
