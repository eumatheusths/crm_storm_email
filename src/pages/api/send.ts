import type { APIRoute } from "astro";
import nodemailer from "nodemailer";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, subject, html } = await request.json();

    const host = import.meta.env.SMTP_HOST;
    const port = Number(import.meta.env.SMTP_PORT);
    const user = import.meta.env.SMTP_USER;
    const pass = import.meta.env.SMTP_PASS;

    const transporter = nodemailer.createTransport({
      host, port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });

    const info = await transporter.sendMail({
      from: `"Storm Pro" <${user}>`,
      to: email, subject, html,
    });

    return new Response(JSON.stringify({ success: true, id: info.messageId }));
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};