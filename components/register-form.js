"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

const initialForm = {
  department: "",
  studentId: "",
  name: "",
  phone: ""
};

export function RegisterForm({
  redirectTo = "/check",
  submitLabel = "등록하고 출석하러 가기"
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
      const response = await fetch("/api/participants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message || "등록 중 오류가 발생했습니다.");
        return;
      }

      setMessage(result.message || "등록이 완료되었습니다.");
      startTransition(() => {
        router.push(redirectTo);
        router.refresh();
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="event-form" onSubmit={handleSubmit}>
      <label>
        <span>학과</span>
        <input
          value={form.department}
          onChange={(event) => updateField("department", event.target.value)}
          placeholder="예: 컴퓨터소프트웨어학부"
        />
      </label>
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
          placeholder="예: 홍길동"
        />
      </label>
      <label>
        <span>전화번호</span>
        <input
          value={form.phone}
          onChange={(event) => updateField("phone", event.target.value)}
          placeholder="예: 01012345678"
        />
      </label>
      {message ? <p className="form-message">{message}</p> : null}
      <button type="submit" className="primary-button form-button" disabled={isPending}>
        {isPending ? "등록 중..." : submitLabel}
      </button>
    </form>
  );
}
