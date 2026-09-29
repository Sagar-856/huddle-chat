# NexChat — Scalable Real-Time Group Chat with AI
 
A production-quality group chat application built with the MERN stack, featuring real-time messaging, horizontally scalable architecture, and context-aware AI responses powered by Google Gemini.
 
**Live Demo:** https://client-vert-gamma.vercel.app  
**GitHub:** https://github.com/Sagar-856/scalable-realtime-chat
 
---
 
## Features
 
- **Real-time messaging** — Socket.IO with room-based broadcasting, typing indicators, and online presence
- **Horizontally scalable** — Redis Pub/Sub adapter ensures socket broadcasts work correctly across multiple server instances
- **AI integration** — Context-aware responses using Google Gemini 2.5 Flash with token-by-token streaming
- **Split-screen UI** — AI questions stay separate from group chat; collapsed preview with "Read more" expansion
- **Rate limiting** — 30 messages/min for normal chat, 5 AI requests/min per user, backed by Redis
- **Invite system** — Shareable invite codes for joining groups
- **Message deletion** — Live broadcast via socket so all clients update instantly
- **Group search** — Search groups by name or description
- **Online presence** — Real-time online user list per group
- **Timestamps** — Smart formatting (time only for today, date for older messages)
---
 
## Architecture
 
```
Client (React + Vite)
        │
        ├── REST API (Express) ──── MongoDB Atlas
        │
        └── WebSocket (Socket.IO) ── Redis (Upstash)
                                         │
                                    Pub/Sub adapter
                                    (multi-instance)
```
 
**Key design decisions:**
 
- **Hybrid REST + WebSocket** — REST handles message persistence (guaranteed write); Socket.IO handles live fan-out. Message delivery never depends on a WebSocket staying open.
- **Redis Pub/Sub adapter** — Socket.IO broadcasts go through Redis so they reach users connected to any server instance.
- **Streaming AI responses** — Gemini's async generator streams chunks server-side; each chunk is immediately re-emitted via Socket.IO to all clients in the room.
- **Rate limiting backed by Redis** — Counters shared across server instances so limits apply correctly regardless of which instance handles the request.
- **Fail-open rate limiting** — If Redis is unreachable, requests are allowed through rather than blocking all users.
---
 
## Tech Stack
 
| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Socket.IO Client, React Markdown |
| Backend | Node.js, Express, Socket.IO |
| Database | MongoDB Atlas (Mongoose) |
| Cache / Pub-Sub | Redis (Upstash) |
| AI | Google Gemini 2.5 Flash API |
| Auth | JWT + bcrypt |
| Rate Limiting | rate-limiter-flexible |
| Deployment | Vercel (client), Render (server) |
| Load Testing | k6 |
 
---
 
## Load Test Results
 
Tested with k6 against the live Render deployment:
 
- **50 concurrent users** sustained for 1 minute
- **852 total requests, 0% error rate**
- **100% of checks passed** (register, create group, send message, fetch history)
- Throughput: 7.4 req/s
---
 
## Local Setup
 
**Prerequisites:** Node.js 18+, MongoDB, Redis (or free Upstash account)
 
**1. Clone the repo**
```bash
git clone https://github.com/Sagar-856/scalable-realtime-chat.git
cd scalable-realtime-chat
```
 
**2. Server setup**
```bash
cd server
npm install
```
 
Create `server/.env`:
```
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
REDIS_URL=your_upstash_redis_url
GEMINI_API_KEY=your_gemini_key
CLIENT_URL=http://localhost:5173
PORT=5000
```
 
```bash
npm run dev
```
 
**3. Client setup**
```bash
cd client
npm install
```
 
Create `client/.env`:
```
VITE_SERVER_URL=http://localhost:5000
```
 
```bash
npm run dev
```
 
Open `http://localhost:5173`
 
---
 
## Project Structure
 
```
scalable-realtime-chat/
├── server/
│   ├── controllers/      # Auth, Group, Message logic
│   ├── middleware/        # JWT auth, rate limiting
│   ├── models/           # Mongoose schemas
│   ├── routes/           # Express routes
│   ├── services/         # Gemini AI service
│   ├── socket.js         # Socket.IO, Redis adapter, AI streaming
│   └── server.js         # Entry point
└── client/
    └── src/
        ├── pages/        # Login, Register, Dashboard, Chat, GroupDetails
        ├── components/   # CreateGroup
        └── services/     # Axios API client
```