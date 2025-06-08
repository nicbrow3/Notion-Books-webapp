import React from 'react';
import { BookSearchResult } from '../../../types/book';

interface BookHeaderProps {
  book: BookSearchResult;
  fieldSelections: any;
  getFieldSources: (fieldId: string) => Array<{value: string | number, label: string, content: string}>;
  onSelectSource: (fieldId: string) => void;
  formatDate: (dateString?: string | null) => string;
}

const BookHeader: React.FC<BookHeaderProps> = ({
  book,
  fieldSelections,
  getFieldSources,
  onSelectSource,
  formatDate
}) => {
  return (
    <div className="flex items-start gap-6 mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Large Cover Image */}
      <div className="flex-shrink-0">
        {book.thumbnail ? (
          <div 
            className={`relative group cursor-pointer h-36 transition-all duration-300 ${
              fieldSelections?.thumbnail === 'audiobook' ? 'w-36' : 'w-24'
            }`}
            onClick={() => getFieldSources('thumbnail').length > 1 && onSelectSource('thumbnail')}
            title={getFieldSources('thumbnail').length > 1 ? "Select cover image source" : "Only one cover source available"}
          >
            <img 
              src={book.thumbnail} 
              alt={`Cover of ${book.title}`}
              className={`w-full h-full rounded-lg shadow-md group-hover:opacity-90 transition-opacity ${
                fieldSelections?.thumbnail === 'audiobook' ? 'object-contain bg-gray-100' : 'object-cover'
              }`}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const placeholder = target.nextElementSibling as HTMLElement;
                if (placeholder) placeholder.style.display = 'flex';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-blue-400 to-blue-600 rounded-lg hidden flex-col items-center justify-center shadow-md">
              <svg className="w-8 h-8 text-white mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14zM19 12h2a1 1 0 010 2h-2v2a1 1 0 01-2 0v-2h-2a1 1 0 010-2h2v-2a1 1 0 012 0v2z" />
              </svg>
              <span className="text-xs text-white text-center px-1">No Cover</span>
            </div>
          </div>
        ) : (
          <div className="w-24 h-36 bg-gradient-to-b from-blue-400 to-blue-600 rounded-lg flex flex-col items-center justify-center shadow-md">
            <svg className="w-8 h-8 text-white mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14zM19 12h2a1 1 0 010 2h-2v2a1 1 0 01-2 0v-2h-2a1 1 0 010-2h2v-2a1 1 0 012 0v2z" />
            </svg>
            <span className="text-xs text-white text-center px-1">No Cover</span>
          </div>
        )}
      </div>

      {/* Book Information */}
      <div className="flex-1 min-w-0 max-w-md">
        <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
          {book.title}
        </h3>
        {book.authors && book.authors.length > 0 && (
          <p className="text-lg text-gray-600 mb-3">
            by {book.authors.join(', ')}
          </p>
        )}
        
        {/* Quick Stats */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mt-3">
          {book.publishedDate && (
            <div
              onClick={() => getFieldSources('releaseDate').length > 1 && onSelectSource('releaseDate')}
              className={`flex items-center gap-1.5 bg-gray-100 ${getFieldSources('releaseDate').length > 1 ? 'hover:bg-gray-200 cursor-pointer' : 'cursor-default'} transition-colors px-2 py-1 rounded-full border border-gray-200`}
              title={getFieldSources('releaseDate').length > 1 ? "Select date source" : "Only one date source available"}
            >
              <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{formatDate(book.publishedDate)}</span>
              {getFieldSources('releaseDate').length > 1 && <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>}
            </div>
          )}
          {book.pageCount && (
            <div
              onClick={() => getFieldSources('pageCount').length > 1 && onSelectSource('pageCount')}
              className={`flex items-center gap-1.5 bg-gray-100 ${getFieldSources('pageCount').length > 1 ? 'hover:bg-gray-200 cursor-pointer' : 'cursor-default'} transition-colors px-2 py-1 rounded-full border border-gray-200`}
              title={getFieldSources('pageCount').length > 1 ? "Select page count source" : "Only one page count source available"}
            >
              <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{book.pageCount} pages</span>
              {getFieldSources('pageCount').length > 1 && <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>}
            </div>
          )}
          {book.audiobookData?.totalDurationHours && (
            <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-full border border-gray-200 cursor-default">
              <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
              <span className="font-medium">
                {book.audiobookData.totalDurationHours < 1 
                  ? `${Math.round(book.audiobookData.totalDurationHours * 60)} min`
                  : `${book.audiobookData.totalDurationHours.toFixed(1)} hrs`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Description Section */}
      {book.description && (
        <div className="flex-1 min-w-0 max-w-sm">
          <div 
            className="bg-gray-50 rounded-lg p-4 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors duration-200 h-36 overflow-hidden group relative"
            onClick={() => onSelectSource('description')}
            title="Click to select description source"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Description</h4>
              {getFieldSources('description').length > 1 && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  {getFieldSources('description').length} sources
                </div>
              )}
            </div>
            <div className="text-sm text-gray-600 leading-relaxed overflow-hidden">
              <p className="line-clamp-4">
                {book.description}
              </p>
            </div>
            <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-20 transition-opacity duration-200 rounded-lg pointer-events-none"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookHeader; 