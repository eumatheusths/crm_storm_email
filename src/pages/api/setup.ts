import type { APIRoute } from "astro";
import pool from "../../lib/db";

export const GET: APIRoute = async () => {
  try {
    // 1. Tabela de Grupos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        emails TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. Tabela de Templates
    await pool.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        assunto TEXT NOT NULL,
        html TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 3. Tabela de Fluxos (Automação)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS flows (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        steps TEXT NOT NULL,
        active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    return new Response("Sucesso! Todas as tabelas (Grupos, Templates, Flows) estão prontas. 🚀");
  } catch (error: any) {
    return new Response("Erro: " + error.message, { status: 500 });
  }
};