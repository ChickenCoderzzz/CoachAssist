import { useNavigate } from "react-router-dom";
import { useState } from "react";
import logo from "../assets/logo.png";
import bg from "../assets/field_bg.png";
import DarkCard from "../components/DarkCard";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth(); //Get login function from AuthContext

  //Form input state
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState(""); //Error message state
  const [needsVerification, setNeedsVerification] = useState(false); //If backend indicated unverified email
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
    setNeedsVerification(false);

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
      //Detect unverified email case
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
      {/* Card container for login form */}
      <DarkCard width="420px" padding="50px 40px">

        {/* App logo */}
        <img
          src={logo}
          alt="CoachAssist Logo"
          style={{ width: "170px", marginBottom: "30px" }}
        />

        {/* Page title */}
        <h2 style={{ color: "white", marginBottom: "25px" }}>Login</h2>

        {/* Username input */}
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

        {/* Password input */}
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
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

        {/* Error message display */}
        {error && (
          <p
            style={{
              color: "#ff6b6b",
              marginBottom: "15px",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            {error}
          </p>
        )}

        {/*Verify Email CTA*/}
        {needsVerification && (
          <button
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "15px",
              borderRadius: "6px",
              background: "#357abd",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => navigate("/verify-email")}
          >
            Verify Email
          </button>
        )}

        {/* Login button */}
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
          onClick={handleLogin}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* Forgot password link */}
        <p style={{ fontSize: "1rem", marginTop: "22px", color: "white" }}>
          <span
            style={{
              fontSize: "1rem",
              color: "#8fd18e",
              cursor: "pointer",
              fontWeight: "bold",
            }}
            onClick={() => navigate("/forgotpassword")}
          >
            Forgot password?
          </span>
        </p>

        {/* Signup link */}
        <p style={{ marginTop: "20px", color: "white" }}>
          Don’t have an account?{" "}
          <span
            style={{
              color: "#8fd18e",
              cursor: "pointer",
              fontWeight: "bold",
            }}
            onClick={() => navigate("/signup")}
          >
            Sign up
          </span>
        </p>

      </DarkCard>
    </div>
  );
}
