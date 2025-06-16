import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { supabase } from "./lib/supabase";

// Pages
import Home from "./pages/home";
import Login from "./pages/login";
import Register from "./pages/register";
import FinalExam from "./pages/finalExam";

// Protected Route Component
function ProtectedRoute({ children, user, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/auth" replace />;
}

// Auth Route Component (redirect to home if already logged in)
function AuthRoute({ children, user, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <Navigate to="/" replace /> : children;
}

// Auth Pages Component (Login/Register with tabs)
function AuthPages() {
  const [showRegister, setShowRegister] = useState(true);

  const switchToLogin = () => setShowRegister(false);
  const switchToRegister = () => setShowRegister(true);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Auth Navigation Tabs */}
      <div className="flex justify-center pt-8">
        <div className="bg-white rounded-lg shadow-sm p-1 flex">
          <button
            onClick={switchToRegister}
            className={`px-6 py-2 rounded-md transition duration-200 ${
              showRegister
                ? "bg-blue-500 text-white"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Create Account
          </button>
          <button
            onClick={switchToLogin}
            className={`px-6 py-2 rounded-md transition duration-200 ${
              !showRegister
                ? "bg-blue-500 text-white"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Sign In
          </button>
        </div>
      </div>

      {/* Auth Forms */}
      <div className="pb-8">
        {showRegister ? (
          <Register onSwitchToLogin={switchToLogin} />
        ) : (
          <Login onSwitchToRegister={switchToRegister} />
        )}
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check on initial load
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth state changes (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route
          path="/auth"
          element={
            <AuthRoute user={user} loading={loading}>
              <AuthPages />
            </AuthRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <Home user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/annotation"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <FinalExam />
            </ProtectedRoute>
          }
        />

        {/* Redirect any unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
