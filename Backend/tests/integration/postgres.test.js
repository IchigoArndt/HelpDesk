"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
require("dotenv").config();
if (!process.env.TEST_DATABASE_URL) throw new Error("Defina TEST_DATABASE_URL para executar integração com PostgreSQL real.");
const schema = `helpdesk_test_${randomUUID().replaceAll("-", "")}`;
const url = new URL(process.env.TEST_DATABASE_URL);
url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();
const prisma = require("../../src/infrastructure/database/prismaClient");
const { seed } = require("../../src/seed");
const { reindexTicket } = require("../../src/infrastructure/services/indexService");
const app = require("../../src/server");
function cli(args) {
  const result = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), ...args], { cwd: path.resolve(__dirname, "../.."), env: process.env, encoding: "utf8", timeout: 120000 });
  assert.equal(result.status, 0, `${result.error || ""} ${result.stdout} ${result.stderr}`);
}
test("PostgreSQL real em schema exclusivo", { timeout: 180000 }, async (t) => {
  let server;
  t.after(async () => {
    try {
      if (server) await new Promise((resolve, reject) => server.close((e) => e ? reject(e) : resolve()));
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally { await prisma.$disconnect(); }
  });
  cli(["migrate", "deploy"]);
  cli(["migrate", "diff", "--from-url", process.env.DATABASE_URL, "--to-schema-datamodel", "prisma/schema.prisma", "--exit-code"]);
  await seed(1000, () => {});
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (route, method = "GET", data) => {
    const r = await fetch(base + route, { method, headers: { "Content-Type": "application/json" }, body: data === undefined ? undefined : JSON.stringify(data) });
    return { status: r.status, body: await r.json() };
  };
  await t.test("seed repetido preserva dados e relações", async () => {
    assert.equal((await seed(1000, () => {})).inserted, 0);
    assert.equal(await prisma.ticket.count(), 1000);
    assert.equal(await prisma.author.count(), 20);
    assert.equal(await prisma.product.count(), 5);
    assert.equal(await prisma.article.count(), 5);
    assert.ok(await prisma.ticketTerm.count() > 1000);
  });
  await t.test("API persiste status e reindexa texto alterado", async () => {
    const sample = await prisma.ticket.findFirst();
    const r = await request("/tickets", "POST", { title: "termoantigoexclusivo", description: "Problema de suporte", status: "RESOLVIDO", solution: "Driver atualizado", authorId: sample.authorId, categoryId: sample.categoryId });
    assert.equal(r.status, 201);
    assert.equal((await prisma.ticket.findUnique({ where: { id: r.body.id } })).status, "RESOLVIDO");
    assert.equal(r.body.author.id, sample.authorId);
    assert.equal((await request(`/tickets/${r.body.id}`, "PATCH", { title: "termonovoexclusivo" })).status, 200);
    assert.equal((await request("/tickets/search?q=termoantigoexclusivo")).body.length, 0);
    assert.equal((await request("/tickets/search?q=termonovoexclusivo&limit=1")).body[0].ticket.id, r.body.id);
  });
  await t.test("referências inválidas não deixam gravações parciais", async () => {
    const sample = await prisma.ticket.findFirst(), count = await prisma.ticket.count();
    assert.equal((await request("/tickets", "POST", { title: "Inválido", description: "Teste FK", authorId: 2147483647, categoryId: sample.categoryId })).status, 404);
    assert.equal(await prisma.ticket.count(), count);
    assert.equal((await request(`/tickets/${sample.id}`, "PATCH", { title: "Não alterar", productId: 2147483647 })).status, 404);
    assert.equal((await prisma.ticket.findUnique({ where: { id: sample.id } })).title, sample.title);
    assert.equal((await request("/tickets/search?q=rede&limit=-1")).status, 400);
  });
  await t.test("falha de FK desfaz chamado e termos novos", async () => {
    const sample = await prisma.ticket.findFirst(), marker = `rollback${randomUUID().replaceAll("-", "")}`;
    await assert.rejects(prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({ data: { title: marker, description: "Teste", authorId: sample.authorId, categoryId: sample.categoryId } });
      await reindexTicket(tx, ticket);
      await tx.ticket.create({ data: { title: "Inválido", description: "FK ausente", authorId: 2147483647, categoryId: sample.categoryId } });
    }), (e) => e.code === "P2003");
    assert.equal(await prisma.ticket.count({ where: { title: marker } }), 0);
    assert.equal(await prisma.term.count({ where: { token: marker } }), 0);
  });
});
