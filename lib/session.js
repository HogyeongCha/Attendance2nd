import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";

const SESSION_COOKIE = "attendance2nd_session";
const ADMIN_SESSION_COOKIE = "attendance2nd_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function encode(data) {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

function decode(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function sign(value) {
  return crypto
    .createHmac("sha256", getServerEnv().appSessionSecret)
    .update(value)
    .digest("base64url");
}

export function createSessionValue(payload) {
  const encodedPayload = encode(payload);
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function parseSessionValue(value) {
  if (!value || !value.includes(".")) return null;

  const [encodedPayload, signature] = value.split(".");
  const expectedSignature = sign(encodedPayload);

  if (signature !== expectedSignature) return null;

  try {
    return decode(encodedPayload);
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  return parseSessionValue(value);
}

export async function setSession(payload) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionValue(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return parseSessionValue(value);
}

export async function setAdminSession(payload) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, createSessionValue(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}
