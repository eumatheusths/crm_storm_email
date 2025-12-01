import type { APIRoute } from "astro";
import pool from "../../../lib/db";
import nodemailer from "nodemailer";

export const GET: APIRoute = async ({ request }) => {
  try {
    const siteUrl = new URL(request.url).origin; 

    // 1. SMTP
    const settingsRes = await pool.query("SELECT * FROM settings LIMIT 1");
    const config = settingsRes.rows[0];
    if (!config) return new Response("Sem SMTP", { status: 500 });

    const transporter = nodemailer.createTransport({
        host: config.smtp_host, port: Number(config.smtp_port),
        secure: config.smtp_secure,
        auth: { user: config.smtp_user, pass: config.smtp_pass },
        tls: { rejectUnauthorized: false }
    });

    // 2. Tarefas
    const tasks = await pool.query(`
        SELECT t.*, f.steps 
        FROM flow_tracking t
        JOIN flows f ON t.flow_id = f.id
        WHERE t.status = 'pending' AND t.next_execution_at <= NOW() AND f.active = true
        LIMIT 20
    `);

    let processed = 0;

    for (const task of tasks.rows) {
        const steps = typeof task.steps === 'string' ? JSON.parse(task.steps) : task.steps;
        const currentStep = steps[task.current_step_index];

        if (!currentStep) {
            await pool.query("UPDATE flow_tracking SET status = 'completed' WHERE id = $1", [task.id]);
            continue;
        }

        try {
            const templateRes = await pool.query("SELECT * FROM templates WHERE id = $1", [currentStep.templateId]);
            
            if (templateRes.rows.length > 0) {
                const tmpl = templateRes.rows[0];
                const logRes = await pool.query(
                    "INSERT INTO email_logs (flow_id, step_index, email, template_id) VALUES ($1, $2, $3, $4) RETURNING id",
                    [task.flow_id, task.current_step_index, task.email, tmpl.id]
                );
                const logId = logRes.rows[0].id;
                const trackingPixel = `<img src="${siteUrl}/api/track?id=${logId}" width="1" height="1" style="display:none;" />`;
                
                await transporter.sendMail({
                    from: `"Nicopel Auto" <${config.sender_email || config.smtp_user}>`,
                    to: task.email, subject: tmpl.assunto, html: tmpl.html + trackingPixel
                });
            }

            // 3. Agendar Próximo (COM LÓGICA DE UNIDADES)
            const nextIndex = task.current_step_index + 1;
            const nextStepData = steps[nextIndex];

            if (nextStepData) {
                const delay = parseInt(nextStepData.delay) || 0;
                // Padrão 'hours' se não tiver unit
                const unit = nextStepData.unit || 'hours'; 
                
                // Validação de segurança para SQL Injection
                const validUnits = ['minutes', 'hours', 'days'];
                const safeUnit = validUnits.includes(unit) ? unit : 'hours';

                await pool.query(`
                    UPDATE flow_tracking 
                    SET current_step_index = $1, next_execution_at = NOW() + interval '${delay} ${safeUnit}' 
                    WHERE id = $2
                `, [nextIndex, task.id]);
            } else {
                await pool.query