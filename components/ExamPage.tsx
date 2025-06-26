import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Exam, AnnotationRowData, AnnotationCellData, ImageSettings, DisplayStatusType } from '../types';
import { ANNOTATION_TABLE_COLUMNS } from '../constants';
import { useExamData } from '../hooks/useExamData';
import { generateRowId } from '../utils/examUtils';
import ExamHeader from './exam/ExamHeader';
import ImageViewer from './exam/ImageViewer';
import AnnotationTable from './exam/AnnotationTable';

const SPECIAL_CHARS_MAP: Record<string, { lower: string; upper: string }> = {
  a: { lower: 'á', upper: 'Á' }, e: { lower: 'é', upper: 'É' },
  i: { lower: 'í', upper: 'Í' }, o: { lower: 'ó', upper: 'Ó' },
  u: { lower: 'ú', upper: 'Ú' }, n: { lower: 'ñ', upper: 'Ñ' },
  c: { lower: 'ç', upper: 'Ç' },
};

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
    hasUnsavedChanges,
    setHasUnsavedChanges,
    submitCurrentAnnotations,
    navigateImage,
    persistDraft,
    currentTaskForDisplay,
    initializeNewRowsForImage,
  } = useExamData({ exam, annotatorDbId, onBackToDashboard });

  // Adjusted initial Y position to -30 to move the image slightly up
  const initialImageSettings: ImageSettings = { zoom: 61, contrast: 100, brightness: 100, position: { x: 0, y: -30 } };
  const [imageSettings, setImageSettings] = useState<ImageSettings>(initialImageSettings);
  
  const [toolSettings, setToolSettings] = useState({ guideLine: false, firstCharCaps: false, specialChars: false });
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);
  const focusedCellRef = useRef<{rowIndex: number, colId: string, inputElement: HTMLInputElement} | null>(null);
  
  useEffect(() => {
    // Reset image position when the image task changes (currentTaskForDisplay is a dependency)
    // This ensures that when a new image loads, its position is reset.
    setImageSettings(prev => ({...prev, position: { x: 0, y: -30 }}));
    setActiveRowIndex(0); // Also reset active row for new image
  }, [currentTaskForDisplay]);


  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        persistDraft();
        // Standard way to prompt user, though modern browsers might override message
        // event.returnValue = 'You have unsaved changes. Are you sure you want to leave?'; 
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (hasUnsavedChanges) { // Persist one last time if component unmounts with changes
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
    // setHasUnsavedChanges(true) and setDisplayStatus handled by setRowsFromHook

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
    // setHasUnsavedChanges(true) and setDisplayStatus handled by setRowsFromHook
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
    // setHasUnsavedChanges(true) and setDisplayStatus handled by setRowsFromHook
  }, [toolSettings.firstCharCaps, rows, setRowsFromHook]);
  
  const handleImageZoomChange = (value: number) => setImageSettings(prev => ({ ...prev, zoom: Math.max(10, Math.min(300, value)) }));
  const handleImageSettingChange = (setting: keyof Omit<ImageSettings, 'position' | 'zoom'>, value: number) => setImageSettings(prev => ({ ...prev, [setting]: Math.max(0, Math.min(200, value)) }));
  const handleImagePositionChange = (newPosition: { x: number; y: number }) => setImageSettings(prev => ({ ...prev, position: newPosition }));
  const handleResetImageSettings = () => setImageSettings(initialImageSettings);

  const handleToolSettingChange = (setting: keyof typeof toolSettings) => setToolSettings(prev => ({ ...prev, [setting]: !prev[setting] }));

  const handleSubmit = async () => {
    if (!annotatorDbId || !currentTaskForDisplay) {
        alert("User session error or no active image task. Cannot submit."); return;
    }
    const submissionSuccessful = await submitCurrentAnnotations(); 

    if (submissionSuccessful) {
        alert(`Data submitted for image: ${currentTaskForDisplay.original_filename || currentTaskForDisplay.storage_path}. Progress: ${progress}%. Thank you!`);
        
        if (currentImageTaskIndex < allImageTasks.length - 1) {
            await navigateImage(1, true); 
             setImageSettings(prev => ({...prev, position: {x:0, y:-30}})); // Reset position for new image
        } else {
            alert("All images for this exam submitted!");
            onBackToDashboard();
        }
    }
  };
  
  const handleNavigateImageWithPersistence = async (direction: 1 | -1) => {
    // persistDraft is called inside navigateImage if hasUnsavedChanges is true and skipLocalSave is false
    await navigateImage(direction, false);
    setImageSettings(prev => ({...prev, position: {x:0, y:-30}})); // Reset position for new image
  };


  const filledCells = useMemo(() => rows.reduce((acc, row) => acc + Object.values(row.cells).filter(cell => (cell?.toString() || '').trim() !== '').length, 0), [rows]);
  const totalCells = useMemo(() => rows.length * ANNOTATION_TABLE_COLUMNS.length, [rows]);
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
            handleCellChange(rowIndex, colId, newValue); // This will use the hook's setRows
            setTimeout(() => { inputElement.selectionStart = inputElement.selectionEnd = selectionStart + 1; }, 0);
          }
        }
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [toolSettings.specialChars, handleCellChange]); // handleCellChange is from useCallback, depends on setRowsFromHook

  const handleTableKeyDown = useCallback((event: React.KeyboardEvent<HTMLTableSectionElement>) => {
    // This function is for keydown events specifically within the table structure, handled by AnnotationTable.tsx inputs.
  }, []);


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
    if (hasUnsavedChanges) {
        const confirmLeave = window.confirm("You have unsaved changes for the current image. These will be saved as a draft locally if you proceed. Do you want to return to the dashboard?");
        if (confirmLeave) {
            persistDraft();
            onBackToDashboard();
        }
    } else {
        onBackToDashboard();
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
        onSubmit={handleSubmit}
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