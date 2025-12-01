import type { APIRoute } from "astro";
import pool from "../../lib/db";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const logId = url.searchParams.get("id");

  if (logId) {
    try {
      // Marca como aberto no banco se ainda não foi
      await pool.query(
        "UPDATE email_logs SET opened_at = NOW() WHERE id = $1 AND opened_at IS NULL",
        [logId]
      );
    } catch (e) {
      console.error("Erro ao rastrear:", e);
    }
  }

  // Retorna um GIF transparente de 1x1 pixel
  const transparentGif = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );

  return new Response(transparentGif, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
};