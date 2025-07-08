import { AnnotationCellData } from "./types";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      annotators: {
        Row: {
          id: number
          liftapp_user_id: string
          created_at: string
          overall_completion_date: string | null
        }
        Insert: {
          id?: number
          liftapp_user_id: string
          created_at?: string
          overall_completion_date?: string | null
        }
        Update: {
          id?: number
          liftapp_user_id?: string
          created_at?: string
          overall_completion_date?: string | null
        }
      }
      user_exam_completions: {
        Row: {
          id: number
          annotator_id: number
          exam_id: number
          assigned_image_id: number
          status: "started" | "submitted" | "timed_out"
          completed_at: string | null
          duration_seconds: number | null
          retake_count: number
          total_effective_keystrokes: number | null
          total_answer_key_keystrokes: number | null
          exams?: { exam_code: string; name: string } | null
        }
        Insert: {
          id?: number
          annotator_id: number
          exam_id: number
          assigned_image_id: number
          status?: "started" | "submitted" | "timed_out"
          completed_at?: string | null
          duration_seconds?: number | null
          retake_count?: number
          total_effective_keystrokes?: number | null
          total_answer_key_keystrokes?: number | null
        }
        Update: {
          id?: number
          annotator_id?: number
          exam_id?: number
          assigned_image_id?: number
          status?: "started" | "submitted" | "timed_out"
          completed_at?: string | null
          duration_seconds?: number | null
          retake_count?: number
          total_effective_keystrokes?: number | null
          total_answer_key_keystrokes?: number | null
        }
      }
      images: {
        Row: {
          id: number
          storage_path: string
          original_filename: string | null
          exam_id: number
          uploader_profile_id?: string | null
        }
        Insert: {
          id?: number
          storage_path: string
          original_filename?: string | null
          exam_id: number
          uploader_profile_id?: string | null
        }
        Update: {
          id?: number
          storage_path?: string
          original_filename?: string | null
          exam_id?: number
          uploader_profile_id?: string | null
        }
      }
      exams: {
        Row: {
          id: number
          exam_code: string
          name: string
        }
        Insert: {
          id?: number
          exam_code: string
          name: string
        }
        Update: {
          id?: number
          exam_code?: string
          name?: string
        }
      }
      annotation_rows: {
        Row: {
          id: number
          annotator_id: number
          image_id: number
          client_row_id: string
          row_data: AnnotationCellData
          is_submitted: boolean
          admin_profile_id?: string | null
        }
        Insert: {
          id?: number
          annotator_id: number
          image_id: number
          client_row_id: string
          row_data: AnnotationCellData
          is_submitted?: boolean
          admin_profile_id?: string | null
        }
        Update: {
          id?: number
          annotator_id?: number
          image_id?: number
          client_row_id?: string
          row_data?: AnnotationCellData
          is_submitted?: boolean
          admin_profile_id?: string | null
        }
      }
      answer_key_rows: {
        Row: {
          id: number
          image_id: number
          admin_profile_id: string
          row_data: AnnotationCellData
          client_row_id: string
        }
        Insert: {
          id?: number
          image_id: number
          admin_profile_id: string
          row_data: AnnotationCellData
          client_row_id: string
        }
        Update: {
          id?: number
          image_id?: number
          admin_profile_id?: string
          row_data?: AnnotationCellData
          client_row_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      start_exam_and_assign_image: {
        Args: {
          p_annotator_id: number
          p_exam_id: number
          p_excluded_image_ids: number[]
        }
        Returns: {
            db_image_id: number;
            storage_path: string;
            original_filename: string | null;
            exam_id: number;
        }[]
      }
      get_answer_key_summaries: {
        Args: {}
        Returns: {
            db_image_id: number;
            storage_path: string;
            original_filename: string | null;
            db_exam_id: number;
            exam_code: string;
            exam_name: string;
            answer_row_count: number;
        }[]
      }
      get_submissions_per_exam: {
        Args: {}
        Returns: {
          name: string
          submission_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
