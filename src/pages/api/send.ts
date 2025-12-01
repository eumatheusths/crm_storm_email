import type { APIRoute } from "astro";
import nodemailer from "nodemailer";
import pool from "../../lib/db";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, subject, html, smtpId } = await request.json();

    // 1. Tenta pegar o SMTP específico pelo ID
    let query = "SELECT * FROM settings WHERE id = $1";
    let params = [smtpId];

    // Se não veio ID, pega o primeiro que achar (fallback)
    if (!smtpId) {
        query = "SELECT * FROM settings ORDER BY id ASC LIMIT 1";
        params = [];
    }

    const { rows } = await pool.query(query, params);
    const config = rows[0];

    if (!config) throw new Error("Nenhum servidor SMTP configurado.");

    // 2. Configura o Transporter com os dados do banco
    const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: Number(config.smtp_port),
        secure: config.smtp_secure, 
        auth: {
            user: config.smtp_user,
            pass: config.smtp_pass
        },
        tls: { rejectUnauthorized: false }
    });
    
    // 3. Envia
    const sender = config.sender_email || config.smtp_user;
    
    const info = await transporter.sendMail({
        from: `"Nicopel" <${sender}>`,
        to: email, subject, html
    });

    return new Response(JSON.stringify({ success: true, id: info.messageId }));

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};