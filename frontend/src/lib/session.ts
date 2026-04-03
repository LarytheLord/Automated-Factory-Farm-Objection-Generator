"use client";

export interface SessionUser {
  id: number | string;
  email: string;
  name: string;
  role: string;
  accessApproved?: boolean;
  accessPending?: boolean;
}

async function parseJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const response = await fetch("/api/auth/me", {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    return null;
  }

  const payload = await parseJsonSafe(response);
  if (!payload?.user || typeof payload.user !== "object") {
    return null;
  }

  return payload.user as SessionUser;
}

export async function logoutSession() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
  }).catch(() => undefined);
}
