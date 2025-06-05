import React from 'react';
import { createPortal } from 'react-dom';

interface ProcessedCategory {
  original: string;
  processed: string;
  isIgnored: boolean;
  isMapped: boolean;
  mappedFrom?: string;
  mappedToThis?: string[];
}

interface ManualMappingModalProps {
  isOpen: boolean;
  processedCategories: ProcessedCategory[];
  manualMappingFrom: string;
  manualMappingTo: string;
  onClose: () => void;
  onSetMappingFrom: (from: string) => void;
  onSetMappingTo: (to: string) => void;
  onExecuteMapping: () => void;
}

const ManualMappingModal: React.FC<ManualMappingModalProps> = ({
  isOpen,
  processedCategories,
  manualMappingFrom,
  manualMappingTo,
  onClose,
  onSetMappingFrom,
  onSetMappingTo,
  onExecuteMapping
}) => {
  if (!isOpen) return null;

  // Create modal content
  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
      style={{ isolation: 'isolate' }}
    >
      <div 
        className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Manual Category Mapping
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Map this category:
            </label>
            <select
              value={manualMappingFrom}
              onChange={(e) => onSetMappingFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select source category...</option>
              {processedCategories
                .filter(cat => !cat.isIgnored)
                .map((cat, idx) => (
                  <option key={idx} value={cat.processed}>
                    {cat.processed}
                  </option>
                ))}
            </select>
          </div>
          
          <div className="flex items-center justify-center py-2">
            <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To this category:
            </label>
            <select
              value={manualMappingTo}
              onChange={(e) => onSetMappingTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select target category...</option>
              {processedCategories
                .filter(cat => !cat.isIgnored && cat.processed !== manualMappingFrom)
                .map((cat, idx) => (
                  <option key={idx} value={cat.processed}>
                    {cat.processed}
                  </option>
                ))}
            </select>
            <div className="mt-2">
              <input
                type="text"
                placeholder="Or type a new category name..."
                value={manualMappingTo}
                onChange={(e) => onSetMappingTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
            <p className="font-medium mb-1">How this works:</p>
            <p>"{manualMappingFrom || 'Source category'}" will be replaced with "{manualMappingTo || 'target category'}" in all future books. Existing mappings will be preserved.</p>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onExecuteMapping}
            disabled={!manualMappingFrom || !manualMappingTo}
            className={`flex-1 px-4 py-2 text-sm rounded font-medium ${
              !manualMappingFrom || !manualMappingTo
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Create Mapping
          </button>
        </div>
      </div>
    </div>
  );

  // Use createPortal to render the modal at the root level of the DOM
  return createPortal(
    modalContent,
    document.body
  );
};

export default ManualMappingModal; 