const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Group = require("./models/group");
const User = require("./models/user");

// groupId -> Map(userId -> userName). Presence is ephemeral, so it lives in memory.
const onlineUsers = new Map();

let io;

function emitPresence(groupId) {
  const users = onlineUsers.get(groupId);
  io.to(groupId).emit("onlineUsers", users ? Array.from(users.values()) : []);
}

function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  // Runs once per connection attempt: verifies the JWT and loads the user
  // BEFORE the connection handler runs, so no client events can arrive early.
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

        socket.join(groupId);
        if (!onlineUsers.has(groupId)) onlineUsers.set(groupId, new Map());
        onlineUsers.get(groupId).set(socket.userId, socket.userName);
        emitPresence(groupId);
        console.log(`${socket.userName} joined group ${groupId}`);
      } catch (err) {
        console.error("joinGroup error:", err.message);
        socket.emit("socketError", { message: "Could not join group" });
      }
    });

    socket.on("leaveGroup", (groupId) => {
      socket.leave(groupId);
      onlineUsers.get(groupId)?.delete(socket.userId);
      emitPresence(groupId);
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

    socket.on("disconnect", () => {
      onlineUsers.forEach((users, groupId) => {
        if (users.delete(socket.userId)) emitPresence(groupId);
      });
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