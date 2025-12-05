export default function DarkCard({ children, width = "420px", padding = "50px 40px" }) {
  return (
    <div
      style={{
        width,
        background: "rgba(0, 0, 0, 0.55)",
        padding,
        borderRadius: "16px",
        boxShadow: "0 0 25px rgba(0,0,0,0.35)",
        textAlign: "center",
        position: "relative",
        zIndex: 2
      }}
    >
      {children}
    </div>
  );
}
