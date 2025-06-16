import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function NavBar({ user }) {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      // Method 1: Get User ID from user metadata (stored during registration)
      const userId = user?.user_metadata?.user_id;

      // Method 2: Get full profile from user_profiles table (optional)
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("auth_user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.warn("Profile fetch error:", error);
      }

      setUserProfile({
        user_id: userId || profile?.user_id || "N/A",
        full_name: profile?.full_name || "",
        department: profile?.department || "",
        role: profile?.role || "student",
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUserProfile({
        user_id: user?.user_metadata?.user_id || "N/A",
        full_name: "",
        department: "",
        role: "student",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              📝 Data Annotation Platform
            </h1>
            <div className="flex items-center space-x-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            📝 Data Annotation Platform
          </h1>
          <div className="flex items-center space-x-4">
            {/* Enhanced User Info with User ID */}
            <div className="text-right">
              <div className="text-sm text-gray-700">
                <span className="font-medium">ID:</span> {userProfile?.user_id}
              </div>
              <div className="text-sm text-gray-600">{user?.email}</div>
              {userProfile?.department && (
                <div className="text-xs text-gray-500">
                  {userProfile.department}
                </div>
              )}
            </div>

            {/* Role Badge */}
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                userProfile?.role === "admin"
                  ? "bg-red-100 text-red-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {userProfile?.role || "Student"}
            </span>

            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
