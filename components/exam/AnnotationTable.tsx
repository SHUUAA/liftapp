import React from 'react';
import { AnnotationRowData, AnnotationColumn, DisplayStatusType, ImageTask } from '../../types';

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c1.153 0 2.24.032 3.287.094M5.116 5.79m10.328_0V4.5a2.25 2.25 0 00-2.25-2.25h-3.874a2.25 2.25 0 00-2.25 2.25v1.29" /></svg>;

interface AnnotationTableProps {
  examName: string;
  rows: AnnotationRowData[];
  columns: AnnotationColumn[]; // Using columns from props now
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
  onTableKeyDown: (event: React.KeyboardEvent<HTMLTableSectionElement>) => void; // For overall table key events if needed
}

const AnnotationTable: React.FC<AnnotationTableProps> = ({
  examName,
  rows,
  columns,
  activeRowIndex,
  onSetActiveRowIndex,
  onCellChange,
  onAddRow,
  onDeleteRow,
  inputRefs,
  focusedCellRef,
  displayStatus,
  getDisplayStatusIcon,
  getDisplayStatusColor,
  filledCells,
  emptyCells,
  currentTaskForDisplay,
  onTableKeyDown
}) => {

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
     if (e.key === 'Tab' && !e.shiftKey && rowIndex === rows.length - 1 && colIndex === columns.length - 1) {
        e.preventDefault(); 
        onAddRow(true); 
      }
  };

  return (
    <section className="w-full h-[40%] flex flex-col bg-white shadow-lg rounded-md overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
        <h2 className="text-md font-semibold text-slate-700">Data Entry Table <span className="text-xs text-slate-500">({examName})</span></h2>
        <button 
          onClick={() => onAddRow(true)} 
          disabled={!currentTaskForDisplay} 
          className="flex items-center space-x-1 px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-xs disabled:opacity-50"
        >
          <PlusIcon />
          <span>Add Row</span>
        </button>
      </div>
      <div className="table-container flex-grow overflow-auto p-1">
        <div className="table-responsive">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 bg-slate-100 z-10">
              <tr>
                <th className="px-1 py-1.5 text-left font-medium text-slate-600 w-8"><span className="sr-only">Actions</span></th>
                {columns.map(col => (<th key={col.id} className={`px-2 py-1.5 text-left font-medium text-slate-600 ${col.width || 'w-auto'}`}>{col.label}</th>))}
              </tr>
            </thead>
            <tbody onKeyDown={onTableKeyDown} className="divide-y divide-slate-200">
              {rows.map((row, rowIndex) => (
                <tr 
                  key={row.id} 
                  className={`${activeRowIndex === rowIndex ? 'bg-yellow-100' : (rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50')} hover:bg-yellow-50`} 
                  onClick={() => onSetActiveRowIndex(rowIndex)}
                >
                  <td className="px-1 py-0.5 align-middle">
                    {rows.length > 1 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteRow(rowIndex); }} 
                        className="text-red-500 hover:text-red-700 p-0.5 rounded" 
                        aria-label={`Delete row ${rowIndex + 1}`}
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </td>
                  {columns.map((col, colIndex) => (
                    <td key={col.id} className={`px-0.5 py-0 align-middle ${col.width || 'w-auto'}`}>
                      <input 
                        ref={el => { if (!inputRefs.current[rowIndex]) inputRefs.current[rowIndex] = []; inputRefs.current[rowIndex][colIndex] = el; }} 
                        type={col.type} 
                        value={row.cells[col.id] || ''} 
                        onChange={e => onCellChange(rowIndex, col.id, e.target.value)} 
                        onFocus={(e) => { onSetActiveRowIndex(rowIndex); focusedCellRef.current = { rowIndex, colId: col.id, inputElement: e.target }; }} 
                        onKeyDown={(e) => handleInputKeyDown(e, rowIndex, colIndex)}
                        className={`w-full p-1 border rounded-sm outline-none transition-colors ${(row.cells[col.id] || '').toString().trim() !== '' ? 'bg-green-50 border-green-300' : 'bg-white border-slate-300'} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs ${activeRowIndex === rowIndex ? 'placeholder-slate-500' : 'placeholder-slate-400'}`} 
                        placeholder={col.label.substring(0,3) + '...'} 
                        aria-label={`${col.label} for row ${rowIndex + 1}`} 
                        disabled={col.id === 'image_ref'} 
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="px-3 py-1.5 border-t border-slate-200 text-xs text-slate-600 flex-shrink-0 flex justify-between items-center">
         <div>
            {displayStatus && (
                <span className={`mr-2 px-1.5 py-0.5 rounded text-white text-xs ${getDisplayStatusColor()}`}>
                    {getDisplayStatusIcon()} {displayStatus}
                </span>
            )}
            {!displayStatus && <span className="text-slate-400">Ready</span>}
         </div>
        <div>
            <span className="mr-2"><span className="inline-block w-2.5 h-2.5 bg-green-50 border border-green-300 rounded-sm mr-1 align-middle"></span>Filled: {filledCells}</span>
            <span className="mr-2"><span className="inline-block w-2.5 h-2.5 bg-white border border-slate-300 rounded-sm mr-1 align-middle"></span>Empty: {emptyCells}</span>
        </div>
      </div>
    </section>
  );
};

export default AnnotationTable;