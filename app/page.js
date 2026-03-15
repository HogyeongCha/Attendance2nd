import Image from "next/image";
import Link from "next/link";
import { getCurrentParticipant, getStampBoard } from "@/lib/data";

const eventDays = [
  { label: "DAY 1", date: "03.16 MON" },
  { label: "DAY 2", date: "03.17 TUE" },
  { label: "DAY 3", date: "03.18 WED" },
  { label: "DAY 4", date: "03.19 THU" },
  { label: "DAY 5", date: "03.20 FRI" }
];

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }) {
  const participant = await getCurrentParticipant();
  const stampBoard = participant ? await getStampBoard() : null;
  const params = await searchParams;
  const token = typeof params?.token === "string" ? params.token : "";
  const completedCount = stampBoard?.completedCount ?? 0;
  const attendanceHref = token ? `/check?token=${token}` : null;

  return (
    <main className="page-shell">
      <section className="simple-header-card">
        <div className="simple-header-brand">
          <Image
            src="/assets/hyu_tech.png"
            alt="HYU TECH 로고"
            width={76}
            height={78}
            className="simple-brand-logo"
            priority
          />
          <div>
            <p className="eyebrow">HANYANG UNIVERSITY ENGINEERING</p>
            <h1 className="simple-page-title">공도2 리뉴얼 기념 출석 이벤트</h1>
          </div>
        </div>
        <p className="simple-page-copy">
          공도2 현장 방문 후 QR과 GPS 인증으로 출석을 기록합니다. 메인 화면에서
          안내를 확인한 뒤 출석하기 버튼을 눌러 출석 화면으로 이동합니다.
        </p>
      </section>

      <section className="simple-info-grid">
        <article className="simple-info-card">
          <span className="simple-info-label">이벤트 기간</span>
          <strong>2026.03.16 - 2026.03.20</strong>
          <p>운영 기간 동안 매일 09:00부터 17:00까지 출석할 수 있습니다.</p>
        </article>
        <article className="simple-info-card">
          <span className="simple-info-label">출석 기준</span>
          <strong>QR + GPS 인증</strong>
          <p>공도2 기준 반경 50m 이내에서만 출석이 인정됩니다.</p>
        </article>
        <article className="simple-info-card">
          <span className="simple-info-label">현재 상태</span>
          <strong>{participant ? "출석 진행 가능" : "출석 전"}</strong>
          <p>
            {participant
              ? `${participant.name} 님 정보가 연결되어 있습니다.`
              : "출석 화면에서 최초 참여 등록 또는 재방문 확인을 진행합니다."}
          </p>
        </article>
        <article className="simple-info-card">
          <span className="simple-info-label">입장 방식</span>
          <strong>현장 QR 전용</strong>
          <p>출석은 현장에 비치된 QR 링크로 접속한 경우에만 진행할 수 있습니다.</p>
        </article>
      </section>

      <section className="landing-grid">
        <article className="simple-flow-card landing-main-card">
          <div className="simple-flow-header">
            <div>
              <p className="eyebrow">ATTENDANCE</p>
              <h2>출석 안내</h2>
            </div>
            <Image
              src="/assets/babylion_question.png"
              alt="출석 안내 마스코트"
              width={120}
              height={120}
            />
          </div>
          <div className="landing-copy-list">
            <p>1일차 최초 참여자는 학과, 학번, 이름, 전화번호를 입력합니다.</p>
            <p>2일차부터는 학번과 이름만 입력하면 출석 단계로 이동할 수 있습니다.</p>
            <p>위치 인증이 완료되면 당일 출석이 기록됩니다.</p>
          </div>
          <div className="hero-actions">
            {attendanceHref ? (
              <Link className="primary-button" href={attendanceHref}>
                출석하기
              </Link>
            ) : (
              <span className="secondary-button">현장 QR 접속 필요</span>
            )}
            <Link className="secondary-button" href="/stamp">
              내 출석 현황 보기
            </Link>
          </div>
        </article>

        <article className="simple-flow-card landing-progress-card">
          <div className="simple-flow-header">
            <div>
              <p className="eyebrow">MY PROGRESS</p>
              <h2>5일 출석 현황</h2>
            </div>
          </div>
          <p className="muted-copy">
            {participant
              ? `${participant.name} 님 기준 진행률입니다.`
              : "세션이 없으면 출석 현황은 대기 상태로 표시됩니다."}
          </p>
          <div className="simple-progress-list">
            {(stampBoard?.stamps ?? eventDays.map((day, index) => ({
              id: `${day.label}-${index}`,
              dayLabel: day.label,
              checked: false
            }))).map((stamp) => (
              <div key={stamp.id} className={`simple-progress-item ${stamp.checked ? "checked" : ""}`}>
                <span>{stamp.dayLabel}</span>
                <strong>{stamp.checked ? "출석 완료" : "대기"}</strong>
              </div>
            ))}
          </div>
          <div className="landing-progress-summary">
            <strong>{participant ? `${completedCount} / ${stampBoard?.totalCount ?? 5}` : "0 / 5"}</strong>
            <span>{participant ? `현재 상태: ${participant.status}` : "로그인 전"}</span>
          </div>
        </article>
      </section>
    </main>
  );
}
