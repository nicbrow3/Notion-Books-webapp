import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BookSearchResult, BookEdition } from '../../types/book';

interface SourceBrowserProps {
  book: BookSearchResult;
  editions: BookEdition[];
  isFiltering: boolean;
  filteredEditions: BookEdition[];
  loadingEditions: boolean;
  onSelectEdition?: (edition: BookEdition) => void;
}

const SourceBrowser: React.FC<SourceBrowserProps> = ({
  book,
  editions,
  isFiltering,
  filteredEditions,
  loadingEditions
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, left: number} | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{top: number, left: number} | null>(null);

  // Prevent background scrolling when dropdown is open
  useEffect(() => {
    if (isOpen) {
      // Save the current scroll position
      const scrollY = window.scrollY;
      
      // Add styles to prevent scrolling
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // Remove styles and restore scroll position when dropdown closes
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Update dropdown position when button position changes
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom,
        left: rect.left
      });
    }
  }, [isOpen]);

  // Update tooltip position when hovering over an item
  const updateTooltipPosition = (event: React.MouseEvent<HTMLDivElement>, itemType: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      top: rect.top,
      left: rect.right + 10 // 10px offset from the right edge
    });
    setHoveredItem(itemType);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen && 
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current && 
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHoveredItem(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Get total number of data sources
  const totalSources = 1 + (book.audiobookData?.hasAudiobook ? 1 : 0) + filteredEditions.length;

  // Format source name for display
  const formatSourceName = () => {
    if (book.source === 'merged_apis') return 'Google Books + Open Library';
    if (book.source === 'open_library_primary') return 'Open Library';
    if (book.source === 'google_books_enhanced') return 'Google Books (Enhanced)';
    if (book.source === 'open_library_edition') return 'Open Library Edition';
    return book.source || 'Unknown';
  };

  // Helper function to display a field only if it exists
  const renderField = (label: string, value: any) => {
    if (value === null || value === undefined || value === '') return null;
    
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      return (
        <p><span className="font-medium">{label}:</span> {value.join(', ')}</p>
      );
    }
    
    return (
      <p><span className="font-medium">{label}:</span> {value.toString()}</p>
    );
  };

  // Render tooltip content for primary source
  const renderPrimaryTooltip = () => {
    if (hoveredItem !== 'primary' || !tooltipPosition) return null;

    return createPortal(
      <div 
        className="fixed shadow-lg w-[350px] bg-white border border-gray-200 rounded-md p-3 z-[99999]"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
        }}
      >
        <div className="text-sm text-gray-600 space-y-1">
          {renderField('ISBN-10', book.isbn10)}
          {renderField('Language', book.language)}
          {renderField('Categories', book.categories?.join(', '))}
          {renderField('Original Published Date', book.originalPublishedDate)}
          {renderField('Source', book.source)}
          {renderField('ID', book.id)}
          {book.thumbnail && (
            <div className="mt-2">
              <span className="font-medium">Cover:</span>
              <img 
                src={book.thumbnail} 
                alt="Book cover" 
                className="mt-1 max-h-28 object-contain" 
              />
            </div>
          )}
          {book.description && (
            <div className="mt-2">
              <span className="font-medium">Description:</span>
              <p className="mt-1 line-clamp-4">{book.description}</p>
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  };

  // Render tooltip content for audiobook
  const renderAudiobookTooltip = () => {
    if (hoveredItem !== 'audiobook' || !tooltipPosition || !book.audiobookData?.hasAudiobook) return null;

    return createPortal(
      <div 
        className="fixed shadow-lg w-[350px] bg-white border border-purple-200 rounded-md p-3 z-[99999]"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
        }}
      >
        <div className="text-sm text-purple-800 space-y-1">
          {renderField('ASIN', book.audiobookData.asin)}
          {renderField('Language', book.audiobookData.language)}
          {renderField('Series', book.audiobookData.series)}
          {book.audiobookData.description && (
            <div className="mt-2">
              <span className="font-medium">Description:</span>
              <p className="mt-1 line-clamp-4">{book.audiobookData.description}</p>
            </div>
          )}
          {book.audiobookData.image && (
            <div className="mt-2">
              <span className="font-medium">Cover:</span>
              <img 
                src={book.audiobookData.image} 
                alt="Audiobook cover" 
                className="mt-1 max-h-28 object-contain" 
              />
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  };

  // Render tooltip content for edition
  const renderEditionTooltip = () => {
    if (!hoveredItem?.startsWith('edition-') || !tooltipPosition) return null;
    
    const editionIndex = parseInt(hoveredItem.replace('edition-', ''));
    const edition = filteredEditions[editionIndex];
    if (!edition) return null;

    return createPortal(
      <div 
        className="fixed shadow-lg w-[350px] bg-white border border-gray-200 rounded-md p-3 z-[99999]"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
        }}
      >
        <div className="text-sm text-gray-600 space-y-1">
          {renderField('Author(s)', edition.authors?.join(', '))}
          {renderField('ISBN-13', edition.isbn13)}
          {renderField('ISBN-10', edition.isbn10)}
          {renderField('Language', edition.language)}
          {renderField('Pages', edition.pageCount)}
          {renderField('Format', edition.format)}
          {edition.thumbnail && (
            <div className="mt-2">
              <span className="font-medium">Cover:</span>
              <img 
                src={edition.thumbnail} 
                alt="Edition cover" 
                className="mt-1 max-h-28 object-contain" 
              />
            </div>
          )}
          {edition.description && (
            <div className="mt-2">
              <span className="font-medium">Description:</span>
              <p className="mt-1 line-clamp-4">{edition.description}</p>
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  };

  // Render dropdown content using portal
  const renderDropdown = () => {
    if (!isOpen || !dropdownPosition) return null;

    return createPortal(
      <div 
        ref={dropdownRef}
        className="fixed shadow-lg w-[450px] bg-white border border-gray-200 rounded-md"
        style={{
          top: `${dropdownPosition.top + 5}px`,
          left: `${dropdownPosition.left}px`,
          zIndex: 99999
        }}
      >
        <div className="max-h-[500px] overflow-y-auto p-4">
          {/* 1. Primary Source */}
          <div 
            className={`mb-4 p-3 border border-gray-200 rounded-md transition-all duration-200 ${hoveredItem === 'primary' ? 'shadow-md bg-gray-50' : 'hover:bg-gray-50'}`}
            onMouseEnter={(e) => updateTooltipPosition(e, 'primary')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium text-gray-900">Primary Source</div>
              <div className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                {formatSourceName()}
              </div>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              {/* Always shown fields */}
              {renderField('Title', book.title)}
              {renderField('Author', book.authors.join(', '))}
              {renderField('Published', book.publishedDate)}
              {renderField('Publisher', book.publisher)}
              {renderField('Pages', book.pageCount)}
              {renderField('ISBN-13', book.isbn13)}
            </div>
          </div>

          {/* 2. Audiobook (if available) */}
          {book.audiobookData?.hasAudiobook && (
            <div 
              className={`mb-4 p-3 border border-purple-200 rounded-md transition-all duration-200 ${hoveredItem === 'audiobook' ? 'shadow-md bg-purple-50' : 'hover:bg-purple-50'}`}
              onMouseEnter={(e) => updateTooltipPosition(e, 'audiobook')}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="font-medium text-purple-900">Audiobook</div>
                <div className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded">
                  {book.audiobookData.source === 'audnexus' ? 'Audnexus' : book.audiobookData.source}
                </div>
              </div>
              <div className="text-sm text-purple-800 space-y-1">
                {/* Always shown fields */}
                {renderField('Title', book.audiobookData.title)}
                {book.audiobookData.narrators && book.audiobookData.narrators.length > 0 && 
                  renderField(`Narrator${book.audiobookData.narrators.length > 1 ? 's' : ''}`, book.audiobookData.narrators.join(', '))}
                {renderField('Published', book.audiobookData.publishedDate)}
                {renderField('Publisher', book.audiobookData.publisher)}
                {book.audiobookData.totalDurationHours && 
                  renderField('Duration', `${book.audiobookData.totalDurationHours.toFixed(1)} hrs`)}
                {book.audiobookData.rating && 
                  renderField('Rating', `${book.audiobookData.rating}/5 ${book.audiobookData.ratingCount ? `(${book.audiobookData.ratingCount} reviews)` : ''}`)}
              </div>
            </div>
          )}

          {/* 3. Editions (if any) */}
          {filteredEditions.length > 0 && (
            <>
              <div className="flex justify-between items-center mb-2">
                <div className="font-medium text-gray-900">Editions</div>
                <div className="text-xs text-gray-500">
                  {isFiltering ? `${filteredEditions.length} of ${editions.length} (English only)` : editions.length} total
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {filteredEditions.map((edition, index) => (
                  <div 
                    key={index} 
                    className={`p-3 border border-gray-200 rounded-md transition-all duration-200 ${hoveredItem === `edition-${index}` ? 'shadow-md bg-gray-50' : 'hover:bg-gray-50'}`}
                    onMouseEnter={(e) => updateTooltipPosition(e, `edition-${index}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className="font-medium text-gray-800 text-sm">{edition.title}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {edition.publishedDate && <span className="mr-2">{edition.publishedDate}</span>}
                      {edition.publisher && <span>{edition.publisher}</span>}
                    </div>
                    
                    {/* Basic info about description */}
                    {edition.description && (
                      <div className="text-xs text-green-600 mt-1">
                        Has description ({edition.description.length} chars)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer with Stats */}
        <div className="border-t border-gray-200 p-3 text-xs text-gray-500 bg-gray-50 rounded-b-md">
          <div className="flex justify-between">
            <span>
              <span className="font-medium">{totalSources}</span> total data sources
              {isFiltering && <span> (filtered for English)</span>}
            </span>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors"
          disabled={loadingEditions}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">Data Sources ({totalSources})</span>
          {loadingEditions && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
          <svg 
            className={`w-4 h-4 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {renderDropdown()}
        {renderPrimaryTooltip()}
        {renderAudiobookTooltip()}
        {renderEditionTooltip()}
      </div>
    </>
  );
};

export default SourceBrowser; 