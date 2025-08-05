import React, { Fragment } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onCancelSecondary?: () => void; // Optional secondary action for the cancel button
  secondaryButtonClass?: string; // Optional class for the secondary button
  maxWidthClass?: string; // Optional class for modal width
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onCancelSecondary,
  secondaryButtonClass,
  maxWidthClass = "sm:max-w-lg", // Default value
}) => {
  if (!isOpen) return null;

  const handleCancelClick = () => {
    if (onCancelSecondary) {
      onCancelSecondary();
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true"></div>
      <div
        className={`relative bg-white rounded-lg shadow-xl transform transition-all sm:my-8 ${maxWidthClass} mx-auto max-w-4xl`}
        style={{ overflow: "hidden" }}
      >
        <div
          className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 rounded-t-lg max-w-full"
          style={{ overflow: "hidden" }}
        >
          <div className="w-full">
            <div className="flex items-center mb-2 text-left">
              <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:h-10 sm:w-10">
                <svg
                  className="h-6 w-6 text-blue-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3
                className="text-lg leading-6 font-medium text-gray-900 ml-3"
                id="modal-title"
              >
                {title}
              </h3>
            </div>
            <div
              className="mt-2 w-full max-w-full text-center"
              style={{ maxWidth: "100%", overflow: "hidden" }}
            >
              {children}
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
          {confirmText && (
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          )}
          {cancelText && (
            <button
              type="button"
              className={`mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm transition-colors
                ${
                  secondaryButtonClass
                    ? `${secondaryButtonClass} border-transparent`
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-indigo-500"
                }`}
              onClick={handleCancelClick}
            >
              {cancelText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
