import { useState } from "react";
import API from "../services/api";

function CreateGroup({ onGroupCreated }) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            await API.post("/groups", { name, description }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setName("");
            setDescription("");
            onGroupCreated();
        } catch (err) {
            console.log(err.response?.data);
        }
    };

    return (
        <div className="create-group-card">
            <h2>New Group</h2>
            <form onSubmit={handleSubmit}>
                <div className="create-group-row">
                    <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                        <input
                            className="input"
                            type="text"
                            placeholder="Group name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                        <input
                            className="input"
                            type="text"
                            placeholder="Description (optional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" type="submit" style={{ width: "auto" }}>
                        Create
                    </button>
                </div>
            </form>
        </div>
    );
}

export default CreateGroup;
