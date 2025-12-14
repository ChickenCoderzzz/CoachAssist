import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DarkCard from "../components/DarkCard";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    username: "",
    new_password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleResetPassword = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Password reset failed");
      }

      // optional success handling
      alert("Password reset successful. Please log in.");
      navigate("/login");
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        paddingTop: "110px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <DarkCard width="420px" padding="40px">
        <h2 style={{ color: "white", marginBottom: "20px" }}>
          Forgot Password
        </h2>

        <input
          type="text"
          name="full_name"
          placeholder="Full Name"
          value={formData.full_name}
          onChange={handleChange}
          style={inputStyle}
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          style={inputStyle}
        />

        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          style={inputStyle}
        />

        <input
          type="password"
          name="new_password"
          placeholder="New Password"
          value={formData.new_password}
          onChange={handleChange}
          style={inputStyle}
        />

        {error && (
          <p style={{ color: "#ff6b6b", marginBottom: "10px" }}>
            {error}
          </p>
        )}

        <button
          style={buttonStyle}
          onClick={handleResetPassword}
          disabled={loading}
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </DarkCard>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "15px",
  borderRadius: "6px",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  background: "#8fd18e",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  marginTop: "10px",
  fontSize: "1.1rem",
};
