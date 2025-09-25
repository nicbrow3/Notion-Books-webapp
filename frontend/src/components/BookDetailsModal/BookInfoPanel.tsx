import React, { useState, useEffect } from 'react';
import { BookSearchResult } from '../../types/book';
import AudiobookInfoSection from './AudiobookInfoSection';
import FieldSourceTable from './FieldSourceTable';
import { CategoryService } from '../../services/categoryService';
import SourceBrowser from './SourceBrowser';
import { parseHtmlForDisplay, extractPlainText } from './utils/htmlUtils';

export interface FieldSelections {
  description: 'audiobook' | 'original' | 'audiobook_summary' | number; // number = edition index
  publisher: 'audiobook' | 'original' | number;
  pageCount: 'original' | number;
  releaseDate: 'published' | 'original' | 'audiobook' | 'first_published' | 'copyright' | 'audiobook_copyright' | number; // published = edition date, original = original published date, audiobook = audiobook date, number = edition index
  isbn: 'original' | number;
  thumbnail: 'original' | 'audiobook' | number;
}

interface BookInfoPanelProps {
  book: BookSearchResult;
  editions: any[];
  loadingEditions: boolean;
  loadingAudiobook: boolean;
  notionSettings?: any; // Add notion settings for filtering preferences
  onOpenAudiobookSearch: () => void;
  onSelectEdition?: (edition: any) => void;
  onFieldSelectionChange?: (fieldSelections: FieldSelections, selectedData: any) => void;
}

// ThumbnailSelector component
interface ThumbnailSelectorProps {
  book: BookSearchResult;
  editions: any[];
  selectedValue: 'original' | 'audiobook' | number;
  onSelect: (value: 'original' | 'audiobook' | number) => void;
  filteredEditions: any[];
  createEditionLabel: (edition: any, index: number) => string;
}

const ThumbnailSelector: React.FC<ThumbnailSelectorProps> = ({ 
  book, 
  editions, 
  selectedValue, 
  onSelect,
  filteredEditions,
  createEditionLabel
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [preferAudiobook, setPreferAudiobook] = useState<boolean>(() => {
    // Initialize from saved preference
    return CategoryService.getPreferAudiobookCovers() || false;
  });

  // Get available thumbnail sources
  const getThumbnailSources = () => {
    const sources: Array<{value: 'audiobook' | 'original' | number, label: string, content: string}> = [];
    
    // Original book thumbnail
    if (book.thumbnail) {
      sources.push({
        value: 'original',
        label: 'Original Book',
        content: book.thumbnail
      });
    }

    // Audiobook thumbnail
    if (book.audiobookData?.hasAudiobook && book.audiobookData.image) {
      sources.push({
        value: 'audiobook',
        label: 'Audiobook',
        content: book.audiobookData.image
      });
    }

    // Edition thumbnails
    filteredEditions.forEach((edition, index: number) => {
      if (edition.thumbnail) {
        // Find the original index in the unfiltered editions array
        const originalIndex = editions.findIndex(e => e.id === edition.id);
        sources.push({
          value: originalIndex !== -1 ? originalIndex : index,
          label: createEditionLabel(edition, originalIndex !== -1 ? originalIndex : index),
          content: edition.thumbnail
        });
      }
    });

    return sources;
  };

  const sources = getThumbnailSources();
  const selectedSource = sources.find(source => source.value === selectedValue) || sources[0];
  
  // Check if the selected source is audiobook
  const isAudiobook = selectedValue === 'audiobook';

  // Handle preference change
  const handlePreferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setPreferAudiobook(newValue);
    // Save the preference
    CategoryService.savePreferAudiobookCovers(newValue);
    
    // If user just enabled the preference and we have an audiobook cover, switch to it immediately
    if (newValue && book.audiobookData?.hasAudiobook && book.audiobookData.image && selectedValue !== 'audiobook') {
      onSelect('audiobook');
    }
  };

  return (
    <>
      <div 
        className="cursor-pointer relative group" 
        onClick={() => setIsOpen(true)}
        title="Click to select cover image"
      >
        {selectedSource?.content ? (
          <div className={`${isAudiobook ? 'relative h-48' : 'w-32 h-48'} rounded shadow-lg overflow-hidden flex items-center justify-center bg-gray-100`}>
            <img
              src={selectedSource.content}
              alt={`Cover of ${book.title}`}
              className={`
                ${isAudiobook 
                  ? 'h-full w-auto max-w-none' 
                  : 'w-full h-full object-cover'
                } 
                group-hover:opacity-90 transition-opacity
              `}
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            {isAudiobook && (
              <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                Audiobook
              </div>
            )}
          </div>
        ) : (
          <div className="w-32 h-48 bg-gray-200 rounded shadow-lg flex items-center justify-center group-hover:bg-gray-300 transition-colors">
            <span className="text-gray-400 text-sm text-center">No Cover</span>
          </div>
        )}
        
        {sources.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
            <span className="text-xs">{sources.length}</span>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={() => setIsOpen(false)}>
          <div className="bg-white rounded-lg p-6 max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Select Cover Image</h3>
            
            <div className="mb-4 pb-3 border-b border-gray-200">
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  className="mr-2 h-4 w-4 text-blue-600 rounded"
                  checked={preferAudiobook}
                  onChange={handlePreferenceChange}
                />
                <span>Always prefer audiobook covers when available</span>
              </label>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {sources.map((source, i) => {
                const isSourceAudiobook = source.value === 'audiobook';
                return (
                  <div 
                    key={i} 
                    className={`cursor-pointer p-2 rounded hover:bg-blue-50 transition-colors ${selectedValue === source.value ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                    onClick={() => {
                      onSelect(source.value);
                      setIsOpen(false);
                    }}
                  >
                    <div className="h-40 overflow-hidden rounded mb-2 flex items-center justify-center bg-gray-100">
                      <img 
                        src={source.content} 
                        alt={source.label}
                        className={`max-w-full max-h-full ${isSourceAudiobook ? 'object-contain' : 'object-cover'}`}
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                    <p className="text-xs text-center text-gray-700 truncate">{source.label}</p>
                    {isSourceAudiobook && <p className="text-xs text-center text-blue-500">Audiobook</p>}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setIsOpen(false)} 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const BookInfoPanel: React.FC<BookInfoPanelProps> = ({
  book,
  editions,
  loadingEditions,
  loadingAudiobook,
  notionSettings,
  onOpenAudiobookSearch,
  onSelectEdition,
  onFieldSelectionChange
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [fieldSelections, setFieldSelections] = useState<FieldSelections>({
    description: 'original',
    publisher: 'original', 
    pageCount: 'original',
    releaseDate: 'original',
    isbn: 'original',
    thumbnail: 'original'
  });

  // Add state for managing which field source tables are open
  const [openFieldTables, setOpenFieldTables] = useState<{
    description: boolean;
    publisher: boolean;
    pageCount: boolean;
    releaseDate: boolean;
  }>({
    description: false,
    publisher: false,
    pageCount: false,
    releaseDate: false
  });

  // Function to toggle field table visibility
  const toggleFieldTable = (fieldName: keyof typeof openFieldTables) => {
    setOpenFieldTables(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  // Helper function to check if a date is year-only
  const isYearOnlyDate = (dateString: string | null | undefined) => {
    if (!dateString || typeof dateString !== 'string') return false;
    return /^\d{4}$/.test(dateString.trim());
  };

  // Helper function to clean audiobook date
  const cleanAudiobookDate = (dateString: string | null | undefined) => {
    if (!dateString || typeof dateString !== 'string') return '';
    return dateString.replace(/T00:00:00\.000Z$/, '');
  };

  // Helper function to extract year from date string
  const extractYear = (dateString: string | null | undefined): number | null => {
    if (!dateString || typeof dateString !== 'string') return null;
    const yearMatch = dateString.match(/\d{4}/);
    return yearMatch ? parseInt(yearMatch[0]) : null;
  };

  // Helper function to check if a source is English
  const isEnglishSource = (edition: any) => {
    if (!edition?.language) return true; // Assume English if no language specified
    const lang = edition.language.toLowerCase();
    return lang === 'en' || lang === 'eng' || lang === 'english' || lang.startsWith('en');
  };

  // Helper function to filter editions by language if needed
  const getFilteredEditions = () => {
    // Default to true (English-only) unless explicitly set to false
    if (notionSettings && notionSettings.useEnglishOnlySources === false) {
      return editions; // No filtering if setting is explicitly disabled
    }
    return editions.filter(isEnglishSource);
  };

  // Helper function to create descriptive edition labels
  const createEditionLabel = (edition: any, index: number) => {
    const parts = [];
    
    // Add title if different from main book
    if (edition.title && edition.title !== book.title) {
      parts.push(edition.title);
    }
    
    // Add year if available
    if (edition.publishedDate) {
      const year = edition.publishedDate.match(/\d{4}/)?.[0];
      if (year) {
        parts.push(`${year}`);
      }
    }
    
    // Add publisher if available and helps differentiate
    if (edition.publisher) {
      parts.push(edition.publisher);
    }
    
    // Fallback to edition number if we don't have distinguishing info
    if (parts.length === 0 || (parts.length === 1 && parts[0] === book.title)) {
      parts.push(`Edition ${index + 1}`);
    }
    
    return parts.join(' • ');
  };

  // Helper function to find the earliest date among all available sources
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const findEarliestDateSource = () => {
    const dateSources: Array<{
      value: 'audiobook' | 'original' | 'first_published' | 'copyright' | 'audiobook_copyright' | number;
      label: string;
      dateString: string;
      year: number;
    }> = [];

    // Collect all available date sources with their years
    if (book.copyright && typeof book.copyright === 'string') {
      const year = extractYear(book.copyright);
      if (year) {
        dateSources.push({
          value: 'copyright',
          label: 'Copyright',
          dateString: book.copyright,
          year
        });
      }
    }

    if (book.audiobookData?.hasAudiobook && book.audiobookData.copyright) {
      const copyrightStr = typeof book.audiobookData.copyright === 'string' 
        ? book.audiobookData.copyright 
        : String(book.audiobookData.copyright);
      const year = extractYear(copyrightStr);
      if (year) {
        dateSources.push({
          value: 'audiobook_copyright',
          label: 'Audiobook Copyright',
          dateString: copyrightStr,
          year
        });
      }
    }

    if (book.originalPublishedDate && typeof book.originalPublishedDate === 'string') {
      const year = extractYear(book.originalPublishedDate);
      if (year) {
        dateSources.push({
          value: 'first_published',
          label: 'First Published',
          dateString: book.originalPublishedDate,
          year
        });
      }
    }

    if (book.publishedDate && typeof book.publishedDate === 'string' && book.publishedDate !== book.originalPublishedDate) {
      const year = extractYear(book.publishedDate);
      if (year) {
        dateSources.push({
          value: 'original',
          label: 'This Edition',
          dateString: book.publishedDate,
          year
        });
      }
    }

    if (book.audiobookData?.hasAudiobook && book.audiobookData.publishedDate && typeof book.audiobookData.publishedDate === 'string') {
      const cleanDate = cleanAudiobookDate(book.audiobookData.publishedDate);
      const year = extractYear(cleanDate);
      if (year && cleanDate) {
        dateSources.push({
          value: 'audiobook',
          label: 'Audiobook',
          dateString: cleanDate,
          year
        });
      }
    }

    // Add edition dates
    getFilteredEditions().forEach((edition, index) => {
      if (edition.publishedDate) {
        const year = extractYear(edition.publishedDate);
        if (year) {
          const originalIndex = editions.findIndex(e => e.id === edition.id);
          dateSources.push({
            value: originalIndex !== -1 ? originalIndex : index,
            label: createEditionLabel(edition, originalIndex !== -1 ? originalIndex : index),
            dateString: edition.publishedDate,
            year
          });
        }
      }
    });

    if (dateSources.length === 0) {
      return null;
    }


    // Sort by year (earliest first)
    dateSources.sort((a, b) => a.year - b.year);

    const earliest = dateSources[0];
    const latest = dateSources[dateSources.length - 1];
    

    // If the earliest date is more than a year prior to the latest, use the earliest
    if (latest.year - earliest.year > 1) {
      return earliest.value;
    }

    // If dates are within the same year or close, prefer audiobook if available
    const audiobookSource = dateSources.find(source => source.value === 'audiobook');
    if (audiobookSource && latest.year - earliest.year <= 1) {
      return 'audiobook';
    }

    // Default to the earliest date
    return earliest.value;
  };

  // Initialize field selections with smart defaults when audiobook/editions load
  useEffect(() => {
    const newSelections = { ...fieldSelections };
    let hasChanges = false;

    // Check for saved defaults first
    const savedDescriptionDefault = CategoryService.getFieldDefault('description');
    const savedPublisherDefault = CategoryService.getFieldDefault('publisher');
    const savedPageCountDefault = CategoryService.getFieldDefault('pages');
    const savedReleaseDateDefault = CategoryService.getFieldDefault('releaseDate');
    const savedThumbnailDefault = CategoryService.getFieldDefault('thumbnail');

    // Use saved defaults if available
    if (savedDescriptionDefault !== null && fieldSelections.description === 'original') {
      newSelections.description = savedDescriptionDefault as 'audiobook' | 'original' | 'audiobook_summary' | number;
      hasChanges = true;
    }
    if (savedPublisherDefault !== null && savedPublisherDefault !== 'audiobook_summary' && fieldSelections.publisher === 'original') {
      newSelections.publisher = savedPublisherDefault as 'audiobook' | 'original' | number;
      hasChanges = true;
    }
    if (savedPageCountDefault !== null && savedPageCountDefault !== 'audiobook' && savedPageCountDefault !== 'audiobook_summary' && fieldSelections.pageCount === 'original') {
      newSelections.pageCount = savedPageCountDefault as 'original' | number;
      hasChanges = true;
    }
    if (savedReleaseDateDefault !== null && savedReleaseDateDefault !== 'audiobook_summary' && fieldSelections.releaseDate === 'original') {
      newSelections.releaseDate = savedReleaseDateDefault as 'published' | 'original' | 'audiobook' | 'first_published' | 'copyright' | 'audiobook_copyright' | number;
      hasChanges = true;
    }
    if (savedThumbnailDefault !== null && savedThumbnailDefault !== 'audiobook_summary' && fieldSelections.thumbnail === 'original') {
      newSelections.thumbnail = savedThumbnailDefault as 'original' | 'audiobook' | number;
      hasChanges = true;
    }

    // Check if audiobook has the isEarlierDate flag set, which means we already determined
    // the audiobook date is earlier than the book date during audiobook data loading
    if (book.audiobookData?.hasAudiobook && book.audiobookData.isEarlierDate && fieldSelections.releaseDate === 'original') {
      console.log('Using audiobook date as default because it has isEarlierDate flag set');
      newSelections.releaseDate = 'audiobook';
      hasChanges = true;
    }
    
    // Default to audiobook thumbnail if available and preference is set to prefer audiobooks
    if (book.audiobookData?.hasAudiobook && book.audiobookData.image && fieldSelections.thumbnail === 'original') {
      // Check if user has set a preference for audiobook covers
      const preferAudiobookCovers = CategoryService.getPreferAudiobookCovers();
      if (preferAudiobookCovers) {
        console.log('Defaulting to audiobook cover based on user preference');
        newSelections.thumbnail = 'audiobook';
        hasChanges = true;
      }
    }

    // Fallback to smart defaults if no saved preferences and no isEarlierDate flag
    else if (!hasChanges) {
      // Default to audiobook description if available and not already set to audiobook
      if (book.audiobookData?.hasAudiobook && book.audiobookData.description && fieldSelections.description === 'original') {
        newSelections.description = 'audiobook';
        hasChanges = true;
      }

      // Default to audiobook publisher if available and original is missing
      if (book.audiobookData?.hasAudiobook && book.audiobookData.publisher && !book.publisher && fieldSelections.publisher === 'original') {
        newSelections.publisher = 'audiobook';
        hasChanges = true;
      }

      // Use smart date selection algorithm to find the best default published date
      if (fieldSelections.releaseDate === 'original') {
        console.log('📅 Running smart date selection algorithm');
        const smartDateSelection = findEarliestDateSource();
        console.log('📅 Smart date selection result:', smartDateSelection);
        if (smartDateSelection && smartDateSelection !== 'original') {
          console.log('📅 Changing default releasedate to:', smartDateSelection);
          newSelections.releaseDate = smartDateSelection;
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      setFieldSelections(newSelections);
    }
  }, [book.publisher, fieldSelections, findEarliestDateSource, book.audiobookData, editions.length, notionSettings?.useEnglishOnlySources]);

  // Get available description sources
  const getDescriptionSources = () => {
    const sources: Array<{value: 'audiobook' | 'original' | 'audiobook_summary' | number, label: string, content: string}> = [];
    
    // Original book description
    if (book.description) {
      sources.push({
        value: 'original',
        label: 'Original Book',
        content: book.description
      });
    }

    // Audiobook description
    if (book.audiobookData?.hasAudiobook && book.audiobookData.description) {
      sources.push({
        value: 'audiobook',
        label: 'Audiobook',
        content: book.audiobookData.description
      });
    }
    
    // Audiobook summary ("About this listen")
    if (book.audiobookData?.hasAudiobook && book.audiobookData.summary) {
      sources.push({
        value: 'audiobook_summary',
        label: 'About this listen',
        content: book.audiobookData.summary
      });
    }

    // Edition descriptions
    getFilteredEditions().forEach((edition, index) => {
      if (edition.description) {
        // Find the original index in the unfiltered editions array
        const originalIndex = editions.findIndex(e => e.id === edition.id);
        sources.push({
          value: originalIndex !== -1 ? originalIndex : index,
          label: createEditionLabel(edition, originalIndex !== -1 ? originalIndex : index),
          content: edition.description
        });
      }
    });

    return sources;
  };

  // Get the currently selected description
  const getSelectedDescription = () => {
    const sources = getDescriptionSources();
    const selectedSource = sources.find(source => source.value === fieldSelections.description);
    return selectedSource?.content || book.description || '';
  };

  // Get the source label for the selected description

  // Get available publisher sources
  const getPublisherSources = () => {
    const sources: Array<{value: 'audiobook' | 'original' | number, label: string, content: string}> = [];
    
    // Original book publisher
    if (book.publisher) {
      sources.push({
        value: 'original',
        label: 'Original Book',
        content: book.publisher
      });
    }

    // Audiobook publisher
    if (book.audiobookData?.hasAudiobook && book.audiobookData.publisher) {
      sources.push({
        value: 'audiobook',
        label: 'Audiobook',
        content: book.audiobookData.publisher
      });
    }

    // Edition publishers
    getFilteredEditions().forEach((edition, index) => {
      if (edition.publisher) {
        // Find the original index in the unfiltered editions array
        const originalIndex = editions.findIndex(e => e.id === edition.id);
        sources.push({
          value: originalIndex !== -1 ? originalIndex : index,
          label: createEditionLabel(edition, originalIndex !== -1 ? originalIndex : index),
          content: edition.publisher
        });
      }
    });

    return sources;
  };

  // Get available page count sources
  const getPageCountSources = () => {
    const sources: Array<{value: 'original' | number, label: string, content: number}> = [];
    
    // Original book page count
    if (book.pageCount) {
      sources.push({
        value: 'original',
        label: 'Original Book',
        content: book.pageCount
      });
    }

    // Edition page counts
    getFilteredEditions().forEach((edition, index) => {
      if (edition.pageCount) {
        // Find the original index in the unfiltered editions array
        const originalIndex = editions.findIndex(e => e.id === edition.id);
        sources.push({
          value: originalIndex !== -1 ? originalIndex : index,
          label: createEditionLabel(edition, originalIndex !== -1 ? originalIndex : index),
          content: edition.pageCount
        });
      }
    });

    return sources;
  };

  // Get available release date sources
  const getReleaseDateSources = () => {
    
    const sources: Array<{value: 'published' | 'original' | 'audiobook' | 'first_published' | 'copyright' | 'audiobook_copyright' | number, label: string, content: string}> = [];
    
    // Collect all potential dates first
    const potentialSources: Array<{
      value: 'published' | 'original' | 'audiobook' | 'first_published' | 'copyright' | 'audiobook_copyright' | number;
      label: string;
      content: string;
      isYearOnly: boolean;
    }> = [];
    
    // Copyright date (often the earliest/most accurate)
    if (book.copyright && typeof book.copyright === 'string') {
      potentialSources.push({
        value: 'copyright',
        label: 'Copyright',
        content: book.copyright,
        isYearOnly: isYearOnlyDate(book.copyright)
      });
    }
    
    // Audiobook copyright date
    
    if (book.audiobookData?.hasAudiobook && book.audiobookData.copyright && typeof book.audiobookData.copyright === 'string') {
      potentialSources.push({
        value: 'audiobook_copyright',
        label: 'Audiobook Copyright',
        content: book.audiobookData.copyright,
        isYearOnly: isYearOnlyDate(book.audiobookData.copyright)
      });
    } else if (book.audiobookData?.hasAudiobook && book.audiobookData.copyright) {
      // Handle case where copyright might be a number instead of string
      const copyrightStr = String(book.audiobookData.copyright);
      potentialSources.push({
        value: 'audiobook_copyright',
        label: 'Audiobook Copyright',
        content: copyrightStr,
        isYearOnly: isYearOnlyDate(copyrightStr)
      });
    }
    
    // First published date (original published date)
    if (book.originalPublishedDate && typeof book.originalPublishedDate === 'string') {
      potentialSources.push({
        value: 'first_published',
        label: 'First Published',
        content: book.originalPublishedDate,
        isYearOnly: isYearOnlyDate(book.originalPublishedDate)
      });
    }
    
    // This edition published date
    if (book.publishedDate && typeof book.publishedDate === 'string' && book.publishedDate !== book.originalPublishedDate) {
      potentialSources.push({
        value: 'original',
        label: 'This Edition',
        content: book.publishedDate,
        isYearOnly: isYearOnlyDate(book.publishedDate)
      });
    }

    // If we only have one date (either publishedDate or originalPublishedDate but not both)
    if (!book.originalPublishedDate && book.publishedDate && typeof book.publishedDate === 'string') {
      potentialSources.push({
        value: 'original',
        label: 'Original Book',
        content: book.publishedDate,
        isYearOnly: isYearOnlyDate(book.publishedDate)
      });
    }

    // Audiobook published date
    if (book.audiobookData?.hasAudiobook && book.audiobookData.publishedDate && typeof book.audiobookData.publishedDate === 'string') {
      const cleanDate = cleanAudiobookDate(book.audiobookData.publishedDate);
      if (cleanDate) { // Only add if cleanDate is not empty
        potentialSources.push({
          value: 'audiobook',
          label: 'Audiobook',
          content: cleanDate,
          isYearOnly: isYearOnlyDate(cleanDate)
        });
      }
    }

    // Edition published dates
    getFilteredEditions().forEach((edition, index) => {
      if (edition.publishedDate) {
        // Find the original index in the unfiltered editions array
        const originalIndex = editions.findIndex(e => e.id === edition.id);
        potentialSources.push({
          value: originalIndex !== -1 ? originalIndex : index,
          label: createEditionLabel(edition, originalIndex !== -1 ? originalIndex : index),
          content: edition.publishedDate,
          isYearOnly: isYearOnlyDate(edition.publishedDate)
        });
      }
    });

    
    // Smart filtering: only remove year-only dates if they're close to specific dates
    // Always keep year-only dates that are significantly earlier (more than 2 years)
    const specificDates = potentialSources.filter(source => !source.isYearOnly);
    const yearOnlyDates = potentialSources.filter(source => source.isYearOnly);
    
    let filteredSources = [...specificDates]; // Start with all specific dates
    
    if (specificDates.length > 0 && yearOnlyDates.length > 0) {
      // Get the earliest year from specific dates
      const earliestSpecificYear = Math.min(...specificDates.map(source => extractYear(source.content) || 9999));
      
      // Keep year-only dates that are significantly earlier (more than 2 years) or if no specific date year found
      yearOnlyDates.forEach(source => {
        const year = extractYear(source.content);
        if (year && (earliestSpecificYear === 9999 || year < earliestSpecificYear - 2)) {
          filteredSources.push(source);
        } else {
        }
      });
    } else {
      // If no specific dates, keep all year-only dates
      filteredSources = potentialSources;
    }
      

    // Convert to final format
    filteredSources.forEach(source => {
      sources.push({
        value: source.value,
        label: source.label,
        content: source.content
      });
    });

    return sources;
  };

  // Get selected values for fields
  const getSelectedPublisher = () => {
    const sources = getPublisherSources();
    const selectedSource = sources.find(source => source.value === fieldSelections.publisher);
    return selectedSource?.content || book.publisher || '';
  };

  const getSelectedPageCount = () => {
    const sources = getPageCountSources();
    const selectedSource = sources.find(source => source.value === fieldSelections.pageCount);
    return selectedSource?.content || book.pageCount || null;
  };

  const getSelectedReleaseDate = () => {
    const sources = getReleaseDateSources();
    const selectedSource = sources.find(source => source.value === fieldSelections.releaseDate);
    
    // If we have multiple sources, return the selected one
    if (sources.length > 1) {
      return selectedSource?.content || sources[0]?.content || '';
    }
    
    // If we only have one source, return it
    if (sources.length === 1) {
      return sources[0].content;
    }
    
    // Fallback
    return book.publishedDate || book.originalPublishedDate || book.copyright || book.audiobookData?.copyright || '';
  };

  // Get the selected thumbnail
  const getSelectedThumbnail = () => {
    // Logic for thumbnail selection based on fieldSelections.thumbnail
    if (fieldSelections.thumbnail === 'audiobook' && book.audiobookData?.hasAudiobook && book.audiobookData.image) {
      return book.audiobookData.image;
    } else if (typeof fieldSelections.thumbnail === 'number' && editions[fieldSelections.thumbnail]?.thumbnail) {
      return editions[fieldSelections.thumbnail].thumbnail;
    }
    
    // Default to original
    return book.thumbnail;
  };

  // Notify parent of current selections
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const notifyFieldSelectionChange = (newSelections?: FieldSelections) => {
    const selections = newSelections || fieldSelections;
    if (onFieldSelectionChange) {
      const selectedData = {
        description: getSelectedDescription(),
        publisher: getSelectedPublisher(),
        pageCount: getSelectedPageCount(),
        releaseDate: getSelectedReleaseDate(),
        thumbnail: getSelectedThumbnail(),
      };
      onFieldSelectionChange(selections, selectedData);
    }
  };

  // Call notification when selections change
  useEffect(() => {
    notifyFieldSelectionChange();
  }, [fieldSelections, notifyFieldSelectionChange]);

  const formatAuthors = (authors: string[]) => {
    if (!authors || authors.length === 0) return 'Unknown Author';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return authors.join(' and ');
    return `${authors.slice(0, -1).join(', ')}, and ${authors[authors.length - 1]}`;
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Unknown';
    
    try {
      // Check if it's just a year (4 digits) - show only the year
      if (/^\d{4}$/.test(dateString.trim())) {
        return dateString.trim(); // Just show "2023" instead of "January 1, 2023"
      }
      
      // Check if it's in YYYY-MM-DD format to avoid timezone issues
      const isoDateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoDateMatch) {
        const [, year, month, day] = isoDateMatch;
        // Create date with explicit components to avoid timezone parsing issues
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
      
      // Try to parse the full date
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        // If invalid date but contains a year, extract and use just the year
        const yearMatch = dateString.match(/\d{4}/);
        if (yearMatch) {
          return yearMatch[0]; // Just show the year
        }
        return dateString; // Return original if we can't parse anything
      }
      
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
      <div className="flex gap-4 mb-6">
        {/* Book Cover - Now using ThumbnailSelector */}
        <div className="flex-shrink-0">
          <ThumbnailSelector
            book={book}
            editions={editions}
            selectedValue={fieldSelections.thumbnail}
            onSelect={(value) => {
              setFieldSelections(prev => ({ ...prev, thumbnail: value }));
            }}
            filteredEditions={getFilteredEditions()}
            createEditionLabel={createEditionLabel}
          />
        </div>

        {/* Basic Info */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {book.title}
            {book.subtitle && (
              <span className="text-gray-600 font-normal">: {book.subtitle}</span>
            )}
          </h3>
          
          <p className="text-sm text-gray-600 mb-3">
            by {formatAuthors(book.authors)}
          </p>

          {/* Replace source indicator and editions info with SourceBrowser */}
          <div className="mb-3">
            <SourceBrowser
              book={book}
              editions={editions}
              isFiltering={notionSettings?.useEnglishOnlySources !== false && getFilteredEditions().length !== editions.length}
              filteredEditions={getFilteredEditions()}
              loadingEditions={loadingEditions}
            />
          </div>
        </div>
      </div>

      {/* Description */}
      {(getSelectedDescription() || getDescriptionSources().length > 0) && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium text-gray-900">Description</h4>
            <FieldSourceTable
              fieldName="Description"
              sources={getDescriptionSources()}
              selectedValue={fieldSelections.description}
              onSelect={(value) => {
                setFieldSelections(prev => ({ ...prev, description: value }));
              }}
              isOpen={openFieldTables.description}
              onToggle={() => toggleFieldTable('description')}
            />
          </div>
          <div className="text-sm text-gray-700 leading-relaxed">
            {fieldSelections.description === 'audiobook_summary' ? (
              <div 
                className={`prose prose-sm max-w-none ${!isDescriptionExpanded ? 'line-clamp-3 max-h-[4.5rem] overflow-hidden' : ''}`}
                dangerouslySetInnerHTML={{ __html: parseHtmlForDisplay(getSelectedDescription()) }}
              />
            ) : (
              <p 
                className={`${!isDescriptionExpanded ? 'line-clamp-3' : ''}`}
                style={{
                  overflow: isDescriptionExpanded ? 'visible' : 'hidden',
                  maxHeight: isDescriptionExpanded ? 'none' : '4.5rem' // Approximately 3 lines
                }}
              >
                {getSelectedDescription()}
              </p>
            )}
            {(() => {
              // Use plain text length for "Show more" button logic, especially for HTML content
              const textLength = fieldSelections.description === 'audiobook_summary' 
                ? extractPlainText(getSelectedDescription()).length 
                : getSelectedDescription().length;
              return textLength > 200 && (
                <button
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="text-blue-600 hover:text-blue-800 text-sm mt-2 underline"
                >
                  {isDescriptionExpanded ? 'Show less' : 'Show more'}
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {/* Detailed Metadata */}
      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
        {getReleaseDateSources().length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900">Published:</span>
              {getReleaseDateSources().length > 1 && (
                <FieldSourceTable
                  fieldName="Published Date"
                  sources={getReleaseDateSources()}
                  selectedValue={fieldSelections.releaseDate}
                  onSelect={(value) => {
                    setFieldSelections(prev => ({ ...prev, releaseDate: value }));
                  }}
                  isOpen={openFieldTables.releaseDate}
                  onToggle={() => toggleFieldTable('releaseDate')}
                />
              )}
            </div>
            <p className="text-gray-600">{formatDate(getSelectedReleaseDate())}</p>
          </div>
        )}
        {getSelectedPublisher() && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900">Publisher:</span>
              <FieldSourceTable
                fieldName="Publisher"
                sources={getPublisherSources()}
                selectedValue={fieldSelections.publisher}
                onSelect={(value) => {
                  setFieldSelections(prev => ({ ...prev, publisher: value }));
                }}
                isOpen={openFieldTables.publisher}
                onToggle={() => toggleFieldTable('publisher')}
              />
            </div>
            <p className="text-gray-600">{getSelectedPublisher()}</p>
          </div>
        )}
        {getSelectedPageCount() && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900">Pages:</span>
              <FieldSourceTable
                fieldName="Pages"
                sources={getPageCountSources()}
                selectedValue={fieldSelections.pageCount}
                onSelect={(value) => {
                  setFieldSelections(prev => ({ ...prev, pageCount: value }));
                }}
                isOpen={openFieldTables.pageCount}
                onToggle={() => toggleFieldTable('pageCount')}
              />
            </div>
            <p className="text-gray-600">{getSelectedPageCount()}</p>
          </div>
        )}
        {book.language && (
          <div>
            <span className="font-medium text-gray-900">Language:</span>
            <p className="text-gray-600">{book.language.toUpperCase()}</p>
          </div>
        )}
        {book.isbn13 && (
          <div>
            <span className="font-medium text-gray-900">ISBN-13:</span>
            <p className="text-gray-600 font-mono text-xs">{book.isbn13}</p>
          </div>
        )}
        {book.isbn10 && (
          <div>
            <span className="font-medium text-gray-900">ISBN-10:</span>
            <p className="text-gray-600 font-mono text-xs">{book.isbn10}</p>
          </div>
        )}
        {book.openLibraryData?.firstPublishYear && (
          <div>
            <span className="font-medium text-gray-800">First Published:</span>
            <p className="text-gray-700">{book.openLibraryData.firstPublishYear}</p>
          </div>
        )}
        
        {book.copyright && (
          <div>
            <span className="font-medium text-gray-800">Copyright:</span>
            <p className="text-gray-700">{book.copyright}</p>
          </div>
        )}
      </div>

      {/* Audiobook Information */}
      <AudiobookInfoSection
        book={book}
        loadingAudiobook={loadingAudiobook}
        onOpenAudiobookSearch={onOpenAudiobookSearch}
      />

      {/* Links */}
      <div className="mt-6">
        <h4 className="font-medium text-gray-900 mb-2">Links</h4>
        <div className="flex flex-wrap gap-2">
          {book.previewLink && (
            <a
              href={book.previewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              Preview
            </a>
          )}
          {book.infoLink && (
            <a
              href={book.infoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              More Info
            </a>
          )}
          {book.buyLink && (
            <a
              href={book.buyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-800 underline text-sm"
            >
              Buy
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookInfoPanel; 