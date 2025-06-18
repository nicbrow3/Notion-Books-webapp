import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CategoryService } from '../../services/categoryService';
import { parseHtmlForDisplay } from './utils/htmlUtils';

interface FieldSource<T = string> {
  value: T;
  label: string;
  content: string | number;
}

interface FieldSourceSelectionModalProps<T = string> {
  isOpen: boolean;
  onClose: () => void;
  fieldName: string;
  sources: FieldSource<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
}

const FieldSourceSelectionModal = <T extends string | number>({
  isOpen,
  onClose,
  fieldName,
  sources,
  selectedValue,
  onSelect
}: FieldSourceSelectionModalProps<T>) => {
  const [isMounted, setIsMounted] = useState(false);
  const [defaultSource, setDefaultSource] = useState<T | null>(() => {
    const saved = CategoryService.getFieldDefault(fieldName.toLowerCase());
    return saved as T | null;
  });
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return ''; // Return empty string for falsy dates
    
    try {
      // Remove time portion if present (T00:00:00.000Z)
      const cleanDate = dateString.split('T')[0];
      
      // Check if it's just a year (4 digits) - show only the year
      if (/^\d{4}$/.test(cleanDate.trim())) {
        return cleanDate.trim();
      }
      
      // Check if it's in YYYY-MM-DD format to avoid timezone issues
      const isoDateMatch = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoDateMatch) {
        const [, year, month, day] = isoDateMatch;
        // Use UTC to prevent the date from shifting due to timezone differences
        const date = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)));
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: '2-digit',
          timeZone: 'UTC'
        });
      }
      
      // Try to parse the full date from original string to preserve timezone if available
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        // If invalid date but contains a year, extract and use just the year
        const yearMatch = cleanDate.match(/\d{4}/);
        if (yearMatch) {
          return yearMatch[0];
        }
        return dateString; // Return original if we can't parse anything
      }
      
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Helper function to check if content is a date and format it
  const formatContentIfDate = (content: string | number): string | number => {
    if (typeof content !== 'string') return content;
    
    // Check if the field name suggests this is a date field
    const isDateField = fieldName.toLowerCase().includes('date') || 
                       fieldName.toLowerCase().includes('published') ||
                       fieldName.toLowerCase().includes('copyright') ||
                       fieldName.toLowerCase().includes('release');
    
    if (!isDateField) return content;
    
    // Try to format as date
    const formatted = formatDate(content);
    return formatted || content;
  };

  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    // Delay the actual close to allow animation to complete
    setTimeout(() => {
      onClose();
    }, 300); // Match the exit animation duration
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling to parent modal
    if (e.target === e.currentTarget && !isClosing) {
      handleClose();
    }
  };

  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling to parent modal
  };

  const handleSetDefault = (value: T) => {
    setDefaultSource(value);
    CategoryService.setFieldDefault(fieldName.toLowerCase(), value as any);
  };

  const toggleDescriptionExpansion = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Helper to check if description content should be truncated
  const shouldTruncateDescription = (content: string | number): boolean => {
    if (typeof content !== 'string') return false;
    // Remove HTML tags to get plain text length for better estimation
    const plainText = content.replace(/<[^>]*>/g, '');
    return plainText.length > 200; // Truncate if longer than 200 characters
  };

  const handleRowClick = (source: FieldSource<T>, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent event bubbling to parent modal
    // Don't select if clicking on the default button
    if ((event.target as HTMLElement).closest('.default-button')) {
      return;
    }
    if (!isClosing) {
      onSelect(source.value);
      handleClose();
    }
  };

  // Convert camelCase to proper case with spaces
  const formatFieldName = (fieldName: string): string => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Determine if this is a description field that needs wider layout
  const isDescriptionField = fieldName.toLowerCase().includes('description');
  
  // Determine if this is an image field that needs image previews
  const isImageField = fieldName.toLowerCase().includes('cover') || 
                      fieldName.toLowerCase().includes('thumbnail') || 
                      fieldName.toLowerCase().includes('image');
  
  // Calculate dynamic widths and layout based on field type
  const getLayoutConfig = () => {
    if (isDescriptionField) {
      return {
        containerMaxWidth: 'max-w-4xl',
        defaultColumnWidth: 'w-20',
        sourceColumnWidth: 'w-48',
        tableLayout: 'table-fixed' as const
      };
    } else if (isImageField) {
      return {
        containerMaxWidth: 'max-w-3xl',
        defaultColumnWidth: 'w-20',
        sourceColumnWidth: 'w-48',
        tableLayout: 'table-auto' as const
      };
    } else {
      return {
        containerMaxWidth: 'max-w-2xl',
        defaultColumnWidth: 'w-16',
        sourceColumnWidth: 'w-32',
        tableLayout: 'table-auto' as const
      };
    }
  };

  const layoutConfig = getLayoutConfig();

  if (!isMounted) {
    return null;
  }

  // Don't show modal if there's only one source
  if (sources.length <= 1) {
    return null;
  }



  // Ensure document.body exists for SSR safety
  if (typeof document !== 'undefined' && document.body) {
    return ReactDOM.createPortal(
      <AnimatePresence mode="wait">
        {(isOpen || isClosing) && (
          <motion.div
            key="field-source-modal"
            className="modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: isClosing ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            onClick={handleBackdropClick}
          >
            <motion.div
              className={`bg-white rounded-lg w-full ${layoutConfig.containerMaxWidth} max-h-[80vh] overflow-hidden shadow-2xl`}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ 
                opacity: isClosing ? 0 : 1, 
                scale: isClosing ? 0.9 : 1, 
                y: isClosing ? 0 : 0 
              }}
              transition={{ 
                type: "spring", 
                stiffness: isClosing ? 600 : 300, 
                damping: isClosing ? 25 : 30,
                duration: isClosing ? 0.25 : 0.3
              }}
              onClick={handleModalContentClick}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Select {formatFieldName(fieldName)} Source
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Choose which source to use for this field
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="max-h-[60vh] overflow-y-auto transition-all duration-300 ease-in-out">
                <table className={`w-full text-sm ${layoutConfig.tableLayout}`}>
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className={`text-left p-4 font-medium text-gray-700 ${layoutConfig.defaultColumnWidth}`}>Default</th>
                      <th className={`text-left p-4 font-medium text-gray-700 ${layoutConfig.sourceColumnWidth}`}>Source</th>
                      <th className="text-left p-4 font-medium text-gray-700">{formatFieldName(fieldName)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sources.map((source, index) => {
                      const isSelected = source.value === selectedValue;
                      const isDefault = source.value === defaultSource;
                      return (
                        <motion.tr
                          key={index}
                          onClick={(e) => handleRowClick(source, e)}
                          className={`border-b border-gray-100 last:border-b-0 cursor-pointer ${
                            isSelected 
                              ? 'ring-1 ring-blue-300' 
                              : ''
                          }`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ 
                            opacity: 1, 
                            y: 0,
                            backgroundColor: isSelected ? '#dbeafe' : 'transparent'
                          }}
                          whileHover={{ 
                            backgroundColor: isSelected ? '#bfdbfe' : '#f9fafb'
                          }}
                          transition={{ 
                            delay: index * 0.05,
                            backgroundColor: { duration: 0.15 }
                          }}
                        >
                          <td className={`p-4 text-center border-r border-gray-200 ${layoutConfig.defaultColumnWidth}`}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetDefault(source.value);
                              }}
                              className={`default-button w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
                                isDefault 
                                  ? 'border-yellow-500 bg-yellow-500 text-white transform scale-110' 
                                  : 'border-gray-300 bg-white hover:border-yellow-300 hover:bg-yellow-50 hover:transform hover:scale-105'
                              }`}
                              title={isDefault ? 'This is the default source' : 'Set as default source'}
                            >
                              {isDefault && (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              )}
                            </button>
                          </td>
                          <td className={`p-4 font-medium text-gray-800 border-r border-gray-200 ${layoutConfig.sourceColumnWidth}`}>
                            <div className="flex items-center gap-2">
                              {source.label}
                              {isSelected && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                  Selected
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-gray-700">
                            {isDescriptionField ? (
                              <div className="flex items-start min-h-[4rem]">
                                {typeof source.content === 'string' ? (
                                  <div className="w-full">
                                    <motion.div 
                                      animate={{ 
                                        height: !expandedDescriptions.has(index) && shouldTruncateDescription(source.content)
                                          ? 72 // 4.5rem in pixels
                                          : "auto"
                                      }}
                                      transition={{ 
                                        type: "spring", 
                                        stiffness: 300, 
                                        damping: 35,
                                        mass: 0.8
                                      }}
                                      className="overflow-hidden"
                                    >
                                      {source.label === 'About this listen' || source.label === 'Audiobook Summary' ? (
                                        <div 
                                          className="prose prose-sm max-w-none break-words"
                                          dangerouslySetInnerHTML={{ __html: parseHtmlForDisplay(source.content as string) }}
                                        />
                                      ) : (
                                        <p className="text-sm leading-relaxed break-words">
                                          {formatContentIfDate(source.content)}
                                        </p>
                                      )}
                                    </motion.div>
                                    {shouldTruncateDescription(source.content) && (
                                      <motion.button
                                        onClick={(e) => toggleDescriptionExpansion(index, e)}
                                        className="mt-2 inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
                                        whileHover={{ 
                                          backgroundColor: '#d1d5db',
                                          scale: 1.05 
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                        transition={{ 
                                          type: "spring", 
                                          stiffness: 400, 
                                          damping: 25 
                                        }}
                                      >
                                        <motion.span
                                          key={expandedDescriptions.has(index) ? 'less' : 'more'}
                                          initial={{ opacity: 0, y: 5 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ duration: 0.15 }}
                                        >
                                          {expandedDescriptions.has(index) ? 'Show less' : 'Show more'}
                                        </motion.span>
                                      </motion.button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm">{formatContentIfDate(source.content)}</span>
                                )}
                              </div>
                            ) : isImageField ? (
                              <div className="flex items-center min-h-[5rem] py-2">
                                {typeof source.content === 'string' && source.content ? (
                                  <div className="flex items-center gap-4">
                                    <div className="relative group">
                                      <img 
                                        src={source.content} 
                                        alt={source.label}
                                        className={`rounded shadow-lg transition-transform group-hover:scale-105 ${
                                          source.label.toLowerCase().includes('audiobook') 
                                            ? 'h-20 w-20 object-contain bg-gray-100' 
                                            : 'w-16 h-24 object-cover'
                                        }`}
                                        onError={(e) => {
                                          // Show placeholder on error
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          const placeholder = target.nextElementSibling as HTMLElement;
                                          if (placeholder) placeholder.style.display = 'flex';
                                        }}
                                      />
                                      <div className={`absolute inset-0 bg-gradient-to-b from-blue-400 to-blue-600 rounded flex items-center justify-center shadow-lg ${
                                        source.label.toLowerCase().includes('audiobook') 
                                          ? 'h-20 w-20' 
                                          : 'w-16 h-24'
                                      }`} style={{ display: 'none' }}>
                                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14zM19 12h2a1 1 0 010 2h-2v2a1 1 0 01-2 0v-2h-2a1 1 0 010-2h2v-2a1 1 0 012 0v2z" />
                                        </svg>
                                      </div>
                                      {source.label.toLowerCase().includes('audiobook') && (
                                        <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                          Audio
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col justify-center">
                                      <span className="text-sm font-medium text-gray-900 mb-1">{source.label}</span>
                                      <span className="text-xs text-gray-500 break-all max-w-64" title={source.content}>
                                        {source.content.length > 60 ? `${source.content.substring(0, 60)}...` : source.content}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-4">
                                    <div className="w-16 h-24 bg-gradient-to-b from-gray-300 to-gray-400 rounded flex items-center justify-center shadow-lg">
                                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14zM19 12h2a1 1 0 010 2h-2v2a1 1 0 01-2 0v-2h-2a1 1 0 010-2h2v-2a1 1 0 012 0v2z" />
                                      </svg>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                      <span className="text-sm font-medium text-gray-900 mb-1">{source.label}</span>
                                      <span className="text-sm text-gray-400">No image available</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center min-h-[2.5rem]">
                                <span className="text-sm">{formatContentIfDate(source.content)}</span>
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Click a row to select that source. Use the star to set a default for future books.
                  </div>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, 
      document.body
    );
  }
  return null;
};

export default FieldSourceSelectionModal; 