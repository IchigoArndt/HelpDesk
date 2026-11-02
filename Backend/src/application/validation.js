"use strict";

const fail = (message, status = 400) => { throw { status, message }; };

function positiveId(value, name) {
  const id = ["number", "string"].includes(typeof value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) fail(`${name} deve ser um inteiro positivo de até 2147483647.`);
  return id;
}

function requiredText(value, name) {
  if (typeof value !== "string" || !value.trim()) fail(`${name} deve ser um texto não vazio.`);
  return value.trim();
}

function textBetween(value, name, min, max) {
  const text = requiredText(value, name);
  if (text.length < min || text.length > max) fail(`${name} deve ter entre ${min} e ${max} caracteres.`);
  return text;
}

function validEmail(value) {
  const email = textBetween(value, "email", 5, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("email inválido.");
  return email;
}

function validTags(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) fail("tags deve ser uma lista de textos.");
  const tags = [];
  for (const raw of value) {
    const tag = textBetween(raw, "tag", 1, 30);
    if (!tags.some((t) => t.toLowerCase() === tag.toLowerCase())) tags.push(tag);
  }
  if (tags.length > 4) fail("Use no máximo 4 tags.");
  return tags;
}

function validInterests(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 12) fail("interests deve ser uma lista com até 12 textos.");
  return [...new Set(value.map((item) => textBetween(item, "interesse", 1, 40)))];
}

const IMAGE_PATTERN = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE_CHARS = 2_800_000; // ~2 MB em base64

function validImage(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > MAX_IMAGE_CHARS || !IMAGE_PATTERN.test(value)) {
    fail("image deve ser uma imagem PNG, JPEG, WebP ou GIF de até 2 MB (data URL base64).");
  }
  return value;
}

function voteDirection(value) {
  const direction = Number(value);
  if (direction !== 1 && direction !== -1) fail("direction deve ser 1 ou -1.");
  return direction;
}

const POST_FILTERS = ["open", "resolved", "unanswered"];
function postFilter(value) {
  if (value === undefined || value === "" || value === "all") return undefined;
  const filter = String(value).toLowerCase();
  if (!POST_FILTERS.includes(filter)) fail(`status inválido. Use: all, ${POST_FILTERS.join(", ")}`);
  return filter;
}

function pageSize(value, fallback, max) {
  if (value === undefined) return fallback;
  const size = positiveId(value, "limit");
  if (size > max) fail(`limit deve ser no máximo ${max}.`);
  return size;
}

module.exports = {
  fail, positiveId, requiredText, textBetween, validEmail, validTags, validInterests,
  validImage, voteDirection, postFilter, pageSize,
};
