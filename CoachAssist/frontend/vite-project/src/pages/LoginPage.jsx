import { useNavigate } from "react-router-dom";
import { useState } from "react";
import logo from "../assets/logo.png";
import DarkCard from "../components/DarkCard";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth(); //Get login function from AuthContext

  //Form input state
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState(""); //Error message state
  const [needsVerification, setNeedsVerification] = useState(false); //If backend indicated unverified email. Added by Wences Jacob Lorenzo
  const [loading, setLoading] = useState(false); //Loading state for login button

  //Handle input field changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  //Handle login button click
  const handleLogin = async () => {
    setError("");
    setNeedsVerification(false); //Added by Wences Jacob Lorenzo

    //Basic frontend validation
    if (!formData.username || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    const result = await login(formData.username, formData.password); // Call login function from AuthContext

    if (result.success) {
      navigate("/dashboard");//Redirect to dashboard on access
    } else {
      //Detect unverified email case. Added by Wences Jacob Lorenzo
      if (result.message?.toLowerCase().includes("verify")) {
        setNeedsVerification(true);
        setError("Please verify your email before logging in.");
      } else {
        setError(result.message || "Invalid credentials");
      }
    }

    setLoading(false);
  };

  return (
    <div className="auth-page-container">
      {/* Card container for login form */}
      <DarkCard width="420px" padding="50px 40px">

        {/* App logo */}
        <img
          src={logo}
          alt="CoachAssist Logo"
          className="auth-logo"
        />

        {/* Page title */}
        <h2 className="auth-title">Login</h2>

        {/* Username input */}
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          className="auth-input username"
        />

        {/* Password input */}
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="auth-input password"
        />

        {/* Error message display */}
        {error && (
          <p className="auth-error">
            {error}
          </p>
        )}

        {/*Verify Email CTA. Added by Wences Jacob Lorenzo*/}
        {needsVerification && (
          <button
            className="auth-btn-secondary"
            onClick={() => navigate("/verify-email")}
          >
            Verify Email
          </button>
        )}

        {/* Login button */}
        <button
          className="auth-btn-primary"
          disabled={loading}
          onClick={handleLogin}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* Forgot password link */}
        <p className="auth-text forgot-password">
          <span
            className="auth-link"
            onClick={() => navigate("/forgotpassword")}
          >
            Forgot password?
          </span>
        </p>

        {/* Signup link */}
        <p className="auth-text signup">
          Don’t have an account?{" "}
          <span
            className="auth-link"
            onClick={() => navigate("/signup")}
          >
            Sign up
          </span>
        </p>

      </DarkCard>
    </div>
  );
}
