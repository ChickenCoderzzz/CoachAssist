import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DarkCard from "../components/DarkCard";
import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/auth/profile/request-password-change", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, // ✅ FIX #1
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.detail || "Failed to send verification code.");
        return;
      }

      // ✅ SUCCESS → navigate to verify page
      navigate("/verify-password-change"); // ✅ FIX #2
    } catch (err) {
      setMessage("Server error. Please try again.");
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
        <img
          src={logo}
          alt="CoachAssist Logo"
          style={{ width: "140px", marginBottom: "20px" }}
        />

        <h2 style={{ color: "white", marginBottom: "20px" }}>
          Change Password
        </h2>

        {message && (
          <p
            style={{
              color: message.toLowerCase().includes("sent")
                ? "#8fd18e"
                : "#d87a7a",
              marginBottom: "15px",
            }}
          >
            {message}
          </p>
        )}

        <button
          style={{
            width: "100%",
            padding: "12px",
            background: "#8fd18e",
            border: "none",
            borderRadius: "6px",
            fontSize: "1.05rem",
            cursor: "pointer",
            marginBottom: "15px",
          }}
          onClick={handleSendCode}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Verification Code"}
        </button>

        <button
          style={{
            width: "100%",
            padding: "12px",
            background: "#d87a7a",
            border: "none",
            borderRadius: "6px",
            fontSize: "1.05rem",
            cursor: "pointer",
          }}
          onClick={() => navigate("/profile")}
        >
          Back
        </button>
      </DarkCard>
    </div>
  );
}
