export default function PowerMeter({ charging, power }) {
  const pct = Math.max(0, Math.min(100, (power / 10) * 100));
  return (
    <div
      style={{
        position: "fixed",
        right: 24,
        top: "50%",
        transform: "translateY(-50%)",
        width: 16,
        height: 200,
        background: "rgba(0,0,0,0.5)",
        borderRadius: 8,
        zIndex: 10,
        opacity: charging || power > 0 ? 1 : 0.7,
        pointerEvents: "none",
        overflow: "hidden",
        boxShadow: "0 0 6px rgba(0,0,0,0.5) inset",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: `${pct}%`,
          background: "linear-gradient(180deg,#4caf50,#2e7d32)",
          borderRadius: 8,
          transition: "height 60ms linear",
        }}
      />
    </div>
  );
}
