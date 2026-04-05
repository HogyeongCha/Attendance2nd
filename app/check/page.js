import Image from "next/image";
import Link from "next/link";
import { CheckInPanel } from "@/components/check-in-panel";
import { LoginForm } from "@/components/login-form";
import { RegisterForm } from "@/components/register-form";
import { getCurrentParticipant, getStampBoard } from "@/lib/data";

export const metadata = {
  title: "출석 체크 | 공도2 출석 이벤트"
};

export const dynamic = "force-dynamic";

export default async function CheckPage({ searchParams }) {
  const participant = await getCurrentParticipant();
  const stampBoard = participant ? await getStampBoard() : null;
  const params = await searchParams;
  const token = typeof params?.token === "string" ? params.token : "";
  const redirectTo = `/check?token=${token}`;

  return (
    <main className="subpage-shell">
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
            <p className="eyebrow">ATTENDANCE CHECK</p>
            <h1 className="simple-page-title">출석 화면</h1>
          </div>
        </div>
        <p className="simple-page-copy">
          1일차 최초 참여자는 개인정보를 입력하고, 2일차부터는 학번과 이름만
          입력해 출석을 진행합니다.
        </p>
      </section>

      {!token ? (
        <section className="simple-flow-panel">
          <p className="eyebrow">QR REQUIRED</p>
          <h3>유효한 출석 링크가 아닙니다.</h3>
          <p className="muted-copy">
            출석은 현장에 비치된 QR을 통해 접속한 경우에만 진행할 수 있습니다.
            현장 QR을 다시 스캔해 접속해주세요.
          </p>
        </section>
      ) : !participant ? (
        <section className="check-entry-grid">
          <article className="simple-flow-panel">
            <p className="eyebrow">DAY 1</p>
            <h3>최초 참여자 정보 입력</h3>
            <p className="muted-copy">
              학과, 학번, 이름, 전화번호를 입력하면 바로 당일 출석 단계로
              넘어갑니다.
            </p>
            <RegisterForm redirectTo={redirectTo} submitLabel="등록 후 출석 단계로" />
          </article>

          <article className="simple-flow-panel">
            <p className="eyebrow">DAY 2 - DAY 5</p>
            <h3>기존 참여자 확인</h3>
            <p className="muted-copy">
              2일차부터는 학번과 이름만 입력해 빠르게 출석 화면으로 이동합니다.
            </p>
            <LoginForm
              redirectTo={redirectTo}
              submitLabel="학번과 이름으로 확인"
              showPhoneLast4={false}
            />
          </article>
        </section>
      ) : (
        <section className="check-entry-grid signed-in">
          <article className="simple-flow-panel simple-summary-panel">
            <p className="eyebrow">PARTICIPANT</p>
            <h3>{participant.name} 님</h3>
            <p className="muted-copy">
              학번 {participant.student_id}
              <br />
              현재 상태 {participant.status}
            </p>
            <div className="simple-progress-list">
              {(stampBoard?.stamps ?? []).map((stamp) => (
                <div key={stamp.id} className={`simple-progress-item ${stamp.checked ? "checked" : ""}`}>
                  <span>{stamp.dayLabel}</span>
                  <strong>{stamp.checked ? "출석 완료" : "대기"}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="simple-flow-panel">
            <p className="eyebrow">CHECK-IN</p>
            <h3>오늘 출석 진행</h3>
            <CheckInPanel initialQrToken={token} hasSession />
          </article>
        </section>
      )}

      <div className="check-footer-actions">
        <Link className="secondary-button" href="/">
          메인으로 돌아가기
        </Link>
        <Link className="secondary-button" href="/stamp">
          내 출석 현황 보기
        </Link>
      </div>
    </main>
  );
}
