import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  AnswerKeyEntry,
  Exam,
  AdminProfile,
  AdminTab,
  FetchedAnswerKeySummary,
  AnnotatorInfo,
  AnalyticsData,
  UserExamScoreMetrics,
  AdminDashboardPageProps,
} from "../../types";
import { EXAMS_DATA } from "../../constants";
import AnswerKeyForm from "./AnswerKeyForm";
import { supabase } from "../../utils/supabase/client";
import { useToast } from "../../contexts/ToastContext";
import Modal from "../common/Modal";
import { formatSupabaseError } from "../../utils/errorUtils";

const STORAGE_BUCKET_NAME = "exam-images";

const formatDurationForAdmin = (totalSeconds?: number): string => {
  if (totalSeconds === undefined || totalSeconds === null || totalSeconds < 0) {
    return "N/A";
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

// Helper function to convert array of objects to CSV string
const convertToCSV = (
  data: AnnotatorInfo[],
  columnsToInclude: {
    key: keyof AnnotatorInfo | string;
    header: string;
    isExamSpecific?: boolean;
    examCode?: string;
    metricKey?: keyof UserExamScoreMetrics | "duration_seconds";
  }[]
) => {
  if (!data || data.length === 0) {
    return "";
  }
  const headers = columnsToInclude.map((col) => col.header).join(",");
  const rows = data.map((row) => {
    return columnsToInclude
      .map((col) => {
        let value: any;
        if (col.isExamSpecific && col.examCode && col.metricKey) {
          if (col.metricKey === "duration_seconds") {
            value = row.per_exam_scores?.[col.examCode]?.duration_seconds;
            if (typeof value === "number") {
              // Format as "Xm Ys" for CSV readability, or keep as raw seconds
              const minutes = Math.floor(value / 60);
              const seconds = value % 60;
              value = `${minutes}m ${seconds}s`;
            } else {
              value = "N/A";
            }
          } else {
            value =
              row.per_exam_scores?.[col.examCode]?.[
                col.metricKey as keyof UserExamScoreMetrics
              ];
          }
        } else {
          value = row[col.key as keyof AnnotatorInfo];
        }

        if (value === null || value === undefined) {
          value = "";
        } else if (
          typeof value === "number" &&
          (col.key === "overall_score_percentage" ||
            (col.metricKey === "score_percentage" && col.isExamSpecific))
        ) {
          value = `${value.toFixed(1)}%`;
        } else {
          value = String(value);
        }

        if (
          value.includes(",") ||
          value.includes('"') ||
          value.includes("\n")
        ) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(",");
  });
  return `${headers}\n${rows.join("\n")}`;
};

// Standalone TabButton component to prevent re-creation on every render
interface TabButtonProps {
  label: string;
  tabName: AdminTab;
  activeTab: AdminTab;
  onClick: (tabName: AdminTab) => void;
}

const TabButton: React.FC<TabButtonProps> = ({
  label,
  tabName,
  activeTab,
  onClick,
}) => (
  <button
    onClick={() => onClick(tabName)}
    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-slate-800
        ${
          activeTab === tabName
            ? "bg-red-500 text-white shadow"
            : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white"
        }`}
  >
    {label}
  </button>
);

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  adminId,
  onAdminLogout,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>("ANNOTATORS");
  const { addToast } = useToast();

  const [fetchedAnswerKeys, setFetchedAnswerKeys] = useState<
    FetchedAnswerKeySummary[]
  >([]);
  const [isLoadingAnswerKeys, setIsLoadingAnswerKeys] =
    useState<boolean>(false);
  const [showAnswerKeyForm, setShowAnswerKeyForm] = useState<boolean>(false);
  const [editingAnswerKey, setEditingAnswerKey] =
    useState<AnswerKeyEntry | null>(null);
  const [activeAnswerKeyExamCode, setActiveAnswerKeyExamCode] =
    useState<string>(EXAMS_DATA.length > 0 ? EXAMS_DATA[0].id : "");

  const [allAnnotators, setAllAnnotators] = useState<AnnotatorInfo[]>([]);
  const [isLoadingAnnotators, setIsLoadingAnnotators] =
    useState<boolean>(false);
  const [annotatorSearchTerm, setAnnotatorSearchTerm] = useState<string>("");

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(false);

  const [currentAdminProfile, setCurrentAdminProfile] =
    useState<AdminProfile | null>(null);

  // State for Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: "",
    body: <></>,
    onConfirm: () => {},
    confirmText: "Confirm",
  });

  useEffect(() => {
    const fetchAdminProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentAdminProfile({
          id: user.id,
          email: user.email || "",
          role: "admin",
        });
      } else {
        console.error("Admin user not found in Supabase Auth session.");
      }
    };
    fetchAdminProfile();
  }, []);

  const fetchAnswerKeySummaries = useCallback(async () => {
    setIsLoadingAnswerKeys(true);
    try {
      const { data, error } = await supabase.rpc("get_answer_key_summaries");

      if (error) {
        console.error("Error fetching answer key summaries:", error);
        addToast({
          type: "error",
          message: `Failed to load answer keys: ${error.message}`,
        });
        setFetchedAnswerKeys([]);
        return;
      }

      const summariesWithUrls = data.map((summary: any) => {
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET_NAME)
          .getPublicUrl(summary.storage_path);
        return {
          dbImageId: summary.db_image_id,
          storagePath: summary.storage_path,
          originalFilename: summary.original_filename,
          dbExamId: summary.db_exam_id,
          examCode: summary.exam_code,
          examName: summary.exam_name,
          answerRowCount: summary.answer_row_count,
          imageUrl: urlData.publicUrl,
        } as FetchedAnswerKeySummary;
      });
      setFetchedAnswerKeys(summariesWithUrls || []);
    } catch (e: any) {
      console.error("Exception fetching answer keys:", e);
      addToast({
        type: "error",
        message: `An unexpected error occurred: ${e.message}`,
      });
      setFetchedAnswerKeys([]);
    } finally {
      setIsLoadingAnswerKeys(false);
    }
  }, [addToast]);

  const fetchAnnotators = useCallback(async () => {
    setIsLoadingAnnotators(true);
    try {
      // Fetch all necessary data in parallel for efficiency
      const [annotatorsResponse, completionsResponse, examsResponse] =
        await Promise.all([
          supabase.from("annotators").select("id, liftapp_user_id, created_at"),
          supabase
            .from("user_exam_completions")
            .select(
              "annotator_id, exam_id, duration_seconds, retake_count, total_effective_keystrokes, total_answer_key_keystrokes"
            )
            .in("status", ["submitted", "timed_out"]),
          supabase.from("exams").select("id, exam_code"),
        ]);

      // De-structure and handle potential errors
      const { data: annotatorsData, error: annotatorsError } =
        annotatorsResponse;
      const { data: completionsData, error: completionsError } =
        completionsResponse;
      const { data: examsData, error: examsError } = examsResponse;

      if (annotatorsError) throw annotatorsError;
      if (completionsError) throw completionsError;
      if (examsError) throw examsError;

      // Create a mapping from database exam ID to the exam's code (e.g., 'baptism')
      const examIdToCodeMap = new Map<number, string>();
      (examsData || []).forEach((exam) =>
        examIdToCodeMap.set(exam.id, exam.exam_code)
      );

      // Process and aggregate the data on the client-side to ensure consistency
      const annotatorsWithScores = (annotatorsData || []).map((annotator) => {
        const completionsForAnnotator = (completionsData || []).filter(
          (c) => c.annotator_id === annotator.id
        );

        // Calculate overall statistics by summing up all of the user's completions
        const total_effective_user_keystrokes_overall =
          completionsForAnnotator.reduce(
            (sum, c) => sum + (c.total_effective_keystrokes || 0),
            0
          );
        const total_answer_key_keystrokes_overall =
          completionsForAnnotator.reduce(
            (sum, c) => sum + (c.total_answer_key_keystrokes || 0),
            0
          );
        const total_retakes_overall = completionsForAnnotator.reduce(
          (sum, c) => sum + (c.retake_count || 0),
          0
        );

        // Process scores for each individual exam
        const per_exam_scores: Record<string, UserExamScoreMetrics> = {};
        completionsForAnnotator.forEach((comp) => {
          const examCode = examIdToCodeMap.get(comp.exam_id);
          if (examCode) {
            const effective = comp.total_effective_keystrokes || 0;
            const total = comp.total_answer_key_keystrokes || 0;
            per_exam_scores[examCode] = {
              images_attempted: 1, // One completion record per exam
              retakes: comp.retake_count || 0,
              total_effective_user_keystrokes: effective,
              total_answer_key_keystrokes: total,
              duration_seconds: comp.duration_seconds ?? undefined,
              score_percentage:
                total > 0
                  ? parseFloat(((effective / total) * 100).toFixed(1))
                  : 0,
            };
          }
        });

        return {
          id: annotator.id,
          liftapp_user_id: annotator.liftapp_user_id,
          created_at: new Date(annotator.created_at).toLocaleDateString(),
          total_images_attempted_overall: completionsForAnnotator.length,
          total_effective_user_keystrokes_overall,
          total_answer_key_keystrokes_overall,
          total_retakes_overall,
          overall_score_percentage:
            total_answer_key_keystrokes_overall > 0
              ? parseFloat(
                  (
                    (total_effective_user_keystrokes_overall /
                      total_answer_key_keystrokes_overall) *
                    100
                  ).toFixed(1)
                )
              : 0,
          per_exam_scores,
        };
      });

      setAllAnnotators(annotatorsWithScores);
    } catch (e: any) {
      console.error("Exception fetching annotators:", e);
      const formattedError = formatSupabaseError(e);
      addToast({
        type: "error",
        message: `Failed to load annotator data: ${formattedError.message}`,
      });
      setAllAnnotators([]);
    } finally {
      setIsLoadingAnnotators(false);
    }
  }, [addToast]);

  const fetchAnalyticsData = useCallback(async () => {
    setIsLoadingAnalytics(true);
    try {
      const [
        annotatorsCountResponse,
        examsCountResponse,
        imagesCountResponse,
        submittedRowsCountResponse,
        { data: submissionsPerExamData, error: submissionsPerExamError },
      ] = await Promise.all([
        supabase.from("annotators").select("*", { count: "exact", head: true }),
        supabase.from("exams").select("*", { count: "exact", head: true }),
        supabase.from("images").select("*", { count: "exact", head: true }),
        supabase
          .from("annotation_rows")
          .select("*", { count: "exact", head: true })
          .eq("is_submitted", true),
        supabase.rpc("get_submissions_per_exam"),
      ]);

      if (
        annotatorsCountResponse.error ||
        examsCountResponse.error ||
        imagesCountResponse.error ||
        submittedRowsCountResponse.error ||
        submissionsPerExamError
      ) {
        const errorMsg =
          "One or more analytics queries failed. Check console for details.";
        console.error({
          annotatorsError: annotatorsCountResponse.error,
          examsError: examsCountResponse.error,
          imagesError: imagesCountResponse.error,
          submittedRowsError: submittedRowsCountResponse.error,
          submissionsPerExamError,
        });
        throw new Error(errorMsg);
      }

      setAnalyticsData({
        totalAnnotators: annotatorsCountResponse.count || 0,
        totalExams: examsCountResponse.count || 0,
        totalImages: imagesCountResponse.count || 0,
        totalSubmittedAnnotationRows: submittedRowsCountResponse.count || 0,
        submissionsPerExam: submissionsPerExamData || [],
      });
    } catch (e: any) {
      console.error("Exception fetching analytics:", e);
      addToast({
        type: "error",
        message: `Failed to load analytics: ${e.message}`,
      });
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (activeTab === "ANSWER_KEYS" && !showAnswerKeyForm) {
      fetchAnswerKeySummaries();
    } else if (activeTab === "ANNOTATORS") {
      fetchAnnotators();
    } else if (activeTab === "ANALYTICS") {
      fetchAnalyticsData();
    }
  }, [
    activeTab,
    showAnswerKeyForm,
    fetchAnswerKeySummaries,
    fetchAnnotators,
    fetchAnalyticsData,
  ]);

  const getExamDatabaseId = async (
    examCode: string
  ): Promise<number | null> => {
    const exam = EXAMS_DATA.find((e) => e.id === examCode);
    if (exam && exam.dbId) return exam.dbId;

    const { data, error } = await supabase
      .from("exams")
      .select("id")
      .eq("exam_code", examCode)
      .single();
    if (error && error.code !== "PGRST116") {
      console.error(`Error fetching exam DB ID for '${examCode}':`, error);
      addToast({
        type: "error",
        message: `Error fetching configuration for exam '${examCode}'.`,
      });
      return null;
    }
    if (data && exam) exam.dbId = data.id; // Cache it on the EXAMS_DATA constant
    return data ? data.id : null;
  };

  const handleSaveAnswerKey = useCallback(
    async (keyData: AnswerKeyEntry) => {
      if (!currentAdminProfile) {
        addToast({
          type: "error",
          message: "Admin profile not loaded. Cannot save answer key.",
        });
        return;
      }
      setIsLoadingAnswerKeys(true);
      try {
        let imageDbId = keyData.dbImageId;
        let imageUrl = keyData.imageUrl;
        let storagePath = keyData.imageId;

        const examDbId =
          keyData.dbExamId || (await getExamDatabaseId(keyData.examId));
        if (!examDbId) {
          throw new Error(
            `Could not find database ID for exam code: ${keyData.examId}`
          );
        }

        if (keyData.imageFile) {
          const file = keyData.imageFile;
          storagePath = `${keyData.examId}/${file.name}_${Date.now()}`;

          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET_NAME)
            .upload(storagePath, file, { cacheControl: "3600", upsert: false });

          if (uploadError)
            throw new Error(`Failed to upload image: ${uploadError.message}`);

          const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKET_NAME)
            .getPublicUrl(storagePath);
          imageUrl = urlData.publicUrl;
        }

        if (storagePath && (!imageDbId || keyData.imageFile)) {
          const imageRecord = {
            exam_id: examDbId,
            storage_path: storagePath,
            original_filename: keyData.imageFile?.name || keyData.imageId,
            uploader_profile_id: currentAdminProfile.id,
          };

          if (imageDbId && keyData.imageFile) {
            // If existing image is being replaced
            const { data, error: updateImageError } = await supabase
              .from("images")
              .update(imageRecord)
              .eq("id", imageDbId)
              .select("id")
              .single();
            if (updateImageError) throw updateImageError;
            imageDbId = data?.id;
          } else if (!imageDbId) {
            // New image
            const { data, error: insertImageError } = await supabase
              .from("images")
              .insert(imageRecord)
              .select("id")
              .single();
            if (insertImageError) throw insertImageError;
            imageDbId = data?.id;
          }
        }

        if (!imageDbId)
          throw new Error(
            "Failed to get or create a database ID for the image."
          );

        const { error: deleteError } = await supabase
          .from("answer_key_rows")
          .delete()
          .eq("image_id", imageDbId);
        if (deleteError) {
          console.warn(
            "Failed to delete old answer rows during update, attempting to insert new ones anyway:",
            deleteError.message
          );
        }

        const answerRowsToInsert = keyData.answers.map((answerRow) => ({
          image_id: imageDbId,
          admin_profile_id: currentAdminProfile.id,
          row_data: answerRow.cells,
          client_row_id: answerRow.id,
        }));

        if (answerRowsToInsert.length > 0) {
          const { error: insertAnswersError } = await supabase
            .from("answer_key_rows")
            .insert(answerRowsToInsert);
          if (insertAnswersError) throw insertAnswersError;
        }

        addToast({
          type: "success",
          message: "Answer key saved successfully!",
        });
        setShowAnswerKeyForm(false);
        setEditingAnswerKey(null);
        fetchAnswerKeySummaries();
      } catch (error: any) {
        console.error("Failed to save answer key:", error);
        addToast({
          type: "error",
          message: `Error saving answer key: ${
            error.message || "Unknown error"
          }`,
        });
      } finally {
        setIsLoadingAnswerKeys(false);
      }
    },
    [currentAdminProfile, fetchAnswerKeySummaries, addToast]
  );

  const handleEditAnswerKey = async (summary: FetchedAnswerKeySummary) => {
    setIsLoadingAnswerKeys(true);
    try {
      const { data: answerRowsData, error } = await supabase
        .from("answer_key_rows")
        .select("row_data, client_row_id")
        .eq("image_id", summary.dbImageId);

      if (error) throw error;

      const answers: AnswerKeyEntry["answers"] = answerRowsData.map(
        (dbRow: any) => ({
          id:
            dbRow.client_row_id ||
            `fallback_id_${Math.random().toString(36).substring(2, 9)}`,
          cells: dbRow.row_data,
        })
      );

      setEditingAnswerKey({
        examId: summary.examCode,
        imageId: summary.originalFilename || summary.storagePath,
        imageUrl: summary.imageUrl,
        answers: answers,
        dbImageId: summary.dbImageId,
        dbExamId: summary.dbExamId,
      });
      setShowAnswerKeyForm(true);
    } catch (e: any) {
      console.error("Error fetching full answer key for editing:", e);
      addToast({
        type: "error",
        message: `Could not load answer key for editing: ${e.message}`,
      });
    } finally {
      setIsLoadingAnswerKeys(false);
    }
  };

  const confirmDeleteAnswerKey = (dbImageId: number) => {
    setModalContent({
      title: "Confirm Deletion",
      body: (
        <p>
          Are you sure you want to delete this answer key? This will remove all
          answer rows associated with this image. The image itself will NOT be
          deleted from storage.
        </p>
      ),
      onConfirm: () => handleDeleteAnswerKey(dbImageId),
      confirmText: "Delete",
    });
    setIsModalOpen(true);
  };

  const handleDeleteAnswerKey = async (dbImageId: number) => {
    setIsModalOpen(false);
    setIsLoadingAnswerKeys(true);
    try {
      const { error: deleteRowsError } = await supabase
        .from("answer_key_rows")
        .delete()
        .eq("image_id", dbImageId);
      if (deleteRowsError) throw deleteRowsError;

      addToast({
        type: "success",
        message: "Answer key (rows) deleted successfully.",
      });
      fetchAnswerKeySummaries(); // Refresh the list
    } catch (e: any) {
      console.error("Error deleting answer key:", e);
      addToast({
        type: "error",
        message: `Failed to delete answer key: ${e.message}`,
      });
    } finally {
      setIsLoadingAnswerKeys(false);
    }
  };

  const handleCreateNewAnswerKey = () => {
    setEditingAnswerKey(null);
    setShowAnswerKeyForm(true);
  };

  const filteredAnnotators = useMemo(() => {
    if (!annotatorSearchTerm) return allAnnotators;
    return allAnnotators.filter((annotator) =>
      annotator.liftapp_user_id
        .toLowerCase()
        .includes(annotatorSearchTerm.toLowerCase())
    );
  }, [allAnnotators, annotatorSearchTerm]);

  const handleExportAnnotatorsToCSV = () => {
    const columnsToExport: {
      key: keyof AnnotatorInfo | string;
      header: string;
      isExamSpecific?: boolean;
      examCode?: string;
      metricKey?: keyof UserExamScoreMetrics | "duration_seconds";
    }[] = [
      { key: "id", header: "DB ID" },
      { key: "liftapp_user_id", header: "LiftApp User ID" },
      { key: "created_at", header: "Registered On" },
      { key: "total_images_attempted_overall", header: "Overall Batches" },
      {
        key: "total_effective_user_keystrokes_overall",
        header: "Overall Effective Keystrokes",
      },
      {
        key: "total_answer_key_keystrokes_overall",
        header: "Overall Total Keystrokes",
      },
      { key: "total_retakes_overall", header: "Overall Retakes" },
      { key: "overall_score_percentage", header: "Overall Score (%)" },
    ];

    EXAMS_DATA.forEach((exam) => {
      columnsToExport.push({
        key: `${exam.id}_images_attempted`,
        header: `${exam.name} Batches`,
        isExamSpecific: true,
        examCode: exam.id,
        metricKey: "images_attempted",
      });
      columnsToExport.push({
        key: `${exam.id}_retakes`,
        header: `${exam.name} Retakes`,
        isExamSpecific: true,
        examCode: exam.id,
        metricKey: "retakes",
      });
      columnsToExport.push({
        key: `${exam.id}_effective_keystrokes`,
        header: `${exam.name} Effective Keystrokes`,
        isExamSpecific: true,
        examCode: exam.id,
        metricKey: "total_effective_user_keystrokes",
      });
      columnsToExport.push({
        key: `${exam.id}_total_keystrokes`,
        header: `${exam.name} Total Keystrokes`,
        isExamSpecific: true,
        examCode: exam.id,
        metricKey: "total_answer_key_keystrokes",
      });
      columnsToExport.push({
        key: `${exam.id}_duration_seconds`,
        header: `${exam.name} Duration`,
        isExamSpecific: true,
        examCode: exam.id,
        metricKey: "duration_seconds",
      });
      columnsToExport.push({
        key: `${exam.id}_score_percentage`,
        header: `${exam.name} Score (%)`,
        isExamSpecific: true,
        examCode: exam.id,
        metricKey: "score_percentage",
      });
    });

    const csvData = convertToCSV(filteredAnnotators, columnsToExport);
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "annotators_detailed_scores.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const filteredAnswerKeys = useMemo(() => {
    if (!activeAnswerKeyExamCode) return fetchedAnswerKeys;
    return fetchedAnswerKeys.filter(
      (key) => key.examCode === activeAnswerKeyExamCode
    );
  }, [fetchedAnswerKeys, activeAnswerKeyExamCode]);

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case "ANSWER_KEYS":
        return (
          <div className="p-6 bg-slate-50 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-slate-700">
                Manage Exam Answer Keys
              </h3>
              {!showAnswerKeyForm && (
                <button
                  onClick={handleCreateNewAnswerKey}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  disabled={isLoadingAnswerKeys}
                >
                  Create New Answer Key
                </button>
              )}
            </div>

            {showAnswerKeyForm ? (
              <AnswerKeyForm
                exams={EXAMS_DATA}
                onSave={handleSaveAnswerKey}
                onCancel={() => {
                  setShowAnswerKeyForm(false);
                  setEditingAnswerKey(null);
                }}
                initialData={editingAnswerKey}
                defaultExamId={activeAnswerKeyExamCode}
              />
            ) : (
              <>
                <div className="mb-4 border-b border-slate-300">
                  <nav
                    className="flex flex-wrap -mb-px space-x-1 sm:space-x-2"
                    aria-label="Exam Types"
                  >
                    {EXAMS_DATA.map((exam) => (
                      <button
                        key={exam.id}
                        onClick={() => setActiveAnswerKeyExamCode(exam.id)}
                        className={`px-3 py-2.5 font-medium text-sm rounded-t-md border-b-2 transition-colors focus:outline-none
                          ${
                            activeAnswerKeyExamCode === exam.id
                              ? "border-blue-500 text-blue-600 bg-white"
                              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                          }`}
                      >
                        {exam.name}
                      </button>
                    ))}
                  </nav>
                </div>
                <div>
                  {isLoadingAnswerKeys && (
                    <p className="text-slate-500 italic">
                      Loading answer keys for{" "}
                      {EXAMS_DATA.find((e) => e.id === activeAnswerKeyExamCode)
                        ?.name || "selected exam"}
                      ...
                    </p>
                  )}
                  {!isLoadingAnswerKeys && filteredAnswerKeys.length === 0 && (
                    <p className="text-slate-500 italic">
                      No answer keys found for{" "}
                      {EXAMS_DATA.find((e) => e.id === activeAnswerKeyExamCode)
                        ?.name || "selected exam"}
                      .
                    </p>
                  )}
                  {!isLoadingAnswerKeys && filteredAnswerKeys.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-200">
                          <tr>
                            <th scope="col" className="px-4 py-3">
                              Image Preview
                            </th>
                            <th scope="col" className="px-4 py-3">
                              Image Ref
                            </th>
                            <th scope="col" className="px-4 py-3">
                              Answer Rows
                            </th>
                            <th scope="col" className="px-4 py-3">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAnswerKeys.map((keySummary) => (
                            <tr
                              key={keySummary.dbImageId}
                              className="bg-white border-b hover:bg-slate-50"
                            >
                              <td className="px-4 py-3">
                                {keySummary.imageUrl && (
                                  <img
                                    src={keySummary.imageUrl}
                                    alt={
                                      keySummary.originalFilename ||
                                      keySummary.storagePath
                                    }
                                    className="h-10 w-auto object-contain rounded"
                                  />
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {keySummary.originalFilename ||
                                  keySummary.storagePath}
                              </td>
                              <td className="px-4 py-3">
                                {keySummary.answerRowCount}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() =>
                                    handleEditAnswerKey(keySummary)
                                  }
                                  className="font-medium text-blue-600 hover:text-blue-800 mr-3"
                                  disabled={isLoadingAnswerKeys}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    confirmDeleteAnswerKey(keySummary.dbImageId)
                                  }
                                  className="font-medium text-red-600 hover:text-red-800"
                                  disabled={isLoadingAnswerKeys}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      case "ANNOTATORS":
        return (
          <div className="p-6 bg-slate-50 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-slate-700">
                Annotator Management & Scores
              </h3>
              <button
                onClick={handleExportAnnotatorsToCSV}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                disabled={
                  isLoadingAnnotators || filteredAnnotators.length === 0
                }
              >
                Export to CSV
              </button>
            </div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by LiftApp User ID..."
                value={annotatorSearchTerm}
                onChange={(e) => setAnnotatorSearchTerm(e.target.value)}
                className="mt-1 block w-full md:w-1/2 lg:w-1/3 px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {isLoadingAnnotators && (
              <p className="text-slate-500 italic">Loading annotators...</p>
            )}
            {!isLoadingAnnotators && filteredAnnotators.length === 0 && (
              <p className="text-slate-500 italic">
                No annotators found
                {annotatorSearchTerm ? " matching your search" : ""}.
              </p>
            )}
            {!isLoadingAnnotators && filteredAnnotators.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left text-slate-600 whitespace-nowrap">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-200">
                    <tr>
                      <th
                        scope="col"
                        className="px-3 py-3 sticky left-0 bg-slate-200 z-10"
                      >
                        LiftApp User ID
                      </th>
                      <th scope="col" className="px-3 py-3">
                        Registered On
                      </th>
                      <th scope="col" className="px-3 py-3 text-center">
                        Overall Batches
                      </th>
                      <th scope="col" className="px-3 py-3 text-center">
                        Overall Retakes
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-center"
                        title="Overall Effective Keystrokes"
                      >
                        Overall Effective Keystrokes
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-center"
                        title="Overall Total Keystrokes"
                      >
                        Overall Total Keystrokes
                      </th>
                      <th scope="col" className="px-3 py-3 text-center">
                        Overall Score (%)
                      </th>
                      {EXAMS_DATA.map((exam) => (
                        <React.Fragment key={exam.id}>
                          <th
                            scope="col"
                            className="px-3 py-3 text-center border-l border-slate-300"
                          >
                            {exam.name} Batches
                          </th>
                          <th scope="col" className="px-3 py-3 text-center">
                            {exam.name} Retakes
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3 text-center"
                            title="Effective Keystrokes"
                          >
                            {exam.name} Effective Keystrokes
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3 text-center"
                            title="Total Keystrokes"
                          >
                            {exam.name} Total Keystrokes
                          </th>
                          <th scope="col" className="px-3 py-3 text-center">
                            {exam.name} Duration
                          </th>
                          <th scope="col" className="px-3 py-3 text-center">
                            {exam.name} Score (%)
                          </th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAnnotators.map((annotator) => (
                      <tr
                        key={annotator.id}
                        className="bg-white hover:bg-slate-50"
                      >
                        <td className="px-3 py-3 font-medium text-slate-900 sticky left-0 bg-white hover:bg-slate-50 z-10">
                          {annotator.liftapp_user_id}
                        </td>
                        <td className="px-3 py-3">{annotator.created_at}</td>
                        <td className="px-3 py-3 text-center">
                          {annotator.total_images_attempted_overall ?? "N/A"}
                        </td>
                        <td className="px-3 py-3 text-center font-semibold">
                          {annotator.total_retakes_overall ?? 0}
                        </td>
                        <td className="px-3 py-3 text-center text-green-600 font-semibold">
                          {annotator.total_effective_user_keystrokes_overall ??
                            "N/A"}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {annotator.total_answer_key_keystrokes_overall ??
                            "N/A"}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {annotator.overall_score_percentage !== undefined &&
                          annotator.overall_score_percentage !== null ? (
                            <span
                              className={`font-bold px-2 py-1 rounded-full text-xs ${
                                annotator.overall_score_percentage >= 75
                                  ? "bg-green-100 text-green-700"
                                  : annotator.overall_score_percentage >= 50
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {annotator.overall_score_percentage.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-slate-500 italic text-xs">
                              N/A
                            </span>
                          )}
                        </td>
                        {EXAMS_DATA.map((exam) => {
                          const examScores =
                            annotator.per_exam_scores?.[exam.id];
                          return (
                            <React.Fragment key={exam.id}>
                              <td className="px-3 py-3 text-center border-l border-slate-300">
                                {examScores?.images_attempted ?? 0}
                              </td>
                              <td className="px-3 py-3 text-center font-semibold">
                                {examScores?.retakes ?? 0}
                              </td>
                              <td className="px-3 py-3 text-center text-green-600 font-semibold">
                                {examScores?.total_effective_user_keystrokes ??
                                  0}
                              </td>
                              <td className="px-3 py-3 text-center">
                                {examScores?.total_answer_key_keystrokes ?? 0}
                              </td>
                              <td className="px-3 py-3 text-center">
                                {formatDurationForAdmin(
                                  examScores?.duration_seconds
                                )}
                              </td>
                              <td className="px-3 py-3 text-center">
                                {examScores?.score_percentage !== undefined &&
                                examScores?.score_percentage !== null &&
                                examScores.total_answer_key_keystrokes! > 0 ? (
                                  <span
                                    className={`font-bold px-2 py-1 rounded-full text-xs ${
                                      examScores.score_percentage >= 75
                                        ? "bg-green-100 text-green-700"
                                        : examScores.score_percentage >= 50
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {examScores.score_percentage.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-slate-500 italic text-xs">
                                    N/A
                                  </span>
                                )}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case "ANALYTICS":
        return (
          <div className="p-6 bg-slate-50 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-slate-700 mb-6">
              Application Analytics
            </h3>
            {isLoadingAnalytics && (
              <p className="text-slate-500 italic">Loading analytics data...</p>
            )}
            {!isLoadingAnalytics && !analyticsData && (
              <p className="text-slate-500 italic">
                Analytics data could not be loaded.
              </p>
            )}
            {!isLoadingAnalytics && analyticsData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnalyticsCard
                  title="Total Annotators"
                  value={analyticsData.totalAnnotators.toString()}
                />
                <AnalyticsCard
                  title="Total Exams Configured"
                  value={analyticsData.totalExams.toString()}
                />
                <AnalyticsCard
                  title="Total Images in System"
                  value={analyticsData.totalImages.toString()}
                />
                <AnalyticsCard
                  title="Total Submitted Annotation Rows"
                  value={analyticsData.totalSubmittedAnnotationRows.toString()}
                />

                {analyticsData.submissionsPerExam.length > 0 && (
                  <div className="md:col-span-2 lg:col-span-3 p-4 bg-white rounded-lg shadow">
                    <h4 className="text-md font-semibold text-slate-600 mb-3">
                      Submissions per Exam
                    </h4>
                    <ul className="space-y-2 text-sm">
                      {analyticsData.submissionsPerExam.map((examStat) => (
                        <li
                          key={examStat.name}
                          className="flex justify-between items-center p-2 bg-slate-100 rounded"
                        >
                          <span>{examStat.name}</span>
                          <span className="font-semibold">
                            {examStat.submission_count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const AnalyticsCard: React.FC<{ title: string; value: string }> = ({
    title,
    value,
  }) => (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
      <h4 className="text-md font-medium text-slate-500 mb-1">{title}</h4>
      <p className="text-3xl font-bold text-slate-700">{value}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-slate-800 text-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-10 h-10 text-red-400 mr-3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
              <h1 className="text-2xl font-semibold">
                LiftApp Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span
                className="text-sm hidden sm:block"
                aria-label={`Logged in as ${adminId}`}
              >
                Welcome,{" "}
                <span className="font-medium">
                  {currentAdminProfile?.email || adminId}
                </span>
              </span>
              <button
                onClick={onAdminLogout}
                className="px-4 py-2 text-sm font-medium text-slate-800 bg-red-400 hover:bg-red-500 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 focus:ring-offset-slate-800 transition-colors"
                aria-label="Admin Logout"
              >
                Logout
              </button>
            </div>
          </div>
          <nav className="flex space-x-2 pb-2 px-1">
            <TabButton
              label="Answer Keys"
              tabName="ANSWER_KEYS"
              activeTab={activeTab}
              onClick={setActiveTab}
            />
            <TabButton
              label="Annotators"
              tabName="ANNOTATORS"
              activeTab={activeTab}
              onClick={setActiveTab}
            />
            <TabButton
              label="Analytics"
              tabName="ANALYTICS"
              activeTab={activeTab}
              onClick={setActiveTab}
            />
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveTabContent()}
      </main>

      <footer className="text-center py-6 text-sm text-slate-500 border-t border-slate-200 mt-auto">
        &copy; {new Date().getFullYear()} LiftApp Admin Panel.
      </footer>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalContent.title}
        onConfirm={modalContent.onConfirm}
        confirmText={modalContent.confirmText}
      >
        {modalContent.body}
      </Modal>
    </div>
  );
};
