import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import bg from "../assets/field_bg.png";
import DarkCard from "../components/DarkCard";

export default function LandingPage() {
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
        position: "relative",
      }}
    >

      {/*  DarkCard container */}
      <DarkCard width="500px" padding="60px 50px">
        
        {/* Logo */}
        <img
          src={logo}
          alt="CoachAssist Logo"
          style={{
            width: "200px",
            marginBottom: "20px",
            position: "relative",
            zIndex: 10
          }}
        />

        {/* Title */}
        <h1
          style={{
            color: "white",
            marginBottom: "10px",
            position: "relative",
            zIndex: 10
          }}
        >
          Welcome to CoachAssist
        </h1>

        {/*  SLOGAN  */}
        <p
          style={{
            color: "white",
            fontSize: "1.2rem",
            marginBottom: "35px",
            position: "relative",
            zIndex: 10
          }}
        >
          Your all-in-one football analysis tool.
        </p>

        {/* Login Button */}
        <button
          style={{
            width: "100%",
            padding: "14px",
            marginBottom: "15px",
            borderRadius: "6px",
            border: "none",
            background: "#4b8b3b",
            color: "white",
            fontSize: "1.1rem",
            cursor: "pointer",
            position: "relative",
            zIndex: 10
          }}
          onClick={() => navigate("/login")}
        >
          Login
        </button>

        {/* Sign Up Button */}
        <button
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "6px",
            border: "1px solid white",
            background: "transparent",
            color: "white",
            fontSize: "1.1rem",
            cursor: "pointer",
            position: "relative",
            zIndex: 10
          }}
          onClick={() => navigate("/signup")}
        >
          Sign Up
        </button>

      </DarkCard>
    </div>
  );
}

