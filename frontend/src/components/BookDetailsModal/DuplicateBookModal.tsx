import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

interface DuplicateBookModalProps {
  isOpen: boolean;
  bookTitle: string;
  existingNotionPage?: { url: string; title: string } | null;
  onClose: () => void;
  onCancel: () => void;
  onReplace: () => void;
  onKeepBoth: () => void;
}

const DuplicateBookModal: React.FC<DuplicateBookModalProps> = ({
  isOpen,
  bookTitle,
  existingNotionPage,
  onClose,
  onCancel,
  onReplace,
  onKeepBoth
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false); // Clean up on unmount
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen || !isMounted) {
    return null;
  }

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg max-w-md w-full shadow-2xl border relative"
        onClick={handleModalContentClick}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Duplicate Book Found
              </h3>
              <p className="text-sm text-gray-600">
                This book already exists in your Notion database
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <div className="mb-4">
            <p className="text-gray-700">
              <span className="font-medium">"{bookTitle}"</span> already exists in your database
              {existingNotionPage && (
                <>
                  {' '}{"as"}{' '}
                  <a
                    href={existingNotionPage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    "{existingNotionPage.title}"
                  </a>
                </>
              )}.
            </p>
            <p className="text-sm text-gray-600 mt-2">
              What would you like to do?
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Cancel */}
            <div
              onClick={onCancel}
              className="w-full flex items-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3 group-hover:bg-gray-200">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900">Cancel</div>
                <div className="text-sm text-gray-600">Don't add this book to Notion</div>
              </div>
            </div>

            {/* Replace */}
            <div
              onClick={onReplace}
              className="w-full flex items-center px-4 py-3 border border-orange-300 rounded-lg hover:bg-orange-50 transition-colors group cursor-pointer"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3 group-hover:bg-orange-200">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900">Replace Existing</div>
                <div className="text-sm text-gray-600">Update only the book properties, preserving other content</div>
              </div>
            </div>

            {/* Keep Both */}
            <div
              onClick={onKeepBoth}
              className="w-full flex items-center px-4 py-3 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors group cursor-pointer"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3 group-hover:bg-blue-200">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900">Keep Both</div>
                <div className="text-sm text-gray-600">Add as a separate entry (different edition/format)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 rounded-b-lg">
          <p className="text-xs text-gray-500 text-center">
            You can always manage duplicates later from your Notion database
          </p>
        </div>
      </div>
    </div>
  );

  // Ensure document.body exists for SSR safety, though isMounted check helps.
  if (typeof document !== 'undefined' && document.body) {
    return ReactDOM.createPortal(modalContent, document.body);
  }
  return null; // Fallback

};

export default DuplicateBookModal; 