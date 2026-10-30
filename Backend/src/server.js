"use strict";

require("dotenv").config();

const express = require("express");
const config = require("./config");

const authorRoutes = require("./presentation/routes/authorRoutes");
const categoryRoutes = require("./presentation/routes/categoryRoutes");
const productRoutes = require("./presentation/routes/productRoutes");
const articleRoutes = require("./presentation/routes/articleRoutes");
const ticketRoutes = require("./presentation/routes/ticketRoutes");
const errorHandler = require("./presentation/middlewares/errorHandler");

const app = express();

app.use(express.json());

// Rotas
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/authors", authorRoutes);
app.use("/categories", categoryRoutes);
app.use("/products", productRoutes);
app.use("/articles", articleRoutes);
app.use("/tickets", ticketRoutes);

// Middleware de erro (deve ser o último)
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`HelpDesk Backend rodando em http://localhost:${config.port}`);
  });
}

module.exports = app;
