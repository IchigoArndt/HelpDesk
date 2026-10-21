"use strict";

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || "Erro interno do servidor.";

  if (status >= 500) {
    console.error("[ERROR]", err);
  }

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
