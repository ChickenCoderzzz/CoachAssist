import { useNavigate } from "react-router-dom";
import { useState } from "react";
import logo from "../assets/logo.png";
import bg from "../assets/field_bg.png";
import DarkCard from "../components/DarkCard";
import { useAuth } from "../context/AuthContext";

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  //  State for form fields
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSignup = async () => {
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!formData.username || !formData.email || !formData.full_name || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);

    const result = await signup({
      username: formData.username,
      email: formData.email,
      full_name: formData.full_name,
      password: formData.password,
    });

    if (result.success) {
      // Redirect to login after successful signup
      navigate("/login");
    } else {
      setError(result.message || "Signup failed");
    }
    setLoading(false);
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
      <DarkCard width="420px" padding="40px 40px">

        {/* Logo */}
        <img
          src={logo}
          alt="CoachAssist Logo"
          style={{ width: "150px", marginBottom: "20px" }}
        />

        <h2 style={{ color: "white", marginBottom: "20px" }}>Create Account</h2>

        {/* Full Name */}
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
            border: "1px solid #777",
            background: "rgba(255, 255, 255, 0.9)",
          }}
        />

        {/* Email */}
        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "15px",
            borderRadius: "6px",
            border: "1px solid #777",
            background: "rgba(255, 255, 255, 0.9)",
          }}
        />

        {/* Username */}
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
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
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
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
          name="confirmPassword"
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "20px",
            borderRadius: "6px",
            border: "1px solid #777",
            background: "rgba(255, 255, 255, 0.9)",
          }}
        />

        {/*  Error Message */}
        {error && (
          <p
            style={{
              color: "#ff6b6b",
              marginBottom: "15px",
              fontWeight: "bold",
            }}
          >
            {error}
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
