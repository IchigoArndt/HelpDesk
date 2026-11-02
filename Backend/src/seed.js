"use strict";
require("dotenv").config();
const { performance } = require("node:perf_hooks");
const prisma = require("./infrastructure/database/prismaClient");
const { reindexTickets } = require("./infrastructure/services/indexService");
const { SCENARIOS, PREFIX, seedCount, ticketData } = require("./seedData");
async function seed(count = seedCount(), log = console.log) {
  count = seedCount(count);
  const started = performance.now(), authors = [], categories = [], products = [];
  for (let index = 1; index <= 20; index++) {
    const email = `colaborador${index}@seed.helpdesk.example`;
    authors.push(await prisma.author.upsert({ where: { email }, update: {}, create: { name: `Colaborador ${index}`, email } }));
  }
  for (const scenario of SCENARIOS) {
    const category = await prisma.category.upsert({ where: { name: scenario.category }, update: {}, create: { name: scenario.category, description: `Suporte de ${scenario.category}.` } });
    categories.push(category);
    const owner = { authorId: authors[0].id, categoryId: category.id };
    let product = await prisma.product.findFirst({ where: { name: scenario.product, ...owner } });
    if (!product) product = await prisma.product.create({ data: { name: scenario.product, description: `Produto fictício: ${scenario.product}.`, ...owner } });
    products.push(product);
    const title = `[SEED HELPDESK] Guia de ${scenario.category}`;
    if (!await prisma.article.findFirst({ where: { title, ...owner } })) await prisma.article.create({ data: { title, body: `${scenario.problem} Procedimento: ${scenario.solution} Documentar o resultado e confirmar com o colaborador.`, ...owner } });
  }
  const where = { title: { startsWith: PREFIX }, authorId: { in: authors.map((a) => a.id) } };
  const existing = new Set((await prisma.ticket.findMany({ where, select: { title: true } })).map((t) => t.title));
  let inserted = 0;
  for (let offset = 0; offset < count; offset += 100) {
    const data = Array.from({ length: Math.min(100, count - offset) }, (_, i) => ticketData(offset + i, authors, categories, products)).filter((t) => !existing.has(t.title));
    if (!data.length) continue;
    await prisma.$transaction(async (tx) => {
      await tx.ticket.createMany({ data });
      const tickets = await tx.ticket.findMany({ where: { title: { in: data.map((t) => t.title) }, authorId: { in: authors.map((a) => a.id) } } });
      await reindexTickets(tx, tickets);
    }, { timeout: 30000 });
    inserted += data.length;
    log(`Seed: ${Math.min(offset + 100, count)}/${count} registros conferidos.`);
  }
  const result = { requested: count, inserted, seededTickets: await prisma.ticket.count({ where }), durationMs: Math.round(performance.now() - started) };
  log(JSON.stringify(result));
  return result;
}
if (require.main === module) seed().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
module.exports = { seed };
