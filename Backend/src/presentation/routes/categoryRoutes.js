"use strict";

const { Router } = require("express");
const ctrl = require("../controllers/categoryController");

const router = Router();

router.post("/", ctrl.create);
router.get("/", ctrl.list);
router.get("/:id", ctrl.get);

module.exports = router;
