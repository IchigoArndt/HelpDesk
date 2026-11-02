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
const { reindexPost } = require("../../src/infrastructure/services/indexService");
const app = require("../../src/server");
function cli(args) {
  const result = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), ...args], { cwd: path.resolve(__dirname, "../.."), env: process.env, encoding: "utf8", timeout: 120000 });
  assert.equal(result.status, 0, `${result.error || ""} ${result.stdout} ${result.stderr}`);
}
test("PostgreSQL real em schema exclusivo", { timeout: 240000 }, async (t) => {
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
  const request = async (route, method = "GET", data, token) => {
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };
    const r = await fetch(base + route, { method, headers, body: data === undefined ? undefined : JSON.stringify(data) });
    return { status: r.status, body: r.status === 204 ? null : await r.json() };
  };
  const signUp = async (name) => {
    const r = await request("/members", "POST", { name, email: `${name.toLowerCase().replaceAll(" ", ".")}@teste.example`, interests: ["Redes"] });
    assert.equal(r.status, 201);
    return r.body;
  };
  const NEW_POST = (extra = {}) => ({ title: "termoexclusivoalfa no computador", description: "Descrição longa o bastante para publicar no teste.", category: "Redes", tags: ["Teste"], ...extra });

  await t.test("seed repetido preserva dados e relações", async () => {
    const again = await seed(1000, () => {});
    assert.equal(again.inserted, 0);
    assert.equal(again.curatedInserted, 0);
    assert.equal(await prisma.post.count(), 1005);
    assert.equal(await prisma.member.count(), 25);
    assert.equal(await prisma.category.count(), 7);
    assert.equal(await prisma.article.count(), 3);
    assert.ok(await prisma.postTerm.count() > 1000);
    assert.equal((await request("/posts?limit=3")).body.length, 3);
    assert.equal((await request("/articles")).body.length, 3);
    assert.deepEqual((await request("/stats")).body, { posts: 1005, resolved: 500 + 2, members: 5 });
    assert.equal((await request("/categories")).body[0].name, "Placa de vídeo");
  });

  await t.test("cadastro, sessão e privacidade do e-mail", async () => {
    const ana = await signUp("Ana Teste");
    assert.ok(ana.token.length >= 64);
    assert.equal(ana.member.email, "ana.teste@teste.example");
    assert.equal((await request("/members", "POST", { name: "Outra", email: "ANA.TESTE@teste.example" })).status, 409);
    assert.equal((await request("/members", "POST", { name: "A", email: "x" })).status, 400);
    assert.equal((await request("/members/me")).status, 401);
    assert.equal((await request("/members/me", "GET", undefined, "token-invalido")).status, 401);
    assert.equal((await request("/members/me", "GET", undefined, ana.token)).body.name, "Ana Teste");
    const login = await request("/members/login", "POST", { email: "ana.teste@teste.example" });
    assert.equal(login.status, 200);
    assert.notEqual(login.body.token, ana.token);
    assert.equal((await request("/members/login", "POST", { email: "ninguem@teste.example" })).status, 404);
    const list = (await request("/members")).body;
    assert.ok(list.length >= 6 && list.every((m) => !("email" in m)));
    assert.ok(list.some((m) => m.name === "Rafael Costa") && !list.some((m) => m.name.startsWith("Membro Seed")));
    assert.equal((await request("/members/logout", "POST", undefined, login.body.token)).status, 204);
    assert.equal((await request("/members/me", "GET", undefined, login.body.token)).status, 401);
    assert.equal((await request("/notifications", "GET", undefined, ana.token)).body.unread, 1);
  });

  await t.test("publicar exige sessão, valida e indexa para a busca", async () => {
    const { token } = await signUp("Bia Publicadora");
    assert.equal((await request("/posts", "POST", NEW_POST())).status, 401);
    assert.equal((await request("/posts", "POST", NEW_POST({ title: "curto" }), token)).status, 400);
    assert.equal((await request("/posts", "POST", NEW_POST({ image: "data:text/html;base64,AAAA" }), token)).status, 400);
    assert.equal((await request("/posts", "POST", NEW_POST({ category: "Inexistente" }), token)).status, 404);
    assert.equal(await prisma.post.count({ where: { title: { contains: "termoexclusivoalfa" } } }), 0);
    const created = await request("/posts", "POST", NEW_POST({ image: "data:image/png;base64,iVBORw0KGgo=" }), token);
    assert.equal(created.status, 201);
    assert.equal(created.body.status, "open");
    assert.equal(created.body.author.name, "Bia Publicadora");
    assert.deepEqual(created.body.tags, ["Teste"]);
    const found = (await request("/posts/search?q=termoexclusivoalfa&limit=1")).body;
    assert.equal(found[0].post.id, created.body.id);
    assert.equal((await request("/posts/search?q=rede&limit=-1")).status, 400);
    assert.equal((await request("/posts/search")).status, 400);
    const detail = (await request(`/posts/${created.body.id}`)).body;
    assert.equal(detail.views, 1);
    assert.equal((await request("/posts/2147483647")).status, 404);
    assert.ok((await request("/posts?status=unanswered&limit=100")).body.some((p) => p.id === created.body.id));
    assert.equal((await request("/posts?status=FECHADO")).status, 400);
  });

  await t.test("respostas, aceite, notificações e voto", async () => {
    const author = await signUp("Caio Autor"), helper = await signUp("Duda Ajudante"), other = await signUp("Edu Curioso");
    const post = (await request("/posts", "POST", NEW_POST({ title: "problemaexclusivobeta no setup", description: "Descrição longa o bastante para o teste de votos." }), author.token)).body;
    const reply = await request(`/posts/${post.id}/replies`, "POST", { body: "solucaoexclusivagama resolve o problema relatado." }, helper.token);
    assert.equal(reply.status, 201);
    assert.equal((await request(`/posts/${post.id}/replies`, "POST", { body: "curta" }, helper.token)).status, 400);
    assert.equal((await request("/notifications", "GET", undefined, author.token)).body.items[0].postId, post.id);
    assert.equal((await request("/posts/search?q=solucaoexclusivagama")).body.length, 0);
    assert.equal((await request(`/posts/${post.id}/accept`, "POST", { replyId: reply.body.id }, helper.token)).status, 403);
    const accepted = await request(`/posts/${post.id}/accept`, "POST", { replyId: reply.body.id }, author.token);
    assert.equal(accepted.body.status, "resolved");
    assert.equal(accepted.body.replies[0].accepted, true);
    assert.equal((await request("/posts/search?q=solucaoexclusivagama")).body[0].post.id, post.id);
    assert.equal((await request("/notifications", "GET", undefined, helper.token)).body.unread, 2);
    assert.equal((await request("/notifications/read", "PATCH", undefined, helper.token)).body.updated, 2);
    const reopened = await request(`/posts/${post.id}/accept`, "POST", { replyId: reply.body.id }, author.token);
    assert.equal(reopened.body.status, "open");
    assert.equal((await request("/posts/search?q=solucaoexclusivagama")).body.length, 0);

    assert.deepEqual((await request("/votes", "POST", { postId: post.id, direction: 1 }, other.token)).body, { score: 1, myVote: 1 });
    assert.deepEqual((await request("/votes", "POST", { postId: post.id, direction: -1 }, other.token)).body, { score: -1, myVote: -1 });
    assert.deepEqual((await request("/votes", "POST", { postId: post.id, direction: -1 }, other.token)).body, { score: 0, myVote: 0 });
    assert.equal((await request("/votes", "POST", { replyId: reply.body.id, direction: 1 }, other.token)).body.score, 1);
    assert.equal((await request("/votes", "POST", { postId: post.id, direction: 1 }, author.token)).status, 403);
    assert.equal((await request("/votes", "POST", { postId: post.id, replyId: reply.body.id, direction: 1 }, other.token)).status, 400);
    assert.equal((await request("/votes", "POST", { postId: post.id, direction: 5 }, other.token)).status, 400);
    assert.equal((await request("/votes", "POST", { postId: post.id, direction: 1 })).status, 401);
    assert.equal((await request("/votes", "POST", { postId: 2147483647, direction: 1 }, other.token)).status, 404);
    const viewed = (await request(`/posts/${post.id}`, "GET", undefined, other.token)).body;
    assert.equal(viewed.replies[0].myVote, 1);
    assert.equal(viewed.replies[0].score, 1);
  });

  await t.test("itens salvos pertencem a cada membro", async () => {
    const one = await signUp("Fabi Leitora"), two = await signUp("Gui Leitor");
    const id = (await request("/posts?limit=1")).body[0].id;
    assert.equal((await request(`/posts/${id}/bookmark`, "POST", undefined, one.token)).body.saved, true);
    assert.equal((await request(`/posts/${id}/bookmark`, "POST", undefined, one.token)).body.saved, true);
    assert.equal((await request("/posts?saved=me", "GET", undefined, one.token)).body.length, 1);
    assert.equal((await request("/posts?saved=me", "GET", undefined, two.token)).body.length, 0);
    assert.equal((await request("/posts?saved=me")).status, 401);
    assert.equal((await request(`/posts/${id}`, "GET", undefined, one.token)).body.saved, true);
    assert.equal((await request(`/posts/${id}/bookmark`, "DELETE", undefined, one.token)).body.saved, false);
    assert.equal((await request("/posts/2147483647/bookmark", "POST", undefined, one.token)).status, 404);
  });

  await t.test("falha de FK desfaz publicação e termos novos", async () => {
    const sample = await prisma.post.findFirst(), marker = `rollback${randomUUID().replaceAll("-", "")}`;
    await assert.rejects(prisma.$transaction(async (tx) => {
      const post = await tx.post.create({ data: { title: marker, description: "Teste", authorId: sample.authorId, categoryId: sample.categoryId } });
      await reindexPost(tx, { id: post.id, title: marker, description: "Teste", tags: [], solution: null });
      await tx.post.create({ data: { title: "Inválido", description: "FK ausente", authorId: 2147483647, categoryId: sample.categoryId } });
    }), (e) => e.code === "P2003");
    assert.equal(await prisma.post.count({ where: { title: marker } }), 0);
    assert.equal(await prisma.term.count({ where: { token: marker } }), 0);
  });

  await t.test("JSON inválido e anexo grande têm erro claro", async () => {
    const raw = await fetch(`${base}/members/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{ruim" });
    assert.equal(raw.status, 400);
    const big = await fetch(`${base}/members/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "a@b.co", pad: "x".repeat(3.2 * 1024 * 1024) }) });
    assert.equal(big.status, 413);
  });
});
