"use strict";

const { computeTicketTF } = require("./tokenizer");

// O chamador mantém gravação e índice na mesma transação.
async function reindexTickets(tx, tickets) {
  if (!tickets.length) return;
  await tx.ticketTerm.deleteMany({ where: { ticketId: { in: tickets.map((t) => t.id) } } });
  const frequencies = tickets.map((ticket) => ({ id: ticket.id, tf: computeTicketTF(ticket) }));
  const tokens = [...new Set(frequencies.flatMap(({ tf }) => [...tf.keys()]))];
  if (!tokens.length) return;
  await tx.term.createMany({ data: tokens.map((token) => ({ token })), skipDuplicates: true });
  const terms = await tx.term.findMany({
    where: { token: { in: tokens } }, select: { id: true, token: true },
  });
  const ids = new Map(terms.map((term) => [term.token, term.id]));
  const postings = frequencies.flatMap(({ id, tf }) =>
    [...tf].map(([token, value]) => ({ ticketId: id, termId: ids.get(token), tf: value })));
  for (let offset = 0; offset < postings.length; offset += 1000) {
    await tx.ticketTerm.createMany({ data: postings.slice(offset, offset + 1000) });
  }
}

async function reindexTicket(tx, ticket) {
  await reindexTickets(tx, [ticket]);
}

module.exports = { reindexTicket, reindexTickets };
