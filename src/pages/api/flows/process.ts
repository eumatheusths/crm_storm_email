import type { APIRoute } from "astro";
import pool from "../../../lib/db";
import nodemailer from "nodemailer";

export const GET: APIRoute = async () => {
  try {
    // 1. Configurar SMTP (Pega o primeiro configurado)
    const settingsRes = await pool.query("SELECT * FROM settings LIMIT 1");
    const config = settingsRes.rows[0];
    
    if (!config) return new Response("Sem SMTP configurado", { status: 500 });

    const transporter = nodemailer.createTransport({
        host: config.smtp_host, port: Number(config.smtp_port),
        secure: config.smtp_secure,
        auth: { user: config.smtp_user, pass: config.smtp_pass },
        tls: { rejectUnauthorized: false }
    });

    // 2. Buscar tarefas pendentes (Hora de execução <= AGORA e status 'pending')
    const tasks = await pool.query(`
        SELECT t.*, f.steps 
        FROM flow_tracking t
        JOIN flows f ON t.flow_id = f.id
        WHERE t.status = 'pending' 
        AND t.next_execution_at <= NOW()
        AND f.active = true
        LIMIT 50 -- Processa de 50 em 50 para não travar
    `);

    let processed = 0;

    for (const task of tasks.rows) {
        const steps = typeof task.steps === 'string' ? JSON.parse(task.steps) : task.steps;
        const currentStep = steps[task.current_step_index];

        if (!currentStep) {
            // Se não tem passo (acabou), marca como concluído
            await pool.query("UPDATE flow_tracking SET status = 'completed' WHERE id = $1", [task.id]);
            continue;
        }

        // 3. Enviar o E-mail
        try {
            // Busca o HTML do template
            const templateRes = await pool.query("SELECT * FROM templates WHERE id = $1", [currentStep.templateId]);
            
            if (templateRes.rows.length > 0) {
                const tmpl = templateRes.rows[0];
                await transporter.sendMail({
                    from: `"Nicopel Auto" <${config.sender_email || config.smtp_user}>`,
                    to: task.email,
                    subject: tmpl.assunto,
                    html: tmpl.html
                });
            }

            // 4. Agendar Próximo Passo
            const nextIndex = task.current_step_index + 1;
            const nextStepData = steps[nextIndex];

            if (nextStepData) {
                // Calcula o tempo do próximo (Agora + Horas de espera)
                const delayHours = parseInt(nextStepData.delay) || 0;
                await pool.query(`
                    UPDATE flow_tracking 
                    SET current_step_index = $1, next_execution_at = NOW() + interval '${delayHours} hours' 
                    WHERE id = $2
                `, [nextIndex, task.id]);
            } else {
                // Não tem mais passos, finaliza
                await pool.query("UPDATE flow_tracking SET status = 'completed' WHERE id = $1", [task.id]);
            }
            
            processed++;

        } catch (err) {
            console.error("Erro ao processar fluxo para " + task.email, err);
            // Opcional: Marcar como falha ou tentar de novo depois
        }
    }

    return new Response(JSON.stringify({ processed, remaining: tasks.rows.length - processed }));
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};