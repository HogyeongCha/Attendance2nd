# 공도2 리뉴얼 기념 출석 이벤트

<p align="center">
  <img src="./public/assets/hyu_tech.png" alt="HYU Tech 로고" width="96" />
  <img src="./public/assets/babylion_laughing.png" alt="이벤트 마스코트" width="96" />
</p>

<p align="center">
  한양대학교 공과대학 도서관(공도2) 리뉴얼 홍보를 위한 현장 출석 체크 웹 애플리케이션
</p>

<p align="center">
  <a href="#프로젝트-소개">소개</a> · <a href="#핵심-기능">핵심 기능</a> · <a href="#기술-스택">기술 스택</a> · <a href="#아키텍처">아키텍처</a> · <a href="#화면-구성">화면</a> · <a href="#로컬-실행">로컬 실행</a>
</p>

---

## 프로젝트 소개

한양대학교 제49대 공과대학 학생회 건설준비위원회가 주최한 공도2 리뉴얼 기념 이벤트의 출석 관리 시스템입니다. 2026년 3월 16일부터 20일까지 5일간 운영되었으며, 실제 약 150명의 참가자가 사용했습니다.

단순한 출석 폼이 아니라, 현장에서만 출석이 인정되도록 QR 토큰 + GPS 반경 검증 + 연속 출석 규칙을 하나의 흐름으로 설계한 프로젝트입니다. 비즈니스 규칙의 검증을 Postgres RPC 함수에 집중시켜 클라이언트 우회를 원천 차단하는 구조를 택했습니다.

### 왜 이 프로젝트를 만들었는가

- 오프라인 공간 방문을 검증 가능한 데이터로 남겨야 하는 실제 요구사항이 있었습니다
- "현장 인증"과 "연속 출석"이라는 운영 제약을 코드로 명확하게 표현해야 했습니다
- 프론트엔드, 서버, DB 정책, 관리자 도구까지 end-to-end로 혼자 설계하고 구현했습니다
- 이틀 개발 + 하루 테스트 후 5일간 실제 운영까지 완료한 프로젝트입니다

## 핵심 기능

### 1. 날짜별 랜덤 QR 토큰

`?day=1` 같은 예측 가능한 쿼리 대신, 날짜마다 `crypto.randomBytes(18)`로 생성한 랜덤 토큰을 QR에 담습니다. 서버는 해당 토큰이 오늘 운영 일자와 일치하는지 다시 검증하므로, QR 링크를 공유받아도 날짜가 맞지 않으면 출석이 거부됩니다.

```
참가자 → QR 스캔 → /check?token=abc123... → 서버가 토큰 ↔ 오늘 날짜 매칭 검증
```

### 2. GPS 반경 검증

브라우저 Geolocation API로 받은 위경도를 서버로 전송하면, Postgres RPC 내부에서 Haversine 공식으로 행사장 중심 좌표와의 거리를 계산합니다. 허용 반경(500m) 밖이면 출석이 거부되고 `admin_logs`에 이상 시도로 기록됩니다.

```sql
-- Haversine 거리 계산 (Postgres RPC 내부)
v_distance_meters :=
  2 * 6371000 * asin(
    sqrt(
      power(sin(radians((p_latitude - p_center_lat) / 2)), 2) +
      cos(radians(p_center_lat)) * cos(radians(p_latitude)) *
      power(sin(radians((p_longitude - p_center_lng) / 2)), 2)
    )
  );
```

### 3. 연속 출석 탈락 처리

5일 연속 출석이 핵심 규칙입니다. 출석 시점에 이전 일자의 누락 여부를 검사하고, 누락이 있으면 즉시 `participants.status = 'eliminated'`로 전환합니다. 이 판정은 프론트가 아닌 DB 함수에서 처리해 규칙 우회를 방지합니다.

```
Day1 ✓ → Day2 ✓ → Day3 ✗ → Day4 출석 시도 → 서버가 Day3 누락 감지 → 즉시 탈락 처리
```

### 4. 관리자 운영 대시보드

참가자 목록, 일자별 출석 현황, QR 토큰 상태, 이상 행동 로그를 한 화면에서 확인할 수 있는 관리자 페이지를 제공합니다. CSV 내보내기와 QR 토큰 재생성 API도 별도로 분리했습니다.

### 5. Signed Cookie 세션

별도 인증 서버 없이, HMAC-SHA256으로 서명한 쿠키 기반 세션을 직접 구현했습니다. 참가자 세션과 관리자 세션을 분리하여 권한을 관리합니다.

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | Next.js 15, React 19 |
| Backend | Next.js App Router + Route Handlers |
| Database | Supabase (PostgreSQL) |
| Business Logic | Postgres RPC Functions (`security definer`) |
| Session | HMAC-SHA256 Signed Cookie |
| Deployment | Vercel |
| QR 생성 | Node.js 스크립트 (`qrcode` 라이브러리) |

## 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│  참가자 흐름                                              │
│                                                         │
│  QR 스캔 → Next.js /check 페이지                         │
│         → 등록 or 로그인 (세션 발급)                       │
│         → GPS 좌표 + QR 토큰을 Route Handler로 전송        │
│         → Route Handler가 Supabase RPC 호출               │
│         → Postgres가 날짜/시간/반경/연속출석 전부 검증        │
│         → 출석 기록 저장 or 거부 사유 반환                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  관리자 흐름                                              │
│                                                         │
│  /admin 로그인 (ADMIN_PASSWORD)                           │
│         → 관리자 세션 발급                                 │
│         → app_admin_dashboard() RPC로 집계 데이터 조회      │
│         → CSV 내보내기 / QR 토큰 재생성 API                 │
└─────────────────────────────────────────────────────────┘
```

비즈니스 규칙을 `db/supabase_rpc.sql`의 Postgres 함수로 내린 이유는, 검증 로직을 한 곳에 고정하기 위해서입니다. 프론트는 UI와 입력 수집에 집중하고, 출석 인정 여부는 서버와 DB가 최종 결정합니다.

## 데이터 모델

```
participants ──1:N──▶ attendance_records ◀──N:1── attendance_days
                              │
                     admin_logs (모니터링)
```

| 테이블 | 역할 |
| --- | --- |
| `attendance_days` | 운영 일자 5일, 시간 범위, QR 토큰 |
| `participants` | 참가자 정보, 상태(`active` / `eliminated` / `completed`) |
| `attendance_records` | 출석 기록, GPS 좌표, 거리, 성공/거부 상태 |
| `admin_logs` | 반경 이탈, 탈락 처리, QR 재생성 등 운영 이벤트 로그 |

주요 제약조건:
- `(participant_id, attendance_day_id)` UNIQUE → 하루 1회 출석 강제
- `reject_reason` consistency check → `success`일 때 거부 사유 null 강제
- `qr_token` 최소 12자 check → 토큰 강도 보장
- Row Level Security 활성화 → 직접 테이블 접근 차단, RPC만 허용

전체 스키마: [`db/schema.sql`](./db/schema.sql) · RPC 함수: [`db/supabase_rpc.sql`](./db/supabase_rpc.sql)

## 화면 구성

| 랜딩 페이지 | 관리자 대시보드 |
| --- | --- |
| ![랜딩 페이지](./public/readme/landing-page.png) | ![관리자 페이지](./public/readme/admin-page.png) |

| 출석 스탬프 |
| --- |
| ![스탬프 페이지](./public/readme/stamp-page.png) |

### 페이지 구조

```
/              랜딩 페이지 (이벤트 안내, 출석 현황 미리보기)
/check         출석 페이지 (등록/로그인 → GPS 인증 → 출석 처리)
/stamp         내 출석 스탬프 보드 + 프로필 수정
/register      참가자 등록 (별도 진입점)
/admin         관리자 대시보드 (비밀번호 보호)
```

### API 라우트

```
POST /api/participants              참가자 등록
POST /api/session/login             재방문 로그인
POST /api/attendance/check-in       출석 처리 (QR + GPS 검증)
GET  /api/me                        현재 세션 참가자 조회

POST /api/admin/login               관리자 로그인
GET  /api/admin/export/[type]       CSV 내보내기 (participants / attendance)
POST /api/admin/attendance-days/[dayNumber]/regenerate   QR 토큰 재생성
GET  /api/admin/attendance-days/[dayNumber]/qr           QR 이미지 조회
POST /api/admin/participants/repair-attendance            출석 데이터 보정
```

## 프로젝트 구조

```
├── app/                    Next.js App Router 페이지 및 API 라우트
├── components/             클라이언트 컴포넌트 (폼, 체크인 패널 등)
├── lib/                    서버 유틸리티 (세션, 검증, Supabase 클라이언트)
├── db/
│   ├── schema.sql          Postgres 스키마 (테이블, 제약조건, 인덱스)
│   ├── supabase_rpc.sql    비즈니스 로직 RPC 함수 9개
│   └── seeds/              운영 데이터 시드
├── scripts/                QR 생성, DB 내보내기 등 운영 스크립트
├── ops/qr/                 생성된 QR 이미지 및 매니페스트
└── docs/                   프로젝트 기획서, 개발 명세, ERD
```

## 로컬 실행

### 환경변수

`.env.example`을 복사한 뒤 아래 값을 채웁니다.

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_EVENT_CENTER_LAT=37.556318
NEXT_PUBLIC_EVENT_CENTER_LNG=127.045965
NEXT_PUBLIC_EVENT_RADIUS_METERS=500

SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_PUBLISHABLE_KEY=...

APP_SESSION_SECRET=...
ADMIN_PASSWORD=...
```

### 설치 및 실행

```bash
npm install
npm run dev
```

### DB 준비

1. Supabase 프로젝트에 [`db/schema.sql`](./db/schema.sql) 적용
2. [`db/supabase_rpc.sql`](./db/supabase_rpc.sql) 적용
3. QR 토큰 및 운영 일자 생성:

```bash
npm run generate:qr
```

이 스크립트는 5일치 랜덤 토큰을 생성하고, QR 이미지(PNG/SVG)와 DB 시드 SQL을 함께 출력합니다.

## 설계 결정과 트레이드오프

| 결정 | 이유 |
| --- | --- |
| 비즈니스 로직을 Postgres RPC로 집중 | 검증 로직이 한 곳에 있어야 클라이언트 우회가 불가능하고, Route Handler는 입출력 변환에만 집중할 수 있음 |
| Signed Cookie 세션 직접 구현 | 5일 단기 이벤트에 NextAuth나 Supabase Auth는 과한 구성. HMAC-SHA256 서명으로 충분한 무결성 보장 |
| GPS 검증을 서버에서 재계산 | 클라이언트가 보낸 좌표만 신뢰하되, 거리 계산은 서버에서 수행해 조작된 거리값 제출을 방지 |
| QR 토큰을 랜덤 문자열로 | `?day=1` 같은 예측 가능한 값은 공유만으로 부정 출석이 가능하므로, 날짜별 랜덤 토큰으로 대체 |
| 탈락 시 데이터 유지 | `eliminated` 상태 플래그만 변경하고 기존 출석 기록은 보존하여 운영 분석에 활용 |
| RLS 활성화 + RPC만 허용 | 테이블 직접 접근을 차단하고, `security definer` RPC를 통해서만 데이터 조작 가능 |

## 운영 결과

- 참가자 약 150명 등록
- 5일간 무중단 운영 완료
- GPS 반경 이탈 시도, 중복 출석 시도 등 이상 행동을 `admin_logs`로 실시간 모니터링
- 최종 5일 연속 출석 완주자 대상 추첨 진행

## 관련 문서

- [프로젝트 기획서](./docs/PROJECT.md)
- [개발 명세](./docs/DEV_SPEC.md)
- [ERD](./docs/ERD.md)
- [QR 운영 가이드](./docs/QR_SETUP.md)

## License

[MIT](./LICENSE)
