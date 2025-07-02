
import React, { useState, useCallback, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';
import ExamPage from './components/ExamPage';
import AdminLoginPage from './components/admin/AdminLoginPage';
import AdminDashboardPage from './components/admin/AdminDashboardPage';
import { AppScreen, Exam, AdminCredentials, ImageTask, ActiveExamSession } from './types';
import { supabase } from './utils/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import { formatSupabaseError } from './utils/errorUtils';
import { ToastProvider, useToast } from './contexts/ToastContext';
import ToastContainer from './components/common/ToastContainer';
import { EXAM_DURATION_SECONDS, EXAMS_DATA } from './constants';

const AppContent: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('USER_LOGIN');
  const [userId, setUserId] = useState<string | null>(null);
  const [currentAnnotatorDbId, setCurrentAnnotatorDbId] = useState<number | null>(null);
  
  const [activeExamSession, setActiveExamSession] = useState<ActiveExamSession | null>(null);
  
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { addToast } = useToast();

  const isHistoryManipulationAllowed = window.location.protocol !== 'blob:';

  const safePushState = (data: any, url: string) => {
    if (isHistoryManipulationAllowed && window.location.pathname !== url) {
      window.history.pushState(data, '', url);
    }
  };

  const safeReplaceState = (data: any, url: string) => {
    if (isHistoryManipulationAllowed && window.location.pathname !== url) {
      window.history.replaceState(data, '', url);
    }
  };
  
  // Effect to load user and session from sessionStorage on initial mount
  useEffect(() => {
    try {
      const savedUserId = sessionStorage.getItem('userId');
      const savedAnnotatorDbId = sessionStorage.getItem('annotatorDbId');
      if (savedUserId && savedAnnotatorDbId) {
        setUserId(savedUserId);
        setCurrentAnnotatorDbId(parseInt(savedAnnotatorDbId, 10));
      }

      const savedSessionJSON = sessionStorage.getItem('activeExamSession');
      if (savedSessionJSON) {
        const session: ActiveExamSession = JSON.parse(savedSessionJSON);
        if (session.sessionEndTime > Date.now()) {
          setActiveExamSession(session);
        } else {
          // Clean up expired session
          sessionStorage.removeItem('activeExamSession');
        }
      }
    } catch (e) {
      console.error("Error loading state from sessionStorage", e);
      sessionStorage.clear(); // Clear potentially corrupted storage
    }
  }, []);

  // Effect to sync activeExamSession to sessionStorage
  useEffect(() => {
    try {
      if (activeExamSession) {
        sessionStorage.setItem('activeExamSession', JSON.stringify(activeExamSession));
      } else {
        sessionStorage.removeItem('activeExamSession');
      }
    } catch (e) {
      console.error("Error saving session to sessionStorage", e);
    }
  }, [activeExamSession]);


  // Unified routing logic
  const handleRouteChange = useCallback(async () => {
    setLoading(true);
    const path = window.location.pathname.toLowerCase();
    
    // Ensure exams have their DB IDs for routing
    if (EXAMS_DATA.some(e => !e.dbId)) {
        const { data: examsFromDb, error } = await supabase.from('exams').select('id, exam_code');
        if (error) {
            addToast({ type: 'error', message: 'Could not load initial exam configuration.' });
        } else {
            examsFromDb.forEach(dbExam => {
                const exam = EXAMS_DATA.find(e => e.id === dbExam.exam_code);
                if (exam) exam.dbId = dbExam.id;
            });
        }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentAdminUser = session?.user ?? null;
      setAdminUser(currentAdminUser);

      const isLoggedInUser = userId && currentAnnotatorDbId;

      if (path.startsWith('/admin')) {
        setCurrentScreen(currentAdminUser ? 'ADMIN_DASHBOARD' : 'ADMIN_LOGIN');
      } else if (isLoggedInUser) {
        const examCodeFromUrl = path.startsWith('/exam/') ? path.split('/')[2] : null;
        if (examCodeFromUrl && activeExamSession && activeExamSession.exam.id === examCodeFromUrl) {
           setCurrentScreen('USER_EXAM');
        } else if (examCodeFromUrl && !activeExamSession) {
           // Handle refresh on an exam page
           const examToResume = EXAMS_DATA.find(e => e.id === examCodeFromUrl);
           if (examToResume && examToResume.dbId) {
                // Silently re-select the exam to re-fetch the task, but don't push state
                handleSelectExam(examToResume, false);
           } else {
                setCurrentScreen('USER_DASHBOARD');
                safeReplaceState({}, '/dashboard');
           }
        } else {
          setCurrentScreen('USER_DASHBOARD');
          if (!path.startsWith('/dashboard')) {
            safeReplaceState({}, '/dashboard');
          }
        }
      } else {
        setCurrentScreen('USER_LOGIN');
        if (path !== '/login' && path !== '/') {
            safeReplaceState({}, '/login');
        }
      }
      setLoading(false);
    });
  }, [userId, currentAnnotatorDbId, activeExamSession]);


  // Separating the popstate listener setup from the initial routing call to prevent bugs.
  // This effect sets up the listener for the browser's back and forward buttons.
  useEffect(() => {
    // The listener is updated whenever handleRouteChange changes, ensuring it never has a stale closure.
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [handleRouteChange]);

  // This effect handles the initial routing when the application first loads.
  useEffect(() => {
    handleRouteChange();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 
  
  // Listen to Supabase auth changes for admin
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        const newAdminUser = session?.user ?? null;
        const oldAdminUser = adminUser;
        setAdminUser(newAdminUser);

        if (newAdminUser && !oldAdminUser) { // Admin logs in
          setCurrentScreen('ADMIN_DASHBOARD');
          safePushState({}, '/admin/dashboard');
        } else if (!newAdminUser && oldAdminUser) { // Admin logs out
          setCurrentScreen('ADMIN_LOGIN');
          safeReplaceState({}, '/admin/login');
        }
    });

    return () => authListener.subscription.unsubscribe();
  }, [adminUser]);

  const getOrCreateAnnotatorInDb = async (liftappUserId: string): Promise<number | null> => {
    try {
      let { data: existingAnnotator, error: selectError } = await supabase
        .from('annotators')
        .select('id')
        .eq('liftapp_user_id', liftappUserId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') throw selectError;

      if (existingAnnotator) {
        return existingAnnotator.id;
      } else {
        const { data: newAnnotator, error: insertError } = await supabase
          .from('annotators')
          .insert({ liftapp_user_id: liftappUserId })
          .select('id')
          .single();
        if (insertError) throw insertError;
        return newAnnotator ? newAnnotator.id : null;
      }
    } catch (caughtError: any) {
      const formattedError = formatSupabaseError(caughtError);
      addToast({ type: 'error', message: `Failed to initialize annotator: ${formattedError.message}`, duration: 8000 });
      return null;
    }
  };

  const handleLogin = useCallback(async (id: string) => {
    if (id.trim() !== '') {
      const dbId = await getOrCreateAnnotatorInDb(id.trim());
      if (dbId) {
        setUserId(id.trim());
        setCurrentAnnotatorDbId(dbId);
        sessionStorage.setItem('userId', id.trim());
        sessionStorage.setItem('annotatorDbId', dbId.toString());
        setCurrentScreen('USER_DASHBOARD');
        safePushState({}, '/dashboard');
      }
    }
  }, [getOrCreateAnnotatorInDb, isHistoryManipulationAllowed]);

  const handleLogout = useCallback(() => {
    setUserId(null);
    setCurrentAnnotatorDbId(null);
    setActiveExamSession(null);
    sessionStorage.clear();
    setCurrentScreen('USER_LOGIN');
    safeReplaceState({}, '/login');
  }, [isHistoryManipulationAllowed]);

  const handleAdminLogin = useCallback(async ({ email, password }: AdminCredentials) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        const formattedError = formatSupabaseError(error);
        addToast({ type: 'error', message: `Admin login failed: ${formattedError.message}` });
    }
    // Auth state change listener will handle the screen update
    setLoading(false);
  }, [addToast]);

  const handleAdminLogout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        const formattedError = formatSupabaseError(error);
        addToast({ type: 'error', message: `Admin logout failed: ${formattedError.message}` });
    }
     // Auth state change listener will handle the screen update
  }, [addToast]);
  
  const handleSelectExam = useCallback(async (exam: Exam, shouldPushState = true) => {
    if (!currentAnnotatorDbId || !userId) {
        addToast({ type: 'error', message: "User session is invalid. Cannot start exam." });
        return;
    }
    if (!exam.dbId) {
        addToast({ type: 'error', message: `Exam configuration for '${exam.name}' is missing.` });
        return;
    }

    try {
        const { data, error } = await supabase.rpc('start_exam_and_assign_image', {
            p_annotator_id: currentAnnotatorDbId,
            p_exam_id: exam.dbId,
        });

        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Could not retrieve an assigned image from the server.");

        const assignedTask: ImageTask = {
            dbImageId: data[0].db_image_id,
            storage_path: data[0].storage_path,
            original_filename: data[0].original_filename,
            exam_id: data[0].exam_id,
        };
        
        const session: ActiveExamSession = {
            exam,
            assignedTask,
            sessionEndTime: Date.now() + EXAM_DURATION_SECONDS * 1000,
            annotatorDbId: currentAnnotatorDbId,
            userId: userId,
        };

        setActiveExamSession(session);
        setCurrentScreen('USER_EXAM');
        if (shouldPushState) {
            safePushState({ examId: exam.id }, `/exam/${exam.id}`);
        }

    } catch (e: any) {
        const formattedError = formatSupabaseError(e);
        addToast({ type: 'error', message: `Error starting exam session: ${formattedError.message}` });
    }
  }, [currentAnnotatorDbId, userId, addToast, isHistoryManipulationAllowed]);
  
  const handleResumeExam = useCallback(() => {
    if (activeExamSession) {
      setCurrentScreen('USER_EXAM');
      safePushState({ examId: activeExamSession.exam.id }, `/exam/${activeExamSession.exam.id}`);
    }
  }, [activeExamSession, isHistoryManipulationAllowed]);

  const handleExamFinish = useCallback(() => {
    setActiveExamSession(null);
    setCurrentScreen('USER_DASHBOARD');
    safeReplaceState({}, '/dashboard');
  }, [isHistoryManipulationAllowed]);

  const handleBackToDashboard = useCallback(() => {
    setCurrentScreen('USER_DASHBOARD');
    safePushState({}, '/dashboard');
  }, [isHistoryManipulationAllowed]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-800">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white"></div>
        </div>
      );
    }

    switch (currentScreen) {
      case 'USER_LOGIN':
        return <LoginPage onLogin={handleLogin} />;
      case 'USER_DASHBOARD':
        return userId && currentAnnotatorDbId ? (
          <DashboardPage
            userId={userId}
            annotatorDbId={currentAnnotatorDbId}
            onLogout={handleLogout}
            onSelectExam={handleSelectExam}
            activeSession={activeExamSession}
            onResumeExam={handleResumeExam}
          />
        ) : null;
      case 'USER_EXAM':
        return activeExamSession ? (
          <ExamPage 
            activeSession={activeExamSession}
            onBackToDashboard={handleBackToDashboard}
            onExamFinish={handleExamFinish}
          />
        ) : null;
      case 'ADMIN_LOGIN':
        return <AdminLoginPage onAdminLogin={handleAdminLogin} isLoading={loading} />;
      case 'ADMIN_DASHBOARD':
        return adminUser ? (
          <AdminDashboardPage adminId={adminUser.id} onAdminLogout={handleAdminLogout} />
        ) : null;
      default:
        return <LoginPage onLogin={handleLogin} />;
    }
  };

  return (
    <div className="min-h-screen">
      {renderContent()}
      <ToastContainer />
    </div>
  );
};

const App: React.FC = () => (
  <ToastProvider>
    <AppContent />
  </ToastProvider>
);

export default App;
