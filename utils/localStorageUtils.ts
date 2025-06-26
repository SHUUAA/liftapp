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
