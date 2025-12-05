import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        width: "100%",
        height: "85px",
        background: "#222",
        display: "flex",
        alignItems: "center",
        padding: "0 30px",
        boxSizing: "border-box",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 1000,
      }}
    >
      {/* Logo → goes to dashboard */}
      <img
        src={logo}
        alt="CoachAssist Logo"
        style={{ height: "65px", cursor: "pointer" }}
        onClick={() => navigate("/dashboard")}
      />

      {/* Spacer pushes links to right */}
      <div style={{ flexGrow: 1 }}></div>

      {/* Profile */}
      <span
        style={{
          color: "white",
          marginRight: "25px",
          fontSize: "1.2rem",
          cursor: "pointer",
        }}
        onClick={() => navigate("/profile")}
      >
        Profile
      </span>

      {/* Tutorial */}
      <span
        style={{
          color: "white",
          fontSize: "1.2rem",
          cursor: "pointer",
        }}
        onClick={() => navigate("/tutorial")}
      >
        Tutorial
      </span>
    </div>
  );
}
