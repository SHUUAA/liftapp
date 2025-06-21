import React from "react";
import { useAdminAuth } from "../hooks/useAdminAuth";
import AdminLogin from "../components/AdminLogin";
import AdminDashboard from "../components/AdminDashboard";

const AdminPanel = () => {
  const { isAuthenticated, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <AdminDashboard /> : <AdminLogin />;
};

export default AdminPanel;
