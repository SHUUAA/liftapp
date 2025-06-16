import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import NavBar from "../components/navBar";

export default function Home({ user }) {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      // Get User ID from metadata and profile table
      const userId = user?.user_metadata?.user_id;

      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("auth_user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.warn("Profile fetch error:", error);
      }

      setUserProfile({
        user_id: userId || profile?.user_id || "N/A",
        full_name: profile?.full_name || "",
        department: profile?.department || "",
        role: profile?.role || "student",
        status: profile?.status || "active",
        created_at: profile?.created_at || user.created_at,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUserProfile({
        user_id: user?.user_metadata?.user_id || "N/A",
        full_name: "",
        department: "",
        role: "student",
        status: "active",
        created_at: user.created_at,
      });
    } finally {
      setLoading(false);
    }
  };

  const goToExam = () => {
    navigate("/annotation");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar user={user} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            🎉 Welcome to Data Annotation Platform!
          </h2>
          <p className="text-gray-600 mb-6">
            You're now logged in and ready to start annotating historical
            documents!
          </p>

          {/* Start Annotation Button */}
          <div className="mb-6">
            <button
              onClick={goToExam}
              className="px-8 py-3 bg-green-500 text-white text-lg font-semibold rounded-lg hover:bg-green-600 transition duration-200 shadow-md"
            >
              🎯 Start Document Annotation
            </button>
            <p className="text-gray-500 text-sm mt-2">
              Begin transcribing and annotating historical documents
            </p>
          </div>

          {/* Enhanced User Info with User ID */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">
              👤 User Information:
            </h3>
            {loading ? (
              <div className="space-y-2">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-64 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="mb-2">
                    <strong>User ID:</strong>
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-mono">
                      {userProfile?.user_id}
                    </span>
                  </p>
                  <p className="mb-2">
                    <strong>Email:</strong> {user?.email}
                  </p>
                  <p className="mb-2">
                    <strong>Role:</strong>
                    <span
                      className={`ml-2 px-2 py-1 rounded text-sm ${
                        userProfile?.role === "admin"
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {userProfile?.role || "Student"}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="mb-2">
                    <strong>Account Created:</strong>{" "}
                    {userProfile?.created_at &&
                      new Date(userProfile.created_at).toLocaleDateString()}
                  </p>
                  <p className="mb-2">
                    <strong>Email Confirmed:</strong>{" "}
                    {user?.email_confirmed_at ? "✅ Yes" : "❌ No"}
                  </p>
                  <p className="mb-2">
                    <strong>Status:</strong>
                    <span
                      className={`ml-2 px-2 py-1 rounded text-sm ${
                        userProfile?.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {userProfile?.status || "Active"}
                    </span>
                  </p>
                  {userProfile?.department && (
                    <p className="mb-2">
                      <strong>Department:</strong> {userProfile.department}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">
              🚀 Annotation Tasks:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <button
                onClick={goToExam}
                className="p-4 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition duration-200 text-left"
              >
                <div className="font-medium text-blue-900">
                  📝 Document Transcription
                </div>
                <div className="text-sm text-blue-700 mt-1">
                  Transcribe handwritten historical documents
                </div>
                <div className="text-xs text-blue-600 mt-2">
                  User ID: {userProfile?.user_id}
                </div>
              </button>
              <div className="p-4 bg-white border border-gray-200 rounded-lg opacity-50 text-left">
                <div className="font-medium text-gray-600">
                  🏷️ Entity Recognition
                </div>
                <div className="text-sm text-gray-500 mt-1">Coming soon...</div>
              </div>
              <div className="p-4 bg-white border border-gray-200 rounded-lg opacity-50 text-left">
                <div className="font-medium text-gray-600">
                  📊 Data Validation
                </div>
                <div className="text-sm text-gray-500 mt-1">Coming soon...</div>
              </div>
              <div className="p-4 bg-white border border-gray-200 rounded-lg opacity-50 text-left">
                <div className="font-medium text-gray-600">
                  ⚙️ Project Settings
                </div>
                <div className="text-sm text-gray-500 mt-1">Coming soon...</div>
              </div>
            </div>
          </div>

          {/* Platform Status */}
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">
              ✅ Platform Status:
            </h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Authentication system active ✅</li>
              <li>• User ID validation enabled ✅</li>
              <li>• Document annotation interface ready ✅</li>
              <li>• Database connection established ✅</li>
              <li>• Ready to start data annotation! 🎯</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
