import React, { useState, useRef, useEffect } from 'react';
import { CaretDownIcon, ArrowSquareOutIcon } from '@phosphor-icons/react';
import { ICON_CONTEXTS, ICON_WEIGHTS } from '../../../constants/iconConfig';

interface NotionFooterProps {
  isNotionConnected: boolean;
  duplicateStatus: 'unknown' | 'checking' | 'duplicate' | 'unique';
  duplicateCount: number;
  duplicatePages?: Array<{ title: string; url: string }>;
  isAddingToNotion: boolean;
  isCheckingDuplicates: boolean;
  selectedCategoriesCount: number;
  duplicateCheckButtonRef: React.RefObject<HTMLButtonElement>;
  onCheckForDuplicates: () => void;
  onAddToNotion: () => void;
}

const NotionFooter: React.FC<NotionFooterProps> = ({
  isNotionConnected,
  duplicateStatus,
  duplicateCount,
  duplicatePages = [],
  isAddingToNotion,
  isCheckingDuplicates,
  selectedCategoriesCount,
  duplicateCheckButtonRef,
  onCheckForDuplicates,
  onAddToNotion
}) => {
  const [showDuplicatesList, setShowDuplicatesList] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'below' | 'above'>('below');
  const duplicateButtonRef = useRef<HTMLButtonElement>(null);

  // Check dropdown position when it opens
  useEffect(() => {
    if (showDuplicatesList && duplicateButtonRef.current) {
      const buttonRect = duplicateButtonRef.current.getBoundingClientRect();
      const dropdownHeight = 300; // Approximate max height of dropdown
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      
      if (spaceBelow < dropdownHeight && buttonRect.top > dropdownHeight) {
        setDropdownPosition('above');
      } else {
        setDropdownPosition('below');
      }
    }
  }, [showDuplicatesList]);
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
                <div className="relative">
                  <button
                    ref={duplicateButtonRef}
                    onClick={() => setShowDuplicatesList(!showDuplicatesList)}
                    className="group px-4 py-2 text-yellow-700 bg-yellow-200 hover:bg-yellow-300 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <span className="text-base font-bold animate-pulse group-hover:animate-wiggle">
                      {duplicateCount}
                    </span>
                    <span className="text-sm">
                      duplicate{duplicateCount > 1 ? 's' : ''} found
                    </span>
                    <CaretDownIcon 
                      size={ICON_CONTEXTS.UI.BUTTON} 
                      weight={ICON_WEIGHTS.BOLD}
                      className={`transition-transform duration-200 group-hover:animate-wiggle ${
                        showDuplicatesList ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </button>
                  
                  {/* Duplicates List Dropdown */}
                  {showDuplicatesList && duplicatePages.length > 0 && (
                    <div className={`absolute left-0 ${
                      dropdownPosition === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
                    } bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-80 max-w-md`}>
                      <div className="p-3 border-b border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900">
                          Duplicate Pages in Notion
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                          Click to open existing pages
                        </p>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {duplicatePages.map((page, index) => (
                          <a
                            key={index}
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                                {page.title}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {page.url.replace(/^https?:\/\//, '').split('/')[0]}
                              </p>
                            </div>
                            <ArrowSquareOutIcon 
                              size={ICON_CONTEXTS.UI.BUTTON} 
                              weight={ICON_WEIGHTS.BOLD}
                              className="text-gray-400 group-hover:text-blue-600 group-hover:animate-wiggle flex-shrink-0"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isNotionConnected ? (
            <button
              onClick={onAddToNotion}
              disabled={isAddingToNotion || selectedCategoriesCount === 0 || isCheckingDuplicates}
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