"use strict";

const { Router } = require("express");
const ctrl = require("../controllers/ticketController");

const router = Router();

// IMPORTANTE: /search deve vir antes de /:id para não ser capturado como id
router.get("/search", ctrl.search);

router.post("/", ctrl.create);
router.get("/", ctrl.list);
router.get("/:id", ctrl.get);
router.patch("/:id", ctrl.update);

module.exports = router;
