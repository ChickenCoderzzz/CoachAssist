import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import DarkCard from "../components/DarkCard";
import bg from "../assets/field_bg.png";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState("request"); // request | verify
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // STEP 1 — request reset code
  const handleSendResetCode = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/auth/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to send reset code.");
      }

      setMessage("If an account exists, a reset code has been sent.");
      setStep("verify");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // STEP 1.5 — resend reset code
  const handleResendCode = async () => {
    if (!email) {
      setError("Please enter your email again.");
      return;
    }

    setResending(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/auth/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to resend reset code.");
      }

      setMessage("Reset code resent to your email.");
    } catch (e) {
      setError(e.message);
    } finally {
      setResending(false);
    }
  };

  // STEP 2 — verify + reset
  const handleResetPassword = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Password reset failed.");
      }

      setMessage("Password reset successful. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (e) {
      setError(e.message);
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
          Forgot Password
        </h2>

        {step === "request" && (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />

            {error && <p style={errorStyle}>{error}</p>}
            {message && <p style={successStyle}>{message}</p>}

            <button
              style={buttonStyle}
              onClick={handleSendResetCode}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Code"}
            </button>
          </>
        )}

        {step === "verify" && (
          <>
            <input
              type="email"
              value={email}
              disabled
              style={{ ...inputStyle, opacity: 0.7 }}
            />

            <input
              type="text"
              placeholder="Reset Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={inputStyle}
            />

            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={inputStyle}
            />

            {error && <p style={errorStyle}>{error}</p>}
            {message && <p style={successStyle}>{message}</p>}

            <button
              style={buttonStyle}
              onClick={handleResetPassword}
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            {/* RESEND RESET CODE */}
            <button
              style={resendButtonStyle}
              onClick={handleResendCode}
              disabled={resending}
            >
              {resending ? "Resending..." : "Resend Reset Code"}
            </button>
          </>
        )}

        <p style={{ marginTop: "20px", color: "white" }}>
          Remembered your password?{" "}
          <Link to="/login" style={{ color: "#8fd18e" }}>
            Login
          </Link>
        </p>
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

const resendButtonStyle = {
  width: "100%",
  padding: "10px",
  background: "#b0b0b0",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  marginTop: "10px",
};

const errorStyle = {
  color: "#ff6b6b",
  marginBottom: "10px",
};

const successStyle = {
  color: "#8fd18e",
  marginBottom: "10px",
};
