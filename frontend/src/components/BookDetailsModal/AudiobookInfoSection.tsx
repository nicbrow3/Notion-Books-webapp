import React from 'react';
import { BookSearchResult } from '../../types/book';
import { 
  MusicNoteIcon,
  WarningIcon,
  InfoIcon,
  CheckIcon,
  UserIcon,
  SpinnerGap
} from '@phosphor-icons/react';
import { ICON_CONTEXTS, ICON_WEIGHTS } from '../../constants/iconConfig';

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
        <MusicNoteIcon 
          size={ICON_CONTEXTS.UI.BUTTON} 
          weight={ICON_WEIGHTS.LIGHT} 
          className="text-purple-600" 
        />
        Audiobook
        {loadingAudiobook && (
          <SpinnerGap 
            size={ICON_CONTEXTS.UI.INPUT} 
            weight={ICON_WEIGHTS.LIGHT} 
            className="animate-spin text-purple-600" 
          />
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
            <SpinnerGap 
              size={ICON_CONTEXTS.UI.INPUT} 
              weight={ICON_WEIGHTS.LIGHT} 
              className="animate-spin text-purple-600" 
            />
            <span className="text-sm">Searching for audiobook information...</span>
          </div>
        </div>
      ) : book.audiobookData?.hasAudiobook ? (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
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
            
            {book.audiobookData?.publisher && book.audiobookData.publisher !== book.publisher && (
              <div>
                <span className="font-medium text-purple-900">Audio Publisher:</span>
                <p className="text-purple-700">{book.audiobookData.publisher}</p>
              </div>
            )}

            {book.audiobookData?.copyright && (
              <div>
                <span className="font-medium text-purple-900">Copyright:</span>
                <p className="text-purple-700">{book.audiobookData.copyright}</p>
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
          {(book.audiobookData.searchLimitation || book.audiobookData.apiLimitation) && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <div className="flex items-start gap-2">
                <WarningIcon 
                  size={ICON_CONTEXTS.UI.INPUT} 
                  weight={ICON_WEIGHTS.LIGHT} 
                  className="text-yellow-600 mt-0.5 flex-shrink-0" 
                />
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
                <CheckIcon 
                  size={ICON_CONTEXTS.UI.INPUT} 
                  weight={ICON_WEIGHTS.LIGHT} 
                  className="text-green-600 mt-0.5 flex-shrink-0" 
                />
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
                <InfoIcon 
                  size={ICON_CONTEXTS.UI.INPUT} 
                  weight={ICON_WEIGHTS.LIGHT} 
                  className="text-blue-600 mt-0.5 flex-shrink-0" 
                />
                <div className="flex-1">
                  <p className="text-xs font-medium text-blue-800 mb-1">Google Books Indicators</p>
                  <div className="text-xs text-blue-700 space-y-1">
                    {book.googleAudiobookHints.markedAsAudiobook && (
                      <div className="flex items-center gap-1">
                        <CheckIcon 
                          size={ICON_CONTEXTS.UI.INPUT} 
                          weight={ICON_WEIGHTS.LIGHT} 
                          className="text-green-600" 
                        />
                        Marked as audiobook in Google Books
                      </div>
                    )}
                    {book.googleAudiobookHints.textToSpeechAllowed && (
                      <div className="flex items-center gap-1">
                        <CheckIcon 
                          size={ICON_CONTEXTS.UI.INPUT} 
                          weight={ICON_WEIGHTS.LIGHT} 
                          className="text-green-600" 
                        />
                        Text-to-speech enabled
                      </div>
                    )}
                    {book.googleAudiobookHints.hasAudioLinks && (
                      <div className="flex items-center gap-1">
                        <CheckIcon 
                          size={ICON_CONTEXTS.UI.INPUT} 
                          weight={ICON_WEIGHTS.LIGHT} 
                          className="text-green-600" 
                        />
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

          {/* Author Found Section */}
          {book.audiobookData.authorFound && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="flex items-center gap-2 mb-2">
                <UserIcon 
                  size={ICON_CONTEXTS.UI.INPUT} 
                  weight={ICON_WEIGHTS.LIGHT} 
                  className="text-blue-600" 
                />
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
        </div>
      ) : book.audiobookData ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <InfoIcon 
              size={ICON_CONTEXTS.UI.INPUT} 
              weight={ICON_WEIGHTS.LIGHT} 
              className="text-gray-600" 
            />
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
                <UserIcon 
                  size={ICON_CONTEXTS.UI.INPUT} 
                  weight={ICON_WEIGHTS.LIGHT} 
                  className="text-blue-600" 
                />
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