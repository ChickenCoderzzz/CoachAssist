import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DarkCard from "../components/DarkCard";
import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";

export default function VerifyPasswordChangePage() {
  const navigate = useNavigate();
  const { token } = useAuth(); //Get authenticated token to protect requests

  //Form state
  const [code, setCode] = useState(""); //Verification code
  const [newPassword, setNewPassword] = useState(""); //New password input

  //UI state
  const [message, setMessage] = useState(""); //Success/error message
  const [loading, setLoading] = useState(false); //Update button lading
  const [resending, setResending] = useState(false); //Resend loading button

  //Verify Code and Update Password
  const handleVerify = async () => {
    setMessage("");
    setLoading(true);

    //Send verification code + new password to backend
    try {
      const res = await fetch(
        "/auth/profile/verify-password-change",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, //Protected route
          },
          body: JSON.stringify({
            code,
            new_password: newPassword,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.detail || "Verification failed.");
        return;
      }

      //On success, return to profile page
      navigate("/profile");
    } catch (err) {
      setMessage("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Resend Verification Code
  const handleResend = async () => {
    setMessage("");
    setResending(true);

    //Request new verification code
    try {
      const res = await fetch(
        "/auth/profile/request-password-change",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`, //Protected route
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.detail || "Failed to resend code.");
        return;
      }

      setMessage("Verification code resent. Check your email.");
    } catch (err) {
      setMessage("Server error. Please try again.");
    } finally {
      setResending(false);
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
      {/* Password change card */}
      <DarkCard width="420px" padding="40px">
        <img
          src={logo}
          alt="CoachAssist Logo"
          style={{ width: "140px", marginBottom: "20px" }}
        />

        <h2 style={{ color: "white", marginBottom: "20px" }}>
          Change Password
        </h2>

        {/* Verification code input */}
        <input
          type="text"
          placeholder="Verification Code"
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

        {/* Dynamic message (success = green, error = red) */}
        {message && (
          <p
            style={{
              color: message.toLowerCase().includes("resent")
                ? "#8fd18e"
                : "#d87a7a",
              marginBottom: "10px",
            }}
          >
            {message}
          </p>
        )}

        {/* Update password button */}
        <button
          style={buttonStyle}
          onClick={handleVerify}
          disabled={loading}
        >
          {loading ? "Updating..." : "Update Password"}
        </button>

        {/* Resend code button */}
        <button
          style={resendButtonStyle}
          onClick={handleResend}
          disabled={resending}
        >
          {resending ? "Resending..." : "Resend Verification Code"}
        </button>

        {/* Back button */}
        <button
          style={backButtonStyle}
          onClick={() => navigate("/profile")}
        >
          Back to Profile
        </button>
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

// Primary action button style
const buttonStyle = {
  width: "100%",
  padding: "12px",
  background: "#8fd18e",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  fontSize: "1.05rem",
  marginBottom: "10px",
};

// Resend button style
const resendButtonStyle = {
  width: "100%",
  padding: "10px",
  background: "#b0b0b0",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  marginBottom: "10px",
};

// Back button style
const backButtonStyle = {
  width: "100%",
  padding: "10px",
  background: "#d87a7a",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
};
