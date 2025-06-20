// src/components/ExamSelection.jsx
import React from 'react';
import { Book, Heart, User, LogOut, X } from 'lucide-react';

const ExamSelection = ({ 
  userId, 
  startExam, 
  onLogout,
  showSuccessToast,
  setShowSuccessToast 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-800">LiftApp</h1>
            <span className="text-gray-600">Genealogy Platform</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User size={16} />
              <span>User: {userId}</span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-50">
          <span>Login Successful</span>
          <span className="text-sm opacity-90">Welcome to LiftApp!</span>
          <button 
            onClick={() => setShowSuccessToast(false)}
            className="ml-2 hover:bg-green-600 rounded p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Select an Exam</h2>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto">
            Choose between Baptism or Marriage document annotation. Each exam contains 
            historical documents that require careful data extraction and entry.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Baptism Records Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="text-center mb-6">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Book className="text-blue-600" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Baptism Records</h3>
              <p className="text-gray-600">
                Annotate historical baptism documents and extract genealogical data
              </p>
            </div>
            
            <div className="space-y-4 mb-8">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Fields include:</h4>
                <p className="text-gray-600 text-sm">Names, Birth dates, Parents, Event details</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Document types:</h4>
                <p className="text-gray-600 text-sm">Church records, Birth certificates</p>
              </div>
            </div>
            
            <button
              onClick={() => startExam('baptism')}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Start Baptism Exam
            </button>
          </div>

          {/* Marriage Records Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="text-center mb-6">
              <div className="bg-pink-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="text-pink-600" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Marriage Records</h3>
              <p className="text-gray-600">
                Annotate historical marriage documents and extract genealogical data
              </p>
            </div>
            
            <div className="space-y-4 mb-8">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Fields include:</h4>
                <p className="text-gray-600 text-sm">Spouse names, Marriage dates, Parents, Witnesses</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Document types:</h4>
                <p className="text-gray-600 text-sm">Marriage certificates, Church records</p>
              </div>
            </div>
            
            <button
              onClick={() => startExam('marriage')}
              className="w-full bg-pink-600 text-white py-3 px-4 rounded-lg hover:bg-pink-700 transition-colors font-medium"
            >
              Start Marriage Exam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamSelection;