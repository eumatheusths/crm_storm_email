// Substitui variáveis tipo {{nome}} pelo valor real do contato. Usado tanto no
// disparo manual (client-side, app.js) quanto nos fluxos automáticos (server-side).
export function mergeTemplate(text: string, vars: Record<string, string>): string {
  if (!text) return text;
  const lower: Record<string, string> = {};
  for (const key in vars) lower[key.toLowerCase()] = vars[key] ?? "";
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => lower[key.toLowerCase()] ?? "");
}
