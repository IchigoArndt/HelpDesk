"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { tokenize, computeTicketTF } = require("../src/infrastructure/services/tokenizer");
const { positiveId, requiredText, validStatus } = require("../src/application/validation");
const { seedCount, ticketData, SCENARIOS } = require("../src/seedData");
test("normalização de texto e pesos", () => {
  assert.deepEqual(tokenize("A IMPRESSÃO de documentos!"), ["impressao", "documentos"]);
  assert.equal(computeTicketTF({ title: "driver", description: "driver", solution: "driver" }).get("driver"), 6);
});
test("valida entradas antes de consultar banco", () => {
  for (const value of [0, -1, 1.5, "abc", null, true, [], {}, 2147483648]) assert.throws(() => positiveId(value, "id"), (e) => e.status === 400);
  assert.equal(positiveId("12", "id"), 12);
  assert.throws(() => requiredText("  ", "title"));
  assert.throws(() => validStatus("ERRO"));
  assert.equal(seedCount("5000"), 5000);
  for (const value of [0, -1, "abc", 100001]) assert.throws(() => seedCount(value));
});
test("massa de 5000 registros tem títulos distintos, relações e soluções coerentes", () => {
  const authors = Array.from({ length: 20 }, (_, id) => ({ id: id + 1 }));
  const categories = SCENARIOS.map((_, id) => ({ id: id + 30 }));
  const products = SCENARIOS.map((_, id) => ({ id: id + 40 }));
  const tickets = Array.from({ length: 5000 }, (_, i) => ticketData(i, authors, categories, products));
  assert.equal(new Set(tickets.map((t) => t.title)).size, 5000);
  assert.equal(new Set(tickets.map((t) => t.status)).size, 4);
  tickets.forEach((t, i) => {
    assert.equal(t.categoryId, categories[i % 5].id);
    assert.equal(t.productId, products[i % 5].id);
    assert.ok(t.description.length > 150);
    assert.equal(Boolean(t.solution), ["RESOLVIDO", "FECHADO"].includes(t.status));
  });
});
