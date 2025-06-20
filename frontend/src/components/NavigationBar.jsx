import React from 'react';
import { ArrowLeft, HelpCircle, Database } from 'lucide-react';

const NavigationBar = ({ 
  setCurrentView, 
  setCurrentSession, 
  connectionStatus, 
  progress, 
  handleSubmit 
}) => {
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
    <div className="bg-white shadow-sm border-b p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to go back? Unsaved changes will be lost.')) {
                setCurrentView('home');
                setCurrentSession(null);
              }
            }}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <ConnectionStatus />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm">Progress: {progress}%</span>
          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Submit
          </button>
          <button className="text-gray-600 hover:text-gray-800">
            <HelpCircle size={20} />
          </button>
          <span className="text-sm">Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
};

export default NavigationBar;