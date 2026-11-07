"use strict";
require("dotenv").config();
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { performance } = require("node:perf_hooks");
const prisma = require("../infrastructure/database/prismaClient");
const { reindexPost } = require("../infrastructure/services/indexService");
const { search } = require("../infrastructure/repositories/postRepository");
async function demo() {
  const counts = {};
  for (const model of ["member", "category", "article", "post", "reply", "tag", "term", "postTerm"]) counts[model] = await prisma[model].count();
  assert.ok(counts.post >= 1000, "Execute npm run seed antes da demonstração.");
  console.log("Persistência:", counts);
  const sample = await prisma.post.findFirst({ include: { author: true, category: true, replies: true, tags: { include: { tag: true } } } });
  assert.ok(sample.author && sample.category);
  console.log("Relações:", { post: sample.id, author: sample.author.name, category: sample.category.name, replies: sample.replies.length, tags: sample.tags.map((t) => t.tag.name) });
  const marker = `rollback${randomUUID().replaceAll("-", "")}`, intentional = new Error("Rollback intencional");
  await assert.rejects(prisma.$transaction(async (tx) => {
    const post = await tx.post.create({ data: { title: marker, description: "Teste de atomicidade", authorId: sample.authorId, categoryId: sample.categoryId } });
    await reindexPost(tx, { id: post.id, title: marker, description: "Teste de atomicidade", tags: [], solution: null });
    assert.ok(await tx.postTerm.count({ where: { postId: post.id } }) > 0);
    throw intentional;
  }), (e) => e === intentional);
  assert.equal(await prisma.post.count({ where: { title: marker } }), 0);
  assert.equal(await prisma.term.count({ where: { token: marker } }), 0);
  console.log("Rollback confirmado: publicação e índice desfeitos.");
  const measurements = [];
  for (const query of ["placa video temperatura", "ssd nvme bios", "wifi desconecta notebook", "memoria ram diagnostico"]) {
    const start = performance.now(), results = await search(query, 5), firstMs = performance.now() - start;
    assert.ok(results.length);
    assert.ok(results.every((r, i) => !i || results[i - 1].score >= r.score));
    const times = [];
    for (let i = 0; i < 5; i++) { const time = performance.now(); await search(query, 5); times.push(performance.now() - time); }
    times.sort((a, b) => a - b);
    measurements.push({ query, results: results.length, firstMs: +firstMs.toFixed(2), medianMs: +times[2].toFixed(2) });
    console.log("Resultado principal:", { score: results[0].score, title: results[0].post.title });
  }
  console.table(measurements);
  console.log("Medição local, sem garantia de desempenho em produção.");
}
if (require.main === module) demo().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
module.exports = { demo };
