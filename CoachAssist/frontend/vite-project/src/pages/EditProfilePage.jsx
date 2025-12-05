import React from "react";
import { useNavigate } from "react-router-dom";
import DarkCard from "../components/DarkCard";

export default function EditProfilePage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        paddingTop: "110px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <DarkCard width="420px" padding="40px">
        <h2 style={{ color: "white", marginBottom: "20px" }}>Edit Profile</h2>

        <input
          type="text"
          placeholder="New Username"
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "15px",
            borderRadius: "6px",
          }}
        />

        <input
          type="password"
          placeholder="New Password"
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "15px",
            borderRadius: "6px",
          }}
        />

        <button
          style={{
            width: "100%",
            padding: "12px",
            background: "#8fd18e",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            marginTop: "10px",
            fontSize: "1.1rem",
          }}
          onClick={() => navigate("/profile")}
        >
          Save Changes
        </button>
      </DarkCard>
    </div>
  );
}
