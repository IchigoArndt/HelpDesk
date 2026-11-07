"use strict";
require("dotenv").config();
const { performance } = require("node:perf_hooks");
const prisma = require("./infrastructure/database/prismaClient");
const { reindexPost, reindexPosts } = require("./infrastructure/services/indexService");
const {
  MEMBERS, CATEGORIES, ARTICLES, CURATED_POSTS, SCENARIOS, BULK_MEMBER_COUNT,
  bulkMember, bulkTitle, seedCount, bulkPostData,
} = require("./seedData");

const upsertMember = (member) => prisma.member.upsert({ where: { email: member.email }, update: {}, create: member });

async function seedBase() {
  const categories = new Map();
  for (const category of CATEGORIES) {
    categories.set(category.name, await prisma.category.upsert({ where: { name: category.name }, update: {}, create: category }));
  }
  for (const article of ARTICLES) {
    await prisma.article.upsert({ where: { title: article.title }, update: {}, create: article });
  }
  const tagNames = new Set([...CURATED_POSTS.flatMap((p) => p.tags), ...SCENARIOS.flatMap((s) => s.tags)]);
  const tags = new Map();
  for (const name of tagNames) tags.set(name, await prisma.tag.upsert({ where: { name }, update: {}, create: { name } }));
  const curatedMembers = new Map();
  for (const member of MEMBERS) curatedMembers.set(member.name, await upsertMember(member));
  const bulkMembers = [];
  for (let index = 1; index <= BULK_MEMBER_COUNT; index++) bulkMembers.push(await upsertMember(bulkMember(index)));
  return { categories, tags, curatedMembers, bulkMembers };
}

async function seedCurated({ categories, tags, curatedMembers }) {
  let inserted = 0;
  for (const spec of CURATED_POSTS) {
    const author = curatedMembers.get(spec.author);
    if (await prisma.post.findFirst({ where: { title: spec.title, authorId: author.id }, select: { id: true } })) continue;
    const createdAt = new Date(Date.now() - spec.minutesAgo * 60000);
    const accepted = spec.replies.find((reply) => reply.accepted);
    await prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          title: spec.title, description: spec.description, status: accepted ? "RESOLVED" : "OPEN",
          score: spec.score, views: spec.views, createdAt, authorId: author.id,
          categoryId: categories.get(spec.category).id,
          tags: { create: spec.tags.map((name) => ({ tagId: tags.get(name).id })) },
          replies: {
            create: spec.replies.map((reply, i) => ({
              body: reply.body, accepted: reply.accepted, score: reply.score,
              authorId: curatedMembers.get(reply.author).id, createdAt: new Date(createdAt.getTime() + (i + 1) * 60000),
            })),
          },
        },
      });
      await reindexPost(tx, { id: post.id, title: spec.title, description: spec.description, tags: spec.tags, solution: accepted?.body ?? null });
    });
    inserted++;
  }
  return inserted;
}

async function seedBulk({ categories, tags, bulkMembers }, count, log) {
  const authorIds = bulkMembers.map((m) => m.id);
  const existing = new Set((await prisma.post.findMany({ where: { authorId: { in: authorIds } }, select: { title: true } })).map((p) => p.title));
  let inserted = 0;
  for (let offset = 0; offset < count; offset += 100) {
    const batch = Array.from({ length: Math.min(100, count - offset) }, (_, i) => offset + i)
      .filter((index) => !existing.has(bulkTitle(index)))
      .map((index) => bulkPostData(index, bulkMembers, categories));
    if (batch.length) {
      await prisma.$transaction(async (tx) => {
        await tx.post.createMany({
          data: batch.map(({ title, description, status, authorId, categoryId, score, views, createdAt }) => (
            { title, description, status, authorId, categoryId, score, views, createdAt })),
        });
        const rows = await tx.post.findMany({ where: { title: { in: batch.map((b) => b.title) }, authorId: { in: authorIds } }, select: { id: true, title: true } });
        const ids = new Map(rows.map((row) => [row.title, row.id]));
        await tx.postTag.createMany({ data: batch.flatMap((b) => b.tags.map((name) => ({ postId: ids.get(b.title), tagId: tags.get(name).id }))) });
        await tx.reply.createMany({ data: batch.flatMap((b) => b.replies.map((reply) => ({ ...reply, postId: ids.get(b.title) }))) });
        await reindexPosts(tx, batch.map((b) => ({ id: ids.get(b.title), title: b.title, description: b.description, tags: b.tags, solution: b.solution })));
      }, { timeout: 60000 });
      inserted += batch.length;
    }
    log(`Seed: ${Math.min(offset + 100, count)}/${count} publicações conferidas.`);
  }
  return inserted;
}

async function seed(count = seedCount(), log = console.log) {
  count = seedCount(count);
  const started = performance.now();
  const base = await seedBase();
  const curated = await seedCurated(base);
  const inserted = await seedBulk(base, count, log);
  const result = {
    requested: count, inserted, curatedInserted: curated,
    seededPosts: await prisma.post.count({ where: { authorId: { in: base.bulkMembers.map((m) => m.id) } } }),
    durationMs: Math.round(performance.now() - started),
  };
  log(JSON.stringify(result));
  return result;
}

if (require.main === module) seed().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
module.exports = { seed };
