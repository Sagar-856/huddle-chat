import axios from "axios";

const API = axios.create({
    baseURL: `${import.meta.env.VITE_SERVER_URL || "http://localhost:5000"}/api`,
});

export default API;