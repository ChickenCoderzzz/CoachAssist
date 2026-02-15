import React from "react";
import { useNavigate } from "react-router-dom";
import DarkCard from "../components/DarkCard";
import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth(); //Get authenticated user and logout function

  return (
    <div
      style={{
        paddingTop: "110px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      {/* Profile card container */}
      <DarkCard width="420px" padding="40px">
        <img
          src={logo}
          alt="CoachAssist Logo"
          style={{ width: "140px", marginBottom: "20px" }}
        />

        {/* Display user information */}
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

        {/* Change password */}
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

        {/* Delete account by Wences Jacob Lorenzo*/}
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

        {/* Log Out */}
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