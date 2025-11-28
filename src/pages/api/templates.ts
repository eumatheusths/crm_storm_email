import type { APIRoute } from "astro";
import pool from "../../lib/db";

export const GET: APIRoute = async () => {
  try {
    const { rows } = await pool.query("SELECT * FROM templates ORDER BY id DESC");
    return new Response(JSON.stringify(rows));
  } catch { return new Response(JSON.stringify([])); }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { nome, assunto, html } = await request.json();
    await pool.query("INSERT INTO templates (nome, assunto, html) VALUES ($1, $2, $3)", [nome, assunto, html]);
    return new Response(JSON.stringify({ success: true }));
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }); }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const { id, nome, assunto, html } = await request.json();
    await pool.query("UPDATE templates SET nome = $1, assunto = $2, html = $3 WHERE id = $4", [nome, assunto, html, id]);
    return new Response(JSON.stringify({ success: true }));
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }); }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();
    await pool.query("DELETE FROM templates WHERE id = $1", [id]);
    return new Response(JSON.stringify({ success: true }));
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }); }
};