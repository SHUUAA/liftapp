import React from 'react';
import { X } from 'lucide-react';

const DataTable = ({
  tableData,
  activeRow,
  setActiveRow,
  fields,
  fieldRefs,
  handleInputChange,
  handleKeyDown,
  setCurrentField,
  deleteRow,
  addNewRow,
  currentSession,
  currentView
}) => {
  return (
    <div className="p-4 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 p-2 text-xs"></th>
              {fields.map(field => (
                <th key={field.key} className="border border-gray-300 p-2 text-xs font-medium">
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr
                key={row.id}
                className={rowIndex === activeRow ? 'bg-yellow-100' : 'hover:bg-gray-50'}
                onClick={() => setActiveRow(rowIndex)}
              >
                <td className="border border-gray-300 p-1 text-center">
                  {tableData.length > 1 && (
                    <button
                      onClick={() => deleteRow(rowIndex)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  )}
                </td>
                {fields.map((field, fieldIndex) => (
                  <td key={`${row.id}-${field.key}`} className="border border-gray-300 p-1">
                    {field.key === 'image' ? (
                      <span className="text-xs text-gray-600">{row[field.key]}</span>
                    ) : (
                      <input
                        ref={el => fieldRefs.current[`${rowIndex}-${fieldIndex}`] = el}
                        type="text"
                        value={row[field.key] || ''}
                        onChange={(e) => handleInputChange(rowIndex, field.key, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, fieldIndex)}
                        onFocus={() => setCurrentField(`${rowIndex}-${fieldIndex}`)}
                        className={`w-full px-1 py-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          row[field.key] ? 'bg-green-50' : 'bg-yellow-50'
                        }`}
                        autoComplete="off"
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={() => addNewRow()}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Add Row
        </button>
        
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            Session: {currentSession?.id || 'None'}
          </div>
          <div className="text-sm text-gray-600">
            Type: {currentView}
          </div>
          <div className="text-sm text-gray-600">
            1/1 Images
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTable;