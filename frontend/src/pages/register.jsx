import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Register({ onSwitchToLogin }) {
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    // Enhanced validation
    if (!userId.trim()) {
      setError("User ID is required!");
      setLoading(false);
      return;
    }

    if (userId.length < 3) {
      setError("User ID must be at least 3 characters long!");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match!");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long!");
      setLoading(false);
      return;
    }

    console.log("Attempting to register user:", { email, userId });

    try {
      // First, check if User ID already exists (optional - you might want to validate against a company database)
      const { data: existingUser, error: checkError } = await supabase
        .from("user_profiles") // This would be a custom table if you create one
        .select("user_id")
        .eq("user_id", userId)
        .single();

      // Comment out the above check if you don't have a profiles table yet

      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          // Store User ID in user metadata
          data: {
            user_id: userId,
            full_name: "", // You can add more fields later
            department: "", // You can add more fields later
          },
          emailRedirectTo: undefined, // Skip email confirmation for easier testing
        },
      });

      console.log("Registration response:", { data, error });

      if (error) throw error;

      if (data?.user) {
        // Optional: Create a profile record in a separate table
        if (data.user.id) {
          const { error: profileError } = await supabase
            .from("user_profiles")
            .insert([
              {
                user_id: userId,
                auth_user_id: data.user.id,
                email: email,
                created_at: new Date().toISOString(),
              },
            ]);

          if (profileError) {
            console.warn("Profile creation failed:", profileError);
            // Don't fail the registration if profile creation fails
          }
        }

        if (data.session) {
          // User is immediately logged in (email confirmation disabled)
          setMessage(
            `Account created successfully! User ID: ${userId} has been registered.`
          );
        } else {
          // Email confirmation required
          setMessage(
            `Account created! User ID: ${userId} registered. Please check your email for a confirmation link.`
          );
        }

        // Clear form
        setUserId("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      console.error("Registration error:", error);

      // Handle specific error cases
      if (error.message.includes("duplicate")) {
        setError("This User ID or email is already registered!");
      } else if (error.message.includes("invalid")) {
        setError(
          "Invalid User ID format. Please check with your administrator."
        );
      } else {
        setError(error.message);
      }
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
          Create Account
        </h1>

        {/* Test Connection Button */}
        <button
          type="button"
          onClick={testConnection}
          className="w-full mb-6 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition duration-200"
        >
          🔧 Test Supabase Connection
        </button>

        <form onSubmit={handleRegister} className="space-y-4">
          {/* User ID Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User ID <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              type="text"
              placeholder="Enter your company-provided User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              minLength={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              Contact your administrator if you don't have a User ID
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
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
              Password <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              type="password"
              placeholder="Choose a password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
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
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        {/* Switch to Login */}
        {onSwitchToLogin && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <button
                onClick={onSwitchToLogin}
                className="text-blue-500 hover:text-blue-700 font-medium"
              >
                Sign In
              </button>
            </p>
          </div>
        )}

        {/* Enhanced Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">
            📋 Registration Requirements:
          </h3>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Obtain your User ID from your company administrator</li>
            <li>Click "Test Supabase Connection" to verify system status</li>
            <li>Enter your company-provided User ID</li>
            <li>Use your work email address</li>
            <li>Choose a secure password (6+ characters)</li>
            <li>Confirm your password matches</li>
            <li>Click "Create Account" to complete registration</li>
          </ol>
        </div>

        {/* Additional Info */}
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            <strong>Note:</strong> Your User ID must be provided by your
            company. Contact your administrator if you don't have one or if you
            encounter issues.
          </p>
        </div>
      </div>
    </div>
  );
}
