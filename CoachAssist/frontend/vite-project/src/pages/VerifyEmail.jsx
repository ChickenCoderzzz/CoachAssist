import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function VerifyEmail() {
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  const verifyEmail = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    const res = await fetch("/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.detail || "Verification failed");
      setLoading(false);
      return;
    }

    setMessage("Email verified! Redirecting to login...");

    setTimeout(() => {
      navigate("/login");
    }, 1500);
  };

  const resendCode = async () => {
    setError("");
    setMessage("");
    setCooldown(true);

    const res = await fetch("/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.detail || "Failed to resend code");
      setCooldown(false);
      return;
    }

    setMessage("Verification code resent!");
    setTimeout(() => setCooldown(false), 30000);
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ marginBottom: "20px" }}>Verify Your Email</h2>

        {/* Verification Code Input */}
        <input
          type="text"
          placeholder="6-digit verification code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={inputStyle}
        />

        <button
          onClick={verifyEmail}
          disabled={loading || !code}
          style={{
            ...buttonStyle,
            background: loading ? "#999" : "#4b8b3b",
          }}
        >
          {loading ? "Verifying..." : "Verify Email"}
        </button>

        <hr style={{ margin: "25px 0" }} />

        {/* Resend Section */}
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <button
          onClick={resendCode}
          disabled={cooldown || !email}
          style={{
            ...buttonStyle,
            background: cooldown ? "#999" : "#357abd",
          }}
        >
          {cooldown ? "Please wait..." : "Resend Verification Code"}
        </button>

        {/* Messages */}
        {message && <p style={{ color: "green", marginTop: "15px" }}>{message}</p>}
        {error && <p style={{ color: "red", marginTop: "15px" }}>{error}</p>}
      </div>
    </div>
  );
}

/* Styles */
const containerStyle = {
  height: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const cardStyle = {
  width: "400px",
  padding: "30px",
  borderRadius: "8px",
  background: "white",
  textAlign: "center",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "15px",
  borderRadius: "6px",
  border: "1px solid #ccc",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "6px",
  color: "white",
  border: "none",
  cursor: "pointer",
  fontSize: "1rem",
};
