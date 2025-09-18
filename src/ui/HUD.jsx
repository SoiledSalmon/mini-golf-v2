import { useNavigate } from "react-router-dom";

export default function HUD({ hole, par, strokes }) {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("loggedIn");
    navigate("/login");
  }

  return (
    <div
      style={{
        position: "absolute",
        top: "12px",
        left: "12px",
        background: "rgba(0,0,0,0.55)",
        color: "white",
        padding: "10px 14px",
        borderRadius: "10px",
        fontSize: "14px",
        lineHeight: "1.4",
        zIndex: 10,
      }}
    >
      <div>Hole {hole} (Par {par})</div>
      <div>Strokes: {strokes}</div>

      <button
        onClick={handleLogout}
        style={{
          marginTop: "8px",
          padding: "6px 12px",
          borderRadius: "8px",
          border: "none",
          fontSize: "13px",
          cursor: "pointer",
          background: "linear-gradient(180deg,#2ecc71,#27ae60)",
          color: "white",
          fontWeight: "600",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          transition: "all 0.2s ease-in-out",
        }}
        onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
        onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        Logout
      </button>
    </div>
  );
}
