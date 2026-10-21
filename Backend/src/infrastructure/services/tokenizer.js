"use strict";

/**
 * Tokenizador simples em português.
 * - Minúsculas
 * - Remove acentos via normalização Unicode
 * - Remove pontuação e caracteres não-alfanuméricos
 * - Descarta tokens com menos de 3 caracteres
 * - Remove stopwords em português
 */

const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "em", "na", "no", "nas", "nos",
  "a", "o", "as", "os", "um", "uma", "uns", "umas",
  "e", "ou", "mas", "pois", "que", "se", "com", "por", "para",
  "ao", "aos", "ah", "ai", "ja", "la", "ha",
  "me", "te", "se", "nos", "vos", "lhe", "lhes",
  "eu", "tu", "ele", "ela", "eles", "elas", "voce", "vocês",
  "este", "esta", "estes", "estas", "esse", "essa", "esses", "essas",
  "isso", "isto", "aqui", "ali", "la",
  "foi", "era", "ser", "ter", "tem", "esta", "sao", "faz",
  "nao", "sim", "mais", "menos", "muito", "pouco",
  "quando", "onde", "como", "qual", "quais", "quem",
]);

/**
 * Remove acentos de uma string.
 * @param {string} str
 * @returns {string}
 */
function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Tokeniza o texto e retorna um array de tokens normalizados.
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  if (!text || typeof text !== "string") return [];

  const normalized = removeAccents(text.toLowerCase());
  const tokens = normalized
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));

  return tokens;
}

/**
 * Conta a frequência de cada token em um array.
 * @param {string[]} tokens
 * @returns {Map<string, number>}
 */
function countFrequency(tokens) {
  const freq = new Map();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) || 0) + 1);
  }
  return freq;
}

/**
 * Calcula o TF ponderado de um chamado.
 * Pesos: título × 3, solução × 2, descrição × 1
 *
 * @param {{ title: string, description: string, solution?: string }} ticket
 * @returns {Map<string, number>} token → tf ponderado
 */
function computeTicketTF(ticket) {
  const titleTokens = tokenize(ticket.title || "");
  const descTokens = tokenize(ticket.description || "");
  const solTokens = tokenize(ticket.solution || "");

  const tf = new Map();

  const add = (tokens, weight) => {
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + weight);
    }
  };

  add(titleTokens, 3);
  add(descTokens, 1);
  add(solTokens, 2);

  return tf;
}

module.exports = { tokenize, countFrequency, computeTicketTF };
