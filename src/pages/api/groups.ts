import type { APIRoute } from "astro";
import pool from "../../lib/db";

export const GET: APIRoute = async () => {
  try {
    const { rows } = await pool.query("SELECT * FROM groups ORDER BY id DESC");
    const data = rows.map(r => {
      try {
        const parsed = typeof r.emails === 'string' ? JSON.parse(r.emails) : r.emails;
        return { ...r, emails: parsed };
      } catch { return { ...r, emails: [] }; }
    });
    return new Response(JSON.stringify(data));
  } catch (e) { return new Response(JSON.stringify([])); }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { nome, emails } = await request.json();
    await pool.query("INSERT INTO groups (nome, emails) VALUES ($1, $2)", [nome, JSON.stringify(emails)]);
    return new Response(JSON.stringify({ success: true }));
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }); }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const { id, nome, emails } = await request.json();
    await pool.query("UPDATE groups SET nome = $1, emails = $2 WHERE id = $3", [nome, JSON.stringify(emails), id]);
    return new Response(JSON.stringify({ success: true }));
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }); }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();
    await pool.query("DELETE FROM groups WHERE id = $1", [id]);
    return new Response(JSON.stringify({ success: true }));
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }); }
};