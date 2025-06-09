import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { 
  WarningIcon, 
  XIcon, 
  ArrowClockwiseIcon, 
  PlusIcon 
} from '@phosphor-icons/react';
import { ICON_CONTEXTS, ICON_WEIGHTS } from '../../constants/iconConfig';

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
      e.stopPropagation(); // Prevent event from bubbling up to parent modals
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
              <WarningIcon 
                size={ICON_CONTEXTS.STATUS.LARGE} 
                weight={ICON_WEIGHTS.FILL} 
                className="text-amber-600" 
              />
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
              <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3 group-hover:bg-gray-200 transition-colors">
                <XIcon 
                  size={ICON_CONTEXTS.UI.BUTTON} 
                  weight={ICON_WEIGHTS.BOLD} 
                  className="text-gray-600 group-hover:animate-wiggle" 
                />
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
              <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3 group-hover:bg-orange-200 transition-colors">
                <ArrowClockwiseIcon 
                  size={ICON_CONTEXTS.UI.BUTTON} 
                  weight={ICON_WEIGHTS.BOLD} 
                  className="text-orange-600 group-hover:animate-wiggle" 
                />
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
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                <PlusIcon 
                  size={ICON_CONTEXTS.UI.BUTTON} 
                  weight={ICON_WEIGHTS.BOLD} 
                  className="text-blue-600 group-hover:animate-wiggle" 
                />
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