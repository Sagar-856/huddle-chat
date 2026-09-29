const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Group = require("./models/group");
const User = require("./models/user");

let io;

// Presence is derived from who is actually in the room right now,
// counting each user once even if they have several tabs open.
// excludeSocketId lets us leave out a socket that is in the middle of disconnecting.
async function emitPresence(groupId, excludeSocketId) {
  const sockets = await io.in(groupId).fetchSockets();
  const names = new Map();
  sockets.forEach((s) => {
    if (s.id !== excludeSocketId) names.set(s.userId, s.userName);
  });
  io.to(groupId).emit("onlineUsers", Array.from(names.values()));
}

function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  // Verifies the JWT and loads the user before the connection handler runs,
  // so no client events can arrive early.
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication error: no token provided"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;

      const user = await User.findById(socket.userId).select("name");
      socket.userName = user?.name || "User";
      next();
    } catch {
      next(new Error("Authentication error: invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id} (${socket.userName})`);

    socket.on("joinGroup", async (groupId) => {
      try {
        const group = await Group.findById(groupId).select("members");
        const isMember = group?.members.some((m) => m.toString() === socket.userId);
        if (!isMember) {
          return socket.emit("socketError", { message: "You are not a member of this group" });
        }

        await socket.join(groupId);
        await emitPresence(groupId);
        console.log(`${socket.userName} joined group ${groupId}`);
      } catch (err) {
        console.error("joinGroup error:", err.message);
        socket.emit("socketError", { message: "Could not join group" });
      }
    });

    socket.on("leaveGroup", async (groupId) => {
      await socket.leave(groupId);
      await emitPresence(groupId);
    });

    // Typing events use the server-verified name and only work inside joined rooms.
    socket.on("typing", ({ groupId } = {}) => {
      if (!socket.rooms.has(groupId)) return;
      socket.to(groupId).emit("userTyping", { userName: socket.userName });
    });

    socket.on("stopTyping", ({ groupId } = {}) => {
      if (!socket.rooms.has(groupId)) return;
      socket.to(groupId).emit("userStoppedTyping", { userName: socket.userName });
    });

    // "disconnecting" fires while the socket is still in its rooms,
    // so we know which rooms need a presence update.
    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        if (room !== socket.id) emitPresence(room, socket.id);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

// Lets controllers reach the same io instance without a circular import.
function getIO() {
  if (!io) throw new Error("Socket.io not initialized yet");
  return io;
}

module.exports = { initializeSocket, getIO };