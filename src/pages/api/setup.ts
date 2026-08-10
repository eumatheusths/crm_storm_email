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

    // Suporte a múltiplos provedores de envio (SMTP clássico ou API da Hostinger)
    await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'smtp'`);
    await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS api_token TEXT`);
    await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS mailbox_resource_id TEXT`);
    await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS sender_name TEXT`);

    // Tabelas usadas pelos Fluxos (automação) e pelo pixel de rastreamento de abertura.
    // Faltavam aqui — sem elas, iniciar um fluxo ou abrir a aba Fluxos quebrava em banco novo.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS flow_tracking (
        id SERIAL PRIMARY KEY,
        flow_id INTEGER REFERENCES flows(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        current_step_index INTEGER DEFAULT 0,
        next_execution_at TIMESTAMP DEFAULT NOW(),
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_flow_tracking_pending ON flow_tracking (status, next_execution_at);`);
    await pool.query(`ALTER TABLE flow_tracking ADD COLUMN IF NOT EXISTS nome TEXT`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        flow_id INTEGER REFERENCES flows(id) ON DELETE CASCADE,
        step_index INTEGER,
        email TEXT NOT NULL,
        template_id INTEGER,
        opened_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_logs_flow_id ON email_logs (flow_id);`);

    // Histórico do disparo manual (antes só os fluxos automáticos eram registrados aqui).
    await pool.query(`ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS assunto TEXT`);
    await pool.query(`ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent'`);
    await pool.query(`ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS error TEXT`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs (created_at DESC);`);

    return new Response("Banco de dados corrigido e atualizado com sucesso! 🚀 Tente salvar agora.");
  } catch (error: any) {
    return new Response("Erro no setup: " + error.message, { status: 500 });
  }
};