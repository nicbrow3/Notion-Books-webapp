export const formatDate = (dateString?: string | null) => {
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