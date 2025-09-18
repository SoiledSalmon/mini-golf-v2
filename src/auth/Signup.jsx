// src/auth/Signup.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  function handleSignup(e) {
    e.preventDefault();
    localStorage.setItem("user", JSON.stringify({ email, password }));
    alert("Signup successful! Please login.");
    navigate("/login");
  }

  return (
    <div className="auth-container">
      <div className="auth-card" role="region" aria-label="Signup card">
        <div className="auth-top">
          <div className="logo-ball" aria-hidden="true" />
          <div>
            <div className="auth-title">Create account</div>
            <div className="auth-sub">Join and play our mini golf levels</div>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSignup}>
          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <button className="auth-btn btn-green" type="submit">Signup</button>
        </form>

        <div className="auth-small">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}
