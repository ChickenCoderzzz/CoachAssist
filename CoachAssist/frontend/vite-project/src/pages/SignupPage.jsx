import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DarkCard from "../components/DarkCard";
import bg from "../assets/field_bg.png";

export default function SignupPage() {
  const navigate = useNavigate();

  //Form input state
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  //UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accountCreated, setAccountCreated] = useState(false); //Added by Wences Jacob Lorenzo

  //Handle input field changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  //Handle signup button click by Wences Jacob Lorenzo
  const handleSignup = async () => {
    setError("");

    //Basic password match validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      //Normalize email before sending to backend
      const email = formData.email.trim().toLowerCase(); //Added by Wences Jacob Lorenzo 

      //Send signup request to backend by Wences Jacob Lorenzo
      const res = await fetch("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formData.full_name,
          email,
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await res.json();

      //Handle backend errors
      if (!res.ok) {
        throw new Error(data.detail || "Failed to create account.");
      }

      //Store email for verify page
      localStorage.setItem("pendingEmail", email);
      setAccountCreated(true); //Switch UI to verification state
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        paddingTop: "110px",
      }}
    >
      {/* Signup card container */}
      <DarkCard width="420px" padding="40px">
        <h2 style={{ color: "white", marginBottom: "20px" }}>
          Create Account
        </h2>

        {/* If account successfully created, show verification message. Added by Wences Jacob Lorenzo*/}
        {accountCreated ? (
          <>
            <p style={{ color: "#8fd18e", marginBottom: "20px" }}>
              Account created! Please verify your email to continue.
            </p>

            {/* Navigate to verify email page */}
            <button
              style={buttonStyle}
              onClick={() => navigate("/verify-email")}
            >
              Verify Email
            </button>

            {/* Login link */}
            <p style={{ marginTop: "20px", color: "white" }}>
              Already verified?{" "}
              <Link to="/login" style={{ color: "#8fd18e" }}>
                Login
              </Link>
            </p>
          </>
        ) : (
          <>
            {/* Full Name */}
            <input
              type="text"
              name="full_name"
              placeholder="Full Name"
              value={formData.full_name}
              onChange={handleChange}
              style={inputStyle}
            />

            {/* Email */}
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              style={inputStyle}
            />
            {/* Username */}
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              style={inputStyle}
            />

            {/* Password */}
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              style={inputStyle}
            />

            {/* Confirm Password */}
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              style={inputStyle}
            />

            {/* Error message display */}
            {error && (
              <p style={{ color: "#ff6b6b", marginBottom: "10px" }}>
                {error}
              </p>
            )}

            {/* Submit button */}
            <button
              style={buttonStyle}
              onClick={handleSignup}
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Account"}
            </button>

            {/* Login link */}
            <p style={{ marginTop: "20px", color: "white" }}>
              Already have an account?{" "}
              <Link to="/login" style={{ color: "#8fd18e" }}>
                Login
              </Link>
            </p>
          </>
        )}
      </DarkCard>
    </div>
  );
}

//Shared input style. Added by Wences Jacob Lorenzo
const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "15px",
  borderRadius: "6px",
  border: "none",
};

//Shared button style. Added by Wences Jacob Lorenzo
const buttonStyle = {
  width: "100%",
  padding: "12px",
  background: "#8fd18e",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  fontSize: "1.1rem",
};
