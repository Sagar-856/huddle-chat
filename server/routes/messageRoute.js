const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddlware");
const messageController = require("../controllers/messageController");
const { limitMessages } = require("../middleware/rateLimiter");

router.post("/:groupId", authMiddleware, limitMessages, messageController.sendMessage);
router.get("/:groupId", authMiddleware, messageController.getMessages);
router.delete("/:messageId", authMiddleware, messageController.deleteMessage);

module.exports = router;