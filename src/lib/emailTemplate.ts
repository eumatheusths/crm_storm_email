export function gerarHtmlEmail(nome: string) {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .btn { display: inline-block; background-color: #d32f2f; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
        .footer { margin-top: 30px; font-size: 12px; color: #888; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>🎁 Você tem prêmios esperando no Club Nicopel!</h2>
        <p>Olá, <strong>${nome}</strong>,</p>
        <p>Você já conferiu seu saldo no <strong>Club Nicopel</strong> recentemente?</p>
        <p>Notamos que você tem acumulado pontos com a gente e queremos garantir que você aproveite as recompensas que preparamos.</p>
        <p>Acesse agora:</p>
        <center>
            <a href="http://club.nicopel.com.br/" class="btn">VER MEUS PONTOS E PRÊMIOS</a>
        </center>
        <div class="footer">
          <p>Enviado por Nicopel Embalagens</p>
        </div>
      </div>
    </body>
    </html>
  `;
}