// src/ui/EndOfLevelModal.jsx
import React from "react";
import "./EndOfLevelModal.css";

export default function EndOfLevelModal({ strokes, onNext, onRetry, onMainMenu }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2 className="modal-title">🎉 Level Complete!</h2>
        <p className="modal-sub">You finished the hole in</p>
        <div className="modal-strokes">{strokes} Strokes</div>

        <div className="modal-buttons">
          <button className="modal-btn next" onClick={onNext}>
            ➡️ Next Level
          </button>
          <button className="modal-btn retry" onClick={onRetry}>
            🔄 Retry
          </button>
          <button className="modal-btn menu" onClick={onMainMenu}>
            🏠 Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
