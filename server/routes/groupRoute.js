const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddlware");
const {
    createGroup, getMyGroups, getGroupById,
    joinGroup, joinByInviteCode, leaveGroup,
    deleteGroup, searchGroups,
} = require("../controllers/groupController");

router.post("/", authMiddleware, createGroup);
router.get("/", authMiddleware, getMyGroups);
router.get("/search", authMiddleware, searchGroups);
router.post("/invite/:code", authMiddleware, joinByInviteCode);
router.get("/:groupId", authMiddleware, getGroupById);
router.post("/:groupId/join", authMiddleware, joinGroup);
router.post("/:groupId/leave", authMiddleware, leaveGroup);
router.delete("/:groupId", authMiddleware, deleteGroup);

module.exports = router;
