import React, { useState, useCallback, useEffect } from "react";
import LoginPage from "./components/LoginPage";
import DashboardPage from "./components/DashboardPage";
import ExamPage from "./components/ExamPage";
import AdminLoginPage from "./components/admin/AdminLoginPage";
import AdminDashboardPage from "./components/admin/AdminDashboardPage";
import { AppScreen, Exam, AdminCredentials, DashboardPageProps } from "./types";
import { supabase } from "./utils/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { checkIfExamCompleted } from "./utils/localStorageUtils"; // Import completion check

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("USER_LOGIN");
  const [userId, setUserId] = useState<string | null>(null); // This is the liftapp_user_id (string)
  const [currentAnnotatorDbId, setCurrentAnnotatorDbId] = useState<
    number | null
  >(null); // This is the annotators.id (integer PK)
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [loadingAdminSession, setLoadingAdminSession] = useState<boolean>(true);

  const safePushState = (
    data: any,
    title: string,
    url?: string | URL | null
  ) => {
    if (window.location.protocol !== "blob:") {
      window.history.pushState(data, title, url);
    }
  };

  const safeReplaceState = (
    data: any,
    title: string,
    url?: string | URL | null
  ) => {
    if (window.location.protocol !== "blob:") {
      window.history.replaceState(data, title, url);
    }
  };

  useEffect(() => {
    const initializeSessionAndPath = async () => {
      setLoadingAdminSession(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const newAdminUser = session?.user ?? null;
      setAdminUser(newAdminUser);

      const path = window.location.pathname.toLowerCase();

      if (newAdminUser) {
        // Admin is logged in
        if (path.startsWith("/admin")) {
          setCurrentScreen("ADMIN_DASHBOARD");
          safeReplaceState({}, "", "/admin/dashboard"); // Ensure URL reflects state
        } else {
          // Admin is logged in but on a user path
          // If user session also exists, prioritize user path. Otherwise, could redirect to admin or user login.
          if (userId && currentAnnotatorDbId) {
            setCurrentScreen(selectedExam ? "USER_EXAM" : "USER_DASHBOARD");
            // URL is already user path, no change needed unless specific logic applies
          } else {
            setCurrentScreen("USER_LOGIN"); // Or redirect to /admin/dashboard
            safeReplaceState({}, "", "/login");
          }
        }
      } else {
        // Admin is NOT logged in
        if (path.startsWith("/admin")) {
          setCurrentScreen("ADMIN_LOGIN");
          safeReplaceState({}, "", "/admin/login"); // Ensure URL reflects state
        } else {
          // Admin not logged in, on a user path
          if (userId && currentAnnotatorDbId) {
            // Check if user login process completed
            if (selectedExam && path.startsWith(`/exam/${selectedExam.id}`)) {
              setCurrentScreen("USER_EXAM");
            } else if (path.startsWith("/dashboard")) {
              setCurrentScreen("USER_DASHBOARD");
            } else {
              // User logged in but path is something else (e.g. /login or /)
              setCurrentScreen("USER_DASHBOARD"); // Default to user dashboard
              safeReplaceState({}, "", "/dashboard");
            }
          } else {
            // No user session, default to user login
            setCurrentScreen("USER_LOGIN");
            if (
              path !== "/" &&
              path !== "/login" &&
              !path.startsWith("/admin")
            ) {
              safeReplaceState({}, "", "/login");
            }
          }
        }
      }
      setLoadingAdminSession(false);
    };

    initializeSessionAndPath();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const newAdminUser = session?.user ?? null;
        setAdminUser(newAdminUser);

        // Only adjust screen if it's relevant to admin state
        if (!newAdminUser && currentScreen === "ADMIN_DASHBOARD") {
          setCurrentScreen("ADMIN_LOGIN");
          safeReplaceState({}, "", "/admin/login");
        } else if (newAdminUser && currentScreen === "ADMIN_LOGIN") {
          setCurrentScreen("ADMIN_DASHBOARD");
          safeReplaceState({}, "", "/admin/dashboard");
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []); // Run once on mount to initialize

  useEffect(() => {
    const handlePopState = () => {
      // Re-evaluate screen based on path and current auth states
      const path = window.location.pathname.toLowerCase();
      setLoadingAdminSession(true); // Indicate potential re-evaluation
      if (path.startsWith("/admin")) {
        setCurrentScreen(adminUser ? "ADMIN_DASHBOARD" : "ADMIN_LOGIN");
      } else {
        if (!userId || !currentAnnotatorDbId) {
          setCurrentScreen("USER_LOGIN");
          setSelectedExam(null); // Clear selected exam if user logs out or session lost
        } else if (path.startsWith("/exam/")) {
          const examIdFromPath = path.split("/exam/")[1];
          if (selectedExam && selectedExam.id === examIdFromPath) {
            setCurrentScreen("USER_EXAM");
          } else {
            // If selectedExam is stale or doesn't match, go to dashboard
            setSelectedExam(null);
            setCurrentScreen("USER_DASHBOARD");
            safeReplaceState({}, "", "/dashboard");
          }
        } else if (path.startsWith("/dashboard")) {
          setCurrentScreen("USER_DASHBOARD");
          setSelectedExam(null); // Clear exam when navigating to dashboard
        } else {
          // Default to user login if path is unrecognized for logged-in user
          setCurrentScreen("USER_LOGIN");
          setUserId(null);
          setCurrentAnnotatorDbId(null);
          setSelectedExam(null);
        }
      }
      setLoadingAdminSession(false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [adminUser, userId, selectedExam, currentAnnotatorDbId]); // Dependencies for popstate logic

  const getOrCreateAnnotatorInDb = async (
    liftappUserId: string
  ): Promise<number | null> => {
    try {
      let { data: existingAnnotator, error: selectError } = await supabase
        .from("annotators")
        .select("id")
        .eq("liftapp_user_id", liftappUserId)
        .single();

      if (selectError && selectError.code !== "PGRST116") {
        console.error("Error fetching annotator:", selectError);
        throw selectError;
      }

      if (existingAnnotator) {
        return existingAnnotator.id;
      } else {
        const { data: newAnnotator, error: insertError } = await supabase
          .from("annotators")
          .insert({ liftapp_user_id: liftappUserId })
          .select("id")
          .single();

        if (insertError) {
          console.error(
            "Error creating annotator (raw Supabase error):",
            insertError
          );
          throw insertError;
        }
        return newAnnotator ? newAnnotator.id : null;
      }
    } catch (caughtError: any) {
      console.error(
        "Full error object in getOrCreateAnnotatorInDb:",
        caughtError
      );
      let displayMessage =
        "An unexpected error occurred during annotator initialization.";

      if (
        typeof caughtError === "object" &&
        caughtError !== null &&
        caughtError.message
      ) {
        displayMessage = caughtError.message;
        if (caughtError.details)
          displayMessage += ` Details: ${caughtError.details}`;
        if (caughtError.hint) displayMessage += ` Hint: ${caughtError.hint}`;
      } else if (typeof caughtError === "string") {
        displayMessage = caughtError;
      } else if (caughtError instanceof Error) {
        displayMessage = caughtError.message;
      }

      alert(
        `Failed to initialize annotator: ${displayMessage}\n\nHint: Check RLS policies on 'annotators' table. 'anon' role needs SELECT and INSERT permissions.`
      );
      return null;
    }
  };

  const handleLogin = useCallback(async (id: string) => {
    if (id.trim() !== "") {
      const dbId = await getOrCreateAnnotatorInDb(id.trim());
      if (dbId) {
        setUserId(id.trim());
        setCurrentAnnotatorDbId(dbId);
        setCurrentScreen("USER_DASHBOARD");
        safePushState({}, "", "/dashboard");
      } else {
        console.error(
          "Could not obtain database ID for annotator. User was alerted."
        );
      }
    }
  }, []);

  const handleLogout = useCallback(() => {
    setUserId(null);
    setCurrentAnnotatorDbId(null);
    setSelectedExam(null);
    setCurrentScreen("USER_LOGIN");
    safePushState({}, "", "/login");
  }, []);

  const handleSelectExam = useCallback(
    (exam: Exam) => {
      if (
        currentAnnotatorDbId &&
        checkIfExamCompleted(currentAnnotatorDbId, exam.id)
      ) {
        alert(
          `You have already completed and submitted the ${exam.name} exam. You cannot re-access it.`
        );
        return;
      }
      setSelectedExam(exam);
      setCurrentScreen("USER_EXAM");
      safePushState({}, "", `/exam/${exam.id}`);
    },
    [currentAnnotatorDbId]
  ); // Added currentAnnotatorDbId as dependency

  const handleBackToDashboard = useCallback(() => {
    setSelectedExam(null);
    setCurrentScreen("USER_DASHBOARD");
    safePushState({}, "", "/dashboard");
  }, []);

  const handleAdminLogin = useCallback(
    async ({ email, password }: AdminCredentials) => {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          throw error;
        }
        // onAuthStateChange will handle setting currentScreen to ADMIN_DASHBOARD & URL
      } catch (error: any) {
        alert(`Admin Login Failed: ${error.message || "Unknown error"}`);
        console.error("Admin login error:", error);
      }
    },
    []
  );

  const handleAdminLogout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      // onAuthStateChange will handle setting currentScreen to ADMIN_LOGIN & URL
      // safePushState({}, '', '/admin/login'); // Let onAuthStateChange handle URL for consistency
    } catch (error: any) {
      alert(`Admin Logout Failed: ${error.message || "Unknown error"}`);
      console.error("Admin logout error:", error);
    }
  }, []);

  if (loadingAdminSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-xl text-slate-700">Loading Application...</p>
      </div>
    );
  }

  // Admin Routes
  if (currentScreen === "ADMIN_LOGIN") {
    return <AdminLoginPage onAdminLogin={handleAdminLogin} isLoading={false} />;
  }
  if (currentScreen === "ADMIN_DASHBOARD") {
    if (adminUser) {
      // Guard: only render if adminUser is confirmed
      return (
        <AdminDashboardPage
          adminId={adminUser.email || adminUser.id}
          onAdminLogout={handleAdminLogout}
        />
      );
    } else {
      // If adminUser is null, onAuthStateChange should have changed screen.
      // Fallback to AdminLogin if somehow this state is reached.
      return (
        <AdminLoginPage onAdminLogin={handleAdminLogin} isLoading={false} />
      );
    }
  }

  // User Routes
  if (!userId || !currentAnnotatorDbId) {
    // If user session info is missing, force login
    if (currentScreen !== "USER_LOGIN") setCurrentScreen("USER_LOGIN"); // Correct state if needed
    return <LoginPage onLogin={handleLogin} />;
  }
  if (currentScreen === "USER_DASHBOARD") {
    // Ensure currentAnnotatorDbId is passed. userId is already passed.
    const dashboardProps: DashboardPageProps = {
      userId,
      annotatorDbId: currentAnnotatorDbId,
      onLogout: handleLogout,
      onSelectExam: handleSelectExam,
    };
    return <DashboardPage {...dashboardProps} />;
  }
  if (currentScreen === "USER_EXAM" && selectedExam && currentAnnotatorDbId) {
    return (
      <ExamPage
        userId={userId}
        exam={selectedExam}
        annotatorDbId={currentAnnotatorDbId}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  // Default fallback if no other screen matches
  return <LoginPage onLogin={handleLogin} />;
};

export default App;
