import { useNavigate } from "react-router-dom";
import { useState } from "react";
import logo from "../assets/logo.png";
import bg from "../assets/field_bg.png";
import DarkCard from "../components/DarkCard";

export default function SignupPage() {
  const navigate = useNavigate();

  //  State for success message + loading
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  //  Mock signup logic (just for navigation testing)
  const handleSignup = () => {
    setLoading(true);
    setSuccess("Account created successfully! Redirecting to login...");

    // Simulate processing delay, then redirect
    setTimeout(() => {
      navigate("/login");
    }, 1500);
  };

  return (
    <div
      style={{
        height: "100vh",
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <DarkCard width="420px" padding="50px 40px">

        {/* Logo */}
        <img
          src={logo}
          alt="CoachAssist Logo"
          style={{ width: "170px", marginBottom: "30px" }}
        />

        <h2 style={{ color: "white", marginBottom: "25px" }}>Create Account</h2>

        {/* Username */}
        <input
          type="text"
          placeholder="Username"
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "15px",
            borderRadius: "6px",
            border: "1px solid #777",
            background: "rgba(255, 255, 255, 0.9)",
          }}
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Password"
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "15px",
            borderRadius: "6px",
            border: "1px solid #777",
            background: "rgba(255, 255, 255, 0.9)",
          }}
        />

        {/* Confirm Password */}
        <input
          type="password"
          placeholder="Confirm Password"
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "20px",
            borderRadius: "6px",
            border: "1px solid #777",
            background: "rgba(255, 255, 255, 0.9)",
          }}
        />

        {/*  Success Message */}
        {success && (
          <p
            style={{
              color: "#8fd18e",
              marginBottom: "15px",
              fontWeight: "bold",
            }}
          >
            {success}
          </p>
        )}

        {/* Create Account Button */}
        <button
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "1rem",
            borderRadius: "6px",
            background: loading ? "#2d5e28" : "#4b8b3b",
            color: "white",
            border: "none",
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
          }}
          disabled={loading}
          onClick={handleSignup}
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>

        {/* Login link */}
        <p style={{ marginTop: "20px", color: "white" }}>
          Already have an account?{" "}
          <span
            style={{
              color: "#8fd18e",
              cursor: "pointer",
              fontWeight: "bold",
            }}
            onClick={() => navigate("/login")}
          >
            Login
          </span>
        </p>

      </DarkCard>
    </div>
  );
}
