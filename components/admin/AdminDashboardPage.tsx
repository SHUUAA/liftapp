import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  AnswerKeyEntry,
  Exam,
  AdminProfile,
  AdminTab,
  FetchedAnswerKeySummary,
  AnalyticsData,
  AdminDashboardPageProps,
  AnnotatorInfo,
  UserExamScoreMetrics,
} from "../../types";
import { EXAMS_DATA, USER_ID_PREFIXES } from "../../constants";
import AnswerKeyForm from "./AnswerKeyForm";
import AnnotatorsTab from "./AnnotatorsTab";
import { supabase } from "../../utils/supabase/client";
import { useToast } from "../../contexts/ToastContext";
import Modal from "../common/Modal";
import { formatSupabaseError } from "../../utils/errorUtils";
import UserGrowthLineChart from "./charts/UserGrowthLineChart";
import SubmissionsBarChart from "./charts/SubmissionsBarChart";

const STORAGE_BUCKET_NAME = "exam-images";
const ROWS_PER_PAGE = 50;

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

  // Answer Key Tab State
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

  // Annotators Tab State
  const [allAnnotators, setAllAnnotators] = useState<AnnotatorInfo[]>([]);
  const [isLoadingAnnotators, setIsLoadingAnnotators] = useState<boolean>(true);
  const [annotatorSearchTerm, setAnnotatorSearchTerm] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");
  const [completionStatusFilter, setCompletionStatusFilter] =
    useState<string>("all");
  const [specificCompletionDate, setSpecificCompletionDate] =
    useState<string>("");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [filterBatches, setFilterBatches] = useState<string>("all");
  const [filterPrefix, setFilterPrefix] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof AnnotatorInfo | null;
    direction: "ascending" | "descending";
  }>({ key: null, direction: "ascending" });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [editingAnnotatorId, setEditingAnnotatorId] = useState<number | null>(
    null
  );
  const [newUsername, setNewUsername] = useState<string>("");

  // Analytics Tab State
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(false);

  // General Component State
  const [currentAdminProfile, setCurrentAdminProfile] =
    useState<AdminProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: "",
    body: <></>,
    onConfirm: () => {},
    confirmText: "Confirm",
  });

  const dataFetchStatus = useRef({
    answerKeys: false,
    annotators: false,
    analytics: false,
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
    dataFetchStatus.current.answerKeys = true;
    try {
      const { data, error } = await supabase.rpc("get_answer_key_summaries");

      if (error) throw formatSupabaseError(error);

      if (!data) {
        setFetchedAnswerKeys([]);
        return;
      }

      const summariesWithUrls = data.map((summary) => {
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
      addToast({
        type: "error",
        message: `Failed to load answer keys: ${e.message}`,
      });
      setFetchedAnswerKeys([]);
    } finally {
      setIsLoadingAnswerKeys(false);
    }
  }, [addToast]);

  const fetchAnnotators = useCallback(async () => {
    setIsLoadingAnnotators(true);
    dataFetchStatus.current.annotators = true;
    try {
      const { data: annotators, error: annotatorsError } = await supabase
        .from("annotators")
        .select("id, liftapp_user_id, created_at, overall_completion_date");
      if (annotatorsError) throw annotatorsError;
      if (!annotators) {
        setAllAnnotators([]);
        return;
      }
      const { data: completions, error: completionsError } =
        await (async () => {
          let allRecords: any[] = [];
          let page = 0;
          const PAGE_SIZE = 1000;
          const PAGE_SIZE = 5000;
          while (true) {
            const { data: pageData, error } = await supabase
              .from("user_exam_completions")
              .select(
                `
                annotator_id, exam_id, status, completed_at, retake_count, duration_seconds,
                total_effective_keystrokes, total_answer_key_keystrokes, score_percentage,
                exams ( exam_code, name )
              `
              )
              .in("status", ["submitted", "timed_out"])
              .order("completed_at", { ascending: false })
              .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
            if (error) return { data: null, error };
            if (pageData) allRecords.push(...pageData);
            if (!pageData || pageData.length < PAGE_SIZE) break;
            page++;
          }
          return { data: allRecords, error: null };
        })();
      if (completionsError) throw completionsError;
      const completionsByAnnotator = new Map<number, any[]>();
      (completions || []).forEach((comp) => {
        if (!completionsByAnnotator.has(comp.annotator_id)) {
          completionsByAnnotator.set(comp.annotator_id, []);
        }
        completionsByAnnotator.get(comp.annotator_id)!.push(comp);
      });
      const processedAnnotators: AnnotatorInfo[] = annotators.map(
        (annotator) => {
          const userCompletions =
            completionsByAnnotator.get(annotator.id) || [];
          const latestCompletionsMap = new Map<number, any>();
          userCompletions.forEach((comp) => {
            if (comp.completed_at && !latestCompletionsMap.has(comp.exam_id)) {
              latestCompletionsMap.set(comp.exam_id, comp);
            }
          });
          const latestCompletions = Array.from(latestCompletionsMap.values());
          let total_images_attempted_overall = 0;
          let total_effective_user_keystrokes_overall = 0;
          let total_answer_key_keystrokes_overall = 0;
          let total_retakes_overall = 0;
          const per_exam_scores: Record<string, UserExamScoreMetrics> = {};
          latestCompletions.forEach((comp) => {
            total_images_attempted_overall += 1;
            const effectiveKs = comp.total_effective_keystrokes || 0;
            const totalKs = comp.total_answer_key_keystrokes || 0;
            total_effective_user_keystrokes_overall += effectiveKs;
            total_answer_key_keystrokes_overall += totalKs;
            total_retakes_overall += comp.retake_count || 0;
            if (comp.exams?.exam_code) {
              per_exam_scores[comp.exams.exam_code] = {
                images_attempted: 1,
                retakes: comp.retake_count || 0,
                total_effective_user_keystrokes: effectiveKs,
                total_answer_key_keystrokes: totalKs,
                score_percentage: comp.score_percentage,
                duration_seconds: comp.duration_seconds,
                completed_at: comp.completed_at,
              };
            }
          });
          const overall_score_percentage =
            total_answer_key_keystrokes_overall > 0
              ? (total_effective_user_keystrokes_overall /
                  total_answer_key_keystrokes_overall) *
                100
              : 0;

          // --- AUTO-UPDATE overall_completion_date if needed ---
          // Only set if user has completed and passed all exams (score >= 90 and completed_at for each exam)
          let shouldSetOverallCompletionDate = false;
          let latestCompletionDate: string | null = null;
          if (EXAMS_DATA.length > 0) {
            const allCompletedAndPassed = EXAMS_DATA.every((exam) => {
              const score = per_exam_scores[exam.id]?.score_percentage;
              const completedAt = per_exam_scores[exam.id]?.completed_at;
              return (
                score !== undefined &&
                score !== null &&
                score >= 90 &&
                !!completedAt
              );
            });
            if (allCompletedAndPassed) {
              // Find the latest completed_at among the exams
              const dates = EXAMS_DATA.map(
                (exam) => per_exam_scores[exam.id]?.completed_at
              )
                .filter(Boolean)
                .map((d) => new Date(d as string));
              if (dates.length === EXAMS_DATA.length) {
                latestCompletionDate = new Date(
                  Math.max(...dates.map((d) => d.getTime()))
                ).toISOString();
                shouldSetOverallCompletionDate = true;
              }
            }
          }
          // If DB value is missing and we should set it, update the DB
          if (
            !annotator.overall_completion_date &&
            shouldSetOverallCompletionDate &&
            latestCompletionDate
          ) {
            // Fire and forget, don't await
            supabase
              .from("annotators")
              .update({ overall_completion_date: latestCompletionDate })
              .eq("id", annotator.id)
              .then(({ error }) => {
                if (error) {
                  console.error(
                    "Failed to update overall_completion_date for annotator",
                    annotator.id,
                    error
                  );
                }
              });
          }

          return {
            id: annotator.id,
            liftapp_user_id: annotator.liftapp_user_id,
            created_at: annotator.created_at,
            overall_completion_date:
              annotator.overall_completion_date ||
              (shouldSetOverallCompletionDate && latestCompletionDate
                ? latestCompletionDate
                : null),
            total_images_attempted_overall,
            total_effective_user_keystrokes_overall,
            total_answer_key_keystrokes_overall,
            overall_score_percentage,
            total_retakes_overall,
            per_exam_scores,
          };
        }
      );
      setAllAnnotators(processedAnnotators);
    } catch (e: any) {
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
    dataFetchStatus.current.analytics = true;
    try {
      const [
        annotatorsCountResponse,
        examsCountResponse,
        imagesCountResponse,
        submittedRowsCountResponse,
        { data: submissionsPerExamData, error: submissionsPerExamError },
        {
          data: annotatorsRegistrationData,
          error: annotatorsRegistrationError,
        },
      ] = await Promise.all([
        supabase.from("annotators").select("*", { count: "exact", head: true }),
        supabase.from("exams").select("*", { count: "exact", head: true }),
        supabase.from("images").select("*", { count: "exact", head: true }),
        supabase
          .from("annotation_rows")
          .select("*", { count: "exact", head: true })
          .eq("is_submitted", true),
        supabase.rpc("get_submissions_per_exam"),
        supabase
          .from("annotators")
          .select("created_at")
          .order("created_at", { ascending: true }),
      ]);

      const errors = [
        annotatorsCountResponse.error,
        examsCountResponse.error,
        imagesCountResponse.error,
        submittedRowsCountResponse.error,
        submissionsPerExamError,
        annotatorsRegistrationError,
      ].filter(Boolean);

      if (errors.length > 0) {
        throw new Error(
          "One or more analytics queries failed: " +
            errors.map((e) => e.message).join(", ")
        );
      }

      const dailyCounts = new Map<string, number>();
      (annotatorsRegistrationData || []).forEach((record) => {
        if (record.created_at) {
          const date = new Date(record.created_at).toISOString().split("T")[0];
          dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
        }
      });

      const sortedDates = Array.from(dailyCounts.keys()).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      );
      let cumulativeCount = 0;
      const annotatorRegistrations = sortedDates.map((date) => {
        cumulativeCount += dailyCounts.get(date)!;
        return { date: date, count: cumulativeCount };
      });

      setAnalyticsData({
        totalAnnotators: annotatorsCountResponse.count || 0,
        totalExams: examsCountResponse.count || 0,
        totalImages: imagesCountResponse.count || 0,
        totalSubmittedAnnotationRows: submittedRowsCountResponse.count || 0,
        submissionsPerExam: submissionsPerExamData || [],
        annotatorRegistrations: annotatorRegistrations,
      });
    } catch (e: any) {
      addToast({
        type: "error",
        message: `Failed to load analytics: ${e.message}`,
      });
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (
      activeTab === "ANSWER_KEYS" &&
      !showAnswerKeyForm &&
      !dataFetchStatus.current.answerKeys
    ) {
      fetchAnswerKeySummaries();
    } else if (
      activeTab === "ANNOTATORS" &&
      !dataFetchStatus.current.annotators
    ) {
      fetchAnnotators();
    } else if (
      activeTab === "ANALYTICS" &&
      !dataFetchStatus.current.analytics
    ) {
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
      addToast({
        type: "error",
        message: `Error fetching configuration for exam '${examCode}'.`,
      });
      return null;
    }
    if (data && exam) exam.dbId = data.id;
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
        let storagePath = keyData.imageId;

        const examDbId =
          keyData.dbExamId || (await getExamDatabaseId(keyData.examId));
        if (!examDbId)
          throw new Error(
            `Could not find DB ID for exam code: ${keyData.examId}`
          );

        if (keyData.imageFile) {
          const file = keyData.imageFile;
          storagePath = `${keyData.examId}/${file.name}_${Date.now()}`;
          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET_NAME)
            .upload(storagePath, file, { upsert: false });
          if (uploadError) throw uploadError;
        }

        if (storagePath && (!imageDbId || keyData.imageFile)) {
          const imageRecord = {
            exam_id: examDbId,
            storage_path: storagePath,
            original_filename: keyData.imageFile?.name || keyData.imageId,
            uploader_profile_id: currentAdminProfile.id,
          };
          if (imageDbId && keyData.imageFile) {
            const { data, error: updateImageError } = await supabase
              .from("images")
              .update(imageRecord)
              .eq("id", imageDbId)
              .select("id")
              .single();
            if (updateImageError) throw updateImageError;
            imageDbId = data?.id;
          } else if (!imageDbId) {
            const { data, error: insertImageError } = await supabase
              .from("images")
              .insert([imageRecord])
              .select("id")
              .single();
            if (insertImageError) throw insertImageError;
            imageDbId = data?.id;
          }
        }
        if (!imageDbId) throw new Error("Failed to get DB ID for image.");
        const { error: deleteError } = await supabase
          .from("answer_key_rows")
          .delete()
          .eq("image_id", imageDbId);
        if (deleteError)
          console.warn("Could not clear old answers:", deleteError.message);

        const answerRowsToInsert = keyData.answers.map((answerRow) => ({
          image_id: imageDbId!,
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
        addToast({
          type: "error",
          message: `Error saving answer key: ${
            formatSupabaseError(error).message
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
        .select("id, row_data, client_row_id")
        .eq("image_id", summary.dbImageId)
        .order("id", { ascending: true });
      if (error) throw error;
      const answers: AnswerKeyEntry["answers"] = (answerRowsData || []).map(
        (dbRow: any) => ({
          id: dbRow.client_row_id || `db_id_${dbRow.id}`,
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
      addToast({
        type: "error",
        message: `Could not load answer key for editing: ${
          formatSupabaseError(e).message
        }`,
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
          Are you sure you want to delete this answer key? This action is
          irreversible.
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
        message: "Answer key deleted successfully.",
      });
      fetchAnswerKeySummaries();
    } catch (e: any) {
      addToast({
        type: "error",
        message: `Failed to delete answer key: ${
          formatSupabaseError(e).message
        }`,
      });
    } finally {
      setIsLoadingAnswerKeys(false);
    }
  };

  const handleCreateNewAnswerKey = () => {
    setEditingAnswerKey(null);
    setShowAnswerKeyForm(true);
  };

  const handleEditUsernameClick = (annotator: AnnotatorInfo) => {
    setEditingAnnotatorId(annotator.id);
    setNewUsername(annotator.liftapp_user_id);
  };

  const handleCancelEdit = () => {
    setEditingAnnotatorId(null);
    setNewUsername("");
  };

  const handleSaveUsername = async (annotatorId: number) => {
    const trimmedUsername = newUsername.trim();
    if (!trimmedUsername) {
      addToast({ type: "error", message: "Username cannot be empty." });
      return;
    }

    const originalAnnotator = allAnnotators.find((a) => a.id === annotatorId);
    if (originalAnnotator?.liftapp_user_id === trimmedUsername) {
      handleCancelEdit(); // No change, just exit edit mode
      return;
    }

    try {
      // Check for duplicates before saving
      const { data: existing, error: checkError } = await supabase
        .from("annotators")
        .select("id")
        .eq("liftapp_user_id", trimmedUsername)
        .neq("id", annotatorId) // Exclude the current user from the check
        .limit(1)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError; // Handle actual errors
      }

      if (existing) {
        addToast({
          type: "error",
          message: `Username "${trimmedUsername}" is already taken.`,
        });
        return;
      }

      // No duplicate found, proceed with update
      const { error: updateError } = await supabase
        .from("annotators")
        .update({ liftapp_user_id: trimmedUsername })
        .eq("id", annotatorId);

      if (updateError) throw updateError;

      // Update local state to reflect the change immediately
      setAllAnnotators((prev) =>
        prev.map((annotator) =>
          annotator.id === annotatorId
            ? { ...annotator, liftapp_user_id: trimmedUsername }
            : annotator
        )
      );

      addToast({
        type: "success",
        message: "Username updated successfully.",
      });
      handleCancelEdit(); // Exit edit mode
    } catch (error: any) {
      addToast({
        type: "error",
        message: `Failed to update username: ${
          formatSupabaseError(error).message
        }`,
      });
    }
  };

  const filteredAnswerKeys = useMemo(() => {
    if (!activeAnswerKeyExamCode) return fetchedAnswerKeys;
    return fetchedAnswerKeys.filter(
      (key) => key.examCode === activeAnswerKeyExamCode
    );
  }, [fetchedAnswerKeys, activeAnswerKeyExamCode]);

  const processedAnnotators = useMemo(() => {
    let processableItems = [...allAnnotators];
    if (annotatorSearchTerm) {
      processableItems = processableItems.filter((annotator) =>
        annotator.liftapp_user_id
          .toLowerCase()
          .includes(annotatorSearchTerm.toLowerCase())
      );
    }
    if (filterPrefix !== "all") {
      processableItems = processableItems.filter((annotator) =>
        annotator.liftapp_user_id.startsWith(filterPrefix)
      );
    }
    if (filterDate) {
      processableItems = processableItems.filter((annotator) => {
        if (!annotator.created_at) return false;
        return (
          new Date(annotator.created_at).toISOString().split("T")[0] ===
          filterDate
        );
      });
    }
    if (completionStatusFilter === "completed") {
      processableItems = processableItems.filter(
        (annotator) => !!annotator.overall_completion_date
      );
    } else if (completionStatusFilter === "not_completed") {
      processableItems = processableItems.filter(
        (annotator) => !annotator.overall_completion_date
      );
    }
    if (specificCompletionDate) {
      processableItems = processableItems.filter((annotator) => {
        if (!annotator.overall_completion_date) return false;
        return (
          new Date(annotator.overall_completion_date)
            .toISOString()
            .split("T")[0] === specificCompletionDate
        );
      });
    }
    if (scoreFilter !== "all") {
      processableItems = processableItems.filter((annotator) => {
        const score = annotator.overall_score_percentage;
        if (score === undefined || score === null) return false;
        if (scoreFilter === ">=90") return score >= 90;
        if (scoreFilter === "<90") return score < 90;
        return true;
      });
    }
    if (filterBatches !== "all") {
      const numBatches = parseInt(filterBatches, 10);
      processableItems = processableItems.filter(
        (annotator) =>
          (annotator.total_images_attempted_overall ?? 0) === numBatches
      );
    }
    if (sortConfig.key) {
      const { key, direction } = sortConfig;
      processableItems.sort((a, b) => {
        let aValue =
          a[key as keyof AnnotatorInfo] ??
          (key === "overall_completion_date" ? null : 0);
        let bValue =
          b[key as keyof AnnotatorInfo] ??
          (key === "overall_completion_date" ? null : 0);
        if (key === "overall_completion_date") {
          if (aValue === null) return 1;
          if (bValue === null) return -1;
        }
        if (aValue < bValue) return direction === "ascending" ? -1 : 1;
        if (aValue > bValue) return direction === "ascending" ? 1 : -1;
        return 0;
      });
    }
    return processableItems;
  }, [
    allAnnotators,
    annotatorSearchTerm,
    filterDate,
    completionStatusFilter,
    specificCompletionDate,
    scoreFilter,
    filterBatches,
    filterPrefix,
    sortConfig,
  ]);

  const paginatedAnnotators = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return processedAnnotators.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [processedAnnotators, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    annotatorSearchTerm,
    filterDate,
    completionStatusFilter,
    specificCompletionDate,
    scoreFilter,
    filterBatches,
    filterPrefix,
  ]);

  const requestSort = (key: keyof AnnotatorInfo) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const RefreshIcon = ({ spinning }: { spinning: boolean }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={`w-5 h-5 ${spinning ? "animate-spin" : ""}`}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );

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
                <div className="flex items-center gap-x-3">
                  <button
                    onClick={fetchAnswerKeySummaries}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center gap-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-wait"
                    disabled={isLoadingAnswerKeys}
                  >
                    <RefreshIcon spinning={isLoadingAnswerKeys} />
                    Refresh
                  </button>
                  <button
                    onClick={handleCreateNewAnswerKey}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                    disabled={isLoadingAnswerKeys}
                  >
                    Create New Answer Key
                  </button>
                </div>
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
                      Loading answer keys...
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
          <AnnotatorsTab
            isLoading={isLoadingAnnotators}
            paginatedAnnotators={paginatedAnnotators}
            processedAnnotators={processedAnnotators}
            sortConfig={sortConfig}
            requestSort={requestSort}
            onRefresh={fetchAnnotators}
            annotatorSearchTerm={annotatorSearchTerm}
            setAnnotatorSearchTerm={setAnnotatorSearchTerm}
            filterPrefix={filterPrefix}
            setFilterPrefix={setFilterPrefix}
            filterDate={filterDate}
            setFilterDate={setFilterDate}
            completionStatusFilter={completionStatusFilter}
            setCompletionStatusFilter={setCompletionStatusFilter}
            specificCompletionDate={specificCompletionDate}
            setSpecificCompletionDate={setSpecificCompletionDate}
            scoreFilter={scoreFilter}
            setScoreFilter={setScoreFilter}
            filterBatches={filterBatches}
            setFilterBatches={setFilterBatches}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            rowsPerPage={ROWS_PER_PAGE}
            editingAnnotatorId={editingAnnotatorId}
            newUsername={newUsername}
            setNewUsername={setNewUsername}
            onEditUsernameClick={handleEditUsernameClick}
            onSaveUsername={handleSaveUsername}
            onCancelEdit={handleCancelEdit}
          />
        );
      case "ANALYTICS":
        return (
          <div className="p-6 bg-slate-50 rounded-lg shadow">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-slate-700">
                Application Analytics
              </h3>
              <button
                onClick={fetchAnalyticsData}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center gap-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-wait"
                disabled={isLoadingAnalytics}
              >
                <RefreshIcon spinning={isLoadingAnalytics} />
                Refresh
              </button>
            </div>
            {isLoadingAnalytics && (
              <div className="text-center p-8 text-slate-500 italic">
                Loading analytics data...
              </div>
            )}
            {!isLoadingAnalytics && !analyticsData && (
              <p className="text-center p-8 text-slate-500 italic">
                Analytics data could not be loaded.
              </p>
            )}
            {!isLoadingAnalytics && analyticsData && (
              <div className="space-y-8">
                {/* Top-level summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                </div>

                {/* User Growth Line Chart */}
                <div className="p-6 bg-white rounded-lg shadow-md">
                  <h4 className="text-lg font-semibold text-slate-700 mb-4">
                    Annotator Registrations Over Time
                  </h4>
                  {analyticsData.annotatorRegistrations.length > 0 ? (
                    <UserGrowthLineChart
                      data={analyticsData.annotatorRegistrations}
                    />
                  ) : (
                    <p className="text-slate-500 italic text-center py-10">
                      No registration data to display.
                    </p>
                  )}
                </div>

                {/* Submissions Per Exam Bar Chart */}
                <div className="p-6 bg-white rounded-lg shadow-md">
                  <h4 className="text-lg font-semibold text-slate-700 mb-4">
                    Submissions per Exam
                  </h4>
                  {analyticsData.submissionsPerExam.length > 0 ? (
                    <SubmissionsBarChart
                      data={analyticsData.submissionsPerExam}
                    />
                  ) : (
                    <p className="text-slate-500 italic text-center py-10">
                      No submission data to display.
                    </p>
                  )}
                </div>
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
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow transform hover:-translate-y-1">
      <h4 className="text-md font-medium text-slate-500 mb-1 truncate">
        {title}
      </h4>
      <p className="text-4xl font-bold text-slate-800">{value}</p>
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
