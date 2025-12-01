import type { APIRoute } from "astro";
import pool from "../../lib/db";

export const GET: APIRoute = async () => {
  try {
    // Pega a primeira linha de configuração
    const { rows } = await pool.query("SELECT * FROM settings LIMIT 1");
    return new Response(JSON.stringify(rows[0] || {}));
  } catch (e) { return new Response(JSON.stringify({})); }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    
    // Atualiza a primeira linha (ID 1 ou a que existir)
    // Se não tiver ID, faz update na tabela toda (como só tem 1 linha, funciona)
    await pool.query(`
        UPDATE settings SET 
        smtp_host = $1, 
        smtp_port = $2, 
        smtp_user = $3, 
        smtp_pass = $4, 
        sender_email = $5, 
        smtp_secure = $6
    `, [data.host, data.port, data.user, data.pass, data.sender, data.secure]);

    return new Response(JSON.stringify({ success: true }));
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }); }
};
