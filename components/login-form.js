"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

const initialForm = {
  studentId: "",
  name: "",
  phoneLast4: ""
};

export function LoginForm({
  redirectTo = "/stamp",
  submitLabel = "재방문 로그인",
  showPhoneLast4 = true
}) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/session/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message || "로그인에 실패했습니다.");
        return;
      }

      setMessage(result.message || "로그인되었습니다.");
      startTransition(() => {
        router.push(redirectTo);
        router.refresh();
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="mini-form" onSubmit={handleSubmit}>
      <label>
        <span>학번</span>
        <input
          value={form.studentId}
          onChange={(event) => updateField("studentId", event.target.value)}
          placeholder="예: 2026123456"
        />
      </label>
      <label>
        <span>이름</span>
        <input
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
          placeholder="이름 또는"
        />
      </label>
      {showPhoneLast4 ? (
        <label>
          <span>전화번호 뒤 4자리</span>
          <input
            value={form.phoneLast4}
            onChange={(event) => updateField("phoneLast4", event.target.value)}
            placeholder="1234"
          />
        </label>
      ) : null}
      {message ? <p className="form-message compact">{message}</p> : null}
      <button type="submit" className="secondary-button" disabled={isPending}>
        {isPending ? "확인 중..." : submitLabel}
      </button>
    </form>
  );
}
