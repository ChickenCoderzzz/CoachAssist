import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import DarkCard from "../components/DarkCard";
import bg from "../assets/field_bg.png";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  //New Const added by Wences Jaocb Lorenzo
  //Step control: "request" = enter email, "verify" = enter code + new password
  const [step, setStep] = useState("request"); 

  //Form state
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  //UI state
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  //Request reset code
  //Added by Wences Jacob Lorenzo
  const handleSendResetCode = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    //Send email to backend to request reset code
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

      //Switch to verification step
      setMessage("If an account exists, a reset code has been sent.");
      setStep("verify");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  //Resend reset code
  //Added by Wences Jacob Lorenzo
  const handleResendCode = async () => {
    if (!email) {
      setError("Please enter your email again.");
      return;
    }

    setResending(true);
    setError("");
    setMessage("");

    //Reuse same endpoint to resend code
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

  //Verify + reset
  //Added by Wences Jacob Lorenzo
  const handleResetPassword = async () => {
    setLoading(true);
    setError("");

    //Send reset code and new password to backend
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

      //Show success message and redirect
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
      {/* Password reset card */}
      <DarkCard width="420px" padding="40px">
        <h2 style={{ color: "white", marginBottom: "20px" }}>
          Forgot Password
        </h2>

        {/* Step 1: Request reset code  by Wences Jacob Lorenzo*/}
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

        {/* Step 2: Enter code + new password by Wences Jacob Lorenzo*/}
        {step === "verify" && (
          <>
            {/* Email (disabled for confirmation) */}
            <input
              type="email"
              value={email}
              disabled
              style={{ ...inputStyle, opacity: 0.7 }}
            />

            {/* Reset code input */}
            <input
              type="text"
              placeholder="Reset Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={inputStyle}
            />

             {/* New password input */}
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={inputStyle}
            />

            {error && <p style={errorStyle}>{error}</p>}
            {message && <p style={successStyle}>{message}</p>}

            {/* Reset password button */}
            <button
              style={buttonStyle}
              onClick={handleResetPassword}
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            {/* Resend reset code */}
            <button
              style={resendButtonStyle}
              onClick={handleResendCode}
              disabled={resending}
            >
              {resending ? "Resending..." : "Resend Reset Code"}
            </button>
          </>
        )}

        {/* Login link */}
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

// Shared input style
const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "15px",
  borderRadius: "6px",
  border: "none",
};

// Primary button style
const buttonStyle = {
  width: "100%",
  padding: "12px",
  background: "#8fd18e",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  fontSize: "1.1rem",
};

// Resend button style
const resendButtonStyle = {
  width: "100%",
  padding: "10px",
  background: "#b0b0b0",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  marginTop: "10px",
};

// Error message style
const errorStyle = {
  color: "#ff6b6b",
  marginBottom: "10px",
};

// Success message style
const successStyle = {
  color: "#8fd18e",
  marginBottom: "10px",
};
