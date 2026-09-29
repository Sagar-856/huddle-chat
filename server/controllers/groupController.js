const Group = require("../models/group");
const Message = require("../models/message");
const crypto = require("crypto");

const createGroup = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ msg: "Group name is required" });
        }
        const newGroup = new Group({
            name,
            description,
            createdBy: req.user.userId,
            members: [req.user.userId],
            inviteCode: crypto.randomBytes(4).toString("hex")
        });
        await newGroup.save();
        res.status(201).json(newGroup);
    } catch (error) {
        res.status(500).json({ msg: "Error creating group", error });
    }
};

const getMyGroups = async (req, res) => {
    try {
        const userId = req.user.userId;
        const groups = await Group.find({ members: userId })
            .populate("createdBy", "name")
            .sort({ updatedAt: -1 });
        res.status(200).json(groups);
    } catch (error) {
        res.status(500).json({ msg: "Error fetching groups", error });
    }
};

// Search public groups by name or description — uses the description field
// that was previously stored but never actually used for anything.
const searchGroups = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.status(400).json({ msg: "Search query must be at least 2 characters" });
        }
        const groups = await Group.find({
            $or: [
                { name: { $regex: q, $options: "i" } },
                { description: { $regex: q, $options: "i" } },
            ],
        })
            .populate("createdBy", "name")
            .select("name description members createdBy inviteCode")
            .limit(20);

        res.status(200).json(groups);
    } catch (error) {
        res.status(500).json({ msg: "Server error", error });
    }
};

const getGroupById = async (req, res) => {
    try {
        const { groupId } = req.params;
        const group = await Group.findById(groupId)
            .populate("createdBy", "name email")
            .populate("members", "name email");

        if (!group) return res.status(404).json({ msg: "Group not found" });

        const isMember = group.members.some(
            (member) => member._id.toString() === req.user.userId
        );
        if (!isMember) return res.status(403).json({ msg: "You are not a member of this group" });

        res.status(200).json(group);
    } catch (error) {
        res.status(500).json({ msg: "Server error" });
    }
};

// Join via invite code — anyone with the code can join,
// no approval needed (appropriate for a chat app at this scale).
const joinByInviteCode = async (req, res) => {
    try {
        const { code } = req.params;
        const userId = req.user.userId;

        const group = await Group.findOne({ inviteCode: code.toLowerCase() });
        
        if (!group) return res.status(404).json({ msg: "Invalid invite code" });

        const isAlreadyMember = group.members.some(
            (m) => m.toString() === userId
        );
        if (isAlreadyMember) {
            return res.status(200).json({ msg: "Already a member", group });
        }

        group.members.push(userId);
        await group.save();

        res.status(200).json({ msg: "Joined group successfully", group });
    } catch (error) {
        res.status(500).json({ msg: "Server error" });
    }
};

const joinGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.userId;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ msg: "Group not found" });

        const isAlreadyMember = group.members.some(
            (member) => member.toString() === userId
        );
        if (isAlreadyMember) return res.status(400).json({ msg: "Already a member" });

        group.members.push(userId);
        await group.save();
        res.status(200).json({ msg: "Joined group successfully", group });
    } catch (error) {
        res.status(500).json({ msg: "Server error" });
    }
};

const leaveGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.userId;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ msg: "Group not found" });

        if (group.createdBy.toString() === userId) {
            return res.status(400).json({ msg: "Group owner cannot leave. Delete the group instead." });
        }

        group.members = group.members.filter((m) => m.toString() !== userId);
        await group.save();
        res.status(200).json({ msg: "Left group successfully" });
    } catch (error) {
        res.status(500).json({ msg: "Server error" });
    }
};

const deleteGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.userId;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ msg: "Group not found" });

        if (group.createdBy.toString() !== userId) {
            return res.status(403).json({ msg: "Only group creator can delete this group" });
        }

        // Delete all messages in this group too — avoids orphaned data
        await Message.deleteMany({ group: groupId });
        await Group.findByIdAndDelete(groupId);
        res.status(200).json({ msg: "Group deleted successfully" });
    } catch (error) {
        res.status(500).json({ msg: "Server error" });
    }
};

module.exports = {
    createGroup, getMyGroups, getGroupById,
    joinGroup, joinByInviteCode, leaveGroup,
    deleteGroup, searchGroups,
};
