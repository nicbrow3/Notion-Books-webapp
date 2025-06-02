import React from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  notionUrl: string;
  categoriesCount: number;
  dateType: string;
  actionType: 'added' | 'updated' | 'added as separate entry';
  onAddAnotherBook: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  bookTitle,
  notionUrl,
  categoriesCount,
  dateType,
  actionType,
  onAddAnotherBook,
}) => {
  if (!isOpen) return null;

  const getSuccessIcon = () => {
    switch (actionType) {
      case 'updated':
        return '🔄';
      case 'added as separate entry':
        return '📚';
      default:
        return '✅';
    }
  };

  const getSuccessTitle = () => {
    switch (actionType) {
      case 'updated':
        return 'Book Updated Successfully!';
      case 'added as separate entry':
        return 'Book Added as Separate Entry!';
      default:
        return 'Book Added Successfully!';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">{getSuccessIcon()}</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {getSuccessTitle()}
          </h2>
          <p className="text-gray-600">
            "{bookTitle}" has been {actionType} in your Notion database
          </p>
        </div>

        {/* Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Categories:</span>
            <span className="font-medium">{categoriesCount}</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-600">Date used:</span>
            <span className="font-medium">{dateType}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => window.open(notionUrl, '_blank', 'noopener,noreferrer')}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View in Notion
          </button>
          
          <button
            onClick={onAddAnotherBook}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Another Book
          </button>
          
          <button
            onClick={onClose}
            className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal; 