import React from "react";
import { useNavigate } from "react-router-dom";
import DarkCard from "../components/DarkCard";
import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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
          Profile
        </h2>

        <p style={{ color: "white" }}>
          <strong>Email:</strong> {user?.email || "Not set"}
        </p>
        <p style={{ color: "white" }}>
          <strong>Username:</strong> {user?.username || "Not set"}
        </p>
        <p style={{ color: "white" }}>
          <strong>Full Name:</strong> {user?.full_name || "Not set"}
        </p>

        {/* CHANGE PASSWORD */}
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
          Change Password
        </button>

        {/* DELETE ACCOUNT */}
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
          onClick={() => navigate("/delete-account")}
        >
          Delete Account
        </button>

        {/* LOG OUT */}
        <button
          style={{
            marginTop: "15px",
            width: "100%",
            padding: "12px",
            background: "#f0c36d",
            border: "none",
            borderRadius: "6px",
            fontSize: "1.1rem",
            cursor: "pointer",
          }}
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          Log Out
        </button>
      </DarkCard>
    </div>
  );
}