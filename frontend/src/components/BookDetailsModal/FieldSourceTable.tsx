import React, { useState, useRef, useEffect } from 'react';
import { CategoryService } from '../../services/categoryService';

interface FieldSource<T = string> {
  value: T;
  label: string;
  content: string | number;
}

interface FieldSourceTableProps<T = string> {
  fieldName: string;
  sources: FieldSource<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const FieldSourceTable = <T extends string | number>({
  fieldName,
  sources,
  selectedValue,
  onSelect,
  isOpen,
  onToggle
}: FieldSourceTableProps<T>) => {
  const selectedSource = sources.find(source => source.value === selectedValue);
  const selectedLabel = selectedSource?.label || 'Unknown';
  const hasMultipleSources = sources.length > 1;
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Get the default source from settings
  const [defaultSource, setDefaultSource] = useState<T | null>(() => {
    const saved = CategoryService.getFieldDefault(fieldName.toLowerCase());
    return saved as T | null;
  });

  // Handle click outside to close the table
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isOpen) {
          onToggle();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onToggle]);

  const handleSetDefault = (value: T) => {
    setDefaultSource(value);
    CategoryService.setFieldDefault(fieldName.toLowerCase(), value as any);
  };

  const handleRowClick = (source: FieldSource<T>, event: React.MouseEvent) => {
    // Don't select if clicking on the default button
    if ((event.target as HTMLElement).closest('.default-button')) {
      return;
    }
    onSelect(source.value);
    onToggle();
  };

  if (!hasMultipleSources) {
    return (
      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
        {selectedLabel}
      </span>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={onToggle}
        className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 flex items-center gap-1"
      >
        {selectedLabel}
        <svg 
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="fixed bg-white border border-gray-300 rounded-md shadow-xl z-[99999] min-w-[600px] max-w-4xl transform transition-all duration-200 ease-out scale-100 opacity-100"
          style={{
            top: containerRef.current ? containerRef.current.getBoundingClientRect().bottom + window.scrollY + 4 : 0,
            left: containerRef.current ? containerRef.current.getBoundingClientRect().left + window.scrollX : 0,
          }}
        >
          <div className="p-3 bg-gray-50 border-b border-gray-200 rounded-t-md">
            <h5 className="font-medium text-gray-900 text-sm">
              Select {fieldName} Source
            </h5>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-700 w-20">Default</th>
                  <th className="text-left p-3 font-medium text-gray-700 w-48">Source</th>
                  <th className={`text-left p-3 font-medium text-gray-700 ${fieldName === 'Pages' ? 'w-24' : ''}`}>{fieldName}</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source, index) => {
                  const isSelected = source.value === selectedValue;
                  const isDefault = source.value === defaultSource;
                  return (
                    <tr
                      key={index}
                      onClick={(e) => handleRowClick(source, e)}
                      className={`transition-all duration-150 border-b border-gray-100 last:border-b-0 cursor-pointer h-16 ${
                        isSelected 
                          ? 'bg-blue-100 ring-1 ring-blue-300' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="p-3 text-center border-r border-gray-200 w-20">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(source.value);
                          }}
                          className={`default-button w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
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
                      <td className="p-3 font-medium text-gray-800 border-r border-gray-200 w-48">
                        <div className="flex items-center gap-2">
                          {source.label}
                          {isDefault && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded">
                              Default
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`p-3 text-gray-700 ${fieldName === 'Pages' ? 'w-24' : ''}`}>
                        <div className="flex items-center min-h-[2rem]">
                          {typeof source.content === 'string' ? (
                            source.content.length > 200 ? (
                              <div className="w-full">
                                <p className="truncate text-sm leading-relaxed" title={source.content}>
                                  {source.content}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {source.content.length} characters
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm leading-relaxed">
                                {source.content}
                              </p>
                            )
                          ) : (
                            <p className="text-sm font-medium">{source.content}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldSourceTable; 