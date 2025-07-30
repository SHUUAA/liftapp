
import React, { useState, useEffect } from "react";
import { EXAMS_DATA } from "../constants";
import ExamCard from "./ExamCard";
import UserScoresTab from "./UserScoresTab";
import {
  Exam,
  DashboardPageProps,
  ActiveExamSession,
  ExamCompletionInfo,
} from "../types";
import { supabase } from "../utils/supabase/client";

type DashboardTab = "TASKS" | "SCORES";

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
};

const ActiveExamBanner: React.FC<{
  session: ActiveExamSession;
  onResume: () => void;
}> = ({ session, onResume }) => {
  const [timeLeft, setTimeLeft] = useState(
    Math.max(0, Math.floor((session.sessionEndTime - Date.now()) / 1000))
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session.sessionEndTime]);

  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-md shadow-lg mb-8 flex items-center justify-between">
      <div>
        <h3 className="font-bold">Ongoing Exam: {session.exam.name}</h3>
        <p className="text-sm">
          You have an exam in progress. Resume to continue or wait for the timer
          to end.
        </p>
      </div>
      <div className="flex items-center space-x-4">
        <div className="text-center">
          <div className="font-mono text-xl font-semibold">
            {formatTime(timeLeft)}
          </div>
          <div className="text-xs text-yellow-700">Time Remaining</div>
        </div>
        <button
          onClick={onResume}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-yellow-100 transition-colors"
        >
          Resume Exam
        </button>
      </div>
    </div>
  );
};

const DashboardPage: React.FC<DashboardPageProps> = ({
  userId,
  annotatorDbId,
  onLogout,
  onSelectExam,
  activeSession,
  onResumeExam,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>("TASKS");
  const [completionStatus, setCompletionStatus] = useState<
    Map<string, ExamCompletionInfo>
  >(new Map());
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);

  useEffect(() => {
    if (!annotatorDbId) {
      setIsLoadingStatus(false);
      return;
    }

    const fetchCompletionStatus = async () => {
      setIsLoadingStatus(true);
      try {
        // Fetch raw completion data directly to ensure consistency
        const { data: completions, error: completionsError } = await supabase
          .from("user_exam_completions")
          .select(
            `
                exam_id,
                score_percentage,
                completed_at,
                exams (
                    exam_code
                )
            `
          )
          .eq("annotator_id", annotatorDbId)
          .in("status", ["submitted", "timed_out"])
          .order("completed_at", { ascending: false }); // Sort to get the latest attempts first

        if (completionsError) throw completionsError;

        // Process data to only show the LATEST score for each exam type
        const latestStatusMap = new Map<number, any>();
        (completions || []).forEach((completion) => {
          if (completion.completed_at && !latestStatusMap.has(completion.exam_id)) {
            latestStatusMap.set(completion.exam_id, completion);
          }
        });

        const newStatusMap = new Map<string, ExamCompletionInfo>();
        Array.from(latestStatusMap.values()).forEach((scoreRecord: any) => {
          const score =
            scoreRecord.score_percentage !== null
              ? parseFloat(scoreRecord.score_percentage.toFixed(1))
              : 0;

          if (scoreRecord.exams?.exam_code) {
            newStatusMap.set(scoreRecord.exams.exam_code, {
              isCompleted: score >= 90,
              score: score,
            });
          }
        });

        setCompletionStatus(newStatusMap);
      } catch (e: any) {
        console.error("Exception while fetching completion status:", e);
      } finally {
        setIsLoadingStatus(false);
      }
    };

    fetchCompletionStatus();
  }, [annotatorDbId]);

  const TasksIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-5 h-5 mr-2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2Z"
      />
    </svg>
  );

  const TrophyIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-5 h-5 mr-2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-4.5A3 3 0 0012 11.25a3 3 0 00-4.5 3V18.75m9 0H3.375c-.621 0-1.125-.504-1.125-1.125V11.25c0-1.92.776-3.67 2.063-4.938 1.286-1.267 3.036-2.062 4.937-2.062h3.3c1.901 0 3.651.795 4.937 2.062 1.287 1.268 2.063 3.017 2.063 4.938v6.375c0 .621-.504 1.125-1.125 1.125H16.5z"
      />
    </svg>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-10 h-10 text-blue-600 mr-3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <h1 className="text-2xl font-semibold text-slate-800">
                LiftApp Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span
                className="text-sm text-slate-600 hidden sm:block"
                aria-label={`Logged in as ${userId}`}
              >
                Welcome,{" "}
                <span className="font-medium text-slate-800">{userId}</span>
              </span>
              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 transition-colors"
                aria-label="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 sm:hidden text-center">
          <span className="text-md text-slate-700">
            Welcome,{" "}
            <span className="font-medium text-slate-900">{userId}</span>
          </span>
        </div>

        {activeTab === "TASKS" && activeSession && (
          <ActiveExamBanner session={activeSession} onResume={onResumeExam} />
        )}

        <div className="mb-8 border-b border-slate-300">
          <nav className="flex space-x-1 sm:space-x-2" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("TASKS")}
              className={`flex items-center px-3 py-3 sm:px-4 sm:py-3 font-medium text-sm rounded-t-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                ${
                  activeTab === "TASKS"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                }`}
              aria-current={activeTab === "TASKS" ? "page" : undefined}
            >
              <TasksIcon />
              Available Tasks
            </button>
            <button
              onClick={() => setActiveTab("SCORES")}
              className={`flex items-center px-3 py-3 sm:px-4 sm:py-3 font-medium text-sm rounded-t-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                ${
                  activeTab === "SCORES"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                }`}
              aria-current={activeTab === "SCORES" ? "page" : undefined}
            >
              <TrophyIcon />
              My Scores
            </button>
          </nav>
        </div>

        {activeTab === "TASKS" && (
          <div>
            <h2 className="text-2xl font-semibold text-slate-700 mb-6">
              Available Annotation Exams
            </h2>
            {isLoadingStatus ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="ml-4 text-slate-600">Loading exam statuses...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {EXAMS_DATA.map((exam: Exam) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    onSelectExam={onSelectExam}
                    completionInfo={completionStatus.get(exam.id)}
                    activeSession={activeSession}
                    onResumeExam={onResumeExam}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "SCORES" && (
          <div>
            <h2 className="text-2xl font-semibold text-slate-700 mb-6">
              My Exam Scores
            </h2>
            <UserScoresTab annotatorDbId={annotatorDbId} />
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-sm text-slate-500 border-t border-slate-200 mt-12">
        &copy; {new Date().getFullYear()} LiftApp Annotation Platform. All
        rights reserved.
      </footer>
    </div>
  );
};

export default DashboardPage;
