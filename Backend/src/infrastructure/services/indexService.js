"use strict";

const { computeTicketTF } = require("./tokenizer");

/**
 * Reindexa um chamado: apaga os postings antigos e recria dentro da mesma transação.
 *
 * @param {import("@prisma/client").PrismaClient} tx  - cliente Prisma (pode ser tx)
 * @param {{ id: number, title: string, description: string, solution?: string }} ticket
 */
async function reindexTicket(tx, ticket) {
  // 1. Remove postings antigos
  await tx.ticketTerm.deleteMany({ where: { ticketId: ticket.id } });

  const tf = computeTicketTF(ticket);
  if (tf.size === 0) return;

  // 2. Garante que cada token exista na tabela Term (upsert)
  const tokens = [...tf.keys()];

  for (const token of tokens) {
    await tx.term.upsert({
      where: { token },
      update: {},
      create: { token },
    });
  }

  // 3. Busca os ids dos termos
  const terms = await tx.term.findMany({
    where: { token: { in: tokens } },
    select: { id: true, token: true },
  });

  // 4. Cria os postings
  const postings = terms.map((term) => ({
    ticketId: ticket.id,
    termId: term.id,
    tf: tf.get(term.token),
  }));

  await tx.ticketTerm.createMany({ data: postings });
}

module.exports = { reindexTicket };
