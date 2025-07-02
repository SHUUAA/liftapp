
import React from 'react';
import { useToast } from '../../contexts/ToastContext';
import Toast from './Toast';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div
      aria-live="assertive"
      className="fixed inset-0 flex flex-col items-end justify-start px-4 py-6 pointer-events-none sm:p-6 sm:justify-start z-[100]"
    >
      <div className="w-full max-w-sm space-y-3">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;
