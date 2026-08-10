export const SESSION_COOKIE = "storm_session";

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// O cookie de sessão nunca guarda a senha em si, só o hash dela.
export async function sessionTokenFor(appPassword: string): Promise<string> {
  return sha256Hex(`storm-email-session:${appPassword}`);
}

export async function isValidSession(cookieValue: string | undefined | null): Promise<boolean> {
  const appPassword = import.meta.env.APP_PASSWORD;
  if (!appPassword || !cookieValue) return false;
  const expected = await sessionTokenFor(appPassword);
  return cookieValue === expected;
}
