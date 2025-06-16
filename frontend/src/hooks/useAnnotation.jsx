// Create this file: src/hooks/useAnnotation.js
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";

export const useAnnotation = (imageName) => {
  const [user, setUser] = useState(null);
  const [annotationId, setAnnotationId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [recordData, setRecordData] = useState({
    image: imageName,
    langua: "",
    event_d: "",
    event: "",
    event_y: "",
    given: "",
    surname: "",
    sex: "",
    age: "",
    death_d: "",
    death_m: "",
    death_y: "",
    fa_given: "",
    fa_surname: "",
    mo_given: "",
    mo_surname: "",
    sp_given: "",
    sp_surname: "",
  });
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const sessionStartTime = useRef(Date.now());

  const calculateCompletionPercentage = useCallback(() => {
    const fields = Object.values(recordData);
    const filledFields = fields.filter(
      (field) => field && field.toString().trim() !== ""
    ).length;
    return Math.round((filledFields / fields.length) * 100);
  }, [recordData]);

  const saveAnnotation = async (isSubmission = false) => {
    if (!annotationId || !user) return false;

    setSaving(true);
    try {
      const completionPercentage = calculateCompletionPercentage();
      const timeSpent = Math.floor(
        (Date.now() - sessionStartTime.current) / 1000
      );

      const updateData = {
        ...recordData,
        completion_percentage: completionPercentage,
        time_spent_seconds: timeSpent,
        status: isSubmission ? "completed" : "in_progress",
        updated_at: new Date().toISOString(),
        ...(isSubmission && { submitted_at: new Date().toISOString() }),
      };

      const { error } = await supabase
        .from("annotations")
        .update(updateData)
        .eq("id", annotationId);

      if (error) {
        console.error("Error saving annotation:", error);
        return false;
      }

      setLastSaved(new Date());
      return true;
    } catch (error) {
      console.error("Error saving annotation:", error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const initializeAnnotation = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) return null;

      setUser(user);
      const userId = user.user_metadata?.user_id || "unknown";

      // Check for existing annotation
      const { data: existingAnnotation, error: fetchError } = await supabase
        .from("annotations")
        .select("*")
        .eq("auth_user_id", user.id)
        .eq("image_name", imageName)
        .single();

      if (existingAnnotation && !fetchError) {
        setAnnotationId(existingAnnotation.id);
        // Load existing data
        const loadedData = {
          image: existingAnnotation.image_name,
          langua: existingAnnotation.langua || "",
          event_d: existingAnnotation.event_d || "",
          event: existingAnnotation.event || "",
          event_y: existingAnnotation.event_y || "",
          given: existingAnnotation.given || "",
          surname: existingAnnotation.surname || "",
          sex: existingAnnotation.sex || "",
          age: existingAnnotation.age || "",
          death_d: existingAnnotation.death_d || "",
          death_m: existingAnnotation.death_m || "",
          death_y: existingAnnotation.death_y || "",
          fa_given: existingAnnotation.fa_given || "",
          fa_surname: existingAnnotation.fa_surname || "",
          mo_given: existingAnnotation.mo_given || "",
          mo_surname: existingAnnotation.mo_surname || "",
          sp_given: existingAnnotation.sp_given || "",
          sp_surname: existingAnnotation.sp_surname || "",
        };
        setRecordData(loadedData);
      } else {
        // Create new annotation
        const { data: newAnnotation, error: createError } = await supabase
          .from("annotations")
          .insert([
            {
              user_id: userId,
              auth_user_id: user.id,
              image_name: imageName,
              status: "in_progress",
            },
          ])
          .select()
          .single();

        if (!createError) {
          setAnnotationId(newAnnotation.id);
        }
      }

      return user;
    } catch (error) {
      console.error("Error initializing annotation:", error);
      return null;
    }
  };

  const updateField = (field, value) => {
    setRecordData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const submitAnnotation = async () => {
    return await saveAnnotation(true);
  };

  return {
    user,
    recordData,
    saving,
    lastSaved,
    completionPercentage: calculateCompletionPercentage(),
    initializeAnnotation,
    saveAnnotation,
    submitAnnotation,
    updateField,
    setRecordData,
  };
};
