# Huddle: Real-Time Group Chat

Huddle is a real-time group chat app. Users register, create or join groups with an invite code, and chat instantly. Messages are saved to MongoDB, so history is still there after a refresh.

## Live Demo

- Frontend: https://huddle-chat-mu.vercel.app
- Backend API: https://huddle-chat-slbl.onrender.com

The backend runs on Render's free tier. After a period of inactivity, the first request can take up to a minute while the server wakes up.

## Features

**Required**
- Send messages and receive them instantly over Socket.io, with no page refresh
- Chat history loaded from the database, so it survives a refresh
- Timestamps on every message
- REST APIs to send messages and fetch chat history
- Broadcast of new messages to everyone connected to the group
- Graceful handling of connections, disconnections and reconnections

**Bonus**
- Login with JWT authentication (email and password)
- Typing indicator
- Online users count and list per group
- Messages stored in MongoDB (Atlas)
- Backend deployed on Render, frontend on Vercel

Also included: groups with invite codes, deleting your own messages, per-user rate limiting on sending, and an error banner in the UI.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), React Router, Socket.io client, Axios |
| Backend | Node.js, Express, Socket.io |
| Database | MongoDB Atlas with Mongoose |
| Auth | JWT, bcrypt |
| Hosting | Render (backend), Vercel (frontend) |

## Project Structure

```
huddle-chat/
├── client/
│   └── src/
│       ├── components/    Reusable UI (CreateGroup, ProtectedRoute)
│       ├── pages/         Login, Register, Dashboard, GroupDetails, Chat
│       ├── services/      Axios instance (api.js)
│       └── index.css      Theme and layout styles
└── server/
    ├── config/            Database connection
    ├── controllers/       Request handling (auth, groups, messages)
    ├── middleware/        Auth check, rate limiter, error handling
    ├── models/            Mongoose schemas (User, Group, Message)
    ├── routes/            Express routers
    ├── socket.js          Socket.io setup and events
    └── server.js          App entry point
```

## Setup

### Prerequisites

- Node.js 18 or later
- A MongoDB database (a free MongoDB Atlas cluster works)

### 1. Clone the repository

```bash
git clone https://github.com/Sagar-856/huddle-chat.git
cd huddle-chat
```

### 2. Run the backend

```bash
cd server
npm install
cp .env.example .env      # on Windows PowerShell: copy .env.example .env
```

Open `.env` and fill in the values (see the table below), then start the server:

```bash
npm run dev               # development with auto-restart
# or
npm start                 # production
```

The API runs at `http://localhost:5000`. Opening it in a browser shows `API Running...`.

### 3. Run the frontend

In a second terminal:

```bash
cd client
npm install
cp .env.example .env      # on Windows PowerShell: copy .env.example .env
npm run dev
```

The app runs at `http://localhost:5173`.

### 4. Try it

1. Register two users, one in a normal window and one in an incognito window.
2. Create a group with the first user and copy its invite code from the group details page.
3. Join the group with the second user using the invite code.
4. Open the chat in both windows and send messages.

## Environment Variables

**Backend (`server/.env`)**

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port the server listens on | `5000` |
| `MONGO_URI` | MongoDB connection string, including a database name | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/realtime-chat` |
| `JWT_SECRET` | Long random string used to sign tokens | `a-long-random-string` |
| `CLIENT_URL` | Frontend origin allowed by CORS for Socket.io (no trailing slash) | `http://localhost:5173` |
| `NODE_ENV` | Set to `production` when deployed | `production` |

**Frontend (`client/.env`)**

| Variable | Description | Example |
|---|---|---|
| `VITE_SERVER_URL` | Base URL of the backend, without a trailing slash | `http://localhost:5000` |

Generate a secret for `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## API Endpoints

All routes except register and login need an `Authorization: Bearer <token>` header.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create an account, returns a JWT |
| POST | `/api/auth/login` | Log in, returns a JWT |
| GET | `/api/auth/me` | Get the current user |
| GET | `/api/groups` | List the groups the user belongs to |
| POST | `/api/groups` | Create a group |
| GET | `/api/groups/search?q=` | Search groups by name or description |
| GET | `/api/groups/:groupId` | Get one group |
| POST | `/api/groups/invite/:code` | Join a group with an invite code |
| POST | `/api/groups/:groupId/leave` | Leave a group |
| DELETE | `/api/groups/:groupId` | Delete a group (owner only) |
| **POST** | **`/api/messages/:groupId`** | **Send a message** |
| **GET** | **`/api/messages/:groupId`** | **Fetch chat history (oldest first)** |
| DELETE | `/api/messages/:messageId` | Delete your own message |

Errors are returned as JSON in the form `{ "msg": "..." }` with a suitable status code (400, 401, 403, 404, 429, 500).

## Socket Events

The client connects with its JWT in the handshake (`auth: { token }`). Connections without a valid token are rejected.

| Event | Direction | Purpose |
|---|---|---|
| `joinGroup` | client to server | Join a group's room (membership is verified) |
| `leaveGroup` | client to server | Leave a group's room |
| `newMessage` | server to client | A new message was posted in the group |
| `messageDeleted` | server to client | A message was deleted |
| `typing` / `stopTyping` | client to server | The user started or stopped typing |
| `userTyping` / `userStoppedTyping` | server to client | Another user started or stopped typing |
| `onlineUsers` | server to client | Current list of online users in the group |
| `socketError` | server to client | A socket action failed |

## Design Decisions

- **Save first, then broadcast.** A message is sent with `POST /api/messages/:groupId`. The server validates it, saves it to MongoDB, and only then emits `newMessage` to the group's room. Nothing is shown to others unless it has been stored, and the REST endpoint keeps working without sockets.
- **The sender is excluded from the broadcast.** The sending client adds its own message from the REST response. Its socket id is sent with the request so the server skips it, which prevents duplicate messages.
- **Authenticated sockets.** The JWT and user are checked in Socket.io middleware before the connection handler runs. This avoids a race where early client events, such as `joinGroup`, arrived before the server was ready. Group membership is checked again on `joinGroup`.
- **The server is the source of truth for identity.** Typing events use the server's verified username instead of one sent by the client, so it cannot be spoofed.
- **Presence is derived from the room.** The online list is computed from the sockets currently in a group's room, and each user is counted once even with several tabs open. This stays correct when someone refreshes, because a dropped connection is removed on `disconnecting` without affecting the new one.
- **Reconnect handling.** The client joins its group from the socket `connect` event, so it re-enters the room automatically after a network drop or server restart.
- **Error handling.** Controllers validate input and return clear status codes. A central Express error handler and a 404 handler cover everything else. On the client, REST failures and socket errors show in an error banner.
- **Rate limiting.** Message sending is limited per user (30 per minute) with a small in-memory limiter.
- **Layers are separated.** Routes, controllers, models, middleware and socket logic are in separate folders, and the client keeps API access in a single service module.

## Assumptions

- Users sign up with an email and password. This is real JWT authentication, which goes a step beyond the dummy login the brief describes.
- Chat happens inside groups. A user must be a member of a group to read or send messages, and joins with an invite code.
- The backend runs as a single instance, so presence and the rate limiter are kept in memory. Running several instances would need a shared store such as Redis.
- Messages are plain text with a maximum length of 2000 characters.
- Read and delivered receipts were optional and are not implemented.

## Notes

This project builds on my earlier project NexChat. I copied the base into a separate repository, removed the parts that were out of scope for this assignment (AI responses and Redis), and simplified and hardened the rest.

## Troubleshooting

- **The server can't reach MongoDB with a `querySrv` error.** Some networks block SRV DNS lookups. In development the server uses public DNS servers to work around this. If it still fails, try another network or use the non-SRV connection string from Atlas.
- **Real-time messages don't arrive on a deployed frontend.** Make sure `CLIENT_URL` on the backend exactly matches the frontend URL, with no trailing slash.
