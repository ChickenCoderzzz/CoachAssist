import { useNavigate } from "react-router-dom";
import { useState } from "react";
import logo from "../assets/logo.png";
import bg from "../assets/field_bg.png";
import DarkCard from "../components/DarkCard";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async () => {
    setError("");
    if (!formData.username || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    const result = await login(formData.username, formData.password);

    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.message || "Invalid credentials");
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        height: "100vh",
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <DarkCard width="420px" padding="50px 40px">

        <img
          src={logo}
          alt="CoachAssist Logo"
          style={{ width: "170px", marginBottom: "30px" }}
        />

        <h2 style={{ color: "white", marginBottom: "25px" }}>Login</h2>

        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "15px",
            borderRadius: "6px",
            border: "1px solid #777",
            background: "rgba(255, 255, 255, 0.9)",
          }}
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "20px",
            borderRadius: "6px",
            border: "1px solid #777",
            background: "rgba(255, 255, 255, 0.9)",
          }}
        />

        {error && (
          <p
            style={{
              color: "#ff6b6b",
              marginBottom: "15px",
              fontWeight: "bold",
            }}
          >
            {error}
          </p>
        )}

        <button
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "1rem",
            borderRadius: "6px",
            background: loading ? "#2d5e28" : "#4b8b3b",
            color: "white",
            border: "none",
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
          }}
          disabled={loading}
          onClick={handleLogin}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p style={{ marginTop: "20px", color: "white" }}>
          Don’t have an account?{" "}
          <span
            style={{
              color: "#8fd18e",
              cursor: "pointer",
              fontWeight: "bold",
            }}
            onClick={() => navigate("/signup")}
          >
            Sign up
          </span>
        </p>

      </DarkCard>
    </div>
  );
}
