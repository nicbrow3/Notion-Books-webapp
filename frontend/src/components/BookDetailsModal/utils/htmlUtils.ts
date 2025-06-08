/**
 * Parse and format HTML content from audiobook summaries
 * This function handles HTML tags commonly found in audiobook descriptions
 * and converts them to properly formatted text or safe HTML
 */
export const parseAndFormatHtml = (htmlString: string): string => {
  if (!htmlString) return '';
  
  // Basic HTML entity decoding
  const decodeHtmlEntities = (str: string): string => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
  };
  
  // Remove or convert HTML tags to formatted text
  let formatted = htmlString
    // Remove paragraph tags but keep line breaks
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    // Convert bold tags to strong emphasis
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '<strong>$1</strong>')
    // Convert italic tags to emphasis
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '<em>$1</em>')
    // Convert underline tags
    .replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>')
    // Remove other common HTML tags but keep their content
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<span[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove any remaining HTML tags (but keep content)
    .replace(/<[^>]*>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Clean up extra whitespace and newlines
  formatted = formatted
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace multiple newlines with double newlines
    .replace(/^\s+|\s+$/g, '') // Trim whitespace from start and end
    .replace(/\s+/g, ' '); // Replace multiple spaces with single space
  
  return formatted;
};

/**
 * Parse HTML content but preserve some formatting for display
 * This version keeps some HTML tags for rich text display
 */
export const parseHtmlForDisplay = (htmlString: string): string => {
  if (!htmlString) return '';
  
  // Clean and format HTML while preserving some tags
  let formatted = htmlString
    // Remove paragraph tags but keep line breaks
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '<br/><br/>')
    // Keep bold and italic formatting
    .replace(/<b[^>]*>/gi, '<strong>')
    .replace(/<\/b>/gi, '</strong>')
    .replace(/<i[^>]*>/gi, '<em>')
    .replace(/<\/i>/gi, '</em>')
    // Convert line breaks
    .replace(/<br\s*\/?>/gi, '<br/>')
    // Remove other HTML tags but keep content
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '<br/>')
    .replace(/<span[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    // Remove dangerous or unwanted tags
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    // Clean up HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Clean up extra line breaks
  formatted = formatted
    .replace(/(<br\/>){3,}/g, '<br/><br/>') // Replace multiple br tags with double br
    .replace(/^\s*<br\/>\s*|<br\/>\s*$/g, '') // Remove leading/trailing br tags
    .trim();
  
  return formatted;
};

/**
 * Extract plain text from HTML content
 * Useful for length calculations and plain text display
 */
export const extractPlainText = (htmlString: string): string => {
  if (!htmlString) return '';
  
  // Create a temporary element to extract text content
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;
  
  // Get text content and clean it up
  const plainText = tempDiv.textContent || tempDiv.innerText || '';
  
  return plainText
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}; 