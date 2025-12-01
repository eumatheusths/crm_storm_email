import type { APIRoute } from "astro";
import pool from "../../../lib/db";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { flowId, groupId } = await request.json();

    // 1. Pegar emails do grupo
    const groupRes = await pool.query("SELECT emails FROM groups WHERE id = $1", [groupId]);
    if (groupRes.rows.length === 0) return new Response(JSON.stringify({ error: "Grupo não encontrado" }), { status: 404 });

    const emailsRaw = groupRes.rows[0].emails;
    const emails = typeof emailsRaw === 'string' ? JSON.parse(emailsRaw) : emailsRaw;

    // 2. Inserir na tabela de rastreamento (Evita duplicados se já estiver rodando)
    let count = 0;
    for (const email of emails) {
        // Verifica se já está nesse fluxo
        const check = await pool.query("SELECT id FROM flow_tracking WHERE flow_id = $1 AND email = $2", [flowId, email]);
        
        if (check.rows.length === 0) {
            // Insere com execução imediata (NOW())
            await pool.query(
                "INSERT INTO flow_tracking (flow_id, email, current_step_index, next_execution_at) VALUES ($1, $2, 0, NOW())",
                [flowId, email]
            );
            count++;
        }
    }

    // 3. Ativa o fluxo
    await pool.query("UPDATE flows SET active = true WHERE id = $1", [flowId]);

    return new Response(JSON.stringify({ success: true, added: count }));
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};