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
  images_scored?: number;
  effective_ks?: number;
  key_ks?: number;
  score_percentage?: number; // Calculated client-side
}

export interface AnnotatorInfo {
  id: number; // PK from annotators table
  liftapp_user_id: string;
  created_at: string;
  
  // Overall scores
  total_images_attempted_overall?: number;
  total_images_scored_overall?: number;
  sum_total_effective_user_keystrokes_overall?: number;
  sum_total_answer_key_keystrokes_overall?: number;
  overall_score_percentage?: number; // Calculated client-side

  // Per-exam scores: A dictionary where key is exam_code (e.g., 'baptism')
  per_exam_scores?: Record<string, UserExamScoreMetrics>;
}


export interface AnalyticsData {
  totalAnnotators: number;
  totalExams: number;
  totalImages: number;
  totalSubmittedAnnotationRows: number;
  submissionsPerExam: { name: string; submission_count: number }[];
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

// For ExamPage image tasks
export interface ImageTask {
  dbImageId: number; // Primary key from public.images table
  storage_path: string;
  original_filename: string | null;
  exam_id: number; // Foreign key to public.exams table
}

// For User Dashboard: Scores Tab
export interface UserExamScore {
  exam_code: string; // e.g., 'baptism'
  exam_name: string; // Display name, e.g., "Baptism Records"
  total_effective_user_keystrokes: number; // User's matching keystrokes
  total_answer_key_keystrokes: number;    // Total possible keystrokes in answer key
  images_attempted: number;
  images_scored: number; // Number of attempted images that had an answer key
  percentage_score?: number; // Calculated on client: (total_effective_user_keystrokes / total_answer_key_keystrokes) * 100
}

// Props for DashboardPage
export interface DashboardPageProps {
  userId: string; // This is the liftapp_user_id (string)
  annotatorDbId: number; // This is the annotators.id (integer PK)
  onLogout: () => void;
  onSelectExam: (exam: Exam) => void;
}

// Props for ExamHeader
export interface ExamHeaderProps {
  userId: string;
  onBackToDashboardClick: () => void;
  toolSettings: { guideLine: boolean; firstCharCaps: boolean; specialChars: boolean };
  onToolSettingChange: (setting: keyof ExamHeaderProps['toolSettings']) => void;
  rowsCount: number;
  progress: number;
  onSubmit: () => Promise<void>;
  isSubmittingToServer: boolean;
  currentTaskForDisplay: ImageTask | undefined;
  displayStatus: DisplayStatusType;
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
  allImageTasks: ImageTask[];
  currentImageTaskIndex: number;
  onNavigateImage: (direction: 1 | -1, skipLocalSave?: boolean) => Promise<void>;
  imageLoading: boolean;
  toolSettings: { guideLine: boolean };
  examName: string;
  isLoadingImageTasks: boolean;
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
  | 'Error submitting';