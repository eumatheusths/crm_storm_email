import type { APIRoute } from "astro";
import pool from "../../lib/db";

export const GET: APIRoute = async () => {
  try {
    const { rows } = await pool.query(`
      SELECT id, email, assunto, status, error, opened_at, created_at
      FROM email_logs
      ORDER BY created_at DESC
      LIMIT 200
    `);
    return new Response(JSON.stringify(rows));
  } catch (e: any) {
    console.error("Erro GET Logs:", e);
    return new Response(JSON.stringify([]));
  }
};
