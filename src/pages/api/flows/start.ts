import type { APIRoute } from "astro";
import pool from "../../../lib/db";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { flowId, groupId, singleEmail } = await request.json(); // Recebe singleEmail agora

    let emails = [];

    // Cenário 1: Email Único
    if (singleEmail) {
        emails = [singleEmail];
    } 
    // Cenário 2: Grupo
    else if (groupId) {
        const groupRes = await pool.query("SELECT emails FROM groups WHERE id = $1", [groupId]);
        if (groupRes.rows.length === 0) return new Response(JSON.stringify({ error: "Grupo não encontrado" }), { status: 404 });
        const emailsRaw = groupRes.rows[0].emails;
        emails = typeof emailsRaw === 'string' ? JSON.parse(emailsRaw) : emailsRaw;
    } else {
        return new Response(JSON.stringify({ error: "Informe um grupo ou e-mail" }), { status: 400 });
    }

    // Inserir na tabela... (mesma lógica de antes)
    let count = 0;
    for (const email of emails) {
        const check = await pool.query("SELECT id FROM flow_tracking WHERE flow_id = $1 AND email = $2", [flowId, email]);
        if (check.rows.length === 0) {
            await pool.query(
                "INSERT INTO flow_tracking (flow_id, email, current_step_index, next_execution_at, status) VALUES ($1, $2, 0, NOW(), 'pending')",
                [flowId, email]
            );
            count++;
        }
    }

    await pool.query("UPDATE flows SET active = true WHERE id = $1", [flowId]);

    return new Response(JSON.stringify({ success: true, added: count }));
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};