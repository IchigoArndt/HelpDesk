"use strict";
function positiveId(value, name) {
  const id = ["number", "string"].includes(typeof value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw { status: 400, message: `${name} deve ser um inteiro positivo de até 2147483647.` };
  return id;
}
function requiredText(value, name) {
  if (typeof value !== "string" || !value.trim()) throw { status: 400, message: `${name} deve ser um texto não vazio.` };
  return value.trim();
}
function validStatus(value) {
  const statuses = ["ABERTO", "EM_ANDAMENTO", "RESOLVIDO", "FECHADO"];
  if (!statuses.includes(value)) throw { status: 400, message: `status inválido. Use: ${statuses.join(", ")}` };
  return value;
}
module.exports = { positiveId, requiredText, validStatus };
