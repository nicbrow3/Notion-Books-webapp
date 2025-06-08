import React from 'react';

interface ActionBarProps {
  selectedCategoriesCount: number;
  duplicateStatus: 'unknown' | 'checking' | 'duplicate' | 'unique';
  onOpenCategoriesModal: () => void;
}

const ActionBar: React.FC<ActionBarProps> = ({
  selectedCategoriesCount,
  duplicateStatus,
  onOpenCategoriesModal
}) => {
  return (
    <div className="flex items-center justify-between mb-6 p-4 bg-gray-100 rounded-lg">
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenCategoriesModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          Manage Categories ({selectedCategoriesCount} selected)
        </button>
      </div>

      <div className="flex items-center gap-2">
        {duplicateStatus === 'unique' && (
          <div className="text-green-600 text-sm font-medium">
            No duplicates found
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionBar; 