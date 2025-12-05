import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import bg from "../assets/field_bg.png";
import DarkCard from "../components/DarkCard";

export default function LoginPage() {
  const navigate = useNavigate();

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

        <img
          src={logo}
          alt="CoachAssist Logo"
          style={{ width: "170px", marginBottom: "30px" }}
        />

        <h2 style={{ color: "white", marginBottom: "25px" }}>Login</h2>

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

        <input
          type="password"
          placeholder="Password"
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "20px",
            borderRadius: "6px",
            border: "1px solid #777",
            background: "rgba(255, 255, 255, 0.9)",
          }}
        />

        <button
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "1rem",
            borderRadius: "6px",
            background: "#4b8b3b",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
          onClick={() => navigate("/dashboard")}
        >
          Login
        </button>

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
