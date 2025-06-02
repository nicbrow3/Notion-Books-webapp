import React from 'react';

interface NotionActionsProps {
  isNotionConnected: boolean;
  notionSettings?: any;
  duplicateStatus: 'unknown' | 'checking' | 'duplicate' | 'unique';
  existingNotionPage: { url: string; title: string } | null;
  isAddingToNotion: boolean;
  selectedCategories: string[];
  onCheckForDuplicates: () => void;
  onAddToNotion: () => void;
}

const NotionActions: React.FC<NotionActionsProps> = ({
  isNotionConnected,
  notionSettings,
  duplicateStatus,
  existingNotionPage,
  isAddingToNotion,
  selectedCategories,
  onCheckForDuplicates,
  onAddToNotion
}) => {
  if (!isNotionConnected) {
    return (
      <div className="border-t border-gray-200 pt-4">
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          Connect to Notion to add this book to your database
        </div>
      </div>
    );
  }

  if (!notionSettings?.databaseId) {
    return (
      <div className="border-t border-gray-200 pt-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          Configure your Notion settings to add books
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 pt-4">
      <div className="mb-4">
        {duplicateStatus === 'checking' && (
          <div className="flex items-center text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Checking for duplicates...
          </div>
        )}
        
        {duplicateStatus === 'duplicate' && (
          <div className="flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded">
            <span className="text-sm text-orange-800 flex items-center">
              <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              May be duplicate
            </span>
            {existingNotionPage && (
              <a
                href={existingNotionPage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                View in Notion →
              </a>
            )}
          </div>
        )}
        
        {duplicateStatus === 'unique' && (
          <div className="flex items-center p-2 bg-green-50 border border-green-200 rounded">
            <svg className="h-4 w-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-green-800">Unique book</span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {duplicateStatus === 'unknown' && (
          <button
            onClick={onCheckForDuplicates}
            className="flex-1 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Check for Duplicates
          </button>
        )}
        
        <button
          onClick={onAddToNotion}
          disabled={isAddingToNotion}
          className={`flex-1 px-4 py-2 text-sm rounded font-medium ${
            isAddingToNotion
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-black text-white hover:bg-gray-800'
          }`}
        >
          {isAddingToNotion ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Adding to Notion...
            </span>
          ) : (
            selectedCategories.length > 0 
              ? `Add to Notion (${selectedCategories.length} categories)`
              : 'Add to Notion'
          )}
        </button>
      </div>
    </div>
  );
};

export default NotionActions; 