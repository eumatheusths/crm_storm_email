import type { APIRoute } from "astro";
import nodemailer from "nodemailer";
import pool from "../../lib/db";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, subject, html, smtpId } = await request.json();

    console.log(`[Send API] Iniciando envio para: ${email} usando SMTP ID: ${smtpId}`);

    // 1. Busca Configuração
    let query = "SELECT * FROM settings WHERE id = $1";
    let params = [smtpId];

    // Fallback: Se não veio ID, tenta pegar o primeiro
    if (!smtpId) {
        query = "SELECT * FROM settings ORDER BY id ASC LIMIT 1";
        params = [];
    }

    const { rows } = await pool.query(query, params);
    const config = rows[0];

    if (!config) {
        console.error("[Send API] Erro: Nenhum servidor SMTP encontrado no banco.");
        return new Response(JSON.stringify({ error: "Nenhum servidor SMTP configurado no sistema." }), { status: 400 });
    }

    console.log(`[Send API] Configuração carregada: ${config.smtp_host}:${config.smtp_port} (${config.smtp_user})`);

    // 2. Cria Transporter
    const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: Number(config.smtp_port),
        secure: config.smtp_secure, // true para 465, false para 587
        auth: {
            user: config.smtp_user,
            pass: config.smtp_pass
        },
        tls: { rejectUnauthorized: false }, // Ajuda com certificados auto-assinados
        connectionTimeout: 10000 // 10 segundos max para conectar
    });

    // 3. Envia
    const sender = config.sender_email || config.smtp_user;
    
    const info = await transporter.sendMail({
        from: `"Nicopel Club" <${sender}>`,
        to: email, 
        subject: subject, 
        html: html
    });

    console.log(`[Send API] Sucesso! MessageID: ${info.messageId}`);
    return new Response(JSON.stringify({ success: true, id: info.messageId }));

  } catch (error: any) {
    console.error("[Send API] ERRO CRÍTICO:", error);
    // Retorna o erro exato para o Frontend mostrar
    return new Response(JSON.stringify({ error: error.message || "Erro desconhecido no envio" }), { status: 500 });
  }
};