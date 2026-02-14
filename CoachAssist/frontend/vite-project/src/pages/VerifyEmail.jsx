import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import DarkCard from "../components/DarkCard";
import bg from "../assets/field_bg.png";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const email = localStorage.getItem("pendingEmail"); //Get stored email from signup flow

  //COmponent state
  const [code, setCode] = useState(""); //Verification code input
  const [loading, setLoading] = useState(false); //Verify button loading
  const [resending, setResending] = useState(false); //Resend button loading
  const [error, setError] = useState(""); //Error message
  const [message, setMessage] = useState(""); //Success info message
  const [verified, setVerified] = useState(false); //Email verified

  //Handle verify button click
  const handleVerify = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      //Send verification code to backend
      const res = await fetch("/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Verification failed.");
      }

      //Remove stored email after verification
      localStorage.removeItem("pendingEmail");
      setVerified(true);
      setMessage("Email verified successfully! Redirecting to login...");

      setTimeout(() => navigate("/login"), 1500); //Redirect to login after short delay
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  //Handle resend verification code
  const handleResend = async () => {
    if (!email) {
      setError("Email not found. Please sign up again.");
      return;
    }

    setError("");
    setMessage("");
    setResending(true);

    try {
      //Request new verification code
      const res = await fetch("/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to resend verification code.");
      }

      setMessage("Verification code resent to your email.");
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
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
      {/* Verification card container */}
      <DarkCard width="420px" padding="40px">
        <h2 style={{ color: "white", marginBottom: "20px" }}>
          Verify Email
        </h2>

        {/* Display email being verified */}
        {email && (
          <p style={{ color: "white", marginBottom: "10px" }}>
            Verifying: <strong>{email}</strong>
          </p>
        )}

        {/* Verification code input */}
        <input
          type="text"
          placeholder="Verification Code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError("");
          }}
          style={inputStyle}
          disabled={verified}
        />

        {/* Error and success messages */}
        {error && <p style={errorStyle}>{error}</p>}
        {message && <p style={successStyle}>{message}</p>}

        {/* Verify button */}
        <button
          style={buttonStyle}
          onClick={handleVerify}
          disabled={loading || verified}
        >
          {loading ? "Verifying..." : "Verify Email"}
        </button>

        {/* Resend button (hidden after verification) */}
        {!verified && (
          <button
            style={resendButtonStyle}
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? "Resending..." : "Resend Verification Code"}
          </button>
        )}

        {/* Login link */}
        <p style={{ marginTop: "20px", color: "white" }}>
          Already verified?{" "}
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
