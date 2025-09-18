// src/auth/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Login({ setLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  function handleLogin(e) {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.email === email && user.password === password) {
      localStorage.setItem("loggedIn", "true");
      setLoggedIn(true);
      navigate("/menu");
    } else {
      alert("Invalid credentials!");
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card" role="region" aria-label="Login card">
        <div className="auth-top">
          <div className="logo-ball" aria-hidden="true" />
          <div>
            <div className="auth-title">MiniGolf Studio</div>
            <div className="auth-sub">Sign in to continue playing</div>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
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
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="auth-btn btn-green" type="submit">Login</button>
        </form>

        <div className="auth-small">
          Don’t have an account? <Link to="/signup">Signup</Link>
        </div>
      </div>
    </div>
  );
}
