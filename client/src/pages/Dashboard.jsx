import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import CreateGroup from "../components/CreateGroup";

function Dashboard() {
    const [user, setUser] = useState(null);
    const [groups, setGroups] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [joinCode, setJoinCode] = useState("");
    const [joinMsg, setJoinMsg] = useState("");
    const navigate = useNavigate();
    const token = localStorage.getItem("token");

    useEffect(() => { fetchUser(); fetchGroups(); }, []);

    const fetchUser = async () => {
        try {
            const res = await API.get("/auth/me", { headers: { Authorization: `Bearer ${token}` } });
            setUser(res.data);
        } catch (err) { console.log(err.response?.data); }
    };

    const fetchGroups = async () => {
        try {
            const res = await API.get("/groups", { headers: { Authorization: `Bearer ${token}` } });
            setGroups(res.data);
        } catch (err) { console.log(err.response?.data); }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (searchQuery.trim().length < 2) return;
        setSearching(true);
        try {
            const res = await API.get(`/groups/search?q=${encodeURIComponent(searchQuery)}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSearchResults(res.data);
        } catch (err) { console.log(err.response?.data); }
        setSearching(false);
    };

    const handleJoinByCode = async (e) => {
        e.preventDefault();
        if (!joinCode.trim()) return;
        try {
            const res = await API.post(`/groups/invite/${joinCode.trim()}`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setJoinMsg(`Joined "${res.data.group.name}" successfully!`);
            setJoinCode("");
            fetchGroups();
        } catch (err) {
            setJoinMsg(err.response?.data?.msg || "Invalid invite code");
        }
        setTimeout(() => setJoinMsg(""), 3000);
    };

    const handleLogout = () => { localStorage.removeItem("token"); navigate("/"); };

    // Unread count — last visit timestamp per group stored in localStorage
    const getUnread = (groupId) => {
        const lastSeen = localStorage.getItem(`lastSeen_${groupId}`);
        return lastSeen ? null : "new"; // simplified — just shows "new" if never visited
    };

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>NexChat</h1>
                    {user && <p className="welcome-text">Hey, {user.name} 👋</p>}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sign out</button>
            </div>

            {/* Create group */}
            <CreateGroup onGroupCreated={fetchGroups} />

            {/* Join by invite code */}
            <div className="create-group-card" style={{ marginBottom: "1.5rem" }}>
                <h2>Join a Group</h2>
                <form onSubmit={handleJoinByCode}>
                    <div className="create-group-row">
                        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                            <input
                                className="input"
                                type="text"
                                placeholder="Paste invite code (e.g. a1b2c3d4)"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-primary" type="submit" style={{ width: "auto" }}>
                            Join
                        </button>
                    </div>
                </form>
                {joinMsg && (
                    <p style={{
                        marginTop: "0.5rem", fontSize: "0.85rem",
                        color: joinMsg.includes("success") ? "#22c55e" : "var(--danger)"
                    }}>
                        {joinMsg}
                    </p>
                )}
            </div>

            {/* Search groups */}
            <div className="create-group-card" style={{ marginBottom: "2rem" }}>
                <h2>Search Groups</h2>
                <form onSubmit={handleSearch}>
                    <div className="create-group-row">
                        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                            <input
                                className="input"
                                type="text"
                                placeholder="Search by name or description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-ghost" type="submit" style={{ width: "auto" }}>
                            {searching ? "..." : "Search"}
                        </button>
                    </div>
                </form>

                {searchResults.length > 0 && (
                    <ul className="group-list" style={{ marginTop: "1rem", marginBottom: 0 }}>
                        {searchResults.map((g) => (
                            <li key={g._id} className="group-item">
                                <div>
                                    <strong style={{ fontSize: "0.9rem" }}>{g.name}</strong>
                                    {g.description && (
                                        <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.1rem" }}>
                                            {g.description}
                                        </p>
                                    )}
                                    <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                                        {g.members.length} members
                                    </p>
                                </div>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => navigate(`/groups/${g._id}`)}
                                >
                                    View →
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* My groups */}
            <p className="section-title">Your Groups</p>
            {groups.length === 0 ? (
                <div className="empty-state">
                    No groups yet — create one or join with an invite code.
                </div>
            ) : (
                <ul className="group-list">
                    {groups.map((group) => (
                        <li key={group._id} className="group-item">
                            <div>
                                <Link to={`/groups/${group._id}`} style={{ display: "block" }}>
                                    {group.name}
                                </Link>
                                {group.description && (
                                    <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.1rem" }}>
                                        {group.description}
                                    </p>
                                )}
                            </div>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => navigate(`/chat/${group._id}`)}
                            >
                                Open Chat →
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default Dashboard;
