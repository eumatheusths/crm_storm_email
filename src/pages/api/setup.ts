import type { APIRoute } from "astro";
import pool from "../../lib/db";

export const GET: APIRoute = async () => {
  try {
    // Tabelas anteriores...
    await pool.query(`CREATE TABLE IF NOT EXISTS groups (id SERIAL PRIMARY KEY, nome TEXT, emails TEXT, created_at TIMESTAMP DEFAULT NOW());`);
    await pool.query(`CREATE TABLE IF NOT EXISTS templates (id SERIAL PRIMARY KEY, nome TEXT, assunto TEXT, html TEXT, created_at TIMESTAMP DEFAULT NOW());`);
    await pool.query(`CREATE TABLE IF NOT EXISTS flows (id SERIAL PRIMARY KEY, nome TEXT, steps TEXT, active BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW());`);

    // --- NOVA TABELA: CONFIGURAÇÕES (SMTP) ---
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        smtp_host TEXT,
        smtp_port INTEGER,
        smtp_user TEXT,
        smtp_pass TEXT,
        sender_email TEXT,
        smtp_secure BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Inserir configuração padrão vazia se não existir
    const check = await pool.query("SELECT count(*) FROM settings");
    if (parseInt(check.rows[0].count) === 0) {
        await pool.query(`INSERT INTO settings (smtp_host, smtp_port, smtp_user, smtp_pass, sender_email, smtp_secure) VALUES ('', 587, '', '', '', false)`);
    }

    return new Response("Banco atualizado! Tabela 'settings' criada. 🚀");
  } catch (error: any) {
    return new Response("Erro: " + error.message, { status: 500 });
  }
};