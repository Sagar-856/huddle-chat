const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const crypto = require("crypto");

const groupSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ""
    },
    createdBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    // Unique invite code — share this link for anyone to join the group.
    // Generated once on creation, never changes unless manually reset.
    // crypto.randomBytes(4) gives 8 hex chars — short enough to share,
    // long enough to avoid collisions for a student project scale.
    inviteCode: {
        type: String,
        unique: true,
        sparse: true,
    },
}, { timestamps: true });

module.exports = mongoose.model("Group", groupSchema);