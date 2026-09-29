const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  },
  { timestamps: true }
);

// History is always fetched per group in chronological order.
messageSchema.index({ group: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);