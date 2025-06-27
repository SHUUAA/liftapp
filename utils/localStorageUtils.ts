import { AnnotationRowData } from '../types';

export const getLocalStorageKey = (annotatorDbId: number, examCode: string, imageDbId: number): string => {
  return `liftapp_draft_${annotatorDbId}_exam_${examCode}_image_${imageDbId}`;
};

export const saveAnnotationsToLocalStorage = (annotatorDbId: number, examCode: string, imageDbId: number, annotations: AnnotationRowData[]): void => {
  if (!annotatorDbId) return;
  try {
    const key = getLocalStorageKey(annotatorDbId, examCode, imageDbId);
    localStorage.setItem(key, JSON.stringify(annotations));
  } catch (error) {
    console.error("Error saving annotations to local storage:", error);
    // Consider a more user-friendly notification if this is critical
    // alert("Could not save draft to local storage. Your browser might be in private mode or storage is full.");
  }
};

export const loadAnnotationsFromLocalStorage = (annotatorDbId: number, examCode: string, imageDbId: number): AnnotationRowData[] | null => {
  if (!annotatorDbId) return null;
  try {
    const key = getLocalStorageKey(annotatorDbId, examCode, imageDbId);
    const storedData = localStorage.getItem(key);
    return storedData ? JSON.parse(storedData) : null;
  } catch (error) {
    console.error("Error loading annotations from local storage:", error);
    return null;
  }
};

export const removeAnnotationsFromLocalStorage = (annotatorDbId: number, examCode: string, imageDbId: number): void => {
  if (!annotatorDbId) return;
  try {
    const key = getLocalStorageKey(annotatorDbId, examCode, imageDbId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Error removing annotations from local storage:", error);
  }
};

// Functions for exam completion status
export const getExamCompletedKey = (annotatorDbId: number, examCode: string): string => {
  return `liftapp_exam_completed_${annotatorDbId}_exam_${examCode}`;
};

export const markExamAsCompletedInLocalStorage = (annotatorDbId: number, examCode: string): void => {
  if (!annotatorDbId) return;
  try {
    const key = getExamCompletedKey(annotatorDbId, examCode);
    localStorage.setItem(key, 'true');
    console.log(`Exam ${examCode} marked as completed for annotator ${annotatorDbId}`);
  } catch (error) {
    console.error("Error marking exam as completed in local storage:", error);
  }
};

export const checkIfExamCompleted = (annotatorDbId: number, examCode: string): boolean => {
  if (!annotatorDbId) return false;
  try {
    const key = getExamCompletedKey(annotatorDbId, examCode);
    const result = localStorage.getItem(key) === 'true';
    // console.log(`Checking completion for exam ${examCode}, annotator ${annotatorDbId}: ${result}`);
    return result;
  } catch (error) {
    console.error("Error checking exam completion status from local storage:", error);
    return false;
  }
};

export const clearExamCompletedInLocalStorage = (annotatorDbId: number, examCode: string): void => {
  if (!annotatorDbId) return;
  try {
    const key = getExamCompletedKey(annotatorDbId, examCode);
    localStorage.removeItem(key);
    console.log(`Cleared 'completed' status for exam ${examCode} for annotator ${annotatorDbId} from local storage.`);
  } catch (error) {
    console.error("Error clearing exam completion status from local storage:", error);
  }
};
