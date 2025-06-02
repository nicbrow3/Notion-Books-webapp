import React from 'react';
import { BookSearchResult } from '../../types/book';

interface AudiobookInfoSectionProps {
  book: BookSearchResult;
  loadingAudiobook: boolean;
  onOpenAudiobookSearch: () => void;
}

const AudiobookInfoSection: React.FC<AudiobookInfoSectionProps> = ({
  book,
  loadingAudiobook,
  onOpenAudiobookSearch
}) => {
  if (!book.audiobookData && !loadingAudiobook) {
    return null;
  }

  return (
    <div className="mt-6">
      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
        </svg>
        Audiobook
        {loadingAudiobook && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
        )}
        {/* Search Button */}
        {!loadingAudiobook && book.authors && book.authors.length > 0 && (
          <button
            onClick={onOpenAudiobookSearch}
            className="ml-auto px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            title="Search for audiobook on Audnexus"
          >
            Search Audnexus
          </button>
        )}
      </h4>
      
      {loadingAudiobook ? (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-700">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
            <span className="text-sm">Searching for audiobook information...</span>
          </div>
        </div>
      ) : book.audiobookData?.hasAudiobook ? (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Available
            </span>
            {book.audiobookData?.source && (
              <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                via {book.audiobookData.source === 'audnexus' ? 'Audnexus' : book.audiobookData.source}
              </span>
            )}
            {book.audiobookData?.selectionContext?.userSelected && (
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                User Selected
              </span>
            )}
          </div>

          {/* Show selection context if user selected */}
          {book.audiobookData?.selectionContext?.userSelected && (
            <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-xs">
              <p className="text-green-800">
                <span className="font-medium">Selected:</span> "{book.audiobookData.selectionContext.selectedTitle}" 
                {book.audiobookData.selectionContext.selectedAuthors && 
                  ` by ${book.audiobookData.selectionContext.selectedAuthors.join(', ')}`}
              </p>
              {(book.audiobookData.selectionContext.selectedTitle !== book.audiobookData.selectionContext.originalTitle ||
                (book.audiobookData.selectionContext.selectedAuthors && 
                 book.audiobookData.selectionContext.selectedAuthors[0] !== book.audiobookData.selectionContext.originalAuthor)) && (
                <p className="text-green-700 mt-1">
                  <span className="font-medium">Original search:</span> "{book.audiobookData.selectionContext.originalTitle}" 
                  by {book.audiobookData.selectionContext.originalAuthor}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {book.audiobookData?.narrators && book.audiobookData.narrators.length > 0 && (
              <div>
                <span className="font-medium text-purple-900">Narrator{book.audiobookData.narrators.length > 1 ? 's' : ''}:</span>
                <p className="text-purple-700">{book.audiobookData.narrators.join(', ')}</p>
              </div>
            )}
            
            {book.audiobookData?.totalDurationHours && (
              <div>
                <span className="font-medium text-purple-900">Duration:</span>
                <p className="text-purple-700">
                  {book.audiobookData.totalDurationHours < 1 
                    ? `${Math.round(book.audiobookData.totalDurationHours * 60)} min`
                    : `${book.audiobookData.totalDurationHours.toFixed(1)} hrs`}
                </p>
              </div>
            )}
            
            {book.audiobookData?.chapterCount && (
              <div>
                <span className="font-medium text-purple-900">Chapters:</span>
                <p className="text-purple-700">{book.audiobookData.chapterCount}</p>
              </div>
            )}
            
            {book.audiobookData?.publishedDate && (
              <div>
                <span className="font-medium text-purple-900">Release Date:</span>
                <p className="text-purple-700">{(() => {
                  try {
                    // Remove time portion if present (T00:00:00.000Z)
                    const cleanDate = book.audiobookData.publishedDate.split('T')[0];
                    
                    // Check if it's just a year (4 digits) - show only the year
                    if (/^\d{4}$/.test(cleanDate.trim())) {
                      return cleanDate.trim();
                    }
                    
                    // Check if it's in YYYY-MM-DD format to avoid timezone issues
                    const isoDateMatch = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                    if (isoDateMatch) {
                      const [, year, month, day] = isoDateMatch;
                      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      return date.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      });
                    }
                    
                    // Try to parse the full date
                    const date = new Date(cleanDate);
                    
                    // Check if the date is valid
                    if (isNaN(date.getTime())) {
                      // If invalid date but contains a year, extract and use just the year
                      const yearMatch = cleanDate.match(/\d{4}/);
                      if (yearMatch) {
                        return yearMatch[0];
                      }
                      return cleanDate;
                    }
                    
                    return date.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    });
                  } catch {
                    return book.audiobookData.publishedDate;
                  }
                })()}</p>
              </div>
            )}
            
            {book.audiobookData?.rating && (
              <div>
                <span className="font-medium text-purple-900">Audiobook Rating:</span>
                <p className="text-purple-700">
                  {book.audiobookData.rating}/5
                  {book.audiobookData.ratingCount && ` (${book.audiobookData.ratingCount} reviews)`}
                </p>
              </div>
            )}
            
            {book.audiobookData?.publisher && book.audiobookData.publisher !== book.publisher && (
              <div>
                <span className="font-medium text-purple-900">Audio Publisher:</span>
                <p className="text-purple-700">{book.audiobookData.publisher}</p>
              </div>
            )}

            {book.audiobookData?.asin && (
              <div>
                <span className="font-medium text-purple-900">ASIN:</span>
                <p className="text-purple-700 font-mono text-xs">{book.audiobookData.asin}</p>
              </div>
            )}
          </div>

          {/* Author information if we only found the author but not specific book */}
          {book.audiobookData?.authorFound && book.audiobookData.authorInfo && (
            <div className="mt-3 pt-3 border-t border-purple-200">
              <p className="text-sm text-purple-700">
                <span className="font-medium">Author found on Audnexus:</span> {book.audiobookData.authorInfo.name}
              </p>
              {book.audiobookData.authorInfo.description && (
                <p className="text-xs text-purple-600 mt-1 line-clamp-2">
                  {book.audiobookData.authorInfo.description}
                </p>
              )}
              {book.audiobookData.authorInfo.genres && book.audiobookData.authorInfo.genres.length > 0 && (
                <p className="text-xs text-purple-600 mt-1">
                  <span className="font-medium">Genres:</span> {book.audiobookData.authorInfo.genres.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Show search limitation and suggestion */}
          {(book.audiobookData.searchLimitation || book.audiobookData.suggestion) && (
            <div className="mb-2 space-y-1">
              {book.audiobookData.searchLimitation && (
                <p className="text-xs text-gray-600">{book.audiobookData.searchLimitation}</p>
              )}
              {book.audiobookData.suggestion && (
                <p className="text-xs text-gray-600 font-medium">💡 {book.audiobookData.suggestion}</p>
              )}
            </div>
          )}

          {/* Show API limitation explanation */}
          {(book.audiobookData.searchLimitation || book.audiobookData.apiLimitation) && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs font-medium text-yellow-800 mb-1">API Limitation</p>
                  <p className="text-xs text-yellow-700">
                    {book.audiobookData.searchLimitation || book.audiobookData.apiLimitation}
                  </p>
                  {book.audiobookData.suggestion && (
                    <p className="text-xs text-yellow-700 mt-1 font-medium">
                      💡 {book.audiobookData.suggestion}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Google Audiobook Hints */}
          {book.audiobookData.googleHint && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs font-medium text-green-800 mb-1">Google Books Suggestion</p>
                  <p className="text-xs text-green-700 mb-1">
                    {book.audiobookData.googleHint.reason}
                  </p>
                  <p className="text-xs text-green-600">
                    {book.audiobookData.googleHint.message}
                  </p>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Confidence: {book.audiobookData.googleHint.confidence}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Google Audiobook Hints (when displayed separately) */}
          {book.googleAudiobookHints && !book.audiobookData.googleHint && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs font-medium text-blue-800 mb-1">Google Books Indicators</p>
                  <div className="text-xs text-blue-700 space-y-1">
                    {book.googleAudiobookHints.markedAsAudiobook && (
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Marked as audiobook in Google Books
                      </div>
                    )}
                    {book.googleAudiobookHints.textToSpeechAllowed && (
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Text-to-speech enabled
                      </div>
                    )}
                    {book.googleAudiobookHints.hasAudioLinks && (
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Contains audiobook-related links
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Confidence: {book.googleAudiobookHints.confidence}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : book.audiobookData ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">
              {book.audiobookData.source === 'error' 
                ? 'Error checking audiobook availability' 
                : book.audiobookData.authorFound
                  ? 'Author found, but audiobook not discoverable'
                  : 'No audiobook found'}
            </span>
          </div>

          {/* Show author information if found */}
          {book.audiobookData.authorFound && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-blue-800">
                  Author found on Audnexus: {book.audiobookData.authorInfo?.name || 'Unknown'}
                </span>
              </div>
              
              {book.audiobookData.authorInfo?.description && (
                <p className="text-xs text-blue-700 mb-2 line-clamp-2">
                  {book.audiobookData.authorInfo.description}
                </p>
              )}
              
              {book.audiobookData.authorInfo?.genres && book.audiobookData.authorInfo.genres.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs font-medium text-blue-800">Author genres:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {book.audiobookData.authorInfo.genres.slice(0, 3).map((genre, index) => (
                      <span
                        key={index}
                        className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Show error message */}
          {book.audiobookData.error && (
            <p className="text-xs text-gray-600 mb-2">{book.audiobookData.error}</p>
          )}

          {/* Show search limitation and suggestion */}
          {(book.audiobookData.searchLimitation || book.audiobookData.suggestion) && (
            <div className="mb-2 space-y-1">
              {book.audiobookData.searchLimitation && (
                <p className="text-xs text-gray-600">{book.audiobookData.searchLimitation}</p>
              )}
              {book.audiobookData.suggestion && (
                <p className="text-xs text-gray-600 font-medium">💡 {book.audiobookData.suggestion}</p>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default AudiobookInfoSection; 