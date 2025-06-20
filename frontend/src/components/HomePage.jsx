import React from 'react';
import { Database } from 'lucide-react';

const HomePage = ({ 
  userId, 
  setUserId, 
  connectionStatus, 
  startExam 
}) => {
  // Connection status indicator
  const ConnectionStatus = () => (
    <div className="flex items-center space-x-2 text-xs">
      <Database size={14} />
      <span className={`px-2 py-1 rounded ${
        connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
        connectionStatus === 'error' ? 'bg-red-100 text-red-800' :
        'bg-yellow-100 text-yellow-800'
      }`}>
        {connectionStatus === 'connected' ? 'Connected' :
         connectionStatus === 'error' ? 'Connection Error' : 'Connecting...'}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">LiftApp</h1>
          <p className="text-gray-600">Genealogy Data Entry Platform</p>
          <div className="mt-4 flex justify-center">
            <ConnectionStatus />
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            User ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your user ID"
          />
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => startExam('baptism')}
            disabled={!userId.trim() || connectionStatus !== 'connected'}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Baptism Exam
          </button>
          
          <button
            onClick={() => startExam('marriage')}
            disabled={!userId.trim() || connectionStatus !== 'connected'}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Marriage Exam
          </button>
        </div>
        
        {connectionStatus !== 'connected' && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              {connectionStatus === 'error' 
                ? 'Unable to connect to database. Please check your connection.'
                : 'Connecting to database...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;