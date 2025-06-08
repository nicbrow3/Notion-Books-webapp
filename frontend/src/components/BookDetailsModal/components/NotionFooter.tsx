import React from 'react';

interface NotionFooterProps {
  isNotionConnected: boolean;
  duplicateStatus: 'unknown' | 'checking' | 'duplicate' | 'unique';
  duplicateCount: number;
  isAddingToNotion: boolean;
  selectedCategoriesCount: number;
  duplicateCheckButtonRef: React.RefObject<HTMLButtonElement>;
  onCheckForDuplicates: () => void;
  onAddToNotion: () => void;
}

const NotionFooter: React.FC<NotionFooterProps> = ({
  isNotionConnected,
  duplicateStatus,
  duplicateCount,
  isAddingToNotion,
  selectedCategoriesCount,
  duplicateCheckButtonRef,
  onCheckForDuplicates,
  onAddToNotion
}) => {
  return (
    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isNotionConnected && (
            <div className="flex items-center gap-2">
              <button
                ref={duplicateCheckButtonRef}
                onClick={onCheckForDuplicates}
                disabled={duplicateStatus === 'checking'}
                className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors disabled:opacity-50"
              >
                Check for Duplicates
              </button>
              {duplicateStatus === 'checking' && (
                <div className="flex items-center text-blue-600 text-sm">
                  <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Checking...
                </div>
              )}
              {duplicateStatus === 'duplicate' && duplicateCount > 0 && (
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                  {duplicateCount}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isNotionConnected ? (
            <button
              onClick={onAddToNotion}
              disabled={isAddingToNotion || selectedCategoriesCount === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isAddingToNotion ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding to Notion...
                </>
              ) : (
                'Add to Notion'
              )}
            </button>
          ) : (
            <div className="text-sm text-gray-500">
              Connect to Notion in Settings to add books
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotionFooter; 