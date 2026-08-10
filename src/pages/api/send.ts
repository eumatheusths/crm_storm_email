import type { APIRoute } from "astro";
import nodemailer from "nodemailer";
import pool from "../../lib/db";
import { sendViaHostingerApi } from "../../lib/hostingerMail";

export const POST: APIRoute = async ({ request }) => {
  let logId: number | null = null;

  try {
    const { email, subject, html, smtpId, templateId } = await request.json();

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
        console.error("[Send API] Erro: Nenhum servidor de envio encontrado no banco.");
        return new Response(JSON.stringify({ error: "Nenhum servidor de envio configurado no sistema." }), { status: 400 });
    }

    const senderName = config.sender_name || config.name || "Storm Mídia";
    const sender = config.sender_email || config.smtp_user;
    const alwaysBcc = import.meta.env.ALWAYS_BCC;

    // 2. Registra o log ANTES de enviar (assim falhas de envio também ficam visíveis no Histórico)
    // e monta o pixel de rastreamento de abertura, igual aos fluxos automáticos.
    const logRes = await pool.query(
        "INSERT INTO email_logs (email, template_id, assunto, status) VALUES ($1, $2, $3, 'sent') RETURNING id",
        [email, templateId || null, subject]
    );
    logId = logRes.rows[0].id;

    const siteUrl = new URL(request.url).origin;
    const trackingPixel = `<img src="${siteUrl}/api/track?id=${logId}" width="1" height="1" style="display:none;" alt="" />`;
    const finalHtml = html + trackingPixel;

    // 3. Envia usando o provedor configurado
    if (config.provider === "hostinger_api") {
        console.log(`[Send API] Enviando via Hostinger API (mailbox ${config.mailbox_resource_id})`);
        await sendViaHostingerApi({
            apiToken: config.api_token,
            mailboxResourceId: config.mailbox_resource_id,
            to: email,
            subject,
            html: finalHtml,
            displayName: senderName,
            bcc: alwaysBcc ? [alwaysBcc] : undefined,
        });
        console.log(`[Send API] Sucesso via Hostinger API!`);
        return new Response(JSON.stringify({ success: true }));
    }

    console.log(`[Send API] Configuração carregada: ${config.smtp_host}:${config.smtp_port} (${config.smtp_user})`);

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

    const info = await transporter.sendMail({
        from: `"${senderName}" <${sender}>`,
        to: email,
        subject: subject,
        html: finalHtml,
        bcc: alwaysBcc || undefined,
    });

    console.log(`[Send API] Sucesso! MessageID: ${info.messageId}`);
    return new Response(JSON.stringify({ success: true, id: info.messageId }));

  } catch (error: any) {
    console.error("[Send API] ERRO CRÍTICO:", error);
    if (logId) {
        await pool.query("UPDATE email_logs SET status = 'failed', error = $1 WHERE id = $2", [error.message, logId]).catch(() => {});
    }
    // Retorna o erro exato para o Frontend mostrar
    return new Response(JSON.stringify({ error: error.message || "Erro desconhecido no envio" }), { status: 500 });
  }
};
