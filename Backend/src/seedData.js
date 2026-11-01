"use strict";
const SCENARIOS = [
  ["Impressoras", "Impressora Laser", "Impressora não imprime documentos PDF", "Fila de impressão bloqueada na rede.", "Atualizar driver da impressora e reiniciar o spooler para imprimir PDF."],
  ["Rede", "Roteador", "Falha de conexão wifi na rede", "Computador sem acesso à rede corporativa.", "Renovar DHCP e atualizar adaptador wifi."],
  ["Acesso", "Portal de Identidade", "Senha esquecida e conta bloqueada", "Colaborador não consegue autenticar no portal.", "Validar identidade, desbloquear conta e redefinir senha."],
  ["Email", "Correio Corporativo", "Email não sincroniza mensagens", "Mensagens e anexos não chegam ao cliente de email.", "Verificar servidor e recriar perfil de email."],
  ["Hardware", "Notebook", "Notebook lento com superaquecimento", "Equipamento apresenta lentidão e desligamentos.", "Limpar ventilação e executar diagnóstico de memória do notebook."],
].map(([category, product, title, problem, solution]) => ({ category, product, title, problem, solution }));
const PREFIX = "[SEED HELPDESK ";
function seedCount(value = process.env.SEED_COUNT ?? "5000") {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 1 || count > 100000) throw new Error("SEED_COUNT deve ser um inteiro entre 1 e 100000.");
  return count;
}
function ticketData(index, authors, categories, products) {
  const slot = index % SCENARIOS.length, scenario = SCENARIOS[slot];
  const status = ["RESOLVIDO", "FECHADO", "ABERTO", "EM_ANDAMENTO"][index % 4];
  return {
    title: `${PREFIX}${String(index + 1).padStart(6, "0")}] ${scenario.title}`,
    description: `${scenario.problem} Unidade ${index % 20 + 1}, setor ${index % 12 + 1}. O suporte deve documentar diagnóstico, testes efetuados e impacto no atendimento da equipe, confirmando a solução com o colaborador. Ocorrência ${index + 1}.`,
    solution: ["RESOLVIDO", "FECHADO"].includes(status) ? scenario.solution : null,
    status, authorId: authors[index % authors.length].id, categoryId: categories[slot].id, productId: products[slot].id,
    createdAt: new Date(Date.UTC(2026, 0, 1) + index * 60000),
  };
}
module.exports = { SCENARIOS, PREFIX, seedCount, ticketData };
