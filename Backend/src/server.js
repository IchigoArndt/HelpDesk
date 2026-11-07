"use strict";

require("dotenv").config();

const express = require("express");
const config = require("./config");

const memberRoutes = require("./presentation/routes/memberRoutes");
const categoryRoutes = require("./presentation/routes/categoryRoutes");
const articleRoutes = require("./presentation/routes/articleRoutes");
const postRoutes = require("./presentation/routes/postRoutes");
const voteRoutes = require("./presentation/routes/voteRoutes");
const notificationRoutes = require("./presentation/routes/notificationRoutes");
const postController = require("./presentation/controllers/postController");
const cors = require("./presentation/middlewares/cors");
const errorHandler = require("./presentation/middlewares/errorHandler");

const app = express();

app.use(cors(config.allowedOrigins));

// O anexo de imagem (até 2 MB) trafega como data URL base64 no JSON.
app.use(express.json({ limit: "3mb" }));

// Rotas
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/stats", postController.stats);
app.use("/members", memberRoutes);
app.use("/categories", categoryRoutes);
app.use("/articles", articleRoutes);
app.use("/posts", postRoutes);
app.use("/votes", voteRoutes);
app.use("/notifications", notificationRoutes);

// Middleware de erro (deve ser o último)
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Circuito Backend rodando em http://localhost:${config.port}`);
  });
}

module.exports = app;
