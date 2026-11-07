"use strict";

const prisma = require("../database/prismaClient");

async function list(memberId, limit = 50) {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { memberId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit,
      select: { id: true, message: true, read: true, createdAt: true, postId: true },
    }),
    prisma.notification.count({ where: { memberId, read: false } }),
  ]);
  return { unread, items };
}

async function markAllRead(memberId) {
  const { count } = await prisma.notification.updateMany({ where: { memberId, read: false }, data: { read: true } });
  return { updated: count };
}

module.exports = { list, markAllRead };
