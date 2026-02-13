import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DarkCard from "../components/DarkCard";
import bg from "../assets/field_bg.png";

export default function SignupPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accountCreated, setAccountCreated] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async () => {
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const email = formData.email.trim().toLowerCase();

      const res = await fetch("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formData.full_name,
          email,
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to create account.");
      }

      //Store email for verify page
      localStorage.setItem("pendingEmail", email);
      setAccountCreated(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        paddingTop: "110px",
      }}
    >
      <DarkCard width="420px" padding="40px">
        <h2 style={{ color: "white", marginBottom: "20px" }}>
          Create Account
        </h2>

        {accountCreated ? (
          <>
            <p style={{ color: "#8fd18e", marginBottom: "20px" }}>
              Account created! Please verify your email to continue.
            </p>

            <button
              style={buttonStyle}
              onClick={() => navigate("/verify-email")}
            >
              Verify Email
            </button>

            <p style={{ marginTop: "20px", color: "white" }}>
              Already verified?{" "}
              <Link to="/login" style={{ color: "#8fd18e" }}>
                Login
              </Link>
            </p>
          </>
        ) : (
          <>
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
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              style={inputStyle}
            />

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
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
              onClick={handleSignup}
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Account"}
            </button>

            <p style={{ marginTop: "20px", color: "white" }}>
              Already have an account?{" "}
              <Link to="/login" style={{ color: "#8fd18e" }}>
                Login
              </Link>
            </p>
          </>
        )}
      </DarkCard>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "15px",
  borderRadius: "6px",
  border: "none",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  background: "#8fd18e",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  fontSize: "1.1rem",
};
