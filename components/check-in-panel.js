"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

const EVENT_CENTER_LAT = Number(process.env.NEXT_PUBLIC_EVENT_CENTER_LAT ?? "37.556318");
const EVENT_CENTER_LNG = Number(process.env.NEXT_PUBLIC_EVENT_CENTER_LNG ?? "127.045965");
const EVENT_RADIUS_METERS = Number(process.env.NEXT_PUBLIC_EVENT_RADIUS_METERS ?? "50");

function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(a));
}

export function CheckInPanel({ initialQrToken, hasSession }) {
  const router = useRouter();
  const qrToken = initialQrToken ?? "";
  const [locationMessage, setLocationMessage] = useState("");
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [coords, setCoords] = useState(null);
  const [locationVerified, setLocationVerified] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("이 브라우저에서는 위치 기능을 지원하지 않습니다.");
      return;
    }

    setIsLocating(true);
    setLocationMessage("");
    setAttendanceMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        const distanceMeters = getDistanceMeters(
          nextCoords.latitude,
          nextCoords.longitude,
          EVENT_CENTER_LAT,
          EVENT_CENTER_LNG
        );

        if (distanceMeters > EVENT_RADIUS_METERS) {
          setCoords(null);
          setLocationVerified(false);
          setLocationMessage(
            `허용 반경을 벗어났습니다. 현재 거리: ${Math.round(distanceMeters)}m`
          );
          setIsLocating(false);
          return;
        }

        setCoords(nextCoords);
        setLocationVerified(true);
        setLocationMessage(
          `위치 인증이 완료되었습니다. 현재 거리: ${Math.round(distanceMeters)}m`
        );
        setIsLocating(false);
      },
      () => {
        setCoords(null);
        setLocationVerified(false);
        setLocationMessage("위치 권한이 거부되었거나 위치를 확인할 수 없습니다.");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }

  async function submitCheckIn() {
    if (!hasSession) {
      setAttendanceMessage("먼저 등록 또는 로그인을 완료해주세요.");
      return;
    }

    if (!coords || !locationVerified) {
      setAttendanceMessage("먼저 위치 인증을 완료해주세요.");
      return;
    }

    if (!qrToken) {
      setAttendanceMessage("QR 토큰이 필요합니다.");
      return;
    }

    setIsSubmitting(true);
    setAttendanceMessage("");

    try {
      const response = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          qrToken,
          ...coords
        })
      });

      const result = await response.json();
      setAttendanceMessage(result.message || "출석이 처리되었습니다.");

      if (response.ok) {
        startTransition(() => {
          router.push("/stamp");
          router.refresh();
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="qr-token-box">
        <span className="token-state">QR 인식 완료</span>
        <p className="muted-copy">
          현장 QR로 접속한 링크가 확인되었습니다. 아래에서 위치 인증 후 바로 출석을
          완료하면 됩니다.
        </p>
      </div>

      <section className="action-panel">
        <div className="location-panel">
          <h2>1. 위치 인증</h2>
          <p>
            브라우저 위치 권한을 허용하고 현재 좌표를 서버로 전송해 허용 반경을
            검증합니다.
          </p>
          <button type="button" className="secondary-button" onClick={requestLocation}>
            {isLocating ? "위치 확인 중..." : "위치 인증 요청"}
          </button>
          {locationMessage ? <p className="form-message">{locationMessage}</p> : null}
        </div>
        <div className="attendance-panel">
          <h2>2. 출석 처리</h2>
          <p>위치 인증이 끝나면 당일 1회만 출석을 기록합니다.</p>
          <button type="button" className="primary-button" onClick={submitCheckIn}>
            {isSubmitting ? "출석 처리 중..." : "출석 완료"}
          </button>
          {attendanceMessage ? <p className="form-message">{attendanceMessage}</p> : null}
        </div>
      </section>
    </>
  );
}
