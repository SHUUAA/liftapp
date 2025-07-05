import React from 'react';

export type AppScreen =
  | 'USER_LOGIN'
  | 'USER_DASHBOARD'
  | 'USER_EXAM'
  | 'ADMIN_LOGIN'
  | 'ADMIN_DASHBOARD';

export type AdminTab = 'ANSWER_KEYS' | 'ANNOTATORS' | 'ANALYTICS'; 

export interface Exam {
  id: string; // e.g., 'baptism', 'marriage' (corresponds to exam_code in DB)
  name: string; // Display name, e.g., "Baptism Records"
  description: string;
  icon: React.ReactNode; // Icon for the dashboard card
  dbId?: number; // Database primary key for the exam
}

// Represents a single image task within an exam session
export interface ImageTask {
  dbImageId: number; // Primary key from public.images table
  storage_path: string;
  original_filename: string | null;
  exam_id: number; // Foreign key to public.exams table
}

export interface CompletionToOverride {
  completionId: number;
  oldImageId: number;
  oldStatus: 'submitted' | 'timed_out';
  oldDuration: number | null;
  oldCompletedAt: string | null;
  oldRetakeCount: number;
  oldEffectiveKeystrokes: number | null;
  oldTotalKeystrokes: number | null;
}

// Represents an active, timed exam session for a user
export interface ActiveExamSession {
  exam: Exam;
  assignedTask: ImageTask;
  sessionEndTime: number; // UTC timestamp (e.g., from Date.now()) when the session expires
  annotatorDbId: number;
  userId: string;
  completionToOverride?: CompletionToOverride | null;
}

export interface AnnotationColumn {
  id: string; // Unique identifier for the column, e.g., 'event_D'
  label: string; // Display name for the column header, e.g., 'Event_D'
  type: 'text' | 'number' | 'date'; // Input type, can be expanded
  width?: string; // Optional width for the column e.g. 'w-24', 'w-48'
}

// Represents a single cell's data; keys are column IDs
export interface AnnotationCellData {
  [key: string]: string | number; // Value for a cell
}

// Represents a single row in the annotation table
export interface AnnotationRowData {
  id: string; // Unique client-side ID for the row (e.g., UUID from database or client-generated)
  cells: AnnotationCellData;
}

export interface ImageSettings {
  zoom: number;
  contrast: number;
  brightness: number;
  position: { x: number; y: number }; // Added for draggable image
}

// For Admin Dashboard: Answer Key Management
export interface AnswerKeyEntry {
  examId: string;         // Corresponds to Exam.id (e.g., 'baptism') / exam_code
  imageId: string;        // Client-side image identifier (e.g., original filename or a generated ref like storage_path)
  imageFile?: File;       // The actual file object for new uploads
  imageUrl?: string;      // URL for displaying an existing image (fetched from Supabase Storage)
  answers: AnnotationRowData[]; // Array of correct answer rows for the image
  
  dbImageId?: number;      // Primary key from public.images table
  dbExamId?: number;       // Primary key from public.exams table
}

// For displaying fetched answer key summaries in the admin dashboard list
export interface FetchedAnswerKeySummary {
  dbImageId: number;
  storagePath: string;
  originalFilename: string | null;
  dbExamId: number;
  examCode: string;
  examName: string;
  answerRowCount: number;
  imageUrl?: string; // Will be populated
}

export interface UserExamScoreMetrics {
  images_attempted?: number;
  total_effective_user_keystrokes?: number;
  total_answer_key_keystrokes?: number;
  score_percentage?: number; // Calculated client-side
  duration_seconds?: number; // Duration of the exam attempt in seconds
  retakes?: number; // Number of retakes for this specific exam
}

export interface AnnotatorInfo {
  id: number; // PK from annotators table
  liftapp_user_id: string;
  created_at: string;
  
  // Overall scores
  total_images_attempted_overall?: number;
  total_effective_user_keystrokes_overall?: number;
  total_answer_key_keystrokes_overall?: number;
  overall_score_percentage?: number; // Calculated client-side
  total_retakes_overall?: number; // New field for total retakes

  // Per-exam scores: A dictionary where key is exam_code (e.g., 'baptism')
  per_exam_scores?: Record<string, UserExamScoreMetrics>;
}


export interface AnalyticsData {
  totalAnnotators: number;
  totalExams: number;
  totalImages: number;
  totalSubmittedAnnotationRows: number;
  submissionsPerExam: { name: string; submission_count: number }[];
  annotatorRegistrations: { date: string; count: number }[];
}

// For Supabase Admin Login
export interface AdminCredentials {
  email: string;
  password: string;
}

// For Admin profile data from Supabase
export interface AdminProfile {
    id: string; // UUID from auth.users
    role: string;
    email?: string;
}

// For User Dashboard: Scores Tab
export interface UserExamScore {
  completion_id: number; // Unique ID for the exam attempt
  exam_code: string; // e.g., 'baptism'
  exam_name: string; // Display name, e.g., "Baptism Records"
  total_effective_user_keystrokes: number;
  total_answer_key_keystrokes: number;
  images_attempted: number;
  percentage_score?: number; // Calculated on client: (total_effective_user_keystrokes / total_answer_key_keystrokes) * 100
  duration_seconds?: number; // Duration of the exam attempt in seconds
  completed_at?: string; // The date and time the exam was completed
  retake_count: number; // Number of retakes
}

// Props for DashboardPage
export interface DashboardPageProps {
  userId: string; // This is the liftapp_user_id (string)
  annotatorDbId: number; // This is the annotators.id (integer PK)
  onLogout: () => void;
  onSelectExam: (exam: Exam) => void;
  activeSession: ActiveExamSession | null;
  onResumeExam: () => void;
}

// Props for AdminDashboardPage
export interface AdminDashboardPageProps {
  adminId: string;
  onAdminLogout: () => void;
}

// The info needed for the card to decide its state
export interface ExamCompletionInfo {
  isCompleted: boolean; // isCompleted means passed (score >= 90)
  score: number | null;
}

// Props for ExamCard
export interface ExamCardProps {
  exam: Exam;
  onSelectExam: (exam: Exam) => void;
  completionInfo?: ExamCompletionInfo; // New property
  activeSession: ActiveExamSession | null;
  onResumeExam: () => void;
}

export interface ExamResult {
  score: number;
  passed: boolean;
  userKeystrokes: number;
  totalKeystrokes: number;
}

// Props for ExamPage
export interface ExamPageProps {
  activeSession: ActiveExamSession;
  onBackToDashboard: () => void;
  onExamFinish: (result: ExamResult, status: 'submitted' | 'timed_out') => void;
  onRetake: () => Promise<void>;
  onCancelRetake: () => void;
}


// Props for ExamHeader
export interface ExamHeaderProps {
  userId: string;
  onBackToDashboardClick: () => void;
  onHelpClick: () => void; // Added for help modal
  toolSettings: { guideLine: boolean; firstCharCaps: boolean; specialChars: boolean };
  onToolSettingChange: (setting: keyof ExamHeaderProps['toolSettings']) => void;
  rowsCount: number;
  progress: number;
  timeLeft: number; // Added for the timer
  onSubmit: () => Promise<void>;
  isSubmittingToServer: boolean;
  currentTaskForDisplay: ImageTask | undefined;
  displayStatus: DisplayStatusType;
  isRetakeSession: boolean;
  onCancelRetakeClick: () => void;
}

// Props for ImageViewer
export interface ImageViewerProps {
  imageSettings: ImageSettings;
  onImageSettingChange: (setting: keyof Omit<ImageSettings, 'position' | 'zoom'>, value: number) => void;
  onImageZoomChange: (value: number) => void;
  onImagePositionChange: (newPosition: { x: number; y: number }) => void;
  onResetImageSettings: () => void;
  currentImageUrl: string | null;
  currentTaskForDisplay: ImageTask | undefined;
  imageLoading: boolean;
  toolSettings: { guideLine: boolean };
  examName: string;
  // Optional props for potential multi-image scenarios in the future
  allImageTasks?: ImageTask[];
  currentImageTaskIndex?: number;
  onNavigateImage?: (direction: 1 | -1) => Promise<void>;
}

// Props for AnnotationTable
export interface AnnotationTableProps {
  examName: string;
  rows: AnnotationRowData[];
  columns: AnnotationColumn[];
  activeRowIndex: number | null;
  onSetActiveRowIndex: (index: number | null) => void;
  onCellChange: (rowIndex: number, columnId: string, value: string) => void;
  onAddRow: (focusNewRow?: boolean) => void;
  onDeleteRow: (rowIndexToDelete: number) => void;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[][]>;
  focusedCellRef: React.MutableRefObject<{ rowIndex: number; colId: string; inputElement: HTMLInputElement } | null>;
  displayStatus: DisplayStatusType;
  getDisplayStatusIcon: () => string;
  getDisplayStatusColor: () => string;
  filledCells: number;
  emptyCells: number;
  currentTaskForDisplay: ImageTask | undefined;
  onTableKeyDown: (event: React.KeyboardEvent<HTMLTableSectionElement>) => void;
}

export type DisplayStatusType = 
  | '' 
  | 'Loaded' 
  | 'Unsaved changes' 
  | 'Draft saved locally'
  | 'Draft loaded locally' 
  | 'Previously submitted data loaded' 
  | 'Submitting...' 
  | `Submitted at ${string}` 
  | 'Error submitting'
  | 'Calculating score...';

// For recording exam completion in the database
export interface UserExamCompletionRecord {
  annotator_id: number;
  exam_id: number;
  assigned_image_id: number; // The image assigned for this exam session
  duration_seconds: number;
  status: 'started' | 'submitted' | 'timed_out';
  total_effective_keystrokes?: number | null;
  total_answer_key_keystrokes?: number | null;
}

// For Toast notifications
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}