"use strict";

const { Router } = require("express");
const ctrl = require("../controllers/postController");
const { requireAuth } = require("../middlewares/auth");

const router = Router();

router.post("/", requireAuth, ctrl.vote);

module.exports = router;
