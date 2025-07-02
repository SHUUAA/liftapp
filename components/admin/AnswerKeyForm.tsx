
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Exam, AnnotationColumn, AnnotationRowData, AnswerKeyEntry } from '../../types';
import { generateRowId } from '../../utils/examUtils'; // Using the centralized helper
import { getColumnsForExam } from '../../constants';
import { useToast } from '../../contexts/ToastContext';

interface AnswerKeyFormProps {
  exams: Exam[];
  onSave: (answerKey: AnswerKeyEntry) => void;
  onCancel: () => void;
  initialData?: AnswerKeyEntry | null;
  defaultExamId?: string; // New optional prop
}

const AnswerKeyForm: React.FC<AnswerKeyFormProps> = ({ exams, onSave, onCancel, initialData, defaultExamId }) => {
  const { addToast } = useToast();
  const [selectedExamId, setSelectedExamId] = useState<string>(() => {
    if (initialData?.examId) return initialData.examId;
    if (defaultExamId) return defaultExamId;
    return exams.length > 0 ? exams[0].id : '';
  });

  const columns = useMemo(() => getColumnsForExam(selectedExamId), [selectedExamId]);

  const [imageId, setImageId] = useState<string>(initialData?.imageId || ''); 
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(initialData?.imageUrl || null);

  const [answerRows, setAnswerRows] = useState<AnnotationRowData[]>([]);

  useEffect(() => {
    if (initialData && initialData.examId === selectedExamId) {
      setAnswerRows(initialData.answers.length > 0 ? initialData.answers : [{ id: generateRowId(), cells: columns.reduce((acc, col) => ({...acc, [col.id]: ''}), {}) }]);
    } else {
      setAnswerRows([{ id: generateRowId(), cells: columns.reduce((acc, col) => ({...acc, [col.id]: ''}), {}) }]);
    }
  }, [initialData, columns, selectedExamId]);


  useEffect(() => {
    if (initialData) {
      setSelectedExamId(initialData.examId);
      setImageId(initialData.imageId); 
      // answerRows are handled by the effect above
      setImageFile(null); 
      setPreviewImageUrl(initialData.imageUrl || null);
    } else {
      // Use defaultExamId if provided for new entries, otherwise first exam
      setSelectedExamId(defaultExamId || (exams.length > 0 ? exams[0].id : ''));
      setImageId('');
      setImageFile(null);
      setPreviewImageUrl(null);
    }
  }, [initialData, exams, defaultExamId]);

  // This effect synchronizes the `image_ref` in all answer rows when the main `imageId` changes.
  useEffect(() => {
    setAnswerRows(prevRows => {
      const needsUpdate = prevRows.some(row => row.cells['image_ref'] !== imageId);
      // Only update if needed to prevent re-renders
      if (!needsUpdate && prevRows.length > 0) {
        return prevRows;
      }
      return prevRows.map(row => ({
        ...row,
        cells: { ...row.cells, image_ref: imageId }
      }));
    });
  }, [imageId]);

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageId(file.name); 
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setPreviewImageUrl(initialData?.imageUrl || null); 
    }
  };

  const handleAddAnswerRow = useCallback(() => {
    setAnswerRows(prevRows => {
      const newCells: { [key: string]: string } = {};
      columns.forEach(col => newCells[col.id] = '');
      // Auto-populate the image_ref for the new row from the main form state
      newCells['image_ref'] = imageId;
      return [...prevRows, { id: generateRowId(), cells: newCells }];
    });
  }, [columns, imageId]);

  const handleCellChange = useCallback((rowIndex: number, columnId: string, value: string) => {
    setAnswerRows(prevRows =>
      prevRows.map((row, idx) =>
        idx === rowIndex ? { ...row, cells: { ...row.cells, [columnId]: value } } : row
      )
    );
  }, []);
  
  const handleRemoveAnswerRow = useCallback((rowIndex: number) => {
    setAnswerRows(prevRows => {
        if (prevRows.length <= 1) return prevRows; 
        return prevRows.filter((_, idx) => idx !== rowIndex);
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId || !imageId.trim()) {
      addToast({ type: 'error', message: 'Please select an exam and provide an Image Identifier or upload an image.' });
      return;
    }
    if (!initialData && !imageFile) { 
        addToast({ type: 'error', message: 'Please upload an image for the new answer key.' });
        return;
    }
    if (answerRows.some(row => Object.values(row.cells).every(cellVal => (cellVal === '' || cellVal === undefined)))) {
      // Removed alert for empty rows to allow flexibility, can be re-added if strict validation is needed.
    }

    onSave({
      examId: selectedExamId,
      imageId: imageId.trim(), 
      imageFile: imageFile || undefined, 
      answers: answerRows,
      imageUrl: previewImageUrl || initialData?.imageUrl, 
      dbImageId: initialData?.dbImageId,
      dbExamId: initialData?.dbExamId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-md shadow-inner border border-slate-200">
      <div>
        <label htmlFor="examId" className="block text-sm font-medium text-slate-700 mb-1">Exam Type</label>
        <select
          id="examId"
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          required
        >
          {exams.map(exam => (
            <option key={exam.id} value={exam.id}>{exam.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="imageFile" className="block text-sm font-medium text-slate-700 mb-1">
          {initialData?.imageUrl || previewImageUrl ? 'Change Image (Optional)' : 'Upload Image'}
        </label>
        <input
          type="file"
          id="imageFile"
          accept="image/jpeg, image/png, image/webp, image/gif"
          onChange={handleImageFileChange}
          className="mt-1 block w-full text-sm text-slate-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
        {previewImageUrl && (
          <div className="mt-2 border border-slate-200 p-2 rounded-md">
            <p className="text-xs text-slate-500 mb-1">Current Image Preview:</p>
            <img src={previewImageUrl} alt="Preview" className="max-h-40 rounded-md object-contain" />
          </div>
        )}
        <label htmlFor="imageId" className="block text-sm font-medium text-slate-700 mt-2 mb-1">Image Identifier (Filename or Reference)</label>
        <input
          type="text"
          id="imageId"
          value={imageId}
          onChange={(e) => setImageId(e.target.value)}
          placeholder="e.g., image_001.jpg (auto-filled on upload)"
          className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          required
        />
         <p className="mt-1 text-xs text-slate-500">This identifier is used to link annotations to this image. It should be unique for the selected exam type.</p>
      </div>


      <div className="space-y-3">
        <h4 className="text-md font-medium text-slate-700">Answer Data</h4>
        {answerRows.map((row, rowIndex) => (
          <div key={row.id} className="p-3 border border-slate-200 rounded-md space-y-2 relative">
             {answerRows.length > 1 && (
                <button
                    type="button"
                    onClick={() => handleRemoveAnswerRow(rowIndex)}
                    className="absolute top-1 right-1 text-red-500 hover:text-red-700 p-1"
                    aria-label="Remove answer row"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
            <p className="text-xs text-slate-500">Answer Row {rowIndex + 1}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
              {columns.map(col => (
                <div key={col.id}>
                  <label htmlFor={`${row.id}-${col.id}`} className="block text-xs font-medium text-slate-600 mb-0.5">{col.label}</label>
                  <input
                    type={col.type}
                    id={`${row.id}-${col.id}`}
                    value={row.cells[col.id] || ''}
                    onChange={e => handleCellChange(rowIndex, col.id, e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs"
                    disabled={col.id === 'image_ref'}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddAnswerRow}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1 py-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          <span>Add Answer Row</span>
        </button>
      </div>
      
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-300 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
        >
          {initialData ? 'Update Answer Key' : 'Save Answer Key'}
        </button>
      </div>
    </form>
  );
};

export default AnswerKeyForm;
