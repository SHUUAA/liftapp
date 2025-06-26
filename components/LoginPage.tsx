
import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (userId: string) => void;
  // onNavigateToAdminLogin: () => void; // Removed prop
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [inputUserId, setInputUserId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inputUserId.trim() === '') {
      setError('User ID cannot be empty.');
      return;
    }
    setError('');
    onLogin(inputUserId.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <div className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl w-full max-w-md transform transition-all hover:scale-105 duration-300">
        <div className="text-center mb-8">
          {/* Using a generic document icon as placeholder */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-20 h-20 mx-auto text-blue-600 mb-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <h1 className="text-3xl font-bold text-slate-800">LiftApp</h1>
          <p className="text-slate-600 mt-2">Annotation Platform Login</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-slate-700 mb-1">
              User ID
            </label>
            <input
              id="userId"
              name="userId"
              type="text"
              value={inputUserId}
              onChange={(e) => {
                setInputUserId(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter your User ID"
              className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              aria-required="true"
              aria-describedby={error ? "userId-error" : undefined}
            />
            {error && <p id="userId-error" className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-102 active:scale-98"
            >
              Login
            </button>
          </div>
        </form>
        {/* Admin Access Button Removed from here */}
        <p className="mt-8 text-xs text-center text-slate-500">
          Annotation assignments will be available after login.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
