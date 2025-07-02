
import React from 'react';
import { ImageTask, DisplayStatusType, ExamHeaderProps } from '../../types'; // Ensure ExamHeaderProps is imported

const ArrowLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>;
const QuestionMarkCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;


const ExamHeader: React.FC<ExamHeaderProps> = ({
  userId,
  onBackToDashboardClick,
  onHelpClick,
  toolSettings,
  onToolSettingChange,
  rowsCount,
  progress,
  timeLeft, // New prop
  onSubmit,
  isSubmittingToServer,
  currentTaskForDisplay,
  displayStatus
}) => {

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <header className="bg-slate-50 border-b border-slate-300 px-4 py-2 flex items-center justify-between shadow-sm flex-shrink-0">
      <div className="flex items-center space-x-3">
        <button 
          onClick={onBackToDashboardClick} 
          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm" 
          aria-label="Back to Dashboard"
        >
          <ArrowLeftIcon />
          <span>Back to Dashboard</span>
        </button>
        <span className="text-sm text-slate-600">User: <span className="font-medium text-slate-800">{userId}</span></span>
      </div>
      <div className="flex items-center space-x-3 text-sm"> {/* Reduced space-x-4 to space-x-3 for tools */}
        {[
          { label: 'Guide Line', key: 'guideLine' as keyof typeof toolSettings }, 
          { label: 'Capslock', key: 'firstCharCaps' as keyof typeof toolSettings }, // Shortened label
          { label: 'Special Chars', key: 'specialChars' as keyof typeof toolSettings } // Shortened label
        ].map(tool => (
          <label key={tool.key} className="flex items-center space-x-1 cursor-pointer text-slate-700 hover:text-slate-900">
            <input 
              type="checkbox" 
              checked={toolSettings[tool.key]} 
              onChange={() => onToolSettingChange(tool.key)} 
              className="form-checkbox h-3.5 w-3.5 text-blue-600 border-slate-400 rounded focus:ring-blue-500" // Slightly smaller checkbox
            />
            <span>{tool.label}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center space-x-3">
        <span className="text-sm text-slate-600 flex items-center" aria-live="polite" aria-atomic="true">
            <ClockIcon /> {formatTime(timeLeft)}
        </span>
        <span className="text-sm text-slate-600">| Rows: {rowsCount} | Progress: {progress}%</span>
        <button 
          onClick={onSubmit} 
          disabled={isSubmittingToServer || !currentTaskForDisplay || displayStatus === 'Submitting...' || timeLeft <=0} 
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm disabled:opacity-50" 
          aria-label="Submit Annotations and Close Exam"
        >
          {isSubmittingToServer ? 'Submitting...' : 'Submit & Close Exam'}
        </button>
        <button 
          onClick={onHelpClick} 
          className="p-2 text-slate-600 hover:text-blue-600 rounded-full hover:bg-slate-200 transition-colors" 
          aria-label="Help"
        >
          <QuestionMarkCircleIcon />
        </button>
      </div>
    </header>
  );
};

export default ExamHeader;
