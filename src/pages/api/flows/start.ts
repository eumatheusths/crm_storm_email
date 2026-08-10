import type { APIRoute } from "astro";
import pool from "../../../lib/db";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { flowId, groupId, singleEmail } = await request.json(); // Recebe singleEmail agora

    let contatos: Array<{ email: string; nome: string }> = [];

    // Cenário 1: Email Único
    if (singleEmail) {
        contatos = [{ email: singleEmail, nome: "" }];
    }
    // Cenário 2: Grupo
    else if (groupId) {
        const groupRes = await pool.query("SELECT emails FROM groups WHERE id = $1", [groupId]);
        if (groupRes.rows.length === 0) return new Response(JSON.stringify({ error: "Grupo não encontrado" }), { status: 404 });
        const emailsRaw = groupRes.rows[0].emails;
        const parsed = typeof emailsRaw === 'string' ? JSON.parse(emailsRaw) : emailsRaw;
        // Grupos antigos guardam só strings de e-mail; os novos guardam { email, nome }.
        contatos = (parsed || []).map((item: any) =>
            typeof item === 'string' ? { email: item, nome: "" } : { email: item.email, nome: item.nome || "" }
        );
    } else {
        return new Response(JSON.stringify({ error: "Informe um grupo ou e-mail" }), { status: 400 });
    }

    // Inserir na tabela... (mesma lógica de antes)
    let count = 0;
    for (const contato of contatos) {
        const check = await pool.query("SELECT id FROM flow_tracking WHERE flow_id = $1 AND email = $2", [flowId, contato.email]);
        if (check.rows.length === 0) {
            await pool.query(
                "INSERT INTO flow_tracking (flow_id, email, nome, current_step_index, next_execution_at, status) VALUES ($1, $2, $3, 0, NOW(), 'pending')",
                [flowId, contato.email, contato.nome]
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
