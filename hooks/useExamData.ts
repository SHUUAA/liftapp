import { useState, useEffect, useCallback, useRef } from 'react';
import { Exam, AnnotationRowData, AnnotationCellData, ImageTask, DisplayStatusType } from '../types';
import { supabase } from '../utils/supabase/client';
import { formatSupabaseError } from '../utils/errorUtils';
import { loadAnnotationsFromLocalStorage, saveAnnotationsToLocalStorage, removeAnnotationsFromLocalStorage } from '../utils/localStorageUtils';
import { ANNOTATION_TABLE_COLUMNS, STORAGE_BUCKET_NAME } from '../constants';
import { generateRowId } from '../utils/examUtils';

interface UseExamDataProps {
  exam: Exam;
  annotatorDbId: number | null;
  onBackToDashboard: () => void;
}

export const useExamData = ({ exam, annotatorDbId, onBackToDashboard }: UseExamDataProps) => {
  const [allImageTasks, setAllImageTasks] = useState<ImageTask[]>([]);
  const [currentImageTaskIndex, setCurrentImageTaskIndex] = useState<number>(-1);
  const [isLoadingImageTasks, setIsLoadingImageTasks] = useState<boolean>(true);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  
  const [rows, setRows] = useState<AnnotationRowData[]>([]);
  const [displayStatus, setDisplayStatus] = useState<DisplayStatusType>('');
  const [isSubmittingToServer, setIsSubmittingToServer] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  const currentExamDbIdRef = useRef<number | null>(exam.dbId || null);

  const initializeNewRowsForImage = useCallback((imageTask?: ImageTask): AnnotationRowData[] => {
    const initialCells: AnnotationCellData = {};
    ANNOTATION_TABLE_COLUMNS.forEach(col => initialCells[col.id] = '');
    
    const currentTaskToUse = imageTask || (allImageTasks.length > 0 && currentImageTaskIndex !== -1 && allImageTasks[currentImageTaskIndex]) || undefined;

    if (currentTaskToUse) {
      initialCells['image_ref'] = currentTaskToUse.original_filename || currentTaskToUse.storage_path;
    } else {
      initialCells['image_ref'] = `doc_${exam.id}_default`;
    }
    return [{ id: generateRowId(), cells: initialCells }];
  }, [allImageTasks, currentImageTaskIndex, exam.id]);
  
  const updateRowsAndSignalChange = useCallback((newRows: AnnotationRowData[] | ((prevRows: AnnotationRowData[]) => AnnotationRowData[])) => {
    setRows(newRows);
    setHasUnsavedChanges(true);
    setDisplayStatus('Unsaved changes');
  }, []);


  const loadAnnotationsForCurrentImage = useCallback(async () => {
    if (!annotatorDbId || currentImageTaskIndex === -1 || !allImageTasks[currentImageTaskIndex]) {
      setRows(initializeNewRowsForImage(allImageTasks[currentImageTaskIndex]));
      setHasUnsavedChanges(false);
      setDisplayStatus('');
      return;
    }
    const currentTask = allImageTasks[currentImageTaskIndex];

    const localDraft = loadAnnotationsFromLocalStorage(annotatorDbId, exam.id, currentTask.dbImageId);
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
        .eq('image_id', currentTask.dbImageId)
        .eq('is_submitted', true);

      if (error) {
        const formattedError = formatSupabaseError(error);
        alert(`Error fetching annotations: ${formattedError.message}`);
        setRows(initializeNewRowsForImage(currentTask));
        setDisplayStatus('');
      } else if (data && data.length > 0) {
        setRows(data.map(dbRow => ({
          id: dbRow.client_row_id,
          cells: dbRow.row_data as AnnotationCellData,
        })));
        setDisplayStatus('Previously submitted data loaded');
      } else {
        setRows(initializeNewRowsForImage(currentTask));
        setDisplayStatus('');
      }
    } catch (e: any) {
      const formattedError = formatSupabaseError(e);
      alert(`An unexpected error occurred while loading annotations: ${formattedError.message}`);
      setRows(initializeNewRowsForImage(currentTask));
      setDisplayStatus('');
    }
    setHasUnsavedChanges(false);
  }, [annotatorDbId, currentImageTaskIndex, allImageTasks, exam.id, initializeNewRowsForImage]);

  useEffect(() => {
    const fetchExamAndImageTasks = async () => {
      setIsLoadingImageTasks(true);
      setAllImageTasks([]);
      setCurrentImageTaskIndex(-1);
      setRows([]); 
      setDisplayStatus('');
      currentExamDbIdRef.current = exam.dbId || null;


      if (!currentExamDbIdRef.current) {
          const { data: examData, error: examError } = await supabase
              .from('exams')
              .select('id')
              .eq('exam_code', exam.id)
              .single();

          if (examError || !examData) {
              const formattedExamError = formatSupabaseError(examError);
              alert(`Critical Error: Could not load configuration for exam '${exam.name}'.\n${formattedExamError.message}`);
              setIsLoadingImageTasks(false);
              onBackToDashboard(); 
              return;
          }
          currentExamDbIdRef.current = examData.id;
      }
      
      const examDbId = currentExamDbIdRef.current;

      const { data: imageTasksData, error: imageTasksError } = await supabase
        .from('images')
        .select('id, storage_path, original_filename, exam_id')
        .eq('exam_id', examDbId);

      if (imageTasksError) {
        const formattedImageTasksError = formatSupabaseError(imageTasksError);
        alert(`Error fetching images for exam '${exam.name}': ${formattedImageTasksError.message}`);
        setIsLoadingImageTasks(false);
        return;
      }

      if (imageTasksData && imageTasksData.length > 0) {
        const tasks: ImageTask[] = imageTasksData.map(img => ({
            dbImageId: img.id,
            storage_path: img.storage_path,
            original_filename: img.original_filename,
            exam_id: img.exam_id,
        }));
        setAllImageTasks(tasks);
        setCurrentImageTaskIndex(0); 
      } else {
        alert(`No images found for exam: ${exam.name}. Please contact an administrator to add images.`);
        setAllImageTasks([]);
        setCurrentImageTaskIndex(-1);
      }
      setIsLoadingImageTasks(false);
    };

    fetchExamAndImageTasks();
  }, [exam.id, exam.name, exam.dbId, onBackToDashboard]); 

  useEffect(() => {
    const loadImageAndAnnotations = async () => {
        if (currentImageTaskIndex === -1 || allImageTasks.length === 0 || !allImageTasks[currentImageTaskIndex]) {
            setCurrentImageUrl(null);
            setRows(initializeNewRowsForImage()); 
            setHasUnsavedChanges(false);
            setDisplayStatus('');
            return;
        }

        const currentTask = allImageTasks[currentImageTaskIndex];
        setImageLoading(true);
        setCurrentImageUrl(null); 

        try {
            const result = supabase.storage
                .from(STORAGE_BUCKET_NAME)
                .getPublicUrl(currentTask.storage_path);

            if (result.data && result.data.publicUrl) {
                setCurrentImageUrl(result.data.publicUrl);
            } else {
                alert(`Could not construct URL for image: ${currentTask.storage_path}.`);
                setCurrentImageUrl(null);
            }
        } catch (e: any) {
            const formattedError = formatSupabaseError(e);
            alert(`An unexpected error occurred while preparing image URL: ${formattedError.message}`);
            setCurrentImageUrl(null);
        } finally {
            setImageLoading(false);
        }
        await loadAnnotationsForCurrentImage(); 
    };
    
    if (!isLoadingImageTasks) { 
       loadImageAndAnnotations();
    }
  }, [currentImageTaskIndex, allImageTasks, isLoadingImageTasks, loadAnnotationsForCurrentImage, initializeNewRowsForImage]);

  const submitCurrentAnnotations = useCallback(async () => {
    if (!annotatorDbId) {
      alert("User session error (annotator ID missing). Cannot submit data.");
      setDisplayStatus('Error submitting');
      return false;
    }
    if (currentImageTaskIndex === -1 || !allImageTasks[currentImageTaskIndex]) {
      alert("No active image task. Cannot submit data.");
      setDisplayStatus('Error submitting');
      return false;
    }

    setIsSubmittingToServer(true);
    setDisplayStatus('Submitting...');
    const currentTask = allImageTasks[currentImageTaskIndex];

    try {
      const rowsToSave = rows.map(clientRow => ({
        annotator_id: annotatorDbId,
        image_id: currentTask.dbImageId,
        row_data: { ...clientRow.cells }, 
        client_row_id: clientRow.id, 
        is_submitted: true,
      }));

      if (rowsToSave.length > 0) {
          const { error: saveError } = await supabase.from('annotation_rows').upsert(
            rowsToSave, 
            { onConflict: 'annotator_id, image_id, client_row_id' }
          ); 

          if (saveError) {
            const formattedError = formatSupabaseError(saveError);
             let detailedMessage = `Error submitting data: ${formattedError.message}`;
            if(!formattedError.isNetworkError) {
                 detailedMessage += `\n\nThis could be an issue with your database setup or Row-Level Security (RLS) policies on the 'annotation_rows' table. Check console for details.`;
            }
            console.error('Full submission error details:', saveError); // Log for admin/dev
            setDisplayStatus('Error submitting');
            alert(detailedMessage);
            setIsSubmittingToServer(false);
            return false;
          }
      }
      
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setDisplayStatus(`Submitted at ${currentTime}`);
      setHasUnsavedChanges(false);
      removeAnnotationsFromLocalStorage(annotatorDbId, exam.id, currentTask.dbImageId);
      setIsSubmittingToServer(false);
      return true;
    } catch (error: any) {
      const formattedError = formatSupabaseError(error);
      alert(`Failed to submit data: ${formattedError.message}`);
      setDisplayStatus('Error submitting');
      setIsSubmittingToServer(false);
      return false;
    }
  }, [rows, annotatorDbId, currentImageTaskIndex, allImageTasks, exam.id]);
  
  const persistDraft = useCallback(() => {
    if (hasUnsavedChanges && annotatorDbId && currentImageTaskIndex !== -1 && allImageTasks[currentImageTaskIndex]) {
        const currentTask = allImageTasks[currentImageTaskIndex];
        saveAnnotationsToLocalStorage(annotatorDbId, exam.id, currentTask.dbImageId, rows);
        setHasUnsavedChanges(false); 
        setDisplayStatus('Draft saved locally'); 
        setTimeout(() => setDisplayStatus(prev => prev === 'Draft saved locally' ? '' : prev), 2000);
    }
  }, [hasUnsavedChanges, annotatorDbId, exam.id, currentImageTaskIndex, allImageTasks, rows]);

  const navigateImage = async (direction: 1 | -1, skipLocalSave = false) => {
    if (hasUnsavedChanges && !skipLocalSave) {
        persistDraft();
    }
    const newIndex = currentImageTaskIndex + direction;
    if (newIndex >= 0 && newIndex < allImageTasks.length) {
        setCurrentImageTaskIndex(newIndex);
    }
  };

  const currentTaskForDisplay = allImageTasks[currentImageTaskIndex];

  return {
    allImageTasks,
    currentImageTaskIndex,
    isLoadingImageTasks,
    currentImageUrl,
    imageLoading,
    rows,
    setRows: updateRowsAndSignalChange, // Use the wrapped setter
    displayStatus,
    setDisplayStatus, // Allow ExamPage to override if needed for specific non-data messages
    isSubmittingToServer,
    hasUnsavedChanges, // Expose for beforeUnload logic in ExamPage
    setHasUnsavedChanges, // Expose for cell change logic
    submitCurrentAnnotations,
    navigateImage,
    persistDraft,
    currentTaskForDisplay,
    initializeNewRowsForImage, // Expose if ExamPage needs to manually init rows outside task changes
  };
};
