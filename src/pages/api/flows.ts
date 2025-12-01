import type { APIRoute } from "astro";
import pool from "../../lib/db";

export const GET: APIRoute = async () => {
  try {
    const { rows } = await pool.query("SELECT * FROM flows ORDER BY id DESC");
    
    // Para cada fluxo, busca estatísticas
    const flowsWithStats = await Promise.all(rows.map(async (r) => {
        const statsRes = await pool.query(`
            SELECT 
                COUNT(*) as sent,
                COUNT(opened_at) as opened
            FROM email_logs 
            WHERE flow_id = $1
        `, [r.id]);
        
        return {
            ...r,
            steps: typeof r.steps === 'string' ? JSON.parse(r.steps) : r.steps,
            stats: statsRes.rows[0] // { sent: 10, opened: 5 }
        };
    }));

    return new Response(JSON.stringify(flowsWithStats));
  } catch (e) {
    return new Response(JSON.stringify([])); 
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { nome, steps } = await request.json();
    await pool.query("INSERT INTO flows (nome, steps) VALUES ($1, $2)", [nome, JSON.stringify(steps)]);
    return new Response(JSON.stringify({ success: true }));
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();
    await pool.query("DELETE FROM flows WHERE id = $1", [id]);
    await pool.query("DELETE FROM email_logs WHERE flow_id = $1", [id]); // Limpa logs tbm
    return new Response(JSON.stringify({ success: true }));
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};