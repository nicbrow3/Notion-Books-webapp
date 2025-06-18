import React from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { useEffect } from 'react';
import { BookSearchResult } from '../../../types/book';
import { 
  BookOpenIcon,
  CalendarIcon,
  FilesIcon,
  MusicNoteIcon,
  CaretDownIcon,
  ListIcon
} from '@phosphor-icons/react';
import { ICON_CONTEXTS, ICON_WEIGHTS } from '../../../constants/iconConfig';

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
  // Motion values for animations
  const pageCountValue = useMotionValue(0);
  const audiobookDurationValue = useMotionValue(0);
  
  // Transform motion values to rounded integers
  const animatedPageCount = useTransform(() => Math.round(pageCountValue.get()));
  const animatedAudiobookDuration = useTransform(() => Math.round(audiobookDurationValue.get()));
  const animatedAudiobookDurationDecimal = useTransform(() => (audiobookDurationValue.get() / 10).toFixed(1));

  // Set up animations when component mounts or book data changes
  useEffect(() => {
    const controls: Array<ReturnType<typeof animate>> = [];
    
    // Calculate duration based on page count (scaled for ~1000 pages max)
    const baseDuration = 0.8; // Minimum duration
    const maxDuration = 2.5;  // Maximum duration at ~1000 pages
    const pageCount = book.pageCount || 200; // Default fallback
    const scalingFactor = Math.min(pageCount / 1000, 1); // Cap at 1000 pages
    const animationDuration = baseDuration + (scalingFactor * (maxDuration - baseDuration));
    
    // More dramatic easing - spends 30% of total time on just the last 5% of numbers
    const dramaticEasing = (t: number) => {
      // First 70% of time rushes through 95% of numbers
      if (t < 0.7) {
        return (t / 0.7) * 0.95; // Linear rush through most numbers
      } else {
        // Last 30% of time crawls through final 5% of numbers
        const remainingProgress = (t - 0.7) / 0.3; // 0 to 1 for the last 30% of time
        const verySlowEase = Math.pow(remainingProgress, 0.3); // Very slow progression
        return 0.95 + (verySlowEase * 0.05);
      }
    };
    
    // Animate page count
    if (book.pageCount) {
      const pageCountAnimation = animate(pageCountValue, book.pageCount, { 
        duration: animationDuration,
        ease: dramaticEasing
      });
      controls.push(pageCountAnimation);
    }
    
    // Animate audiobook duration (uses same duration as page count)
    if (book.audiobookData?.totalDurationHours) {
      const targetValue = book.audiobookData.totalDurationHours < 1 
        ? Math.round(book.audiobookData.totalDurationHours * 60)
        : book.audiobookData.totalDurationHours * 10; // Multiply by 10 for decimal precision
      
      const audiobookAnimation = animate(audiobookDurationValue, targetValue, { 
        duration: animationDuration,
        ease: dramaticEasing
      });
      controls.push(audiobookAnimation);
    }
    
    return () => {
      controls.forEach(control => control.stop());
    };
  }, [book.pageCount, book.audiobookData?.totalDurationHours, pageCountValue, audiobookDurationValue]);

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
              key={`thumbnail-${fieldSelections?.thumbnail || 'original'}-${book.thumbnail}`}
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
              <BookOpenIcon 
                size={ICON_CONTEXTS.BOOK_HEADER.COVER_PLACEHOLDER} 
                weight={ICON_WEIGHTS.FILL} 
                className="text-white mb-2" 
              />
              <span className="text-xs text-white text-center px-1">No Cover</span>
            </div>
          </div>
        ) : (
          <div className="w-24 h-36 bg-gradient-to-b from-blue-400 to-blue-600 rounded-lg flex flex-col items-center justify-center shadow-md">
            <BookOpenIcon 
              size={ICON_CONTEXTS.BOOK_HEADER.COVER_PLACEHOLDER} 
              weight={ICON_WEIGHTS.FILL} 
              className="text-white mb-2" 
            />
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
              <CalendarIcon 
                size={ICON_CONTEXTS.BOOK_HEADER.METADATA} 
                weight={ICON_WEIGHTS.FILL} 
                className="text-gray-600" 
              />
              <span className="font-medium">{formatDate(book.publishedDate)}</span>
              {getFieldSources('releaseDate').length > 1 && (
                <CaretDownIcon 
                  size={ICON_CONTEXTS.BOOK_HEADER.INDICATORS} 
                  weight={ICON_WEIGHTS.FILL} 
                  className="text-gray-500" 
                />
              )}
            </div>
          )}
          {book.pageCount && (
            <div
              onClick={() => getFieldSources('pageCount').length > 1 && onSelectSource('pageCount')}
              className={`flex items-center gap-1.5 bg-gray-100 ${getFieldSources('pageCount').length > 1 ? 'hover:bg-gray-200 cursor-pointer' : 'cursor-default'} transition-colors px-2 py-1 rounded-full border border-gray-200`}
              title={getFieldSources('pageCount').length > 1 ? "Select page count source" : "Only one page count source available"}
            >
              <FilesIcon 
                size={ICON_CONTEXTS.BOOK_HEADER.METADATA} 
                weight={ICON_WEIGHTS.FILL} 
                className="text-gray-600" 
              />
              <span className="font-medium">
                <motion.span 
                  className="inline-block text-right tabular-nums"
                  style={{ minWidth: `${book.pageCount.toString().length * 0.6}em` }}
                >
                  {animatedPageCount}
                </motion.span> pages
              </span>
            </div>
          )}
          {book.audiobookData?.totalDurationHours && (
            <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-full border border-gray-200 cursor-default">
              <MusicNoteIcon 
                size={ICON_CONTEXTS.BOOK_HEADER.METADATA} 
                weight={ICON_WEIGHTS.FILL} 
                className="text-gray-600" 
              />
              <span className="font-medium">
                {book.audiobookData.totalDurationHours < 1 
                  ? <>
                      <motion.span 
                        className="inline-block text-right tabular-nums"
                        style={{ minWidth: `${Math.round(book.audiobookData.totalDurationHours * 60).toString().length * 0.6}em` }}
                      >
                        {animatedAudiobookDuration}
                      </motion.span> min
                    </>
                  : <>
                      <motion.span 
                        className="inline-block text-right tabular-nums"
                        style={{ minWidth: `${book.audiobookData.totalDurationHours.toFixed(1).length * 0.6}em` }}
                      >
                        {animatedAudiobookDurationDecimal}
                      </motion.span> hrs
                    </>}
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
                  <ListIcon 
                    size={ICON_CONTEXTS.BOOK_HEADER.INDICATORS} 
                    weight={ICON_WEIGHTS.FILL} 
                  />
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