import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import API from "../services/api";

const socket = io(import.meta.env.VITE_SERVER_URL || "http://localhost:5000", {
    autoConnect: false,
});

// "3:45 PM" for today, "Yesterday 10:20 AM", or "Jun 12 9:00 AM"
function formatTime(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (d.toDateString() === now.toDateString()) return time;
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
    return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

function Chat() {
    const { groupId } = useParams();
    const navigate = useNavigate();

    const [messages, setMessages] = useState([]);
    const [content, setContent] = useState("");
    const [typingUser, setTypingUser] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [groupName, setGroupName] = useState("");
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [showOnline, setShowOnline] = useState(false);
    const [error, setError] = useState("");

    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const errorTimeoutRef = useRef(null);
    const token = localStorage.getItem("token");
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // Shows an error banner that clears itself after a few seconds.
    const showError = (text) => {
        setError(text);
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = setTimeout(() => setError(""), 5000);
    };

    const errorText = (err, fallback) =>
        err.response?.data?.msg || err.response?.data?.message || fallback;

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [msgRes, userRes, groupRes] = await Promise.all([
                    API.get(`/messages/${groupId}`, authHeaders),
                    API.get("/auth/me", authHeaders),
                    API.get(`/groups/${groupId}`, authHeaders),
                ]);
                setMessages(msgRes.data);
                setCurrentUserId(userRes.data._id);
                setGroupName(groupRes.data.name);
                localStorage.setItem(`lastSeen_${groupId}`, Date.now());
            } catch (err) {
                showError(errorText(err, "Could not load the chat. Please refresh."));
            }
        };
        loadInitialData();

        // Joining from the "connect" event means the user is also
        // re-added to the room after any reconnect.
        const handleConnect = () => socket.emit("joinGroup", groupId);
        const handleNewMessage = (message) => {
            setMessages((prev) => [...prev, message]);
            localStorage.setItem(`lastSeen_${groupId}`, Date.now());
        };
        const handleMessageDeleted = ({ messageId }) =>
            setMessages((prev) => prev.filter((m) => m._id !== messageId));
        const handleConnectError = (err) => showError(`Connection problem: ${err.message}`);
        const handleSocketError = ({ message }) => showError(message);

        socket.auth = { token };
        socket.on("connect", handleConnect);
        socket.on("connect_error", handleConnectError);
        socket.on("socketError", handleSocketError);
        socket.on("newMessage", handleNewMessage);
        socket.on("messageDeleted", handleMessageDeleted);
        socket.on("onlineUsers", setOnlineUsers);
        socket.on("userTyping", ({ userName }) => setTypingUser(userName));
        socket.on("userStoppedTyping", () => setTypingUser(null));
        socket.connect();

        return () => {
            clearTimeout(typingTimeoutRef.current);
            clearTimeout(errorTimeoutRef.current);
            socket.emit("leaveGroup", groupId);
            socket.off("connect", handleConnect);
            socket.off("connect_error", handleConnectError);
            socket.off("socketError", handleSocketError);
            socket.off("newMessage", handleNewMessage);
            socket.off("messageDeleted", handleMessageDeleted);
            socket.off("onlineUsers");
            socket.off("userTyping");
            socket.off("userStoppedTyping");
            socket.disconnect();
        };
    }, [groupId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleDeleteMessage = async (messageId) => {
        try {
            await API.delete(`/messages/${messageId}`, authHeaders);
            // Remove immediately; the socket broadcast updates everyone else.
            setMessages((prev) => prev.filter((m) => m._id !== messageId));
        } catch (err) {
            showError(errorText(err, "Could not delete message"));
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const text = content.trim();
        if (!text) return;

        try {
            const res = await API.post(
                `/messages/${groupId}`,
                { content: text, senderSocketId: socket.id },
                authHeaders
            );
            setMessages((prev) => [...prev, res.data]);
            setContent("");
            clearTimeout(typingTimeoutRef.current);
            socket.emit("stopTyping", { groupId });
        } catch (err) {
            showError(errorText(err, "Message could not be sent. Please try again."));
        }
    };

    const handleChange = (e) => {
        setContent(e.target.value);
        socket.emit("typing", { groupId });
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit("stopTyping", { groupId });
        }, 1500);
    };

    return (
        <div className="chat-root">
            <div className="chat-left">
                <div className="chat-header">
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/groups/${groupId}`)}>←</button>
                    <h2 style={{ flex: 1 }}>{groupName || "Chat"}</h2>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowOnline(!showOnline)}>
                        <span style={{
                            display: "inline-block", width: 8, height: 8,
                            borderRadius: "50%", background: "#22c55e", marginRight: "0.4rem",
                        }} />
                        {onlineUsers.length} online
                    </button>
                </div>

                {showOnline && onlineUsers.length > 0 && (
                    <div style={{
                        padding: "0.75rem 1.25rem",
                        background: "var(--element)",
                        borderBottom: "1px solid var(--border)",
                        fontSize: "0.82rem",
                        color: "var(--muted)",
                    }}>
                        {onlineUsers.map((name, i) => (
                            <span key={i} style={{ marginRight: "0.75rem" }}>
                                <span style={{ color: "#22c55e", marginRight: "0.25rem" }}>●</span>
                                {name}
                            </span>
                        ))}
                    </div>
                )}

                {error && (
                    <div role="alert" style={{
                        padding: "0.5rem 1.25rem",
                        background: "var(--element)",
                        borderBottom: "1px solid var(--danger)",
                        color: "var(--danger)",
                        fontSize: "0.82rem",
                    }}>
                        {error}
                    </div>
                )}

                <div className="chat-messages">
                    {messages.map((msg) => {
                        const isMine = msg.sender?._id === currentUserId;
                        return (
                            <div key={msg._id} className={`msg-row ${isMine ? "mine" : "theirs"}`}>
                                {!isMine && <span className="msg-sender">{msg.sender?.name}</span>}
                                <div style={{ position: "relative" }} className="msg-bubble-wrap">
                                    <div className="msg-bubble">{msg.content}</div>
                                    {isMine && (
                                        <button
                                            onClick={() => handleDeleteMessage(msg._id)}
                                            style={{
                                                position: "absolute", top: "-6px", right: "100%",
                                                background: "var(--element)",
                                                border: "1px solid var(--border)",
                                                borderRadius: "4px", cursor: "pointer",
                                                fontSize: "0.7rem", color: "var(--danger)",
                                                padding: "0.1rem 0.35rem", opacity: 0,
                                                transition: "opacity 0.15s",
                                            }}
                                            className="delete-btn"
                                            aria-label="Delete message"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                                {msg.createdAt && (
                                    <span style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.15rem" }}>
                                        {formatTime(msg.createdAt)}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <div className="typing-indicator">
                    {typingUser && `${typingUser} is typing...`}
                </div>

                <div className="chat-input-bar">
                    <input
                        className="chat-input"
                        type="text"
                        value={content}
                        onChange={handleChange}
                        onKeyDown={(e) => e.key === "Enter" && handleSend(e)}
                        placeholder="Type a message..."
                    />
                    <button className="btn btn-ghost" onClick={handleSend}>Send</button>
                </div>
            </div>
        </div>
    );
}

export default Chat;