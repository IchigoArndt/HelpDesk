"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { tokenize, computePostTF } = require("../src/infrastructure/services/tokenizer");
const v = require("../src/application/validation");
const { seedCount, bulkPostData, bulkTitle, SCENARIOS, CURATED_POSTS, MEMBERS, CATEGORIES } = require("../src/seedData");

test("normalização de texto e pesos", () => {
  assert.deepEqual(tokenize("A IMPRESSÃO de documentos!"), ["impressao", "documentos"]);
  assert.equal(computePostTF({ title: "driver", description: "driver", solution: "driver", tags: ["driver"] }).get("driver"), 8);
});

test("valida entradas antes de consultar banco", () => {
  for (const value of [0, -1, 1.5, "abc", null, true, [], {}, 2147483648]) assert.throws(() => v.positiveId(value, "id"), (e) => e.status === 400);
  assert.equal(v.positiveId("12", "id"), 12);
  assert.throws(() => v.requiredText("  ", "title"));
  assert.throws(() => v.textBetween("curto", "title", 10, 160), (e) => e.status === 400);
  assert.equal(v.validEmail(" Ana@Exemplo.com "), "ana@exemplo.com");
  for (const value of ["sem-arroba", "a@b", 42, undefined]) assert.throws(() => v.validEmail(value), (e) => e.status === 400);
  assert.deepEqual(v.validTags(["BIOS", "bios", "RTX"]), ["BIOS", "RTX"]);
  assert.throws(() => v.validTags(["a", "b", "c", "d", "e"]));
  assert.equal(v.voteDirection(-1), -1);
  for (const value of [0, 2, "x", undefined]) assert.throws(() => v.voteDirection(value));
  assert.equal(v.postFilter("all"), undefined);
  assert.equal(v.postFilter("Resolved"), "resolved");
  assert.throws(() => v.postFilter("FECHADO"));
  assert.equal(v.validImage(undefined), null);
  assert.ok(v.validImage("data:image/png;base64,iVBORw0KGgo="));
  for (const value of ["data:text/html;base64,AAAA", "http://x/y.png", "data:image/png;base64,<script>"]) assert.throws(() => v.validImage(value));
  assert.equal(seedCount("5000"), 5000);
  for (const value of [0, -1, "abc", 100001]) assert.throws(() => seedCount(value));
});

test("dados do protótipo estão consistentes", () => {
  const categories = new Set(CATEGORIES.map((c) => c.name));
  const members = new Set(MEMBERS.map((m) => m.name));
  for (const post of CURATED_POSTS) {
    assert.ok(categories.has(post.category));
    assert.ok(members.has(post.author));
    assert.ok(post.replies.filter((r) => r.accepted).length <= 1);
    post.replies.forEach((r) => assert.ok(members.has(r.author)));
  }
});

test("massa de 5000 registros tem títulos distintos, relações e soluções coerentes", () => {
  const authors = Array.from({ length: 20 }, (_, id) => ({ id: id + 1 }));
  const categoriesByName = new Map(CATEGORIES.map((c, id) => [c.name, { id: id + 30 }]));
  const posts = Array.from({ length: 5000 }, (_, i) => bulkPostData(i, authors, categoriesByName));
  assert.equal(new Set(posts.map((p) => p.title)).size, 5000);
  assert.equal(new Set(posts.map((p) => p.status)).size, 2);
  posts.forEach((p, i) => {
    assert.equal(p.title, bulkTitle(i));
    assert.equal(p.categoryId, categoriesByName.get(SCENARIOS[i % SCENARIOS.length].category).id);
    assert.ok(p.description.length > 150);
    assert.equal(Boolean(p.solution), p.status === "RESOLVED");
    assert.equal(p.replies.filter((r) => r.accepted).length, p.status === "RESOLVED" ? 1 : 0);
    p.replies.forEach((r) => assert.notEqual(r.authorId, p.authorId));
  });
});
