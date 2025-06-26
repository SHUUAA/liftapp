import React, { useState } from 'react';
import { AdminCredentials } from '../../types'; // Ensure this type is defined

interface AdminLoginPageProps {
  onAdminLogin: (credentials: AdminCredentials) => void;
  isLoading: boolean; // Optional: for showing loading state during login
}

const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onAdminLogin, isLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (email.trim() === '' || password.trim() === '') {
      setError('Email and Password cannot be empty.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    onAdminLogin({ email: email.trim(), password: password.trim() });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-600 p-4">
      <div className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl w-full max-w-md transform transition-all hover:scale-105 duration-300">
        <div className="text-center mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-20 h-20 mx-auto text-red-600 mb-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <h1 className="text-3xl font-bold text-slate-800">LiftApp Admin</h1>
          <p className="text-slate-600 mt-2">Administrator Access</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email" 
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter your admin email"
              className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm transition-colors"
              aria-required="true"
              aria-describedby={error ? "admin-error" : undefined}
            />
          </div>
           <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password" 
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter your password"
              className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm transition-colors"
              aria-required="true"
              aria-describedby={error ? "admin-error" : undefined}
            />
          </div>
          {error && <p id="admin-error" className="mt-2 text-xs text-red-600">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-transform transform hover:scale-102 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Logging in...' : 'Login as Admin'}
            </button>
          </div>
        </form>
        <p className="mt-8 text-xs text-center text-slate-500">
          Use the credentials of the admin user created in Supabase.
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;