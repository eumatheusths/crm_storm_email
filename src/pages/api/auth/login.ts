import type { APIRoute } from "astro";
import { sessionTokenFor, SESSION_COOKIE } from "../../../lib/auth";

export const POST: APIRoute = async ({ request, cookies }) => {
  const appPassword = import.meta.env.APP_PASSWORD;
  if (!appPassword) {
    return new Response(JSON.stringify({ error: "APP_PASSWORD não configurado no servidor." }), { status: 500 });
  }

  const { password } = await request.json();

  if (password !== appPassword) {
    return new Response(JSON.stringify({ error: "Senha incorreta." }), { status: 401 });
  }

  const token = await sessionTokenFor(appPassword);
  cookies.set(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });

  return new Response(JSON.stringify({ success: true }));
};
