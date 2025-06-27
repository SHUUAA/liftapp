
import React from 'react';
import { Exam, ExamCardProps } from '../types'; // Updated import
import { checkIfExamCompleted } from '../utils/localStorageUtils';

const ExamCard: React.FC<ExamCardProps> = ({ exam, onSelectExam, annotatorDbId }) => {
  const isCompleted = checkIfExamCompleted(annotatorDbId, exam.id);

  const handleStartOrReviewExam = () => {
    if (!isCompleted) {
      onSelectExam(exam);
    }
    // If completed, button is disabled, so this won't be called.
    // If we wanted a "Review" functionality, logic would go here.
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden transform transition-all hover:shadow-2xl ${!isCompleted ? 'hover:-translate-y-1' : ''} duration-300 ease-in-out flex flex-col h-full`}>
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
          onClick={handleStartOrReviewExam}
          disabled={isCompleted}
          className={`w-full font-medium py-2.5 px-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150
            ${isCompleted 
              ? 'bg-green-500 text-white cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
            }`}
          aria-label={isCompleted ? `Exam completed: ${exam.name}` : `Start exam: ${exam.name}`}
        >
          {isCompleted ? 'Done' : 'Start Exam'}
        </button>
      </div>
    </div>
  );
};

export default ExamCard;