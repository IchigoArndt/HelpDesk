"use strict";
require("dotenv").config();
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { performance } = require("node:perf_hooks");
const prisma = require("../infrastructure/database/prismaClient");
const { reindexTicket } = require("../infrastructure/services/indexService");
const { search } = require("../infrastructure/repositories/ticketRepository");
async function demo() {
  const counts = {};
  for (const model of ["author", "category", "product", "article", "ticket", "term", "ticketTerm"]) counts[model] = await prisma[model].count();
  assert.ok(counts.ticket >= 1000, "Execute npm run seed antes da demonstração.");
  console.log("Persistência:", counts);
  const sample = await prisma.ticket.findFirst({ include: { author: true, category: true, product: true } });
  assert.ok(sample.author && sample.category);
  console.log("Relações:", { ticket: sample.id, author: sample.author.name, category: sample.category.name, product: sample.product?.name });
  const marker = `rollback${randomUUID().replaceAll("-", "")}`, intentional = new Error("Rollback intencional");
  await assert.rejects(prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({ data: { title: marker, description: "Teste de atomicidade", authorId: sample.authorId, categoryId: sample.categoryId } });
    await reindexTicket(tx, ticket);
    assert.ok(await tx.ticketTerm.count({ where: { ticketId: ticket.id } }) > 0);
    throw intentional;
  }), (e) => e === intentional);
  assert.equal(await prisma.ticket.count({ where: { title: marker } }), 0);
  assert.equal(await prisma.term.count({ where: { token: marker } }), 0);
  console.log("Rollback confirmado: chamado e índice desfeitos.");
  const measurements = [];
  for (const query of ["impressora pdf", "senha conta bloqueada", "rede wifi", "notebook superaquecimento"]) {
    const start = performance.now(), results = await search(query, 5), firstMs = performance.now() - start;
    assert.ok(results.length);
    assert.ok(results.every((r, i) => !i || results[i - 1].score >= r.score));
    const times = [];
    for (let i = 0; i < 5; i++) { const time = performance.now(); await search(query, 5); times.push(performance.now() - time); }
    times.sort((a, b) => a - b);
    measurements.push({ query, results: results.length, firstMs: +firstMs.toFixed(2), medianMs: +times[2].toFixed(2) });
    console.log("Resultado principal:", results[0]);
  }
  console.table(measurements);
  console.log("Medição local, sem garantia de desempenho em produção.");
}
if (require.main === module) demo().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
module.exports = { demo };
