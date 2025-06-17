import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import NavBar from "../components/navBar";

export default function AdminDashboard({ user }) {
  const navigate = useNavigate();

  // Authentication and authorization
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dashboard data
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAnnotations: 0,
    completedAnnotations: 0,
    activeSessions: 0,
    avgCompletionRate: 0,
    totalTimeSpent: 0,
  });

  // Users data
  const [users, setUsers] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [sessions, setSessions] = useState([]);

  // UI state
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Filters
  const [userFilter, setUserFilter] = useState("all"); // all, active, inactive
  const [annotationFilter, setAnnotationFilter] = useState("all"); // all, in_progress, completed
  const [dateRange, setDateRange] = useState("week"); // week, month, all

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadDashboardData();
    }
  }, [isAdmin, dateRange]);

  const checkAdminAccess = async () => {
    try {
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user has admin role
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("user_id, full_name, role, department")
        .eq("auth_user_id", user.id)
        .single();

      if (profileError || !profile) {
        navigate("/auth");
        return;
      }

      setCurrentUser({ ...user, profile });

      if (profile.role !== "admin") {
        alert("Access denied. Admin privileges required.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadStats(),
        loadUsers(),
        loadAnnotations(),
        loadSessions(),
      ]);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get date filter
      let dateFilter = "";
      if (dateRange === "week") {
        dateFilter = new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000
        ).toISOString();
      } else if (dateRange === "month") {
        dateFilter = new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString();
      }

      // Total users
      const { count: totalUsers } = await supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true });

      // Total annotations
      let annotationsQuery = supabase
        .from("annotations")
        .select("*", { count: "exact", head: true });

      if (dateFilter) {
        annotationsQuery = annotationsQuery.gte("created_at", dateFilter);
      }

      const { count: totalAnnotations } = await annotationsQuery;

      // Completed annotations
      let completedQuery = supabase
        .from("annotations")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed");

      if (dateFilter) {
        completedQuery = completedQuery.gte("created_at", dateFilter);
      }

      const { count: completedAnnotations } = await completedQuery;

      // Active sessions (sessions without end time)
      const { count: activeSessions } = await supabase
        .from("annotation_sessions")
        .select("*", { count: "exact", head: true })
        .is("ended_at", null);

      // Average completion rate
      const { data: avgData } = await supabase
        .from("annotations")
        .select("completion_percentage")
        .not("completion_percentage", "is", null);

      const avgCompletionRate =
        avgData?.length > 0
          ? Math.round(
              avgData.reduce(
                (sum, item) => sum + item.completion_percentage,
                0
              ) / avgData.length
            )
          : 0;

      // Total time spent
      const { data: timeData } = await supabase
        .from("annotations")
        .select("time_spent_seconds")
        .not("time_spent_seconds", "is", null);

      const totalTimeSpent =
        timeData?.reduce(
          (sum, item) => sum + (item.time_spent_seconds || 0),
          0
        ) || 0;

      setStats({
        totalUsers: totalUsers || 0,
        totalAnnotations: totalAnnotations || 0,
        completedAnnotations: completedAnnotations || 0,
        activeSessions: activeSessions || 0,
        avgCompletionRate,
        totalTimeSpent,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadUsers = async () => {
    try {
      let query = supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (userFilter === "active") {
        query = query.eq("status", "active");
      } else if (userFilter === "inactive") {
        query = query.eq("status", "inactive");
      }

      const { data, error } = await query;

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const loadAnnotations = async () => {
    try {
      let query = supabase
        .from("annotations")
        .select(
          `
          *,
          user_profiles!inner(user_id, full_name, email)
        `
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (annotationFilter === "in_progress") {
        query = query.eq("status", "in_progress");
      } else if (annotationFilter === "completed") {
        query = query.eq("status", "completed");
      }

      const { data, error } = await query;

      if (error) throw error;

      setAnnotations(data || []);
    } catch (error) {
      console.error("Error loading annotations:", error);
    }
  };

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("annotation_sessions")
        .select(
          `
          *,
          user_profiles!inner(user_id, full_name),
          annotations!inner(image_name, status)
        `
        )
        .order("started_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setSessions(data || []);
    } catch (error) {
      console.error("Error loading sessions:", error);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) throw error;

      alert(`User role updated to ${newRole} successfully!`);
      loadUsers();
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("Error updating user role. Please try again.");
    }
  };

  const updateUserStatus = async (userId, newStatus) => {
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) throw error;

      alert(`User status updated to ${newStatus} successfully!`);
      loadUsers();
    } catch (error) {
      console.error("Error updating user status:", error);
      alert("Error updating user status. Please try again.");
    }
  };

  const exportData = async (type) => {
    try {
      let data, filename;

      switch (type) {
        case "users":
          data = users;
          filename = "users_export.json";
          break;
        case "annotations":
          data = annotations;
          filename = "annotations_export.json";
          break;
        case "sessions":
          data = sessions;
          filename = "sessions_export.json";
          break;
        default:
          return;
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      alert(`${type} data exported successfully!`);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Error exporting data. Please try again.");
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">Access Denied</p>
          <p className="text-gray-600">Admin privileges required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <NavBar user={user} />

      {/* Admin Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="all">All Time</option>
            </select>
            <button
              onClick={loadDashboardData}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Back to App
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalUsers}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Total Annotations
            </h3>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalAnnotations}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Completed</h3>
            <p className="text-2xl font-bold text-green-600">
              {stats.completedAnnotations}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Active Sessions
            </h3>
            <p className="text-2xl font-bold text-orange-600">
              {stats.activeSessions}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Avg Completion
            </h3>
            <p className="text-2xl font-bold text-blue-600">
              {stats.avgCompletionRate}%
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Time</h3>
            <p className="text-2xl font-bold text-purple-600">
              {formatTime(stats.totalTimeSpent)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: "overview", label: "Overview" },
                { id: "users", label: "Users" },
                { id: "annotations", label: "Annotations" },
                { id: "sessions", label: "Sessions" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Recent Activity
                    </h3>
                    <div className="space-y-3">
                      {annotations.slice(0, 5).map((annotation) => (
                        <div
                          key={annotation.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded"
                        >
                          <div>
                            <p className="font-medium">
                              {annotation.user_profiles?.full_name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {annotation.image_name}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                annotation.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {annotation.status}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {annotation.completion_percentage}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      System Health
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span>Database Connection</span>
                        <span className="text-green-600 font-medium">
                          ✓ Healthy
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span>Active Users (Last 24h)</span>
                        <span className="font-medium">
                          {users.filter((u) => u.status === "active").length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span>Completion Rate</span>
                        <span className="font-medium">
                          {stats.avgCompletionRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === "users" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Users Management
                    </h3>
                    <select
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="all">All Users</option>
                      <option value="active">Active Only</option>
                      <option value="inactive">Inactive Only</option>
                    </select>
                  </div>
                  <button
                    onClick={() => exportData("users")}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Export Users
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.full_name || "No name"}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                              <div className="text-xs text-gray-400">
                                ID: {user.user_id}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={user.role}
                              onChange={(e) =>
                                updateUserRole(user.id, e.target.value)
                              }
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="student">Student</option>
                              <option value="instructor">Instructor</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={user.status}
                              onChange={(e) =>
                                updateUserStatus(user.id, e.target.value)
                              }
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.department || "Not set"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(user.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Annotations Tab */}
            {activeTab === "annotations" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Annotations
                    </h3>
                    <select
                      value={annotationFilter}
                      onChange={(e) => setAnnotationFilter(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="all">All Annotations</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <button
                    onClick={() => exportData("annotations")}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Export Annotations
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Image
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Progress
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time Spent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {annotations.map((annotation) => (
                        <tr key={annotation.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {annotation.user_profiles?.full_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {annotation.user_profiles?.user_id}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {annotation.image_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                annotation.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {annotation.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{
                                    width: `${
                                      annotation.completion_percentage || 0
                                    }%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-900">
                                {annotation.completion_percentage || 0}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTime(annotation.time_spent_seconds || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(annotation.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === "sessions" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Active Sessions
                  </h3>
                  <button
                    onClick={() => exportData("sessions")}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Export Sessions
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Image
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Started
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sessions.map((session) => (
                        <tr key={session.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {session.user_profiles?.full_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {session.user_profiles?.user_id}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {session.annotations?.image_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(session.started_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {session.duration_seconds
                              ? formatTime(session.duration_seconds)
                              : "Active"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                session.ended_at
                                  ? "bg-gray-100 text-gray-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {session.ended_at ? "Ended" : "Active"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900">
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">User Details</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedUser.full_name || "Not set"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    User ID
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedUser.user_id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedUser.email}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedUser.role}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Department
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedUser.department || "Not set"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedUser.status}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Created
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(selectedUser.created_at)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Last Updated
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(selectedUser.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
