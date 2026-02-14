import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DarkCard from "../components/DarkCard";
import { useAuth } from "../context/AuthContext";

export default function DeleteAccountPage() {
  const navigate = useNavigate();
  const { token, logout } = useAuth(); //Get auth token and logout function

  //UI state
  const [loading, setLoading] = useState(false); //Loading state for delete button
  const [error, setError] = useState(""); //Error message state

  //Handle account deletion
  const handleDelete = async () => {
    setLoading(true);
    setError("");

    //Send delete request to backend with auth tokem
    try {
      const res = await fetch("/auth/delete-account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, 
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to delete account");
      }

      logout(); //Clear user session

      navigate("/login");//Navigate to login page

    } catch (err) {
      setError(err.message || "Failed to delete account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        paddingTop: "110px",
      }}
    >
      {/* Delete confirmation card */}
      <DarkCard width="420px" padding="40px">
        <h2 style={{ color: "white", marginBottom: "15px" }}>
          Delete Account
        </h2>

        {/* Warning message */}
        <p style={{ color: "#ffb3b3", marginBottom: "20px" }}>
          Are you sure you want to delete your account?
          <br />
          <strong>This action cannot be undone.</strong>
        </p>

        {/* Error display */}
        {error && (
          <p style={{ color: "#ff6b6b", marginBottom: "10px" }}>
            {error}
          </p>
        )}

        {/* Confirm delete button */}
        <button
          style={{
            width: "100%",
            padding: "12px",
            background: "#d87a7a",
            border: "none",
            borderRadius: "6px",
            fontSize: "1.1rem",
            cursor: "pointer",
          }}
          onClick={handleDelete}
          disabled={loading}
        >
          {loading ? "Deleting..." : "Yes, Delete My Account"}
        </button>

        {/* Cancel button (return to profile) */}
        <button
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "10px",
            background: "#f0c36d",
            border: "none",
            borderRadius: "6px",
            fontSize: "1rem",
            cursor: "pointer",
          }}
          onClick={() => navigate("/profile")}
        >
          Cancel
        </button>
      </DarkCard>
    </div>
  );
}
