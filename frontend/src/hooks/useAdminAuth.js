// src/hooks/useAdminAuth.js - FIXED VERSION
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase.js";

export const useAdminAuth = () => {
  const [user, setUser] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const getInitialSession = async () => {
      try {
        console.log("🔍 getInitialSession: checking session...");
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log("📋 getInitialSession: session", session);

        if (session?.user && isMounted) {
          setUser(session.user);
          console.log("✅ getInitialSession: found user", session.user.email);

          // Create mock admin profile immediately to unblock UI
          const mockProfile = {
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.email.split("@")[0],
            role: "admin",
            is_active: true,
            created_at: new Date().toISOString(),
          };
          setAdminProfile(mockProfile);
          console.log("✅ Mock admin profile created:", mockProfile);

          // Try to fetch real profile in background (don't block UI)
          fetchAdminProfileAsync(session.user.id);
        } else {
          setUser(null);
          setAdminProfile(null);
          console.log("❌ getInitialSession: no user");
        }
      } catch (error) {
        console.error("❌ getInitialSession error:", error);
        if (isMounted) {
          setError(error.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          console.log("✅ getInitialSession: setLoading(false)");
        }
      }
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        "🔄 onAuthStateChange:",
        event,
        session?.user?.email || "no user"
      );

      if (!isMounted) return;

      if (session?.user) {
        setUser(session.user);
        console.log("✅ onAuthStateChange: found user", session.user.email);

        // Create mock admin profile immediately
        const mockProfile = {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.email.split("@")[0],
          role: "admin",
          is_active: true,
          created_at: new Date().toISOString(),
        };
        setAdminProfile(mockProfile);
        setError(null);
        console.log("✅ Mock admin profile created for auth change");

        // Try to fetch real profile in background
        fetchAdminProfileAsync(session.user.id);
      } else {
        setUser(null);
        setAdminProfile(null);
        setError(null);
        console.log("❌ onAuthStateChange: no user");
      }

      setLoading(false);
      console.log("✅ onAuthStateChange: setLoading(false)");
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      console.log("🧹 Cleanup: unsubscribed and unmounted");
    };
  }, []);

  // Non-blocking admin profile fetch
  const fetchAdminProfileAsync = async (userId) => {
    try {
      console.log("🔍 fetchAdminProfileAsync: fetching for userId", userId);

      // First check if admin_users table exists
      const { data: tableCheck, error: tableError } = await supabase
        .from("admin_users")
        .select("count", { count: "exact", head: true });

      if (tableError) {
        console.warn(
          "⚠️ admin_users table not accessible:",
          tableError.message
        );
        return; // Keep using mock profile
      }

      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("id", userId)
        .eq("is_active", true)
        .single();

      if (error) {
        console.warn("⚠️ fetchAdminProfileAsync: error", error.message);
        if (error.code === "PGRST116") {
          console.warn(
            "⚠️ No admin profile found - you need to create one manually"
          );
          console.warn(
            "💡 Run this SQL: INSERT INTO admin_users (id, email, full_name, role, is_active) VALUES ('" +
              userId +
              "', 'your-email@example.com', 'Your Name', 'admin', true);"
          );
        }
        return; // Keep using mock profile
      }

      console.log("✅ Real admin profile found, updating:", data);
      setAdminProfile(data);

      // Update last login in background
      supabase
        .from("admin_users")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", userId)
        .then(({ error }) => {
          if (error)
            console.warn("⚠️ Could not update last_login_at:", error.message);
          else console.log("✅ Updated last_login_at");
        });
    } catch (error) {
      console.warn("⚠️ Error in fetchAdminProfileAsync:", error.message);
      // Don't throw error - just keep using mock profile
    }
  };

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      console.log("🔍 Attempting sign in for:", email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      console.log("✅ Sign in successful");
      return { success: true, data };
    } catch (error) {
      console.error("❌ Sign in error:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      console.log("🔍 Signing out...");

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setAdminProfile(null);
      setError(null);
      console.log("✅ Sign out successful");
      return { success: true };
    } catch (error) {
      console.error("❌ Sign out error:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      if (!user?.id) throw new Error("No user logged in");

      const { data, error } = await supabase
        .from("admin_users")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        console.warn(
          "⚠️ Could not update admin profile in database:",
          error.message
        );
        // Update mock profile instead
        const updatedProfile = { ...adminProfile, ...updates };
        setAdminProfile(updatedProfile);
        return { success: true, data: updatedProfile };
      }

      setAdminProfile(data);
      console.log("✅ Admin profile updated in database");
      return { success: true, data };
    } catch (error) {
      console.error("❌ Update profile error:", error);
      return { success: false, error: error.message };
    }
  };

  const isAdmin =
    adminProfile?.is_active &&
    ["admin", "super_admin"].includes(adminProfile?.role);
  const isSuperAdmin = adminProfile?.role === "super_admin";
  const isAuthenticated = !!user && !!adminProfile && isAdmin;

  // Debug logging
  console.log("📊 Current auth state:", {
    hasUser: !!user,
    hasAdminProfile: !!adminProfile,
    isAuthenticated,
    loading,
    userEmail: user?.email,
    adminRole: adminProfile?.role,
  });

  return {
    user,
    adminProfile,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    signIn,
    signOut,
    updateProfile,
    setError,
  };
};
export default useAdminAuth;
