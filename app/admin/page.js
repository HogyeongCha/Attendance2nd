import { AdminLoginForm } from "@/components/admin-login-form";
import { AdminLogoutButton } from "@/components/admin-logout-button";
import { AdminDayActions } from "@/components/admin-day-actions";
import { getAdminDashboardData, requireAdminSession } from "@/lib/admin-data";

export const metadata = {
  title: "관리자 대시보드 | 공도2 출석 이벤트"
};

export const dynamic = "force-dynamic";

function maskToken(token) {
  if (!token) return "-";
  if (token.length <= 10) return token;
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

export default async function AdminPage() {
  const isAdmin = await requireAdminSession();

  if (!isAdmin) {
    return (
      <main className="subpage-shell">
        <section className="subpage-header">
          <p className="eyebrow">ADMIN</p>
          <h1>관리자 로그인</h1>
          <p>
            이 페이지는 `ADMIN_PASSWORD`로 보호됩니다. 브라우저는 직접 DB에 접근하지
            않고 서버가 `service_role`로 조회합니다.
          </p>
        </section>
        <section className="form-panel">
          <AdminLoginForm />
          <aside className="helper-card">
            <h2>운영 메모</h2>
            <ul>
              <li>관리자 세션은 별도 쿠키로 저장됩니다.</li>
              <li>환경변수 `ADMIN_PASSWORD` 설정이 필요합니다.</li>
              <li>QR 토큰 전체값은 관리자 화면에서 마스킹되어 표시됩니다.</li>
            </ul>
          </aside>
        </section>
      </main>
    );
  }

  const dashboard = await getAdminDashboardData();

  return (
    <main className="subpage-shell admin-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">ADMIN DASHBOARD</p>
          <h1>운영 현황</h1>
          <p>참가자, 출석 기록, 운영 일자, 이상 로그를 한 화면에서 확인합니다.</p>
        </div>
        <div className="admin-toolbar">
          <a className="secondary-button" href="/api/admin/export/participants">
            참가자 CSV
          </a>
          <a className="secondary-button" href="/api/admin/export/attendance">
            출석 CSV
          </a>
          <AdminLogoutButton />
        </div>
      </section>

      <section className="admin-stats-grid">
        <article className="admin-stat-card">
          <span>참가자</span>
          <strong>{dashboard.stats.participants}</strong>
        </article>
        <article className="admin-stat-card">
          <span>진행 중</span>
          <strong>{dashboard.stats.active}</strong>
        </article>
        <article className="admin-stat-card">
          <span>완주</span>
          <strong>{dashboard.stats.completed}</strong>
        </article>
        <article className="admin-stat-card">
          <span>탈락</span>
          <strong>{dashboard.stats.eliminated}</strong>
        </article>
        <article className="admin-stat-card">
          <span>성공 출석</span>
          <strong>{dashboard.stats.successfulCheckIns}</strong>
        </article>
      </section>

      <section className="admin-grid">
        <section className="admin-panel wide">
          <div className="admin-panel-header">
            <h2>참가자 목록</h2>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>학번</th>
                  <th>이름</th>
                  <th>학과</th>
                  <th>전화번호</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.participants.map((participant) => (
                  <tr key={participant.id}>
                    <td>{participant.student_id}</td>
                    <td>{participant.name}</td>
                    <td>{participant.department}</td>
                    <td>{participant.phone}</td>
                    <td>{participant.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <h2>운영 일자 / QR</h2>
          </div>
          <div className="admin-list">
            {dashboard.days.map((day) => (
              <article key={day.id} className="admin-list-item">
                <strong>
                  DAY {day.day_number} / {day.attendance_date}
                </strong>
                <span>{maskToken(day.qr_token)}</span>
                <AdminDayActions dayNumber={day.day_number} />
              </article>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <h2>최근 이상 로그</h2>
          </div>
          <div className="admin-list">
            {dashboard.logs.length === 0 ? (
              <p className="muted-copy">아직 기록된 로그가 없습니다.</p>
            ) : (
              dashboard.logs.map((log) => (
                <article key={log.id} className="admin-list-item">
                  <strong>{log.type}</strong>
                  <span>{log.message}</span>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="admin-panel wide">
          <div className="admin-panel-header">
            <h2>최근 출석 기록</h2>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>시각</th>
                  <th>참가자</th>
                  <th>일차</th>
                  <th>거리(m)</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.records.map((record) => (
                  <tr key={record.id}>
                    <td>{new Date(record.attended_at).toLocaleString("ko-KR")}</td>
                    <td>
                      {record.participant?.name} / {record.participant?.student_id}
                    </td>
                    <td>
                      DAY {record.day?.day_number} / {record.day?.attendance_date}
                    </td>
                    <td>{record.distance_meters ?? "-"}</td>
                    <td>{record.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
