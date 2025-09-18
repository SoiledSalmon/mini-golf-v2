// src/ui/HoleComplete.jsx
export default function HoleComplete({ visible, strokes, par, score, onNext }) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        zIndex: 20,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          background: "#222",
          padding: "24px 40px",
          borderRadius: "12px",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: "24px", marginBottom: "12px" }}>🎉 Hole Complete!</h2>
        <p>Strokes: {strokes} (Par {par})</p>
        <p>Score: {score >= 0 ? `+${score}` : score}</p>
        <button
          style={{
            marginTop: "16px",
            padding: "10px 20px",
            border: "none",
            borderRadius: "6px",
            background: "#4caf50",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
          }}
          onClick={onNext}
        >
          Next Hole →
        </button>
      </div>
    </div>
  );
}
