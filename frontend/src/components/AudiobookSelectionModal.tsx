import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface AudiobookMatch {
  asin: string;
  title: string;
  subtitle?: string;
  authors?: string[];
  releaseDate?: string;
  image?: string;
  relevanceScore: number;
  matchReason: string;
}

interface AuthorResult {
  author: {
    name: string;
    asin: string;
    description?: string;
    image?: string;
  };
  books: AudiobookMatch[];
  note?: string;
}

interface AudiobookSearchResult {
  searchQuery: {
    title: string;
    author: string;
  };
  results: AuthorResult[];
  totalAuthors: number;
  message: string;
}

interface AudiobookSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  bookAuthor: string;
  onAudiobookSelected: (audiobookData: any) => void;
}

const AudiobookSelectionModal: React.FC<AudiobookSelectionModalProps> = ({
  isOpen,
  onClose,
  bookTitle,
  bookAuthor,
  onAudiobookSelected
}) => {
  const [searchResults, setSearchResults] = useState<AudiobookSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualAsin, setManualAsin] = useState('');
  const [manualLookupLoading, setManualLookupLoading] = useState(false);
  const [selectedAsin, setSelectedAsin] = useState<string | null>(null);
  const [loadingAsin, setLoadingAsin] = useState<string | null>(null);

  // Search for audiobooks when modal opens
  useEffect(() => {
    if (isOpen && bookTitle && bookAuthor) {
      searchAudiobooks();
    }
  }, [isOpen, bookTitle, bookAuthor]);

  const searchAudiobooks = async () => {
    setLoading(true);
    setError(null);
    setSearchResults(null);

    try {
      console.log(`🔍 Searching for audiobooks: "${bookTitle}" by ${bookAuthor}`);
      
      const response = await fetch(`/api/books/audiobook-search/${encodeURIComponent(bookTitle)}/${encodeURIComponent(bookAuthor)}`);
      const result = await response.json();

      if (result.success && result.data) {
        setSearchResults(result.data);
        console.log(`✅ Found ${result.data.results.length} author results`);
      } else {
        setError(result.error || 'Failed to search for audiobooks');
        if (result.suggestion) {
          toast(result.suggestion, {
            icon: '💡',
            duration: 5000,
          });
        }
      }
    } catch (err) {
      console.error('❌ Audiobook search failed:', err);
      setError('Failed to search for audiobooks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectAudiobook = async (asin: string, bookTitle: string) => {
    setLoadingAsin(asin);
    setSelectedAsin(asin);

    try {
      console.log(`🎯 Selecting audiobook: ${asin}`);
      
      const response = await fetch(`/api/books/audiobook/${asin}?title=${encodeURIComponent(bookTitle)}&author=${encodeURIComponent(bookAuthor)}`);
      const result = await response.json();

      if (result.success && result.data) {
        console.log(`✅ Selected audiobook: "${result.data.title}"`);
        onAudiobookSelected(result.data);
        toast.success(`Selected audiobook: "${result.data.title}"`);
        onClose();
      } else {
        setError(result.error || 'Failed to get audiobook details');
        toast.error(result.error || 'Failed to get audiobook details');
      }
    } catch (err) {
      console.error('❌ Audiobook selection failed:', err);
      setError('Failed to select audiobook. Please try again.');
      toast.error('Failed to select audiobook. Please try again.');
    } finally {
      setLoadingAsin(null);
      setSelectedAsin(null);
    }
  };

  const handleManualLookup = async () => {
    if (!manualAsin.trim()) {
      toast.error('Please enter an ASIN');
      return;
    }

    setManualLookupLoading(true);

    try {
      console.log(`🎯 Manual ASIN lookup: ${manualAsin}`);
      
      const response = await fetch('/api/books/audiobook/manual-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asin: manualAsin.trim(),
          title: bookTitle,
          author: bookAuthor
        })
      });

      const result = await response.json();

      if (result.success && result.data) {
        console.log(`✅ Manual lookup successful: "${result.data.title}"`);
        onAudiobookSelected(result.data);
        toast.success(`Found audiobook: "${result.data.title}"`);
        onClose();
      } else {
        toast.error(result.error || 'Audiobook not found with that ASIN');
      }
    } catch (err) {
      console.error('❌ Manual lookup failed:', err);
      toast.error('Failed to lookup audiobook. Please try again.');
    } finally {
      setManualLookupLoading(false);
    }
  };

  const formatDuration = (durationHours: number) => {
    if (durationHours < 1) {
      return `${Math.round(durationHours * 60)} min`;
    }
    return `${durationHours.toFixed(1)} hrs`;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div 
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Find Audiobook
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Search for "{bookTitle}" by {bookAuthor}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Searching Audnexus...</span>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-800 font-medium">{error}</span>
              </div>
            </div>
          )}

          {searchResults && !loading && (
            <div className="space-y-6">
              {/* Search Results Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Search Results</h3>
                <p className="text-sm text-blue-800">{searchResults.message}</p>
                {searchResults.totalAuthors > searchResults.results.length && (
                  <p className="text-xs text-blue-600 mt-1">
                    Showing top {searchResults.results.length} of {searchResults.totalAuthors} authors found
                  </p>
                )}
              </div>

              {/* Author Results */}
              {searchResults.results.map((authorResult, authorIndex) => (
                <div key={authorIndex} className="border border-gray-200 rounded-lg p-4">
                  {/* Author Info */}
                  <div className="flex items-start gap-4 mb-4">
                    {authorResult.author.image && (
                      <img
                        src={authorResult.author.image}
                        alt={authorResult.author.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{authorResult.author.name}</h4>
                      {authorResult.author.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {authorResult.author.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">ASIN: {authorResult.author.asin}</p>
                    </div>
                  </div>

                  {/* Books */}
                  {authorResult.books.length > 0 ? (
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-800">
                        Audiobooks ({authorResult.books.length})
                      </h5>
                      {authorResult.books.map((book, bookIndex) => (
                        <div
                          key={bookIndex}
                          className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          {book.image && (
                            <img
                              src={book.image}
                              alt={book.title}
                              className="w-12 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <h6 className="font-medium text-gray-900">{book.title}</h6>
                            {book.subtitle && (
                              <p className="text-sm text-gray-600">{book.subtitle}</p>
                            )}
                            {book.authors && book.authors.length > 0 && (
                              <p className="text-sm text-gray-600">
                                by {book.authors.join(', ')}
                              </p>
                            )}
                            {book.releaseDate && (
                              <p className="text-xs text-gray-500">Released: {(() => {
                                try {
                                  // Remove time portion if present (T00:00:00.000Z)
                                  const cleanDate = book.releaseDate.split('T')[0];
                                  
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
                                  return book.releaseDate;
                                }
                              })()}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                book.relevanceScore >= 80 ? 'bg-green-100 text-green-800' :
                                book.relevanceScore >= 40 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {book.matchReason} ({book.relevanceScore}%)
                              </span>
                              <span className="text-xs text-gray-500">ASIN: {book.asin}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => selectAudiobook(book.asin, book.title)}
                            disabled={loadingAsin === book.asin}
                            className={`px-4 py-2 text-sm rounded font-medium transition-colors ${
                              loadingAsin === book.asin
                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                : 'bg-purple-600 text-white hover:bg-purple-700'
                            }`}
                          >
                            {loadingAsin === book.asin ? (
                              <span className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Selecting...
                              </span>
                            ) : (
                              'Select'
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <p className="text-sm text-yellow-800">
                        {authorResult.note || 'No books found in this author\'s catalog.'}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {searchResults.results.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No audiobook matches found.</p>
                  <p className="text-sm mt-1">Try the manual ASIN lookup below if you know the Amazon ASIN.</p>
                </div>
              )}
            </div>
          )}

          {/* Manual ASIN Lookup */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="font-medium text-gray-900 mb-4">Manual ASIN Lookup</h3>
            <p className="text-sm text-gray-600 mb-4">
              If you know the Amazon ASIN for this audiobook, you can enter it directly:
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={manualAsin}
                onChange={(e) => setManualAsin(e.target.value)}
                placeholder="Enter Amazon ASIN (e.g., B08G9PRS1K)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleManualLookup();
                  }
                }}
              />
              <button
                onClick={handleManualLookup}
                disabled={manualLookupLoading || !manualAsin.trim()}
                className={`px-4 py-2 text-sm rounded font-medium transition-colors ${
                  manualLookupLoading || !manualAsin.trim()
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {manualLookupLoading ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Looking up...
                  </span>
                ) : (
                  'Lookup'
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              You can find the ASIN in the Amazon URL or product details page
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Powered by Audnexus API
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudiobookSelectionModal; 