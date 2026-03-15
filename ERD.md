# 공도2 출석 이벤트 ERD

## 1. 목적

이 문서는 공도2 출석 이벤트 웹 서비스의 데이터 구조를 정의한다.

핵심 목표는 다음과 같다.

- 참가자 정보를 안정적으로 관리
- 날짜별 QR 출석을 검증
- 하루 1회 출석을 강제
- 연속 출석 탈락 상태를 유지
- 관리자용 모니터링 데이터를 확보

## 2. 엔티티 목록

- `participants`
- `attendance_days`
- `attendance_records`
- `admin_logs`

## 3. 관계 요약

- `participants` 1 : N `attendance_records`
- `attendance_days` 1 : N `attendance_records`

즉, 한 참가자는 여러 날짜의 출석 기록을 가질 수 있고, 한 출석 일자에는 여러 참가자의 출석 기록이 연결된다.

## 4. ERD 텍스트 표현

```text
participants
  id PK
  student_id UNIQUE
  department
  name
  phone
  status
  eliminated_on_day FK -> attendance_days.id (nullable)
  created_at
  updated_at

attendance_days
  id PK
  day_number UNIQUE
  attendance_date UNIQUE
  start_time
  end_time
  qr_token UNIQUE
  is_active
  created_at
  updated_at

attendance_records
  id PK
  participant_id FK -> participants.id
  attendance_day_id FK -> attendance_days.id
  attended_at
  latitude
  longitude
  distance_meters
  ip_address
  user_agent
  status
  reject_reason
  created_at

  UNIQUE(participant_id, attendance_day_id)

admin_logs
  id PK
  type
  message
  metadata
  created_at
```

## 5. 테이블 상세

### 5.1 `participants`

참가자 기본 정보를 저장한다.

| 컬럼명 | 타입 예시 | 제약 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid / bigint | PK | 참가자 식별자 |
| `student_id` | varchar | UNIQUE, NOT NULL | 학번 |
| `department` | varchar | NOT NULL | 학과 |
| `name` | varchar | NOT NULL | 이름 |
| `phone` | varchar | NOT NULL | 전화번호 |
| `status` | enum / varchar | NOT NULL | `active`, `eliminated`, `completed` |
| `eliminated_on_day` | uuid / bigint | NULL, FK | 탈락 처리된 일자 |
| `created_at` | timestamptz | NOT NULL | 생성 시각 |
| `updated_at` | timestamptz | NOT NULL | 수정 시각 |

설계 포인트:

- `student_id`는 사용자 고유 식별자다.
- 탈락자는 삭제하지 않고 `status = eliminated`로 유지한다.
- 5일 완주자는 `status = completed`로 갱신할 수 있다.

### 5.2 `attendance_days`

운영 일자와 날짜별 QR 정보를 저장한다.

| 컬럼명 | 타입 예시 | 제약 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid / bigint | PK | 출석 일자 식별자 |
| `day_number` | int | UNIQUE, NOT NULL | 1~5 일차 |
| `attendance_date` | date | UNIQUE, NOT NULL | 실제 날짜 |
| `start_time` | time | NOT NULL | 출석 시작 시각 |
| `end_time` | time | NOT NULL | 출석 종료 시각 |
| `qr_token` | varchar | UNIQUE, NOT NULL | 날짜별 랜덤 QR 토큰 |
| `is_active` | boolean | NOT NULL | 현재 사용 중 여부 |
| `created_at` | timestamptz | NOT NULL | 생성 시각 |
| `updated_at` | timestamptz | NOT NULL | 수정 시각 |

설계 포인트:

- `qr_token`은 `?day=1` 같은 예측 가능한 값 대신 랜덤 문자열을 저장한다.
- `attendance_date`와 `day_number`는 모두 유니크여야 한다.
- 운영 기간은 고정 5일이지만, 테이블로 관리하면 재사용과 관리자 제어가 쉬워진다.

### 5.3 `attendance_records`

출석 시도와 결과를 저장한다.

| 컬럼명 | 타입 예시 | 제약 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid / bigint | PK | 출석 기록 식별자 |
| `participant_id` | uuid / bigint | NOT NULL, FK | 참가자 |
| `attendance_day_id` | uuid / bigint | NOT NULL, FK | 출석 일자 |
| `attended_at` | timestamptz | NOT NULL | 출석 처리 시각 |
| `latitude` | numeric | NULL 또는 NOT NULL | 위도 |
| `longitude` | numeric | NULL 또는 NOT NULL | 경도 |
| `distance_meters` | numeric | NULL | 기준 좌표와의 거리 |
| `ip_address` | inet / varchar | NULL | 요청 IP |
| `user_agent` | text | NULL | 브라우저 정보 |
| `status` | enum / varchar | NOT NULL | `success`, `rejected` |
| `reject_reason` | varchar | NULL | 실패 사유 |
| `created_at` | timestamptz | NOT NULL | 생성 시각 |

핵심 제약:

- `UNIQUE(participant_id, attendance_day_id)`

설계 포인트:

- 하루 1회 출석 제한은 이 유니크 제약으로 강제한다.
- `status = rejected` 기록도 남기면 이상 행동 탐지와 운영 분석에 유리하다.
- 거리는 프런트가 아니라 서버에서 재계산한 값을 저장한다.

### 5.4 `admin_logs`

관리자 모니터링용 시스템 로그를 저장한다.

| 컬럼명 | 타입 예시 | 제약 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid / bigint | PK | 로그 식별자 |
| `type` | varchar | NOT NULL | 로그 유형 |
| `message` | text | NOT NULL | 로그 메시지 |
| `metadata` | jsonb | NULL | 추가 데이터 |
| `created_at` | timestamptz | NOT NULL | 생성 시각 |

예시 로그 유형:

- `multiple_accounts_same_ip`
- `repeated_same_location`
- `invalid_qr_attempt`
- `outside_radius_attempt`
- `duplicate_attendance_attempt`

## 6. 상태값 정의

### `participants.status`

- `active`: 정상 참여 중
- `eliminated`: 연속 출석 탈락
- `completed`: 5일 출석 완료

### `attendance_records.status`

- `success`: 출석 성공
- `rejected`: 출석 실패

### `attendance_records.reject_reason`

예시:

- `invalid_qr`
- `out_of_time_window`
- `location_permission_denied`
- `outside_allowed_radius`
- `duplicate_for_day`
- `participant_eliminated`

## 7. 권장 인덱스

- `participants(student_id)`
- `participants(status)`
- `attendance_days(attendance_date)`
- `attendance_days(qr_token)`
- `attendance_records(participant_id)`
- `attendance_records(attendance_day_id)`
- `attendance_records(status)`
- `attendance_records(attended_at)`
- `admin_logs(type)`
- `admin_logs(created_at)`

## 8. 권장 무결성 규칙

- `attendance_days.day_number`는 1 이상이어야 한다
- `attendance_days.start_time < attendance_days.end_time`
- `attendance_records.distance_meters >= 0`
- `participants.student_id`는 공백 없이 저장
- `participants.phone`은 하이픈 제거 후 저장

## 9. 비즈니스 규칙과 데이터 반영 방식

### 연속 출석 탈락

- 특정 사용자가 Day N 이전 일자 중 하나를 누락한 상태에서 다음 검증 시점이 오면 `participants.status = eliminated`
- `eliminated_on_day`에는 탈락이 확정된 일자 ID를 저장할 수 있다
- 탈락 후에도 기존 `attendance_records`는 삭제하지 않는다

### 출석 완료

- Day5까지 모두 성공 출석이면 `participants.status = completed`

### QR 검증

- 사용자가 진입한 토큰은 `attendance_days.qr_token`과 매칭되어야 한다
- 서버는 오늘 날짜와 해당 토큰의 운영 날짜가 일치하는지 추가 검증해야 한다

## 10. 구현 시 참고사항

- 실제 DB는 Postgres 기준으로 설계하는 것이 적절하다
- `uuid` 또는 `bigserial` 중 하나를 프로젝트 전체에서 일관되게 선택한다
- 운영상 rejected 로그를 많이 남길 경우 `attendance_records`와 `admin_logs`의 역할을 분리해서 관리하는 편이 좋다
- 개인정보가 포함되므로 관리자 조회 범위와 보관 기간은 별도 운영 정책으로 정하는 것이 좋다
