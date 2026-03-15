"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password })
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message || "로그인에 실패했습니다.");
        return;
      }

      setMessage(result.message || "로그인 완료");
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="event-form" onSubmit={handleSubmit}>
      <label>
        <span>관리자 비밀번호</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="ADMIN_PASSWORD"
        />
      </label>
      {message ? <p className="form-message">{message}</p> : null}
      <button type="submit" className="primary-button form-button" disabled={isPending}>
        {isPending ? "확인 중..." : "관리자 로그인"}
      </button>
    </form>
  );
}
