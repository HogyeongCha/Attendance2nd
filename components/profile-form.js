"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

export function ProfileForm({ participant }) {
  const router = useRouter();
  const [form, setForm] = useState({
    department: participant.department ?? "",
    name: participant.name ?? "",
    phone: participant.phone ?? ""
  });
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
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message || "정보 수정 중 오류가 발생했습니다.");
        return;
      }

      setMessage(result.message || "내 정보가 수정되었습니다.");
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="event-form profile-form" onSubmit={handleSubmit}>
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
        <input value={participant.student_id} disabled />
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
      {message ? <p className="form-message compact">{message}</p> : null}
      <button type="submit" className="primary-button form-button" disabled={isPending}>
        {isPending ? "저장 중..." : "내 정보 저장"}
      </button>
    </form>
  );
}
