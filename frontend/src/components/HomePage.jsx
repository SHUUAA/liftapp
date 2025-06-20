// src/components/HomePage.jsx
import React from 'react';
import { Database } from 'lucide-react';

const HomePage = ({ 
  userId, 
  setUserId, 
  connectionStatus, 
  onAccessPlatform 
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">LiftApp</h1>
          <p className="text-gray-600 text-lg">Genealogy Data Entry Platform</p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">Welcome</h2>
          <p className="text-gray-600 text-center text-sm leading-relaxed">
            Enter your company-provided User ID to access the exam platform
          </p>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            User ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="Enter your User ID"
          />
        </div>
        
        <button
          onClick={onAccessPlatform}
          disabled={!userId.trim() || connectionStatus !== 'connected'}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Access Platform
        </button>
        
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm mb-3">
            This platform provides access to Baptism and Marriage document annotation tools.
          </p>
          <ConnectionStatus />
        </div>
        
        {connectionStatus !== 'connected' && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800 text-center">
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