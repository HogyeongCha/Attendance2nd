-- 공도2 출석 이벤트 Postgres 스키마
-- Target: PostgreSQL / Supabase Postgres

begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'participant_status'
  ) then
    create type participant_status as enum ('active', 'eliminated', 'completed');
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'attendance_record_status'
  ) then
    create type attendance_record_status as enum ('success', 'rejected');
  end if;
end
$$;

create table if not exists attendance_days (
  id uuid primary key default gen_random_uuid(),
  day_number integer not null unique,
  attendance_date date not null unique,
  start_time time not null,
  end_time time not null,
  qr_token text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_days_day_number_check check (day_number >= 1),
  constraint attendance_days_time_window_check check (start_time < end_time),
  constraint attendance_days_qr_token_length_check check (char_length(trim(qr_token)) >= 12)
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  student_id text not null unique,
  department text not null,
  name text not null,
  phone text not null,
  status participant_status not null default 'active',
  eliminated_on_day uuid references attendance_days(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint participants_student_id_not_blank check (char_length(trim(student_id)) > 0),
  constraint participants_department_not_blank check (char_length(trim(department)) > 0),
  constraint participants_name_not_blank check (char_length(trim(name)) > 0),
  constraint participants_phone_not_blank check (char_length(trim(phone)) > 0)
);

create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  attendance_day_id uuid not null references attendance_days(id) on delete cascade,
  attended_at timestamptz not null default now(),
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  distance_meters numeric(8, 2),
  ip_address inet,
  user_agent text,
  status attendance_record_status not null,
  reject_reason text,
  created_at timestamptz not null default now(),
  constraint attendance_records_participant_day_unique unique (participant_id, attendance_day_id),
  constraint attendance_records_distance_nonnegative check (
    distance_meters is null or distance_meters >= 0
  ),
  constraint attendance_records_reject_reason_consistency check (
    (status = 'success' and reject_reason is null) or
    (status = 'rejected' and reject_reason is not null)
  )
);

create table if not exists admin_logs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  constraint admin_logs_type_not_blank check (char_length(trim(type)) > 0),
  constraint admin_logs_message_not_blank check (char_length(trim(message)) > 0)
);

alter table attendance_days enable row level security;
alter table participants enable row level security;
alter table attendance_records enable row level security;
alter table admin_logs enable row level security;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_attendance_days_updated_at on attendance_days;
create trigger set_attendance_days_updated_at
before update on attendance_days
for each row
execute function set_updated_at();

drop trigger if exists set_participants_updated_at on participants;
create trigger set_participants_updated_at
before update on participants
for each row
execute function set_updated_at();

create index if not exists idx_participants_status
  on participants(status);

create index if not exists idx_attendance_days_attendance_date
  on attendance_days(attendance_date);

create index if not exists idx_attendance_records_participant_id
  on attendance_records(participant_id);

create index if not exists idx_attendance_records_attendance_day_id
  on attendance_records(attendance_day_id);

create index if not exists idx_attendance_records_status
  on attendance_records(status);

create index if not exists idx_attendance_records_attended_at
  on attendance_records(attended_at desc);

create index if not exists idx_admin_logs_type
  on admin_logs(type);

create index if not exists idx_admin_logs_created_at
  on admin_logs(created_at desc);

comment on table attendance_days is '이벤트 운영 일자와 QR 토큰 정보';
comment on table participants is '이벤트 참가자 기본 정보';
comment on table attendance_records is '참가자의 일자별 출석 기록 및 출석 실패 기록';
comment on table admin_logs is '관리자 모니터링용 로그';

comment on column participants.student_id is '학번, 참가자 유니크 식별값';
comment on column participants.status is 'active, eliminated, completed';
comment on column participants.eliminated_on_day is '탈락 확정 처리 일자';
comment on column attendance_days.qr_token is '날짜별 랜덤 QR 토큰';
comment on column attendance_records.status is 'success 또는 rejected';
comment on column attendance_records.reject_reason is 'rejected 상태일 때 실패 사유';

commit;
