// src/hooks/useAdminDatabase.js
import { useState } from "react";
import { supabase } from "../lib/supabase.js";

export const useAdminDatabase = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Utility function to log admin actions
  const logAction = async (
    action,
    resourceType,
    resourceId = null,
    details = null
  ) => {
    try {
      await supabase.rpc("log_admin_action", {
        p_action: action,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_details: details,
      });
    } catch (error) {
      console.error("Error logging action:", error);
    }
  };

  // DOCUMENT IMAGES CRUD
  const getDocumentImages = async (examType = null) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("document_images")
        .select(
          `
          *,
          uploaded_by_profile:admin_users(full_name, email)
        `
        )
        .order("created_at", { ascending: false });

      if (examType) {
        query = query.eq("exam_type", examType);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error("Error fetching document images:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const createDocumentImage = async (imageData) => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("document_images")
        .insert({
          ...imageData,
          uploaded_by: user.id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await logAction("CREATE", "document_image", data.id, {
        image_name: data.image_name,
      });

      return { success: true, data };
    } catch (error) {
      console.error("Error creating document image:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateDocumentImage = async (id, updates) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("document_images")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await logAction("UPDATE", "document_image", id, updates);

      return { success: true, data };
    } catch (error) {
      console.error("Error updating document image:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const deleteDocumentImage = async (id) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from("document_images")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await logAction("DELETE", "document_image", id);

      return { success: true };
    } catch (error) {
      console.error("Error deleting document image:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // ANSWER KEYS CRUD
  const getAnswerKeys = async (examType = null) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("answer_keys")
        .select(
          `
          *,
          created_by_profile:admin_users(full_name, email)
        `
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (examType) {
        query = query.eq("exam_type", examType);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error("Error fetching answer keys:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const createAnswerKey = async (answerKeyData) => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("answer_keys")
        .insert({
          ...answerKeyData,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update document_images to mark it has an answer key
      await supabase
        .from("document_images")
        .update({ has_answer_key: true })
        .eq("image_name", data.image_name);

      await logAction("CREATE", "answer_key", data.id, {
        image_name: data.image_name,
      });

      return { success: true, data };
    } catch (error) {
      console.error("Error creating answer key:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateAnswerKey = async (id, updates) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("answer_keys")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          version: supabase.raw("version + 1"),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await logAction("UPDATE", "answer_key", id, updates);

      return { success: true, data };
    } catch (error) {
      console.error("Error updating answer key:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const deleteAnswerKey = async (id) => {
    try {
      setLoading(true);
      setError(null);

      // Get the answer key first to know which image to update
      const { data: answerKey } = await supabase
        .from("answer_keys")
        .select("image_name")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("answer_keys")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      // Update document_images to mark it doesn't have an answer key
      if (answerKey) {
        await supabase
          .from("document_images")
          .update({ has_answer_key: false })
          .eq("image_name", answerKey.image_name);
      }

      await logAction("DELETE", "answer_key", id);

      return { success: true };
    } catch (error) {
      console.error("Error deleting answer key:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // USERS CRUD
  const getUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("users")
        .select(
          `
          *,
          sessions(count)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error("Error fetching users:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("users")
        .insert({
          ...userData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await logAction("CREATE", "user", data.id, { user_id: data.user_id });

      return { success: true, data };
    } catch (error) {
      console.error("Error creating user:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (id, updates) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("users")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await logAction("UPDATE", "user", id, updates);

      return { success: true, data };
    } catch (error) {
      console.error("Error updating user:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.from("users").delete().eq("id", id);

      if (error) throw error;

      await logAction("DELETE", "user", id);

      return { success: true };
    } catch (error) {
      console.error("Error deleting user:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // DASHBOARD STATS
  const getDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("admin_dashboard_stats")
        .select("*")
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // GET SESSIONS WITH ANNOTATIONS
  const getSessions = async (userId = null, examType = null) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("sessions")
        .select(
          `
          *,
          user:users(user_id),
          annotations(count)
        `
        )
        .order("created_at", { ascending: false });

      if (userId) {
        query = query.eq("user_id", userId);
      }

      if (examType) {
        query = query.eq("exam_type", examType);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error("Error fetching sessions:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const getSessionDetails = async (sessionId) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("sessions")
        .select(
          `
          *,
          user:users(user_id),
          annotations(*)
        `
        )
        .eq("id", sessionId)
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error("Error fetching session details:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    setError,
    // Document Images
    getDocumentImages,
    createDocumentImage,
    updateDocumentImage,
    deleteDocumentImage,
    // Answer Keys
    getAnswerKeys,
    createAnswerKey,
    updateAnswerKey,
    deleteAnswerKey,
    // Users
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    // Dashboard
    getDashboardStats,
    // Sessions
    getSessions,
    getSessionDetails,
  };
};
