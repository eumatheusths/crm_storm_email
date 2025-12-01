import type { APIRoute } from "astro";
import nodemailer from "nodemailer";
import pool from "../../lib/db";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, subject, html } = await request.json();

    // 1. Busca configurações do Banco
    const { rows } = await pool.query("SELECT * FROM settings LIMIT 1");
    const config = rows[0];

    let transporter;

    if (config && config.smtp_host && config.smtp_user) {
        // USA A CONFIGURAÇÃO DO BANCO (ABA CONFIGURAÇÕES)
        transporter = nodemailer.createTransport({
            host: config.smtp_host,
            port: Number(config.smtp_port),
            secure: config.smtp_secure, // true para 465, false para outras
            auth: {
                user: config.smtp_user,
                pass: config.smtp_pass
            },
            tls: { rejectUnauthorized: false }
        });
        
        // Define o remetente
        const sender = config.sender_email || config.smtp_user;
        
        await transporter.sendMail({
            from: `"Nicopel" <${sender}>`,
            to: email, subject, html
        });

    } else {
        // FALLBACK: USA O ARQUIVO .ENV SE O BANCO ESTIVER VAZIO
        const host = import.meta.env.SMTP_HOST;
        const port = Number(import.meta.env.SMTP_PORT);
        const user = import.meta.env.SMTP_USER;
        const pass = import.meta.env.SMTP_PASS;

        transporter = nodemailer.createTransport({
            host, port, secure: port === 465,
            auth: { user, pass }, tls: { rejectUnauthorized: false }
        });

        await transporter.sendMail({
            from: `"Nicopel" <${user}>`,
            to: email, subject, html
        });
    }

    return new Response(JSON.stringify({ success: true }));
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};