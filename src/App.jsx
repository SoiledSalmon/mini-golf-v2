// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Signup from "./auth/Signup";
import Login from "./auth/Login";
import Canvas3D from "./scene/Canvas3D";
import MainMenu from "./ui/MainMenu";
import { useState, useEffect } from "react";

export default function App() {
  const [holeDone, setHoleDone] = useState(false);
  const [strokes, setStrokes] = useState(0);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("loggedIn") === "true") {
      setLoggedIn(true);
    }
  }, []);

  function handleHoleComplete() {
    setHoleDone(true);
  }

  function handleNextHole() {
    setHoleDone(false);
    setStrokes(0);
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/signup" />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login setLoggedIn={setLoggedIn} />} />
      <Route
        path="/menu"
        element={loggedIn ? <MainMenu /> : <Navigate to="/login" />}
      />
      <Route
        path="/game/:levelId"
        element={
          loggedIn ? (
            <Canvas3D
              onHoleComplete={handleHoleComplete}
              holeDone={holeDone}
              onNextHole={handleNextHole}
              strokes={strokes}
              setStrokes={setStrokes}
              setHoleDone={setHoleDone}
            />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  );
}
