
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Exam, AnnotationRowData, AnnotationCellData, ImageSettings, DisplayStatusType, UserExamCompletionRecord } from '../types';
import { ANNOTATION_TABLE_COLUMNS } from '../constants';
import { useExamData } from '../hooks/useExamData';
import { generateRowId } from '../utils/examUtils';
import ExamHeader from './exam/ExamHeader';
import ImageViewer from './exam/ImageViewer';
import AnnotationTable from './exam/AnnotationTable';
import { markExamAsCompletedInLocalStorage, checkIfExamCompleted } from '../utils/localStorageUtils';
import { supabase } from '../utils/supabase/client';
import { formatSupabaseError } from '../utils/errorUtils';

const SPECIAL_CHARS_MAP: Record<string, { lower: string; upper: string }> = {
  a: { lower: 'á', upper: 'Á' }, e: { lower: 'é', upper: 'É' },
  i: { lower: 'í', upper: 'Í' }, o: { lower: 'ó', upper: 'Ó' },
  u: { lower: 'ú', upper: 'Ú' }, n: { lower: 'ñ', upper: 'Ñ' },
  c: { lower: 'ç', upper: 'Ç' },
};

const EXAM_DURATION_SECONDS = 20 * 60; // 20 minutes

interface ExamPageProps {
  userId: string;
  exam: Exam;
  annotatorDbId: number | null;
  onBackToDashboard: () => void;
}

const ExamPage: React.FC<ExamPageProps> = ({ userId, exam, annotatorDbId, onBackToDashboard }) => {
  const {
    allImageTasks,
    currentImageTaskIndex,
    isLoadingImageTasks,
    currentImageUrl,
    imageLoading,
    rows,
    setRows: setRowsFromHook,
    displayStatus,
    setDisplayStatus: setDisplayStatusFromHook,
    isSubmittingToServer,
    setIsSubmittingToServer, 
    hasUnsavedChanges,
    submitAllExamAnnotations,
    navigateImage,
    persistDraft,
    currentTaskForDisplay,
    currentExamDbId, 
  } = useExamData({ exam, annotatorDbId, onBackToDashboard });

  const initialImageSettings: ImageSettings = { zoom: 61, contrast: 100, brightness: 100, position: { x: 0, y: -30 } };
  const [imageSettings, setImageSettings] = useState<ImageSettings>(initialImageSettings);
  
  const [toolSettings, setToolSettings] = useState({ guideLine: false, firstCharCaps: false, specialChars: false });
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);
  const focusedCellRef = useRef<{rowIndex: number, colId: string, inputElement: HTMLInputElement} | null>(null);

  const [timeLeft, setTimeLeft] = useState<number>(EXAM_DURATION_SECONDS);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const timerIdRef = useRef<number | null>(null);
  const isExamClosingRef = useRef(false);

  const recordExamCompletionInDb = async (durationSeconds: number, status: 'submitted' | 'timed_out') => {
    if (!annotatorDbId || !currentExamDbId) {
      console.error("DEBUG: Cannot record exam completion: annotatorDbId or currentExamDbId is missing.", { annotatorDbId, currentExamDbId });
      alert("Error: Could not record exam completion details due to missing identifiers. (See console for details)");
      return;
    }

    const completionRecord: UserExamCompletionRecord = {
      annotator_id: annotatorDbId,
      exam_id: currentExamDbId,
      duration_seconds: durationSeconds,
      status: status,
    };
    
    console.log("DEBUG: Attempting to record exam completion with data:", completionRecord);

    try {
      const { data, error } = await supabase
        .from('user_exam_completions')
        .upsert(completionRecord, { onConflict: 'annotator_id, exam_id' }); 

      if (error) {
        const formattedError = formatSupabaseError(error);
        console.error("DEBUG: Error saving exam completion to DB:", formattedError.message, error);
        alert(`Error: Your work was submitted, but there was an issue saving the exam completion details (duration/status) to the database: ${formattedError.message}\n(See console for more details)`);
      } else {
        console.log("DEBUG: Exam completion and duration recorded successfully in DB.", data);
      }
    } catch (e: any) {
      const formattedError = formatSupabaseError(e);
      console.error("DEBUG: Exception saving exam completion to DB:", formattedError.message, e);
      alert(`Error: Your work was submitted, but there was an issue saving the exam completion details (exception): ${formattedError.message}\n(See console for more details)`);
    }
  };


  const handleExamClosure = useCallback(async (status: 'submitted' | 'timed_out') => {
    if (isExamClosingRef.current) return;
    isExamClosingRef.current = true;
    setIsTimerActive(false);
    if (timerIdRef.current) clearInterval(timerIdRef.current);

    const durationTakenSeconds = EXAM_DURATION_SECONDS - timeLeft;

    if (annotatorDbId && currentExamDbId) {
      // If the exam timed out, we need to perform the final submission now.
      if (status === 'timed_out') {
          console.log("DEBUG: Exam timed out, submitting all work.");
          await submitAllExamAnnotations();
      }
      
      // The `finalize_exam_annotations` RPC has been removed as it's redundant and caused duplication issues.
      // The new `submitAllExamAnnotations` function now handles submitting all work for the entire exam.
      
      await recordExamCompletionInDb(durationTakenSeconds, status);
      markExamAsCompletedInLocalStorage(annotatorDbId, exam.id);
    } else {
      console.warn("DEBUG: annotatorDbId or currentExamDbId is null, cannot finalize or record exam completion or mark in localStorage.");
    }
    
    let message = "";
    if (status === 'submitted') {
      message = `All work for the ${exam.name} exam has been submitted and the exam is now closed. Time taken: ${Math.floor(durationTakenSeconds / 60)}m ${durationTakenSeconds % 60}s. Thank you!`;
    } else { // timed_out
      message = `Time is up! All your work has been automatically submitted. The exam is now closed. Total time elapsed: ${Math.floor(durationTakenSeconds / 60)}m ${durationTakenSeconds % 60}s.`;
    }
    alert(message);
    onBackToDashboard();
  }, [annotatorDbId, exam.id, exam.name, onBackToDashboard, persistDraft, timeLeft, recordExamCompletionInDb, currentExamDbId, submitAllExamAnnotations]);


  useEffect(() => {
    if (!isLoadingImageTasks && annotatorDbId) {
      if (checkIfExamCompleted(annotatorDbId, exam.id)) {
        alert(`You have already completed the ${exam.name} exam. Returning to dashboard.`);
        onBackToDashboard();
        return;
      }
      if (allImageTasks.length > 0 && currentImageTaskIndex !== -1 && !isTimerActive && !isExamClosingRef.current) {
        setIsTimerActive(true);
      }
    }
  }, [isLoadingImageTasks, allImageTasks, currentImageTaskIndex, annotatorDbId, exam.id, exam.name, onBackToDashboard, isTimerActive]);

  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      timerIdRef.current = window.setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } else if (timeLeft <= 0 && isTimerActive && !isExamClosingRef.current) {
      handleExamClosure('timed_out');
    }
    return () => {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
    };
  }, [isTimerActive, timeLeft, handleExamClosure]);
  
  useEffect(() => {
    setImageSettings(prev => ({...prev, position: { x: 0, y: -30 }}));
    setActiveRowIndex(0);
    isExamClosingRef.current = false; 
  }, [currentTaskForDisplay]);


  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isExamClosingRef.current) { 
        persistDraft();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (hasUnsavedChanges && !isExamClosingRef.current) {
          persistDraft();
      }
    };
  }, [hasUnsavedChanges, persistDraft]);

  const handleAddRow = useCallback((focusNewRow = true) => {
    const currentTask = currentTaskForDisplay;
    const imageRef = currentTask ? (currentTask.original_filename || currentTask.storage_path) : `doc_${exam.id}_default`;

    const newCells: AnnotationCellData = ANNOTATION_TABLE_COLUMNS.reduce((acc, col) => {
        acc[col.id] = col.id === 'image_ref' ? imageRef : '';
        return acc;
    }, {} as AnnotationCellData);

    const newRow: AnnotationRowData = { id: generateRowId(), cells: newCells };
    
    setRowsFromHook(prevRows => [...prevRows, newRow]);
    const newRowIndex = rows.length; 
    setActiveRowIndex(newRowIndex);

    if (focusNewRow) {
      setTimeout(() => {
        const firstEditableColIndex = ANNOTATION_TABLE_COLUMNS.findIndex(col => col.id !== 'image_ref');
        if (inputRefs.current[newRowIndex]?.[firstEditableColIndex >= 0 ? firstEditableColIndex : 0]) {
            inputRefs.current[newRowIndex][firstEditableColIndex >= 0 ? firstEditableColIndex : 0]?.focus();
        }
      }, 0);
    }
  }, [rows.length, exam.id, currentTaskForDisplay, setRowsFromHook]); 
  
  const handleDeleteRow = useCallback((rowIndexToDelete: number) => {
    if (rows.length <= 1) { alert("Cannot delete the last remaining row."); return; }
    setRowsFromHook(prevRows => prevRows.filter((_, idx) => idx !== rowIndexToDelete));
    const newActiveIndex = Math.max(0, rowIndexToDelete - 1);
    if (rows.length - 1 === 0) setActiveRowIndex(null);
    else if (activeRowIndex === rowIndexToDelete) {
        setActiveRowIndex(newActiveIndex);
        setTimeout(() => { if (inputRefs.current[newActiveIndex]?.[0]) inputRefs.current[newActiveIndex][0]?.focus(); }, 0);
    } else if (activeRowIndex && activeRowIndex > rowIndexToDelete) setActiveRowIndex(activeRowIndex - 1);
  }, [rows, activeRowIndex, setRowsFromHook]);

  const handleCellChange = useCallback((rowIndex: number, columnId: string, value: string) => {
    let processedValue = value; 
    if (toolSettings.firstCharCaps) {
      const cellValueBeforeChange = String(rows[rowIndex]?.cells[columnId] || '');
      if (cellValueBeforeChange.length === 0 && processedValue.length > 0) processedValue = processedValue.charAt(0).toUpperCase() + processedValue.slice(1);
      else if (processedValue.length > cellValueBeforeChange.length && cellValueBeforeChange.endsWith(' ') && processedValue.charAt(cellValueBeforeChange.length) !== ' ') {
        const charAddedIndex = cellValueBeforeChange.length;
        processedValue = processedValue.substring(0, charAddedIndex) + processedValue.charAt(charAddedIndex).toUpperCase() + processedValue.substring(charAddedIndex + 1);
      }
    }
    setRowsFromHook(prevRows => prevRows.map((row, idx) => idx === rowIndex ? { ...row, cells: { ...row.cells, [columnId]: processedValue } } : row));
  }, [toolSettings.firstCharCaps, rows, setRowsFromHook]);
  
  const handleImageZoomChange = (value: number) => setImageSettings(prev => ({ ...prev, zoom: Math.max(10, Math.min(300, value)) }));
  const handleImageSettingChange = (setting: keyof Omit<ImageSettings, 'position' | 'zoom'>, value: number) => setImageSettings(prev => ({ ...prev, [setting]: Math.max(0, Math.min(200, value)) }));
  const handleImagePositionChange = (newPosition: { x: number; y: number }) => setImageSettings(prev => ({ ...prev, position: newPosition }));
  const handleResetImageSettings = () => setImageSettings(initialImageSettings);

  const handleToolSettingChange = (setting: keyof typeof toolSettings) => setToolSettings(prev => ({ ...prev, [setting]: !prev[setting] }));

  const handleSubmitAndCloseExam = async () => {
    if (isExamClosingRef.current) return;
    if (!annotatorDbId) {
        alert("User session error. Cannot submit."); return;
    }
    
    setIsSubmittingToServer(true); 
    const submissionSuccessful = await submitAllExamAnnotations(); 

    if (submissionSuccessful) {
        await handleExamClosure('submitted');
    } else {
        setIsSubmittingToServer(false);
        alert(`Submission failed for the exam. The exam remains open. Please try again or contact support.`);
        if(timeLeft > 0 && !isTimerActive && !isExamClosingRef.current) setIsTimerActive(true); 
    }
  };
  
  const handleNavigateImageWithPersistence = async (direction: 1 | -1) => {
    if (isExamClosingRef.current) return;
    await navigateImage(direction, false); 
    setImageSettings(prev => ({...prev, position: {x:0, y:-30}}));
  };


  const filledCells = useMemo(() => rows.reduce((acc, row) => acc + Object.values(row.cells).filter(cell => (cell?.toString() || '').trim() !== '').length, 0), [rows]);
  const totalCells = useMemo(() => rows.length * ANNOTATION_TABLE_COLUMNS.length, [rows]);
  const emptyCells = totalCells - filledCells;
  const progress = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Logic for special character insertion
      if (toolSettings.specialChars && event.ctrlKey && event.altKey && focusedCellRef.current) {
        const charKey = event.key.toLowerCase();
        if (SPECIAL_CHARS_MAP[charKey]) {
          event.preventDefault();
          const { lower, upper } = SPECIAL_CHARS_MAP[charKey];
          const charToInsert = event.shiftKey ? upper : lower;
          
          const { rowIndex, colId, inputElement } = focusedCellRef.current;
          const { selectionStart, selectionEnd, value } = inputElement;

          if (selectionStart !== null && selectionEnd !== null) {
            const newValue = value.substring(0, selectionStart) + charToInsert + value.substring(selectionEnd);
            
            // Directly update the state, bypassing handleCellChange to avoid conflicts with other features like CapsLock.
            setRowsFromHook(prevRows => prevRows.map((row, idx) =>
              idx === rowIndex ? { ...row, cells: { ...row.cells, [colId]: newValue } } : row
            ));

            // Set cursor position after update
            setTimeout(() => {
              if (inputElement) {
                inputElement.focus();
                inputElement.selectionStart = inputElement.selectionEnd = selectionStart + 1;
              }
            }, 0);
          }
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [toolSettings.specialChars, setRowsFromHook]); // This hook is now self-contained and efficient.

  const handleTableKeyDown = useCallback((event: React.KeyboardEvent<HTMLTableSectionElement>) => {
    // This function is for keydown events specifically within the table structure, handled by AnnotationTable.tsx inputs.
  }, []);


  if (isLoadingImageTasks && !currentTaskForDisplay && !currentExamDbId) { 
    return <div className="min-h-screen flex items-center justify-center"><p>Loading exam configuration...</p></div>;
  }
  if (isLoadingImageTasks && !currentTaskForDisplay) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading exam tasks...</p></div>;
  }
  
  const getDisplayStatusIcon = () => {
    if (displayStatus.startsWith('Submitted')) return '✅';
    if (displayStatus === 'Submitting...') return '💾';
    if (displayStatus === 'Error submitting') return '❌';
    if (displayStatus === 'Unsaved changes') return '✏️';
    if (displayStatus === 'Draft saved locally' || displayStatus === 'Draft loaded locally') return '📄';
    if (displayStatus === 'Previously submitted data loaded') return '✅';
    return '⏳'; 
  };

  const getDisplayStatusColor = () => {
    if (displayStatus.startsWith('Submitted') || displayStatus === 'Previously submitted data loaded') return 'bg-green-500';
    if (displayStatus === 'Submitting...') return 'bg-orange-500';
    if (displayStatus === 'Error submitting') return 'bg-red-500';
    if (displayStatus === 'Unsaved changes') return 'bg-yellow-500';
    if (displayStatus === 'Draft saved locally' || displayStatus === 'Draft loaded locally') return 'bg-blue-500';
    return 'bg-slate-400';
  }

  const handleBackToDashboardClick = () => {
    if (isExamClosingRef.current) { onBackToDashboard(); return; }

    if (hasUnsavedChanges) {
        const confirmLeave = window.confirm("You have unsaved changes for the current image. These will be saved as a draft locally if you proceed. Do you want to return to the dashboard? This will not submit the exam.");
        if (confirmLeave) {
            persistDraft();
            setIsTimerActive(false); 
            if (timerIdRef.current) clearInterval(timerIdRef.current);
            onBackToDashboard();
        }
    } else {
        const confirmLeave = window.confirm("Are you sure you want to return to the dashboard? This will not submit the exam and your timer will stop.");
        if (confirmLeave) {
            setIsTimerActive(false); 
            if (timerIdRef.current) clearInterval(timerIdRef.current);
            onBackToDashboard();
        }
    }
  };
  
  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      <ExamHeader
        userId={userId}
        onBackToDashboardClick={handleBackToDashboardClick}
        toolSettings={toolSettings}
        onToolSettingChange={handleToolSettingChange}
        rowsCount={rows.length}
        progress={progress}
        timeLeft={timeLeft}
        onSubmit={handleSubmitAndCloseExam}
        isSubmittingToServer={isSubmittingToServer}
        currentTaskForDisplay={currentTaskForDisplay}
        displayStatus={displayStatus}
      />

      <div className="flex-grow flex flex-col p-1 sm:p-2 gap-1 sm:gap-2 overflow-hidden">
        <ImageViewer
          imageSettings={imageSettings}
          onImageSettingChange={handleImageSettingChange}
          onImageZoomChange={handleImageZoomChange}
          onImagePositionChange={handleImagePositionChange}
          onResetImageSettings={handleResetImageSettings}
          currentImageUrl={currentImageUrl}
          currentTaskForDisplay={currentTaskForDisplay}
          allImageTasks={allImageTasks}
          currentImageTaskIndex={currentImageTaskIndex}
          onNavigateImage={handleNavigateImageWithPersistence}
          imageLoading={imageLoading}
          toolSettings={{ guideLine: toolSettings.guideLine }}
          examName={exam.name}
          isLoadingImageTasks={isLoadingImageTasks}
        />
        <AnnotationTable
          examName={exam.name}
          rows={rows}
          columns={ANNOTATION_TABLE_COLUMNS}
          activeRowIndex={activeRowIndex}
          onSetActiveRowIndex={setActiveRowIndex}
          onCellChange={handleCellChange}
          onAddRow={handleAddRow}
          onDeleteRow={handleDeleteRow}
          inputRefs={inputRefs}
          focusedCellRef={focusedCellRef}
          displayStatus={displayStatus}
          getDisplayStatusIcon={getDisplayStatusIcon}
          getDisplayStatusColor={getDisplayStatusColor}
          filledCells={filledCells}
          emptyCells={emptyCells}
          currentTaskForDisplay={currentTaskForDisplay}
          onTableKeyDown={handleTableKeyDown}
        />
      </div>
    </div>
  );
};

export default ExamPage;
