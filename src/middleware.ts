import { defineMiddleware } from "astro:middleware";
import { isValidSession, SESSION_COOKIE } from "./lib/auth";

// Rotas que precisam ficar acessíveis sem login:
// - /login e /api/auth/*: para o próprio fluxo de login
// - /api/flows/process: chamado pelo Vercel Cron (sem cookie de navegador), tem seu próprio segredo
// - /api/track: pixel de rastreamento carregado pelo cliente de e-mail de quem recebe a campanha
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout", "/api/flows/process", "/api/track"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))) {
    return next();
  }

  // Assets estáticos (favicon, imagens em /public, build do astro)
  if (pathname.startsWith("/_astro") || /\.(svg|png|jpg|jpeg|ico|css|js)$/.test(pathname)) {
    return next();
  }

  const appPassword = import.meta.env.APP_PASSWORD;
  if (!appPassword) {
    return new Response(
      "Configuração pendente: defina a variável de ambiente APP_PASSWORD para liberar o acesso ao painel.",
      { status: 500 }
    );
  }

  const authenticated = await isValidSession(context.cookies.get(SESSION_COOKIE)?.value);

  if (!authenticated) {
    if (pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401 });
    }
    return context.redirect("/login");
  }

  return next();
});
