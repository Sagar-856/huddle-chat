# Huddle: Real-Time Group Chat

One or two lines: what it is and the main features.

## Live Demo
- Frontend: https://huddle-chat-mu.vercel.app
- Backend API: https://huddle-chat-slbl.onrender.com
- Note: the backend is on Render's free tier, so the first request after a
  period of inactivity can take up to a minute.

## Features
(Bullet list: send/receive in real time, history after refresh, timestamps,
JWT login, typing indicator, online users, MongoDB storage, deployed.)

## Tech Stack
(Frontend, backend, database, real-time, hosting.)

## Project Structure
(A short folder tree of client/ and server/ with one line per folder.)

## Setup
### Prerequisites
(Node version, a MongoDB Atlas account or a local MongoDB.)
### Backend
(Steps: cd server, npm install, create .env from .env.example, npm run dev.)
### Frontend
(Steps: cd client, npm install, create .env from .env.example, npm run dev.)

## Environment Variables
(Two tables, server and client: name, what it is, example value.)

## API Endpoints
(Table: method, path, description. Include register, login, send message,
fetch history, plus the group routes you use.)

## Socket Events
(Table: event name, direction, purpose. joinGroup, leaveGroup, newMessage,
typing, stopTyping, userTyping, onlineUsers, socketError.)

## Design Decisions
(3 to 5 points: for example, messages are saved through REST first and then
broadcast by the server; JWT-authenticated sockets; presence derived from
room membership; MongoDB for persistence; rate limiting.)

## Assumptions
(3 to 5 points: for example, users register with email and password, chat
happens inside groups joined by invite code, a single server instance.)

## Notes
(One line: this builds on my earlier project NexChat, simplified and adapted
for this assignment.)