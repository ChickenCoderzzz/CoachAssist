import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DarkCard from "../components/DarkCard";
import { useAuth } from "../context/AuthContext";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user, token, updateUser } = useAuth();

  const [formData, setFormData] = useState({
    username: user?.username || "",
    password: "",
    full_name: user?.full_name || "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    const payload = {};
    if (formData.username && formData.username !== user.username) payload.username = formData.username;
    if (formData.password) payload.password = formData.password;
    if (formData.full_name && formData.full_name !== user.full_name) payload.full_name = formData.full_name;

    try {
      const res = await fetch(`/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", token },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Failed to update profile (${res.status})`);
      }
      const updatedUser = await res.json();
      updateUser(updatedUser);
      navigate("/profile");
    } catch (e) {
      console.error("Failed to save profile:", e);
    }
    setLoading(false);
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
        <h2 style={{ color: "white", marginBottom: "20px" }}>Edit Profile</h2>

        <input
          type="text"
          name="username"
          placeholder="New Username"
          value={formData.username}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "15px",
            borderRadius: "6px",
          }}
        />

        <input
          type="password"
          name="password"
          placeholder="New Password"
          value={formData.password}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "15px",
            borderRadius: "6px",
          }}
        />

        <input
          type="text"
          name="full_name"
          placeholder="Full Name"
          value={formData.full_name}
          onChange={handleChange}
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
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </DarkCard>
    </div>
  );
}
