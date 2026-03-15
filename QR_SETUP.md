# QR 운영 가이드

## 1. 권장 방식

이 프로젝트의 QR 코드는 날짜별 랜덤 토큰 URL을 담아야 한다.

권장 URL 형식:

- `https://your-site.com/check?token=랜덤토큰`

비추천 형식:

- `https://your-site.com/check?day=1`

이유:

- `day=1` 같은 값은 쉽게 추측 가능하다
- 랜덤 토큰은 URL 공유와 추측 공격에 더 강하다
- 서버는 토큰과 실제 운영 날짜를 함께 검증할 수 있다

## 2. 생성 절차

프로젝트 루트에서 실행:

```bash
npm run generate:qr
```

생성 결과:

- `attendance_days.seed.sql`
- `generated/qr/*.png`
- `generated/qr/*.svg`
- `generated/qr/manifest.json`

## 3. 운영 순서

1. `NEXT_PUBLIC_SITE_URL`를 실제 배포 URL로 맞춘다
2. `npm run generate:qr` 실행
3. 생성된 `attendance_days.seed.sql`을 Supabase SQL Editor 또는 migration으로 적용
4. `generated/qr/*.png` 중 해당 날짜 파일을 인쇄해 공도2 입구에 비치

## 4. 주의사항

- 토큰을 다시 생성하면 이전 QR은 무효가 된다
- 운영 시작 직전에 한 번만 생성하고 고정하는 편이 안전하다
- `manifest.json`은 내부 운영용으로만 보관하고 외부에 공개하지 않는 편이 좋다
- 현장 인쇄용으로는 PNG, 디자인 편집용으로는 SVG가 편하다

## 5. 서버 검증 규칙

서버는 다음을 모두 확인해야 한다.

- QR 토큰 존재 여부
- 해당 토큰이 `attendance_days.qr_token`과 일치하는지
- 토큰의 `attendance_date`가 오늘 날짜와 일치하는지
- 현재 시간이 `start_time ~ end_time` 범위인지
- 사용자 세션이 유효한지
- GPS가 허용 반경 이내인지
