export function normalizeStudentId(studentId) {
  return String(studentId ?? "").trim();
}

export function normalizePhone(phone) {
  return String(phone ?? "").replace(/\D/g, "");
}

export function validateRegistrationInput(input) {
  const studentId = normalizeStudentId(input.studentId);
  const department = String(input.department ?? "").trim();
  const name = String(input.name ?? "").trim();
  const phone = normalizePhone(input.phone);

  if (!department || !studentId || !name || !phone) {
    return { ok: false, message: "모든 항목을 입력해주세요." };
  }

  if (!/^\d{8,12}$/.test(studentId)) {
    return { ok: false, message: "학번 형식을 확인해주세요." };
  }

  if (!/^01\d{8,9}$/.test(phone)) {
    return { ok: false, message: "전화번호 형식을 확인해주세요." };
  }

  return {
    ok: true,
    value: { department, studentId, name, phone }
  };
}

export function validateLoginInput(input) {
  const studentId = normalizeStudentId(input.studentId);
  const name = String(input.name ?? "").trim();
  const phoneLast4 = String(input.phoneLast4 ?? "").replace(/\D/g, "");

  if (!studentId) {
    return { ok: false, message: "학번을 입력해주세요." };
  }

  if (!name && !phoneLast4) {
    return { ok: false, message: "이름 또는 전화번호 뒤 4자리를 입력해주세요." };
  }

  if (phoneLast4 && !/^\d{4}$/.test(phoneLast4)) {
    return { ok: false, message: "전화번호 뒤 4자리를 확인해주세요." };
  }

  return {
    ok: true,
    value: { studentId, name, phoneLast4 }
  };
}

export function validateParticipantUpdateInput(input) {
  const department = String(input.department ?? "").trim();
  const name = String(input.name ?? "").trim();
  const phone = normalizePhone(input.phone);

  if (!department || !name || !phone) {
    return { ok: false, message: "모든 항목을 입력해주세요." };
  }

  if (!/^01\d{8,9}$/.test(phone)) {
    return { ok: false, message: "전화번호 형식을 확인해주세요." };
  }

  return {
    ok: true,
    value: { department, name, phone }
  };
}
