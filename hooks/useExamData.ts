
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Exam, AnnotationRowData, AnnotationCellData, ImageTask, DisplayStatusType } from '../types';
import { supabase } from '../utils/supabase/client';
import { formatSupabaseError } from '../utils/errorUtils';
import { loadAnnotationsFromLocalStorage, saveAnnotationsToLocalStorage, removeAnnotationsFromLocalStorage } from '../utils/localStorageUtils';
import { getColumnsForExam, STORAGE_BUCKET_NAME } from '../constants';
import { generateRowId } from '../utils/examUtils';
import { useToast } from '../contexts/ToastContext';

interface UseExamDataProps {
  exam: Exam;
  annotatorDbId: number | null;
  assignedTask: ImageTask; // The single, pre-assigned image task
}

export const useExamData = ({ exam, annotatorDbId, assignedTask }: UseExamDataProps) => {
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  
  const [rows, setRows] = useState<AnnotationRowData[]>([]);
  const [displayStatus, setDisplayStatus] = useState<DisplayStatusType>('');
  const [isSubmittingToServer, setIsSubmittingToServer] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  const [currentExamDbId, setCurrentExamDbId] = useState<number | null>(exam.dbId || null);
  const { addToast } = useToast();

  const columnsForCurrentExam = useMemo(() => getColumnsForExam(exam.id), [exam.id]);
  
  const initializeNewRowsForImage = useCallback((imageTask: ImageTask): AnnotationRowData[] => {
    const initialCells: AnnotationCellData = {};
    columnsForCurrentExam.forEach(col => initialCells[col.id] = '');
    
    initialCells['image_ref'] = imageTask.original_filename || imageTask.storage_path;

    return [{ id: generateRowId(), cells: initialCells }];
  }, [exam.id, columnsForCurrentExam]);

  
  const updateRowsAndSignalChange = useCallback((newRows: AnnotationRowData[] | ((prevRows: AnnotationRowData[]) => AnnotationRowData[])) => {
    setRows(newRows);
    setHasUnsavedChanges(true);
    setDisplayStatus('Unsaved changes');
  }, []);

  const loadAnnotationsForImage = useCallback(async (task: ImageTask) => {
    if (!annotatorDbId) {
      setRows(initializeNewRowsForImage(task));
      setDisplayStatus('');
      return;
    }

    const localDraft = loadAnnotationsFromLocalStorage(annotatorDbId, exam.id, task.dbImageId);
    if (localDraft) {
      setRows(localDraft);
      setHasUnsavedChanges(false); 
      setDisplayStatus('Draft loaded locally');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('annotation_rows')
        .select('client_row_id, row_data, is_submitted')
        .eq('annotator_id', annotatorDbId)
        .eq('image_id', task.dbImageId)
        .eq('is_submitted', true);

      if (error) throw error;

      if (data && data.length > 0) {
        setRows(data.map(dbRow => ({
          id: dbRow.client_row_id,
          cells: dbRow.row_data as AnnotationCellData,
        })));
        setDisplayStatus('Previously submitted data loaded');
      } else {
        setRows(initializeNewRowsForImage(task));
        setDisplayStatus('');
      }
    } catch (e: any) {
      const formattedError = formatSupabaseError(e);
      addToast({ type: 'error', message: `Could not load annotations: ${formattedError.message}` });
      setRows(initializeNewRowsForImage(task));
      setDisplayStatus('');
    } finally {
        setHasUnsavedChanges(false);
    }
  }, [annotatorDbId, exam.id, initializeNewRowsForImage, addToast]);


  // Main effect to load image URL and annotations when the assigned task is available
  useEffect(() => {
    const loadExamData = async () => {
        if (!assignedTask) {
            setCurrentImageUrl(null);
            setRows([]);
            return;
        }

        setImageLoading(true);
        setCurrentExamDbId(assignedTask.exam_id);
        setCurrentImageUrl(null);

        try {
            const { data: urlData } = supabase.storage
                .from(STORAGE_BUCKET_NAME)
                .getPublicUrl(assignedTask.storage_path);

            if (urlData && urlData.publicUrl) {
                setCurrentImageUrl(urlData.publicUrl);
            } else {
                throw new Error(`Could not construct URL for image: ${assignedTask.storage_path}.`);
            }
            
            await loadAnnotationsForImage(assignedTask);

        } catch (e: any) {
            const formattedError = formatSupabaseError(e);
            addToast({ type: 'error', message: `Error loading exam data: ${formattedError.message}` });
            setCurrentImageUrl(null);
        } finally {
            setImageLoading(false);
        }
    };
    
    loadExamData();

  }, [assignedTask, loadAnnotationsForImage, addToast]);

  const submitAllExamAnnotations = useCallback(async () => {
    if (!annotatorDbId || !currentExamDbId || !assignedTask) {
        addToast({ type: 'error', message: "User session error (annotator, exam, or task ID missing). Cannot submit." });
        setDisplayStatus('Error submitting');
        return false;
    }

    setIsSubmittingToServer(true);
    setDisplayStatus('Submitting...');

    try {
        const rowsToUpsert = [];
        for (const clientRow of rows) {
            const hasData = Object.values(clientRow.cells).some(val => val && String(val).trim() !== '' && val !== assignedTask.original_filename);
            if (hasData) {
                rowsToUpsert.push({
                    annotator_id: annotatorDbId,
                    image_id: assignedTask.dbImageId,
                    row_data: { ...clientRow.cells },
                    client_row_id: clientRow.id,
                    is_submitted: true,
                });
            }
        }
        
        if (rowsToUpsert.length > 0) {
            const { error: saveError } = await supabase.from('annotation_rows').upsert(
                rowsToUpsert,
                { onConflict: 'annotator_id, image_id, client_row_id' }
            );

            if (saveError) {
              const formattedError = formatSupabaseError(saveError);
              addToast({ type: 'error', message: `Error submitting data: ${formattedError.message}`});
              setDisplayStatus('Error submitting');
              setIsSubmittingToServer(false);
              return false;
            }
        }

        removeAnnotationsFromLocalStorage(annotatorDbId, exam.id, assignedTask.dbImageId);
        
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setDisplayStatus(`Submitted at ${currentTime}`);
        setHasUnsavedChanges(false);
        setIsSubmittingToServer(false);
        return true;
    } catch (error: any) {
        const formattedError = formatSupabaseError(error);
        addToast({ type: 'error', message: `Failed to submit data: ${formattedError.message}` });
        setDisplayStatus('Error submitting');
        setIsSubmittingToServer(false);
        return false;
    }
  }, [rows, annotatorDbId, currentExamDbId, assignedTask, exam.id, addToast]);
  
  const persistDraft = useCallback(() => {
    if (hasUnsavedChanges && annotatorDbId && assignedTask) {
        saveAnnotationsToLocalStorage(annotatorDbId, exam.id, assignedTask.dbImageId, rows);
        setHasUnsavedChanges(false); 
        setDisplayStatus('Draft saved locally'); 
        setTimeout(() => setDisplayStatus(prev => prev === 'Draft saved locally' ? '' : prev), 2000);
    }
  }, [hasUnsavedChanges, annotatorDbId, exam.id, assignedTask, rows]);

  return {
    currentImageUrl,
    imageLoading,
    rows,
    setRows: updateRowsAndSignalChange,
    displayStatus,
    setDisplayStatus, 
    isSubmittingToServer,
    setIsSubmittingToServer,
    hasUnsavedChanges, 
    submitAllExamAnnotations,
    persistDraft,
    currentTaskForDisplay: assignedTask, // The current task is always the single assigned task
    currentExamDbId,
  };
};
