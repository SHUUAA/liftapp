
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AnnotationRowData, AnnotationCellData, ImageSettings, DisplayStatusType, ExamPageProps, ExamResult } from '../types';
import { getColumnsForExam, EXAM_DURATION_SECONDS } from '../constants';
import { useExamData } from '../hooks/useExamData';
import { generateRowId } from '../utils/examUtils';
import ExamHeader from './exam/ExamHeader';
import ImageViewer from './exam/ImageViewer';
import AnnotationTable from './exam/AnnotationTable';
import { supabase } from '../utils/supabase/client';
import { formatSupabaseError } from '../utils/errorUtils';
import { useToast } from '../contexts/ToastContext';
import Modal from './common/Modal';
import { removeAnnotationsFromLocalStorage } from '../utils/localStorageUtils';

const SPECIAL_CHARS_MAP: Record<string, { lower: string; upper: string }> = {
  a: { lower: 'á', upper: 'Á' }, e: { lower: 'é', upper: 'É' },
  i: { lower: 'í', upper: 'Í' }, o: { lower: 'ó', upper: 'Ó' },
  u: { lower: 'ú', upper: 'Ú' }, n: { lower: 'ñ', upper: 'Ñ' },
  c: { lower: 'ç', upper: 'Ç' },
};

/**
 * Calculates the length of the common prefix between two strings.
 * This is a TypeScript implementation of the provided Supabase `common_prefix_length` SQL function.
 * @param s1 The first string.
 * @param s2 The second string.
 * @returns The number of matching characters from the start of the strings.
 */
const commonPrefixLength = (s1: string = '', s2: string = ''): number => {
    if (!s1 || !s2) {
        return 0;
    }
    const minLen = Math.min(s1.length, s2.length);
    let len = 0;
    for (let i = 0; i < minLen; i++) {
        if (s1[i] === s2[i]) {
            len++;
        } else {
            break; // Mismatch found, stop counting.
        }
    }
    return len;
};


const ExamPage: React.FC<ExamPageProps> = ({ activeSession, onBackToDashboard, onExamFinish, onRetake, onCancelRetake }) => {
  const { userId, exam, annotatorDbId, assignedTask, sessionEndTime, completionToOverride } = activeSession;
  
  const columnsForCurrentExam = useMemo(() => getColumnsForExam(exam.id), [exam.id]);
  const { addToast } = useToast();
  
  const {
    currentImageUrl,
    imageLoading,
    rows,
    setRows: setRowsFromHook,
    displayStatus,
    setDisplayStatus,
    isSubmittingToServer,
    setIsSubmittingToServer, 
    hasUnsavedChanges,
    submitAllExamAnnotations,
    persistDraft,
    currentTaskForDisplay,
  } = useExamData({ exam, annotatorDbId, assignedTask });

  const initialImageSettings: ImageSettings = { zoom: 20, contrast: 100, brightness: 100, position: { x: 0, y: -30 } };
  const [imageSettings, setImageSettings] = useState<ImageSettings>(initialImageSettings);
  
  const [toolSettings, setToolSettings] = useState({ guideLine: false, firstCharCaps: false, specialChars: false });
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);
  const focusedCellRef = useRef<{rowIndex: number, colId: string, inputElement: HTMLInputElement} | null>(null);

  const [now, setNow] = useState(Date.now());
  const timeLeft = Math.max(0, Math.floor((sessionEndTime - now) / 1000));
  const isExamClosingRef = useRef(false);

  const [attemptedImageIds, setAttemptedImageIds] = useState<number[]>([assignedTask.dbImageId]);

  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  useEffect(() => {
    if (!attemptedImageIds.includes(assignedTask.dbImageId)) {
        setAttemptedImageIds(prev => [...prev, assignedTask.dbImageId]);
    }
  }, [assignedTask.dbImageId, attemptedImageIds]);
  
  const handleTimeout = useCallback(async () => {
    if (isExamClosingRef.current) return;
    isExamClosingRef.current = true;
    
    setDisplayStatus('Calculating score...');
    const submissionSuccessful = await submitAllExamAnnotations();
    if (submissionSuccessful) {
        // Fetch answer key to calculate final score
        const { data: answerRowsData } = await supabase
            .from('answer_key_rows')
            .select('client_row_id, row_data')
            .eq('image_id', assignedTask.dbImageId);
        
        const answerKey: AnnotationRowData[] = (answerRowsData || []).map((dbRow: any) => ({
            id: dbRow.client_row_id, cells: dbRow.row_data
        }));
        
        const finalResult = calculateScore(rows, answerKey);
        onExamFinish(finalResult, 'timed_out');
    } else {
        addToast({ type: 'error', message: 'Auto-submission failed. Please check your connection. Exam is closed.' });
        onBackToDashboard();
    }
  }, [rows, onExamFinish, submitAllExamAnnotations, assignedTask.dbImageId, addToast, onBackToDashboard]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
    if (timeLeft <= 0 && !isExamClosingRef.current) {
        handleTimeout();
    }
  }, [timeLeft, handleTimeout]);
  
  useEffect(() => {
    setImageSettings(prev => ({...prev, position: { x: 0, y: -30 }}));
    setActiveRowIndex(0);
    isExamClosingRef.current = false; 
    setExamResult(null);
    setIsResultsModalOpen(false);
  }, [assignedTask]);

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
    const imageRef = assignedTask.original_filename || assignedTask.storage_path;
    const newCells: AnnotationCellData = columnsForCurrentExam.reduce((acc, col) => ({...acc, [col.id]: col.id === 'image_ref' ? imageRef : ''}), {} as AnnotationCellData);
    const newRow: AnnotationRowData = { id: generateRowId(), cells: newCells };
    
    setRowsFromHook(prevRows => [...prevRows, newRow]);
    const newRowIndex = rows.length; 
    setActiveRowIndex(newRowIndex);

    if (focusNewRow) {
      setTimeout(() => {
        const firstEditableColIndex = columnsForCurrentExam.findIndex(col => col.id !== 'image_ref');
        if (inputRefs.current[newRowIndex]?.[firstEditableColIndex >= 0 ? firstEditableColIndex : 0]) {
            inputRefs.current[newRowIndex][firstEditableColIndex >= 0 ? firstEditableColIndex : 0]?.focus();
        }
      }, 0);
    }
  }, [rows.length, assignedTask, setRowsFromHook, columnsForCurrentExam]); 
  
  const handleDeleteRow = useCallback((rowIndexToDelete: number) => {
    if (rows.length <= 1) { addToast({type:'warning', message: "Cannot delete the last remaining row."}); return; }
    setRowsFromHook(prevRows => prevRows.filter((_, idx) => idx !== rowIndexToDelete));
    const newActiveIndex = Math.max(0, rowIndexToDelete - 1);
    if (rows.length - 1 === 0) setActiveRowIndex(null);
    else if (activeRowIndex === rowIndexToDelete) {
        setActiveRowIndex(newActiveIndex);
        setTimeout(() => { if (inputRefs.current[newActiveIndex]?.[0]) inputRefs.current[newActiveIndex][0]?.focus(); }, 0);
    } else if (activeRowIndex && activeRowIndex > rowIndexToDelete) setActiveRowIndex(activeRowIndex - 1);
  }, [rows, activeRowIndex, setRowsFromHook, addToast]);

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

  /**
   * Calculates score based on provided Supabase SQL functions logic.
   * @param userRows The user's annotation rows.
   * @param answerKeyRows The correct answer key rows.
   * @returns An ExamResult object with score and other metrics.
   */
  const calculateScore = (userRows: AnnotationRowData[], answerKeyRows: AnnotationRowData[]): ExamResult => {
      let totalAnswerKeyChars = 0;
      let totalMatchingChars = 0;

      // 1. Calculate total scorable characters from the answer key, mimicking `total_chars_in_row`.
      for (const answerRow of answerKeyRows) {
          for (const key in answerRow.cells) {
              if (key === 'image_ref') continue;
              const value = answerRow.cells[key]?.toString() || '';
              if (value) {
                  totalAnswerKeyChars += value.length;
              }
          }
      }

      // 2. For each answer key row, find matching characters from the corresponding user row,
      // mimicking `calculate_matching_chars`. We align rows by index.
      for (let i = 0; i < answerKeyRows.length; i++) {
          const answerRowData = answerKeyRows[i].cells;
          const userRowData = userRows[i]?.cells; // Use optional chaining in case user has fewer rows.

          if (!userRowData) {
              // User didn't provide this row, so 0 matching characters for it.
              continue;
          }
          
          // Iterate through the keys of the answer key row, as per the SQL function.
          for (const key in answerRowData) {
              if (key === 'image_ref') continue;
              
              const answerValue = answerRowData[key]?.toString() || '';
              if (answerValue) { // Only score non-empty fields in the key.
                  const userValue = userRowData[key]?.toString() || '';
                  totalMatchingChars += commonPrefixLength(userValue, answerValue);
              }
          }
      }

      // If user submitted more rows than the answer key, they are ignored for scoring.
      if (answerKeyRows.length === 0 || totalAnswerKeyChars === 0) {
          // Handle case where answer key is empty or not found.
          let totalUserChars = 0;
          userRows.forEach(row => {
              for(const key in row.cells) {
                  if (key !== 'image_ref') {
                      totalUserChars += (row.cells[key]?.toString() || '').length;
                  }
              }
          });
          return { score: 0, passed: false, userKeystrokes: totalUserChars, totalKeystrokes: 0 };
      }

      const score = (totalMatchingChars / totalAnswerKeyChars) * 100;

      return {
          score,
          passed: score >= 90,
          userKeystrokes: totalMatchingChars,
          totalKeystrokes: totalAnswerKeyChars,
      };
  };

  const handleInitialSubmit = async () => {
    setIsSubmittingToServer(true);
    setDisplayStatus('Calculating score...');
    try {
        const { data: answerRowsData, error: fetchError } = await supabase
            .from('answer_key_rows')
            .select('client_row_id, row_data')
            .eq('image_id', assignedTask.dbImageId);

        if (fetchError) {
            addToast({type: 'error', message: 'Could not fetch answer key to calculate score. Please try again.'});
            return;
        }

        if (!answerRowsData || answerRowsData.length === 0) {
            addToast({ type: 'warning', message: 'No answer key found for this image. Score cannot be calculated. Please submit to record completion.' });
            setExamResult({ score: 0, passed: false, userKeystrokes: 0, totalKeystrokes: 0 });
            setIsResultsModalOpen(true);
            return;
        }
        
        const answerKey: AnnotationRowData[] = answerRowsData.map((dbRow: any) => ({
            id: dbRow.client_row_id,
            cells: dbRow.row_data
        }));
        
        const result = calculateScore(rows, answerKey);
        setExamResult(result);
        setIsResultsModalOpen(true);

    } catch (e: any) {
        addToast({ type: 'error', message: `An unexpected error occurred while calculating score: ${e.message}`});
    } finally {
        setIsSubmittingToServer(false);
        setDisplayStatus('');
    }
  };

  const handleFinalSubmission = async () => {
    if (isExamClosingRef.current || !examResult) return;
    setIsResultsModalOpen(false);
    setIsSubmittingToServer(true); 
    const submissionSuccessful = await submitAllExamAnnotations(); 
    if (submissionSuccessful) {
        onExamFinish(examResult, 'submitted');
    } else {
        setIsSubmittingToServer(false);
        addToast({type: 'error', message: `Submission failed. The exam remains open. Please try again or contact support.`});
    }
  };

  const handleRetakeFromModal = async () => {
    setIsResultsModalOpen(false);
    setExamResult(null);
    if (annotatorDbId) {
      removeAnnotationsFromLocalStorage(annotatorDbId, exam.id, assignedTask.dbImageId);
    }
    await onRetake();
  };

  const filledCells = useMemo(() => rows.reduce((acc, row) => acc + Object.values(row.cells).filter(cell => (cell?.toString() || '').trim() !== '').length, 0), [rows]);
  const totalCells = useMemo(() => rows.length * columnsForCurrentExam.length, [rows, columnsForCurrentExam]);
  const emptyCells = totalCells - filledCells;
  const progress = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
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
            setRowsFromHook(prevRows => prevRows.map((row, idx) =>
              idx === rowIndex ? { ...row, cells: { ...row.cells, [colId]: newValue } } : row
            ));
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
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [toolSettings.specialChars, setRowsFromHook]);

  const handleTableKeyDown = useCallback((event: React.KeyboardEvent<HTMLTableSectionElement>) => {}, []);

  if (!currentTaskForDisplay) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading exam session...</p></div>;
  }
  
  const getDisplayStatusIcon = (): string => {
    if (displayStatus.startsWith('Submitting')) return '⏳';
    if (displayStatus.startsWith('Submitted')) return '✅';
    if (displayStatus.startsWith('Error')) return '❌';
    if (displayStatus.startsWith('Draft saved')) return '💾';
    if (displayStatus.startsWith('Draft loaded')) return '📂';
    if (displayStatus.startsWith('Unsaved')) return '✏️';
    if (displayStatus.startsWith('Previously')) return '🔄';
    if (displayStatus.startsWith('Calculating')) return '🧮';
    return '⚪';
  };

  const getDisplayStatusColor = (): string => {
    if (displayStatus.startsWith('Submitting')) return 'bg-blue-500';
    if (displayStatus.startsWith('Submitted')) return 'bg-green-500';
    if (displayStatus.startsWith('Error')) return 'bg-red-500';
    if (displayStatus.startsWith('Draft saved')) return 'bg-yellow-500';
    if (displayStatus.startsWith('Draft loaded')) return 'bg-indigo-500';
    if (displayStatus.startsWith('Unsaved')) return 'bg-orange-500';
    if (displayStatus.startsWith('Previously')) return 'bg-purple-500';
    if (displayStatus.startsWith('Calculating')) return 'bg-purple-500';
    return 'bg-slate-400';
  };
  
  const renderResultsModalBody = () => {
    if (!examResult) return <p>Calculating score...</p>;
    const scoreColor = examResult.passed ? 'text-green-600' : 'text-red-600';
    return (
        <div className="text-center">
            <h4 className={`text-5xl font-bold ${scoreColor}`}>{examResult.score.toFixed(1)}%</h4>
            <p className="text-lg font-semibold mt-2">{examResult.passed ? '🎉 You Passed! 🎉' : 'Needs Improvement'}</p>
            <p className="text-sm text-slate-600 mt-2">Passing score is 90%.</p>
            <p className="text-xs text-slate-500 mt-4">
                Your score is based on your accuracy against the answer key.
                ({examResult.userKeystrokes.toLocaleString()} / {examResult.totalKeystrokes.toLocaleString()} correct characters)
            </p>
        </div>
    );
  };
  
  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      <ExamHeader
        userId={userId}
        onBackToDashboardClick={onBackToDashboard}
        onHelpClick={() => setIsHelpModalOpen(true)}
        toolSettings={toolSettings}
        onToolSettingChange={handleToolSettingChange}
        rowsCount={rows.length}
        progress={progress}
        timeLeft={timeLeft}
        onSubmit={handleInitialSubmit}
        isSubmittingToServer={isSubmittingToServer}
        currentTaskForDisplay={currentTaskForDisplay}
        displayStatus={displayStatus}
        isRetakeSession={!!completionToOverride}
        onCancelRetakeClick={onCancelRetake}
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
          imageLoading={imageLoading}
          toolSettings={{ guideLine: toolSettings.guideLine }}
          examName={exam.name}
        />
        <AnnotationTable
          examName={exam.name}
          rows={rows}
          columns={columnsForCurrentExam}
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
       <Modal 
        isOpen={isResultsModalOpen}
        onClose={() => examResult && !examResult.passed ? setIsResultsModalOpen(true) : setIsResultsModalOpen(false)}
        title="Exam Results"
        confirmText="Submit Final Score"
        onConfirm={handleFinalSubmission}
        cancelText={examResult && !examResult.passed ? "Retake Exam" : "Close"}
        onCancelSecondary={examResult && !examResult.passed ? handleRetakeFromModal : () => setIsResultsModalOpen(false)}
        secondaryButtonClass={examResult && !examResult.passed ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : undefined}
      >
        {renderResultsModalBody()}
      </Modal>
      <Modal 
        isOpen={isHelpModalOpen} 
        onClose={() => setIsHelpModalOpen(false)}
        title="Help Documentation"
        onConfirm={() => setIsHelpModalOpen(false)}
        confirmText="Got it!"
      >
        <div className="text-sm text-slate-600 space-y-2 text-left max-h-[60vh] overflow-y-auto pr-2">
            <p><strong>Image Controls:</strong> Use zoom, contrast, and brightness sliders. Click and drag the image to move it. The 'Reset' button restores the default view.</p>
            <p><strong>Back to Dashboard:</strong> You can return to the dashboard at any time. Your exam timer will continue to run in the background.</p>
            <p><strong>Data Entry:</strong> Click a cell to edit. Use 'Tab' to navigate between cells. Pressing 'Tab' in the last cell of the last row automatically adds a new row.</p>
            <p><strong>Special Characters:</strong> Enable 'Special Chars', then use Ctrl+Alt+[key] (e.g., Ctrl+Alt+a for 'á'). Add Shift for uppercase (e.g., Ctrl+Alt+Shift+a for 'Á').</p>
            <p><strong>First Char Capslock:</strong> Automatically capitalizes the first letter of any new word you type in a cell.</p>
            <p><strong>Submit & Close Exam:</strong> This will first show you your score. You can then choose to submit it permanently or retake with a new image if you failed.</p>
            <p><strong>Timer:</strong> You have 40 minutes to complete the exam. If the timer runs out, your work will be automatically submitted, and the exam will be closed.</p>
            <p><strong>Drafts:</strong> Unsaved changes are automatically saved as a local draft if you close the tab or navigate away. When you return, you can resume your work.</p>
        </div>
      </Modal>
    </div>
  );
};

export default ExamPage;
