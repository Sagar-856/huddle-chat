const mongoose = require("mongoose");
const Message = require("../models/message");
const Group = require("../models/group");
const { getIO } = require("../socket");

const MAX_LENGTH = 2000;

// Returns the group if the user is a member. Otherwise it sends the
// error response itself and returns null, so callers just `return`.
async function getGroupForMember(groupId, userId, res) {
  if (!mongoose.isValidObjectId(groupId)) {
    res.status(400).json({ msg: "Invalid group id" });
    return null;
  }
  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404).json({ msg: "Group not found" });
    return null;
  }
  const isMember = group.members.some((m) => m.toString() === userId);
  if (!isMember) {
    res.status(403).json({ msg: "You are not a member of this group" });
    return null;
  }
  return group;
}

module.exports.sendMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { senderSocketId } = req.body;
    const userId = req.user.userId;
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";

    if (!content) return res.status(400).json({ msg: "Message cannot be empty" });
    if (content.length > MAX_LENGTH) {
      return res.status(400).json({ msg: `Message too long (max ${MAX_LENGTH} characters)` });
    }

    const group = await getGroupForMember(groupId, userId, res);
    if (!group) return;

    const message = await Message.create({ content, sender: userId, group: groupId });
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name email")
      .populate("group", "name");

    // Persist first, then broadcast. The sender's own socket is excluded
    // because the client already appends its own message after the POST succeeds.
    const io = getIO();
    if (senderSocketId) {
      io.to(groupId).except(senderSocketId).emit("newMessage", populatedMessage);
    } else {
      io.to(groupId).emit("newMessage", populatedMessage);
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("sendMessage error:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

module.exports.getMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await getGroupForMember(groupId, req.user.userId, res);
    if (!group) return;

    const messages = await Message.find({ group: groupId })
      .populate("sender", "name email")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("getMessages error:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

module.exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ msg: "Invalid message id" });
    }

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ msg: "Message not found" });

    if (message.sender.toString() !== req.user.userId) {
      return res.status(403).json({ msg: "You can only delete your own messages" });
    }

    await message.deleteOne();
    getIO().to(message.group.toString()).emit("messageDeleted", { messageId });

    res.status(200).json({ msg: "Message deleted" });
  } catch (error) {
    console.error("deleteMessage error:", error);
    res.status(500).json({ msg: "Server error" });
  }
};