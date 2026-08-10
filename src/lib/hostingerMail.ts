const HOSTINGER_API_BASE = "https://api.mail.hostinger.com/api/v1";

// Confirma o token e encontra o resourceId da caixa que corresponde ao e-mail remetente.
// A API da Hostinger não aceita endereço de e-mail direto no envio, só o resourceId da caixa.
export async function resolveHostingerMailbox(apiToken: string, senderEmail: string): Promise<string> {
  const res = await fetch(`${HOSTINGER_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });

  if (!res.ok) {
    throw new Error(`Token da Hostinger inválido ou sem permissão (HTTP ${res.status}).`);
  }

  const json = await res.json();
  const mailboxes: Array<{ resourceId: string; address: string }> = json?.data?.mailboxes || [];
  const match = mailboxes.find((m) => m.address?.toLowerCase() === senderEmail.toLowerCase());

  if (!match) {
    const disponiveis = mailboxes.map((m) => m.address).join(", ") || "nenhuma";
    throw new Error(`Este token não tem acesso à caixa "${senderEmail}". Caixas disponíveis: ${disponiveis}`);
  }

  return match.resourceId;
}

export async function sendViaHostingerApi(opts: {
  apiToken: string;
  mailboxResourceId: string;
  to: string;
  subject: string;
  html: string;
  displayName?: string;
}): Promise<void> {
  const res = await fetch(`${HOSTINGER_API_BASE}/mailboxes/${opts.mailboxResourceId}/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      ...(opts.displayName ? { displayName: opts.displayName } : {}),
    }),
  });

  if (res.status !== 204) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error || JSON.stringify(body);
    } catch {
      detail = res.statusText;
    }
    throw new Error(`Hostinger API respondeu ${res.status}: ${detail}`);
  }
}
