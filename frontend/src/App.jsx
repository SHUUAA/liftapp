import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LiftApp from './LiftApp.jsx';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LiftApp />} />
          {/* Future routes can go here */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;