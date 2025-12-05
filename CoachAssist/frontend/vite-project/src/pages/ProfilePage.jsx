import React from "react";
import { useNavigate } from "react-router-dom";
import DarkCard from "../components/DarkCard";
import logo from "../assets/logo.png";

export default function ProfilePage() {
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
        <img
          src={logo}
          alt="CoachAssist Logo"
          style={{ width: "140px", marginBottom: "20px" }}
        />

        <h2 style={{ color: "white", marginBottom: "20px" }}>Profile</h2>

        <p style={{ color: "white" }}>
          <strong>Email:</strong> john_smith@gmail.com
        </p>
        <p style={{ color: "white" }}>
          <strong>Username:</strong> john_smith21
        </p>
        <p style={{ color: "white" }}>
          <strong>Full Name:</strong> John Smith
        </p>

        <button
          style={{
            marginTop: "25px",
            width: "100%",
            padding: "12px",
            background: "#8fd18e",
            border: "none",
            borderRadius: "6px",
            fontSize: "1.1rem",
            cursor: "pointer",
          }}
          onClick={() => navigate("/edit-profile")}
        >
          Edit
        </button>

        <button
          style={{
            marginTop: "15px",
            width: "100%",
            padding: "12px",
            background: "#d87a7a",
            border: "none",
            borderRadius: "6px",
            fontSize: "1.1rem",
            cursor: "pointer",
          }}
          onClick={() => navigate("/")}
        >
          Log Out
        </button>
      </DarkCard>
    </div>
  );
}

