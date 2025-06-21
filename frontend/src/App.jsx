import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LiftApp from "./LiftApp.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LiftApp />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
