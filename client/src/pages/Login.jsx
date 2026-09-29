import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            const res = await API.post("/auth/login", { email, password });
            localStorage.setItem("token", res.data.token);
            navigate("/dashboard");
        } catch (err) {
            setError(err.response?.data?.msg || "Login failed. Check your credentials.");
        }
    };

    return (
        <div className="page-center">
            <div className="card">
                <h1 className="card-title">Welcome back</h1>
                <p className="card-subtitle">Sign in to your account to continue</p>

                <form onSubmit={handleSubmit}>
                    <div className="field">
                        <label>Email</label>
                        <input
                            className="input"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="field">
                        <label>Password</label>
                        <input
                            className="input"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                            {error}
                        </p>
                    )}

                    <button className="btn btn-primary" type="submit">
                        Sign in
                    </button>
                </form>

                <span className="link">
                    Don't have an account? <Link to="/register">Register</Link>
                </span>
            </div>
        </div>
    );
}

export default Login;
