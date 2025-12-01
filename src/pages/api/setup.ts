import type { APIRoute } from "astro";
import pool from "../../lib/db";

export const GET: APIRoute = async () => {
  try {
    // Cria as tabelas básicas se não existirem
    await pool.query(`CREATE TABLE IF NOT EXISTS groups (id SERIAL PRIMARY KEY, nome TEXT, emails TEXT, created_at TIMESTAMP DEFAULT NOW());`);
    await pool.query(`CREATE TABLE IF NOT EXISTS templates (id SERIAL PRIMARY KEY, nome TEXT, assunto TEXT, html TEXT, created_at TIMESTAMP DEFAULT NOW());`);
    await pool.query(`CREATE TABLE IF NOT EXISTS flows (id SERIAL PRIMARY KEY, nome TEXT, steps TEXT, active BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW());`);

    // Cria a tabela settings se não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        name TEXT DEFAULT 'Padrão',
        smtp_host TEXT,
        smtp_port INTEGER,
        smtp_user TEXT,
        smtp_pass TEXT,
        sender_email TEXT,
        smtp_secure BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // *** CORREÇÃO DE ERRO *** // Se a tabela já existia (da versão anterior), ela não tem a coluna 'name'.
    // Este comando adiciona a coluna 'name' se ela estiver faltando.
    await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Meu Servidor'`);

    return new Response("Banco de dados corrigido e atualizado com sucesso! 🚀 Tente salvar agora.");
  } catch (error: any) {
    return new Response("Erro no setup: " + error.message, { status: 500 });
  }
};