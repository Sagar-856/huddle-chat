import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";

function GroupDetails() {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const [group, setGroup] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [joinMsg, setJoinMsg] = useState("");

    useEffect(() => { fetchGroup(); }, [groupId]);

    const fetchGroup = async () => {
        setLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            const [groupRes, userRes] = await Promise.all([
                API.get(`/groups/${groupId}`, { headers: { Authorization: `Bearer ${token}` } }),
                API.get("/auth/me", { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            setGroup(groupRes.data);
            setCurrentUser(userRes.data);
        } catch (err) {
            console.log(err.response?.data);
            setError(err.response?.data?.msg || "Could not load this group");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyInvite = () => {
        const link = `${window.location.origin}/join/${group.inviteCode}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleJoin = async (e) => {
        e.preventDefault();
        const code = joinCode.trim();
        if (!code) {
            setJoinMsg("Please enter an invite code");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const res = await API.post(`/groups/invite/${code}`, {}, { headers: { Authorization: `Bearer ${token}` } });
            setJoinMsg(`Joined "${res.data.group.name}" successfully!`);
            setJoinCode("");
            await fetchGroup();
        } catch (err) {
            setJoinMsg(err.response?.data?.msg || "Invalid invite code");
        }
    };

    const handleLeave = async () => {
        try {
            const token = localStorage.getItem("token");
            await API.post(`/groups/${groupId}/leave`, {}, { headers: { Authorization: `Bearer ${token}` } });
            navigate("/dashboard");
        } catch (err) { alert(err.response?.data?.msg || "Error leaving group"); }
    };

    const handleDelete = async () => {
        if (!window.confirm("Delete this group and all its messages?")) return;
        try {
            const token = localStorage.getItem("token");
            await API.delete(`/groups/${groupId}`, { headers: { Authorization: `Bearer ${token}` } });
            navigate("/dashboard");
        } catch (err) { console.log(err.response?.data); }
    };

    if (loading) return (
        <div className="page-center">
            <p style={{ color: "var(--muted)" }}>Loading...</p>
        </div>
    );

    if (error) {
        const isNotMember = error === "You are not a member of this group";
        return (
            <div className="page-center">
                <div className="create-group-card" style={{ maxWidth: "28rem", textAlign: "center" }}>
                    <h2>Group unavailable</h2>
                    <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>{error}</p>
                    {isNotMember && (
                        <form onSubmit={handleJoin} style={{ marginTop: "1rem" }}>
                            <div className="field" style={{ marginBottom: "0.75rem" }}>
                                <input
                                    className="input"
                                    type="text"
                                    placeholder="Enter invite code"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value)}
                                />
                            </div>
                            <div className="action-row" style={{ justifyContent: "center" }}>
                                <button className="btn btn-ghost" type="button" onClick={() => navigate("/dashboard")}>Back to dashboard</button>
                                <button className="btn btn-primary" type="submit">Join Group</button>
                            </div>
                            {joinMsg && (
                                <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: joinMsg.includes("success") ? "#22c55e" : "var(--danger)" }}>
                                    {joinMsg}
                                </p>
                            )}
                        </form>
                    )}
                    {!isNotMember && (
                        <div className="action-row" style={{ justifyContent: "center", marginTop: "1rem" }}>
                            <button className="btn btn-ghost" onClick={() => navigate("/dashboard")}>Back to dashboard</button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const isOwner = currentUser && group.createdBy._id === currentUser._id;

    return (
        <div className="group-details">
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: "1.5rem" }} onClick={() => navigate("/dashboard")}>
                ← Back
            </button>

            <h1>{group.name}</h1>
            {group.description && <p className="description">{group.description}</p>}

            {/* Invite code section */}
            <div style={{
                background: "var(--element)", border: "1px solid var(--border)",
                borderRadius: "var(--radius)", padding: "1rem", marginBottom: "1.25rem"
            }}>
                <p className="meta-label" style={{ marginBottom: "0.5rem" }}>Invite Link</p>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <code style={{
                        flex: 1, background: "var(--bg)", padding: "0.4rem 0.75rem",
                        borderRadius: "var(--radius-sm)", fontSize: "0.85rem",
                        color: "var(--purple)", border: "1px solid var(--border)"
                    }}>
                        {group.inviteCode}
                    </code>
                    <button className="btn btn-ghost btn-sm" onClick={handleCopyInvite}>
                        {copied ? "Copied! ✓" : "Copy link"}
                    </button>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.5rem" }}>
                    Share this code — anyone can use it to join on the dashboard
                </p>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
                <p className="meta-label">Created by</p>
                <p style={{ fontSize: "0.9rem" }}>{group.createdBy.name}</p>
            </div>

            <div>
                <p className="meta-label">Members ({group.members.length})</p>
                <ul className="member-list">
                    {group.members.map((member) => (
                        <li key={member._id} className="member-item">
                            {member.name}
                            {member._id === group.createdBy._id && (
                                <span style={{ marginLeft: "0.5rem", fontSize: "0.7rem", color: "var(--purple)" }}>
                                    owner
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="action-row">
                <button className="btn btn-primary" onClick={() => navigate(`/chat/${groupId}`)}>
                    Open Chat
                </button>
                {!isOwner && (
                    <button className="btn btn-ghost" onClick={handleLeave}>Leave Group</button>
                )}
                {isOwner && (
                    <button className="btn btn-danger" onClick={handleDelete}>Delete Group</button>
                )}
            </div>
        </div>
    );
}

export default GroupDetails;
