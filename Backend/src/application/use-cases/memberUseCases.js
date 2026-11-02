"use strict";

const repo = require("../../infrastructure/repositories/memberRepository");
const { fail, positiveId, textBetween, validEmail, validInterests } = require("../validation");

function validName(value) {
  return textBetween(value, "name", 2, 70);
}

function validLevel(value) {
  if (value === undefined || value === null || value === "") return null;
  return textBetween(value, "level", 1, 60);
}

async function register(data = {}) {
  const { member, token } = await repo.create({
    name: validName(data.name),
    email: validEmail(data.email),
    level: validLevel(data.level),
    interests: validInterests(data.interests),
  });
  return { member: await repo.withStats(member), token };
}

async function login(data = {}) {
  const { member, token } = await repo.login(validEmail(data.email));
  return { member: await repo.withStats(member), token };
}

async function logout(token) {
  await repo.logout(token);
}

async function me(member) {
  return repo.withStats(member);
}

async function updateMe(member, data = {}) {
  const update = {};
  if (data.name !== undefined) update.name = validName(data.name);
  if (data.level !== undefined) update.level = validLevel(data.level);
  if (data.interests !== undefined) update.interests = validInterests(data.interests);
  if (!Object.keys(update).length) fail("Informe ao menos um campo válido para atualizar.");
  return repo.withStats(await repo.updateProfile(member.id, update));
}

async function listMembers() {
  return repo.findAll();
}

async function getMember(id) {
  const member = await repo.findPublicById(positiveId(id, "id"));
  if (!member) throw { status: 404, message: "Membro não encontrado." };
  return member;
}

module.exports = { register, login, logout, me, updateMe, listMembers, getMember };
