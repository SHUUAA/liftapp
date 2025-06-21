// src/hooks/useAdminAuth.js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase.js";

export const useAdminAuth = () => {
  const [user, setUser] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          setUser(session.user);
          await fetchAdminProfile(session.user.id);
        }
      } catch (error) {
        console.error("Error getting initial session:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchAdminProfile(session.user.id);
      } else {
        setUser(null);
        setAdminProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAdminProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("id", userId)
        .eq("is_active", true)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No admin profile found
          throw new Error("Admin profile not found or inactive");
        }
        throw error;
      }

      setAdminProfile(data);

      // Update last login
      await supabase
        .from("admin_users")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", userId);
    } catch (error) {
      console.error("Error fetching admin profile:", error);
      setError(error.message);
      // Sign out if no valid admin profile
      await supabase.auth.signOut();
    }
  };

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error("Sign in error:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setAdminProfile(null);
      return { success: true };
    } catch (error) {
      console.error("Sign out error:", error);
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

      if (error) throw error;

      setAdminProfile(data);
      return { success: true, data };
    } catch (error) {
      console.error("Update profile error:", error);
      return { success: false, error: error.message };
    }
  };

  const isAdmin =
    adminProfile?.is_active &&
    ["admin", "super_admin"].includes(adminProfile?.role);
  const isSuperAdmin = adminProfile?.role === "super_admin";

  return {
    user,
    adminProfile,
    loading,
    error,
    isAuthenticated: !!user && !!adminProfile,
    isAdmin,
    isSuperAdmin,
    signIn,
    signOut,
    updateProfile,
    setError,
  };
};
