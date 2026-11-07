"use strict";

const memberRepo = require("../../infrastructure/repositories/memberRepository");

function bearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

// Preenche req.member quando há token válido; não bloqueia visitantes.
async function optionalAuth(req, res, next) {
  try {
    const token = bearerToken(req);
    if (token) {
      req.token = token;
      req.member = await memberRepo.findBySessionToken(token);
    }
    next();
  } catch (err) {
    next(err);
  }
}

// Exige sessão válida.
async function requireAuth(req, res, next) {
  await optionalAuth(req, res, (err) => {
    if (err) return next(err);
    if (!req.member) return next({ status: 401, message: "Entre na comunidade para realizar esta ação." });
    next();
  });
}

module.exports = { optionalAuth, requireAuth };
