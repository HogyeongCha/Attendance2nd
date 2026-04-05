begin;

create or replace function public.app_get_participant(p_participant_id uuid)
returns table (
  id uuid,
  student_id text,
  department text,
  name text,
  phone text,
  status participant_status,
  eliminated_on_day uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    participants.id,
    participants.student_id,
    participants.department,
    participants.name,
    participants.phone,
    participants.status,
    participants.eliminated_on_day,
    participants.created_at,
    participants.updated_at
  from public.participants
  where participants.id = p_participant_id
$$;

create or replace function public.app_register_participant(
  p_department text,
  p_student_id text,
  p_name text,
  p_phone text
)
returns table (
  id uuid,
  student_id text,
  name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.participants%rowtype;
begin
  if exists (
    select 1
    from public.participants p
    where p.student_id = trim(p_student_id)
  ) then
    raise exception '이미 등록된 학번입니다. 재방문 로그인을 이용해주세요.';
  end if;

  insert into public.participants (department, student_id, name, phone)
  values (trim(p_department), trim(p_student_id), trim(p_name), trim(p_phone))
  returning * into v_participant;

  return query
  select v_participant.id, v_participant.student_id, v_participant.name;
end;
$$;

create or replace function public.app_login_participant(
  p_student_id text,
  p_name text default null,
  p_phone_last4 text default null
)
returns table (
  id uuid,
  student_id text,
  name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.participants%rowtype;
begin
  select *
  into v_participant
  from public.participants p
  where p.student_id = trim(p_student_id)
  limit 1;

  if found then
    return query
    select v_participant.id, v_participant.student_id, v_participant.name;
    return;
  end if;

  insert into public.participants (
    department,
    student_id,
    name,
    phone
  )
  values (
    '임시 확인 필요',
    trim(p_student_id),
    coalesce(nullif(trim(p_name), ''), '미확인 참가자'),
    '01000000000'
  )
  returning * into v_participant;

  insert into public.admin_logs (type, message, metadata)
  values (
    'participant_placeholder_created',
    v_participant.student_id || ' placeholder participant created via login',
    jsonb_build_object(
      'participant_id', v_participant.id,
      'student_id', v_participant.student_id
    )
  );

  return query
  select v_participant.id, v_participant.student_id, v_participant.name;
end;
$$;

create or replace function public.app_get_stamp_board(p_participant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant jsonb;
  v_stamps jsonb;
begin
  select to_jsonb(p)
  into v_participant
  from public.participants p
  where p.id = p_participant_id;

  if v_participant is null then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'dayLabel', 'DAY ' || d.day_number,
        'date', to_char(d.attendance_date, 'MM.DD'),
        'checked',
          exists (
            select 1
            from public.attendance_records r
            where r.participant_id = p_participant_id
              and r.attendance_day_id = d.id
              and r.status = 'success'
          )
      )
      order by d.day_number
    ),
    '[]'::jsonb
  )
  into v_stamps
  from public.attendance_days d;

  return jsonb_build_object(
    'participant', v_participant,
    'stamps', v_stamps,
    'completedCount', (
      select count(*)
      from public.attendance_records
      where participant_id = p_participant_id
        and status = 'success'
    ),
    'totalCount', (
      select count(*)
      from public.attendance_days
    )
  );
end;
$$;

create or replace function public.app_update_participant(
  p_participant_id uuid,
  p_department text,
  p_name text,
  p_phone text
)
returns table (
  id uuid,
  student_id text,
  department text,
  name text,
  phone text,
  status participant_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.participants%rowtype;
begin
  update public.participants as p
  set department = trim(p_department),
      name = trim(p_name),
      phone = trim(p_phone),
      updated_at = now()
  where p.id = p_participant_id
  returning * into v_participant;

  if not found then
    raise exception '참가자 정보를 찾을 수 없습니다.';
  end if;

  return query
  select
    v_participant.id,
    v_participant.student_id,
    v_participant.department,
    v_participant.name,
    v_participant.phone,
    v_participant.status;
end;
$$;

create or replace function public.app_check_in(
  p_participant_id uuid,
  p_qr_token text,
  p_latitude numeric,
  p_longitude numeric,
  p_center_lat numeric,
  p_center_lng numeric,
  p_radius_meters numeric,
  p_ip_address text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.participants%rowtype;
  v_day public.attendance_days%rowtype;
  v_first_success_day_number integer;
  v_previous_day_count integer;
  v_previous_success_count integer;
  v_distance_meters numeric;
  v_success_count integer;
begin
  select *
  into v_participant
  from public.participants
  where id = p_participant_id;

  if not found then
    raise exception '먼저 참가자 등록 또는 로그인을 해주세요.';
  end if;

  if v_participant.status = 'eliminated' then
    raise exception '이미 연속 출석 대상에서 제외된 계정입니다.';
  end if;

  select *
  into v_day
  from public.attendance_days
  where qr_token = trim(p_qr_token)
  limit 1;

  if not found then
    raise exception '유효하지 않은 QR입니다.';
  end if;

  if v_day.attendance_date <> ((now() at time zone 'Asia/Seoul')::date) then
    raise exception '오늘 날짜용 QR이 아닙니다.';
  end if;

  if not (
    (now() at time zone 'Asia/Seoul')::time >= v_day.start_time
    and
    (now() at time zone 'Asia/Seoul')::time <= v_day.end_time
  ) then
    raise exception '출석 가능 시간이 아닙니다.';
  end if;

  select min(d.day_number)
  into v_first_success_day_number
  from public.attendance_records r
  join public.attendance_days d
    on d.id = r.attendance_day_id
  where r.participant_id = v_participant.id
    and r.status = 'success';

  if v_first_success_day_number is null then
    v_previous_day_count := 0;
    v_previous_success_count := 0;
  else
    select count(*)
    into v_previous_day_count
    from public.attendance_days
    where day_number >= v_first_success_day_number
      and day_number < v_day.day_number;

    select count(*)
    into v_previous_success_count
    from public.attendance_records r
    join public.attendance_days d
      on d.id = r.attendance_day_id
    where r.participant_id = v_participant.id
      and r.status = 'success'
      and d.day_number >= v_first_success_day_number
      and d.day_number < v_day.day_number;
  end if;

  if v_previous_success_count <> v_previous_day_count then
    update public.participants
    set status = 'eliminated',
        eliminated_on_day = v_day.id
    where id = v_participant.id;

    insert into public.admin_logs (type, message, metadata)
    values (
      'participant_eliminated',
      v_participant.student_id || ' is eliminated before day ' || v_day.day_number,
      jsonb_build_object(
        'participant_id', v_participant.id,
        'attendance_day_id', v_day.id
      )
    );

    raise exception '이전 출석 누락으로 연속 출석 대상에서 제외되었습니다.';
  end if;

  v_distance_meters :=
    2 * 6371000 * asin(
      sqrt(
        power(sin(radians((p_latitude - p_center_lat) / 2)), 2) +
        cos(radians(p_center_lat)) *
        cos(radians(p_latitude)) *
        power(sin(radians((p_longitude - p_center_lng) / 2)), 2)
      )
    );

  if v_distance_meters > p_radius_meters then
    insert into public.admin_logs (type, message, metadata)
    values (
      'outside_radius_attempt',
      v_participant.student_id || ' attempted check-in outside radius',
      jsonb_build_object(
        'participant_id', v_participant.id,
        'attendance_day_id', v_day.id,
        'distance_meters', round(v_distance_meters)
      )
    );

    raise exception '허용 반경을 벗어났습니다. 현재 거리: %m', round(v_distance_meters);
  end if;

  begin
    insert into public.attendance_records (
      participant_id,
      attendance_day_id,
      attended_at,
      latitude,
      longitude,
      distance_meters,
      ip_address,
      user_agent,
      status
    )
    values (
      v_participant.id,
      v_day.id,
      now(),
      p_latitude,
      p_longitude,
      round(v_distance_meters::numeric, 2),
      nullif(trim(coalesce(p_ip_address, '')), '')::inet,
      nullif(trim(coalesce(p_user_agent, '')), ''),
      'success'
    );
  exception
    when unique_violation then
      raise exception '오늘은 이미 출석이 완료되었습니다.';
  end;

  select count(*)
  into v_success_count
  from public.attendance_records
  where participant_id = v_participant.id
    and status = 'success';

  if v_success_count >= 5 then
    update public.participants
    set status = 'completed'
    where id = v_participant.id;
  end if;

  return jsonb_build_object(
    'message', '오늘 출석이 완료되었습니다.',
    'distanceMeters', round(v_distance_meters),
    'dayNumber', v_day.day_number
  );
end;
$$;

create or replace function public.app_admin_dashboard()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with participants_data as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'student_id', p.student_id,
          'department', p.department,
          'name', p.name,
          'phone', p.phone,
          'status', p.status,
          'created_at', p.created_at
        )
        order by p.created_at desc
      ),
      '[]'::jsonb
    ) as value
    from public.participants p
  ),
  days_data as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'day_number', d.day_number,
          'attendance_date', d.attendance_date,
          'qr_token', d.qr_token,
          'is_active', d.is_active
        )
        order by d.day_number asc
      ),
      '[]'::jsonb
    ) as value
    from public.attendance_days d
  ),
  records_data as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'attended_at', r.attended_at,
          'distance_meters', r.distance_meters,
          'status', r.status,
          'reject_reason', r.reject_reason,
          'participant', jsonb_build_object(
            'name', p.name,
            'student_id', p.student_id
          ),
          'day', jsonb_build_object(
            'day_number', d.day_number,
            'attendance_date', d.attendance_date
          )
        )
        order by r.attended_at desc
      ),
      '[]'::jsonb
    ) as value
    from (
      select *
      from public.attendance_records
      order by attended_at desc
      limit 50
    ) r
    left join public.participants p on p.id = r.participant_id
    left join public.attendance_days d on d.id = r.attendance_day_id
  ),
  logs_data as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', l.id,
          'type', l.type,
          'message', l.message,
          'created_at', l.created_at
        )
        order by l.created_at desc
      ),
      '[]'::jsonb
    ) as value
    from (
      select *
      from public.admin_logs
      order by created_at desc
      limit 30
    ) l
  )
  select jsonb_build_object(
    'stats', jsonb_build_object(
      'participants', (select count(*) from public.participants),
      'active', (select count(*) from public.participants where status = 'active'),
      'completed', (select count(*) from public.participants where status = 'completed'),
      'eliminated', (select count(*) from public.participants where status = 'eliminated'),
      'successfulCheckIns', (select count(*) from public.attendance_records where status = 'success')
    ),
    'participants', participants_data.value,
    'days', days_data.value,
    'records', records_data.value,
    'logs', logs_data.value
  )
  from participants_data, days_data, records_data, logs_data
$$;

create or replace function public.app_admin_regenerate_day_token(
  p_day_number integer,
  p_qr_token text
)
returns table (
  id uuid,
  day_number integer,
  attendance_date date,
  qr_token text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day public.attendance_days%rowtype;
begin
  update public.attendance_days
  set qr_token = trim(p_qr_token),
      updated_at = now()
  where day_number = p_day_number
  returning * into v_day;

  if not found then
    raise exception '해당 일차를 찾을 수 없습니다.';
  end if;

  insert into public.admin_logs (type, message, metadata)
  values (
    'qr_token_regenerated',
    'DAY ' || p_day_number || ' QR token regenerated',
    jsonb_build_object(
      'attendance_day_id', v_day.id,
      'day_number', p_day_number
    )
  );

  return query
  select v_day.id, v_day.day_number, v_day.attendance_date, v_day.qr_token;
end;
$$;

create or replace function public.app_admin_get_day(p_day_number integer)
returns table (
  day_number integer,
  attendance_date date,
  qr_token text
)
language sql
security definer
set search_path = public
as $$
  select d.day_number, d.attendance_date, d.qr_token
  from public.attendance_days d
  where d.day_number = p_day_number
$$;

grant execute on function public.app_get_participant(uuid) to anon, authenticated;
grant execute on function public.app_register_participant(text, text, text, text) to anon, authenticated;
grant execute on function public.app_login_participant(text, text, text) to anon, authenticated;
grant execute on function public.app_get_stamp_board(uuid) to anon, authenticated;
grant execute on function public.app_update_participant(uuid, text, text, text) to anon, authenticated;
grant execute on function public.app_check_in(uuid, text, numeric, numeric, numeric, numeric, numeric, text, text) to anon, authenticated;
grant execute on function public.app_admin_dashboard() to anon, authenticated;
grant execute on function public.app_admin_regenerate_day_token(integer, text) to anon, authenticated;
grant execute on function public.app_admin_get_day(integer) to anon, authenticated;

commit;
