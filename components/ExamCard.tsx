
import React from 'react';
import { ExamCardProps } from '../types';

const ExamCard: React.FC<ExamCardProps> = ({ exam, onSelectExam, completionInfo, activeSession, onResumeExam }) => {

  const isThisExamActive = activeSession && activeSession.exam.id === exam.id;
  const isAnotherExamActive = activeSession && activeSession.exam.id !== exam.id;

  const getButtonState = () => {
    // Active sessions always take precedence
    if (isThisExamActive) {
      return { text: 'Resume Exam', disabled: false, className: 'bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-500 animate-pulse' };
    }
    if (isAnotherExamActive) {
      return { text: 'Start Exam', disabled: true, className: 'bg-slate-400 text-white cursor-not-allowed' };
    }

    // Check completion status if no active session interferes
    if (completionInfo) {
      if (completionInfo.isCompleted) { // Passed (score >= 90)
        return { text: 'Done', disabled: true, className: 'bg-green-500 text-white cursor-not-allowed' };
      } else { // Failed (score < 90)
        return { text: 'Retake Exam', disabled: false, className: 'bg-orange-500 hover:bg-orange-600 text-white focus:ring-orange-500' };
      }
    }
    
    // Default case: never attempted
    return { text: 'Start Exam', disabled: false, className: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500' };
  };

  const buttonState = getButtonState();

  const handleButtonClick = () => {
    if (buttonState.disabled) return;
    
    if (isThisExamActive) {
      onResumeExam();
    } else {
      onSelectExam(exam);
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden transform transition-all hover:shadow-2xl ${!buttonState.disabled ? 'hover:-translate-y-1' : ''} duration-300 ease-in-out flex flex-col h-full ${buttonState.disabled && !completionInfo?.isCompleted ? 'opacity-60' : ''}`}>
      <div className="p-6 flex-grow flex flex-col">
        <div className="flex items-center justify-center mb-5 h-20 w-20 mx-auto bg-slate-100 rounded-full p-2">
           {exam.icon}
        </div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2 text-center">{exam.name}</h3>
        <p className="text-sm text-slate-600 leading-relaxed text-center flex-grow mb-4">
          {exam.description}
        </p>
      </div>
      <div className="p-5 bg-slate-50 border-t border-slate-200 mt-auto">
        <button
          onClick={handleButtonClick}
          disabled={buttonState.disabled}
          className={`w-full font-medium py-2.5 px-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 ${buttonState.className}`}
          aria-label={completionInfo?.isCompleted ? `Exam completed: ${exam.name}` : `${buttonState.text}: ${exam.name}`}
        >
          {buttonState.text}
        </button>
      </div>
    </div>
  );
};

export default ExamCard;
