
import React from 'react';
import { Exam } from '../types';

interface ExamCardProps {
  exam: Exam;
  onSelectExam: (exam: Exam) => void; // New prop
}

const ExamCard: React.FC<ExamCardProps> = ({ exam, onSelectExam }) => {
  const handleStartTask = () => {
    onSelectExam(exam); // Call the new prop
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden transform transition-all hover:shadow-2xl hover:-translate-y-1 duration-300 ease-in-out flex flex-col h-full">
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
          onClick={handleStartTask}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-150"
          aria-label={`Start task: ${exam.name}`}
        >
          Start Task
        </button>
      </div>
    </div>
  );
};

export default ExamCard;
