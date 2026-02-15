import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DarkCard from "../components/DarkCard";
import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { token } = useAuth(); //Get JWT token for authenticated request

  //Consts added by Wences Jacob Lorenzo
  const [message, setMessage] = useState(""); //Success or error message
  const [loading, setLoading] = useState(false); //Button loading stage

  //Send password change verification code to user's email
  //Added by Wences Jacob Lorenzo
  const handleSendCode = async () => {
    setMessage("");
    setLoading(true);

    try {
      //Call backend endpoint to request password change verification
      const res = await fetch("/auth/profile/request-password-change", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, 
        },
      });

      const data = await res.json();

      //Handle backend error
      if (!res.ok) {
        setMessage(data.detail || "Failed to send verification code.");
        return;
      }

      navigate("/verify-password-change"); 
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
      {/* Card container */}
      <DarkCard width="420px" padding="40px">
        <img
          src={logo}
          alt="CoachAssist Logo"
          style={{ width: "140px", marginBottom: "20px" }}
        />

        <h2 style={{ color: "white", marginBottom: "20px" }}>
          Change Password
        </h2>

        {/* Display dynamic success/error message. Added by Wences Jacob Lorenzo */}
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

        {/* Send Verification Code Button. Added by Wences Jacob Lorenzo*/}
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

        {/* Back Button. Added by Wences Jacob Lorenzo */}
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
