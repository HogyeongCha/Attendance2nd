import Image from "next/image";
import Link from "next/link";
import { ProfileForm } from "@/components/profile-form";
import { getStampBoard } from "@/lib/data";

export const metadata = {
  title: "내 출석 스탬프 | 공도2 출석 이벤트"
};

export const dynamic = "force-dynamic";

export default async function StampPage() {
  const stampBoard = await getStampBoard();

  if (!stampBoard) {
    return (
      <main className="subpage-shell">
        <section className="subpage-header">
          <p className="eyebrow">STAMP BOARD</p>
          <h1>세션이 없습니다.</h1>
          <p>먼저 참가자 등록 또는 재방문 로그인을 완료한 뒤 다시 확인하세요.</p>
          <div className="hero-actions">
            <Link className="primary-button" href="/register">
              등록 또는 로그인
            </Link>
            <Link className="secondary-button" href="/">
              랜딩으로 돌아가기
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const { participant, stamps, completedCount, totalCount } = stampBoard;
  const statusText =
    participant.status === "completed"
      ? "완주"
      : participant.status === "eliminated"
        ? "탈락"
        : "진행 중";

  return (
    <main className="subpage-shell">
      <section className="stamp-header">
        <div>
          <p className="eyebrow">STAMP BOARD</p>
          <h1>{participant.name} 님의 연속 출석 현황</h1>
          <p>학번 {participant.student_id} 기준의 실제 출석 데이터입니다.</p>
        </div>
        <div className="stamp-summary">
          <span>현재 상태</span>
          <strong>{statusText}</strong>
          <p>
            {completedCount} / {totalCount} 완료
          </p>
        </div>
      </section>

      <section className="stamp-board">
        <div className="stamp-grid">
          {stamps.map((stamp) => (
            <article
              key={stamp.id}
              className={`stamp-card ${stamp.checked ? "checked" : ""}`}
            >
              <span>{stamp.dayLabel}</span>
              <strong>{stamp.date}</strong>
              <em>{stamp.checked ? "CHECKED" : "WAITING"}</em>
            </article>
          ))}
        </div>
        <div className="stamp-mascot">
          <Image
            src="/assets/babylion_laughing.png"
            alt="즐거운 라이언 마스코트"
            width={240}
            height={240}
          />
          <p>다음 출석일에도 공도2에서 QR을 스캔하면 다음 칸이 채워집니다.</p>
          <Link href="/check" className="primary-button">
            오늘 출석 화면으로
          </Link>
        </div>
      </section>

      <section className="profile-section">
        <article className="profile-card">
          <div className="profile-copy">
            <p className="eyebrow">MY PROFILE</p>
            <h2>내 정보 수정</h2>
            <p>
              학과, 이름, 전화번호를 수정할 수 있습니다. 학번은 출석 식별값이라
              변경되지 않습니다.
            </p>
          </div>
          <ProfileForm participant={participant} />
        </article>
      </section>
    </main>
  );
}
