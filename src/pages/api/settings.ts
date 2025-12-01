import type { APIRoute } from "astro";
import pool from "../../lib/db";

// LISTAR (GET)
export const GET: APIRoute = async () => {
  try {
    // Garante que retorna sempre um ARRAY, mesmo se estiver vazio
    const { rows } = await pool.query("SELECT * FROM settings ORDER BY id ASC");
    return new Response(JSON.stringify(rows));
  } catch (e: any) {
    console.error("Erro GET Settings:", e);
    return new Response(JSON.stringify([])); 
  }
};

// CRIAR NOVO (POST)
export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    console.log("Tentando salvar:", data); // Log para debug

    await pool.query(`
        INSERT INTO settings (name, smtp_host, smtp_port, smtp_user, smtp_pass, sender_email, smtp_secure)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
        data.name || 'Servidor', 
        data.host, 
        data.port, 
        data.user, 
        data.pass, 
        data.sender, 
        data.secure
    ]);
    
    return new Response(JSON.stringify({ success: true }));
  } catch (e: any) { 
    console.error("Erro POST Settings:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 }); 
  }
};

// EDITAR EXISTENTE (PUT)
export const PUT: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    
    await pool.query(`
        UPDATE settings SET 
        name = $1, smtp_host = $2, smtp_port = $3, smtp_user = $4, 
        smtp_pass = $5, sender_email = $6, smtp_secure = $7
        WHERE id = $8
    `, [
        data.name, 
        data.host, 
        data.port, 
        data.user, 
        data.pass, 
        data.sender, 
        data.secure, 
        data.id
    ]);

    return new Response(JSON.stringify({ success: true }));
  } catch (e: any) { 
    console.error("Erro PUT Settings:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 }); 
  }
};

// EXCLUIR (DELETE)
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();
    await pool.query("DELETE FROM settings WHERE id = $1", [id]);
    return new Response(JSON.stringify({ success: true }));
  } catch (e: any) { 
    return new Response(JSON.stringify({ error: e.message }), { status: 500 }); 
  }
};