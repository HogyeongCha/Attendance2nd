"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    setIsPending(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button type="button" className="secondary-button" onClick={handleClick} disabled={isPending}>
      {isPending ? "정리 중..." : "관리자 로그아웃"}
    </button>
  );
}
