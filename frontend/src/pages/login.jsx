import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login({ onSwitchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    console.log("Attempting to login user:", email);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      console.log("Login response:", { data, error });

      if (error) throw error;

      if (data?.session) {
        setMessage("Login successful! Redirecting...");
        console.log("Login successful:", data.user.email);
      }
    } catch (error) {
      console.error("Login error:", error);

      // Provide more user-friendly error messages
      if (error.message.includes("Invalid login credentials")) {
        setError(
          "Invalid email or password. Please check your credentials and try again."
        );
      } else if (error.message.includes("Email not confirmed")) {
        setError(
          "Please check your email and click the confirmation link before logging in."
        );
      } else if (error.message.includes("Too many requests")) {
        setError(
          "Too many login attempts. Please wait a few minutes and try again."
        );
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setMessage("Password reset email sent! Check your inbox.");
    } catch (error) {
      console.error("Password reset error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      console.log("Testing Supabase connection...");
      const { data, error } = await supabase.auth.getSession();
      console.log("Connection test:", { data, error });

      if (error) {
        setError(`Connection failed: ${error.message}`);
      } else {
        setMessage("✅ Supabase connection successful!");
      }
    } catch (error) {
      console.error("Connection error:", error);
      setError(`Connection error: ${error.message}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl mb-6 text-center font-semibold text-gray-800">
          Welcome Back
        </h1>

        {/* Test Connection Button */}
        <button
          type="button"
          onClick={testConnection}
          className="w-full mb-6 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition duration-200"
        >
          🔧 Test Supabase Connection
        </button>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <strong>❌ Error:</strong> {error}
            </div>
          )}

          {message && (
            <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              <strong>✅ Success:</strong> {message}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {/* Forgot Password */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm text-blue-500 hover:text-blue-700 transition duration-200"
            disabled={loading}
          >
            Forgot your password?
          </button>
        </div>

        {/* Switch to Register */}
        {onSwitchToRegister && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <button
                onClick={onSwitchToRegister}
                className="text-blue-500 hover:text-blue-700 font-medium"
              >
                Create Account
              </button>
            </p>
          </div>
        )}

        {/* Troubleshooting */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-800 mb-2">
            💡 Troubleshooting:
          </h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Make sure you've created an account first</li>
            <li>• Check if email confirmation is required</li>
            <li>• Verify your email and password are correct</li>
            <li>• Look at the browser console for detailed logs</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
