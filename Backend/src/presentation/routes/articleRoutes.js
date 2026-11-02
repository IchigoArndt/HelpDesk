"use strict";

const { Router } = require("express");
const ctrl = require("../controllers/articleController");

const router = Router();

router.get("/", ctrl.list);
router.get("/:id", ctrl.get);

module.exports = router;
