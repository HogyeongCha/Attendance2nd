"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminDayActions({ dayNumber }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function regenerate() {
    setIsPending(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/attendance-days/${dayNumber}/regenerate`, {
        method: "POST"
      });
      const result = await response.json();
      setMessage(result.message || "재발급 완료");

      if (response.ok) {
        startTransition(() => {
          router.refresh();
        });
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="admin-day-actions">
      <button type="button" className="secondary-button admin-inline-button" onClick={regenerate} disabled={isPending}>
        {isPending ? "재발급 중..." : "토큰 재발급"}
      </button>
      <a className="secondary-button admin-inline-button" href={`/api/admin/attendance-days/${dayNumber}/qr?format=png`}>
        PNG QR
      </a>
      <a className="secondary-button admin-inline-button" href={`/api/admin/attendance-days/${dayNumber}/qr?format=svg`}>
        SVG QR
      </a>
      {message ? <p className="form-message compact">{message}</p> : null}
    </div>
  );
}
