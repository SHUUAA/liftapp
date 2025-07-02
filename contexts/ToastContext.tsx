
import React, { createContext, useState, useCallback, useContext } from 'react';
import { ToastMessage, ToastType } from '../types';

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (toast: { type: ToastType; message: string; duration?: number }) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(({ type, message, duration = 5000 }: { type: ToastType; message: string; duration?: number }) => {
    const id = new Date().getTime().toString() + Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { id, type, message, duration };
    setToasts(prevToasts => [...prevToasts, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
