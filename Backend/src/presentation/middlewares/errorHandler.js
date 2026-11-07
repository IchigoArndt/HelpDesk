"use strict";

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const databaseErrors = {
    P2002: { status: 409, message: "Já existe um registro com esses dados únicos." },
    P2003: { status: 400, message: "Referência inválida: verifique os identificadores informados." },
    P2025: { status: 404, message: "Registro não encontrado." },
  };
  const parserErrors = {
    "entity.too.large": { status: 413, message: "Conteúdo grande demais. A imagem deve ter até 2 MB." },
    "entity.parse.failed": { status: 400, message: "JSON inválido na requisição." },
  };

  const mapped = databaseErrors[err.code] || parserErrors[err.type];
  const status = mapped?.status || err.status || 500;
  const message = mapped?.message || (status < 500 ? err.message : "Erro interno do servidor.");

  if (status >= 500) {
    console.error("[ERROR]", err);
  }

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
