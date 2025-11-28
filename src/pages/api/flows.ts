import type { APIRoute } from "astro";
import pool from "../../lib/db";

export const GET: APIRoute = async () => {
  try {
    const { rows } = await pool.query("SELECT * FROM flows ORDER BY id DESC");
    const data = rows.map(r => ({
      ...r,
      steps: typeof r.steps === 'string' ? JSON.parse(r.steps) : r.steps
    }));
    return new Response(JSON.stringify(data));
  } catch { return new Response(JSON.stringify([])); }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { nome, steps } = await request.json();
    await pool.query("INSERT INTO flows (nome, steps) VALUES ($1, $2)", [nome, JSON.stringify(steps)]);
    return new Response(JSON.stringify({ success: true }));
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }); }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();
    await pool.query("DELETE FROM flows WHERE id = $1", [id]);
    return new Response(JSON.stringify({ success: true }));
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }); }
};