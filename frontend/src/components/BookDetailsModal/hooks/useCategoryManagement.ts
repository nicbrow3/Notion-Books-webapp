import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { BookSearchResult } from '../../../types/book';
import { CategoryService, CategorySettings } from '../../../services/categoryService';

interface ProcessedCategory {
  original: string;
  processed: string;
  isIgnored: boolean;
  isMapped: boolean;
  mappedFrom?: string;
  mappedToThis?: string[];
}

interface UseCategoryManagementProps {
  book: BookSearchResult;
  isOpen: boolean;
  currentBook: BookSearchResult;
}

interface UseCategoryManagementReturn {
  rawCategories: string[];
  setRawCategories: (categories: string[]) => void;
  processedCategories: ProcessedCategory[];
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  categorySettings: CategorySettings;
  setCategorySettings: (settings: CategorySettings) => void;
  showSimilarCategories: { [key: string]: string[] };
  processCategories: (preserveSelections?: boolean, overrideSettings?: CategorySettings) => void;
  toggleCategory: (processedCategory: string) => void;
  selectAllCategories: () => void;
  deselectAllCategories: () => void;
  handleIgnoreCategory: (category: ProcessedCategory) => void;
  handleUnignoreCategory: (category: ProcessedCategory) => void;
  handleMergeCategories: (fromCategory: string, toCategory: string) => void;
  handleUnmapCategory: (category: ProcessedCategory) => void;
}

export const useCategoryManagement = ({ 
  book, 
  isOpen, 
  currentBook 
}: UseCategoryManagementProps): UseCategoryManagementReturn => {
  const [rawCategories, setRawCategories] = useState<string[]>([]);
  const [processedCategories, setProcessedCategories] = useState<ProcessedCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categorySettings, setCategorySettings] = useState<CategorySettings>(CategoryService.loadSettings());
  const [showSimilarCategories, setShowSimilarCategories] = useState<{ [key: string]: string[] }>({});
  
  const preserveSelectionsRef = useRef<boolean>(false);
  const hasProcessedCategoriesRef = useRef<boolean>(false);
  const hasProcessedAudiobookRef = useRef<boolean>(false);

  // Process categories whenever raw categories or settings change
  const processCategories = useCallback((preserveSelections = false, overrideSettings?: CategorySettings) => {
    const settingsToUse = overrideSettings || categorySettings;
    const result = CategoryService.processCategories(rawCategories, settingsToUse, currentBook.audiobookData);
    
    const processed: ProcessedCategory[] = [];
    
    // Get all current mappings to calculate reverse mappings
    const allMappings = CategoryService.getAllMappings();
    
    // Create a map of parent categories to their children
    const parentToChildren: { [parent: string]: string[] } = {};
    Object.entries(allMappings).forEach(([child, parent]) => {
      if (!parentToChildren[parent]) {
        parentToChildren[parent] = [];
      }
      parentToChildren[parent].push(child);
    });
    
    // Add processed categories
    result.processed.forEach(processedCat => {
      const originalCat = Object.keys(result.mapped).find(key => result.mapped[key] === processedCat) || processedCat;
      const mappedToThis = parentToChildren[processedCat] || [];
      
      processed.push({
        original: originalCat,
        processed: processedCat,
        isIgnored: false,
        isMapped: !!result.mapped[originalCat],
        mappedFrom: result.mapped[originalCat] ? originalCat : undefined,
        mappedToThis: mappedToThis.length > 0 ? mappedToThis : undefined
      });
    });
    
    // Add ignored categories
    result.ignored.forEach(ignoredCat => {
      processed.push({
        original: ignoredCat,
        processed: ignoredCat,
        isIgnored: true,
        isMapped: false
      });
    });
    
    setProcessedCategories(processed);
    
    // Only update selected categories if we're not preserving selections
    // or if this is the initial load (no current selections)
    if (!preserveSelections) {
      setSelectedCategories(result.processed);
    } else {
      // When preserving selections, filter out any categories that are no longer available
      setSelectedCategories(prev => prev.filter(selected => result.processed.includes(selected)));
    }
    
    // Check for similar categories
    const similar = CategoryService.getSimilarCategories(result.processed);
    setShowSimilarCategories(similar);
  }, [rawCategories, categorySettings, currentBook.audiobookData]);

  // Initialize categories when book changes
  useEffect(() => {
    if (book) {
      const initialCategories = book.categories || [];
      setRawCategories(initialCategories);
      // Reset selections when book changes
      setSelectedCategories([]);
      preserveSelectionsRef.current = false;
    }
  }, [book]);

  // Process categories when they change
  useEffect(() => {
    // Only process categories when modal is actually open
    if (!isOpen) return;
    
    // Only process if we haven't processed yet or if raw categories have changed
    if (!hasProcessedCategoriesRef.current) {
      processCategories(preserveSelectionsRef.current);
      hasProcessedCategoriesRef.current = true;
    }
  }, [isOpen, rawCategories, processCategories]);

  // Reset category processing flag when book or raw categories change
  useEffect(() => {
    hasProcessedCategoriesRef.current = false;
  }, [book.id, rawCategories]);

  // Reprocess categories when audiobook data changes (but only once per audiobook data change)
  useEffect(() => {
    // Only reprocess categories when modal is actually open
    if (!isOpen) return;
    
    if (currentBook.audiobookData && rawCategories.length > 0 && !hasProcessedAudiobookRef.current) {
      // Only log if audiobook has genres that might affect category processing
      if (currentBook.audiobookData.hasAudiobook && currentBook.audiobookData.genres && currentBook.audiobookData.genres.length > 0) {
        console.log(`Reprocessing categories with ${currentBook.audiobookData.genres.length} audiobook genres`);
      }
      processCategories(preserveSelectionsRef.current);
      hasProcessedAudiobookRef.current = true;
    }
  }, [isOpen, currentBook.audiobookData, rawCategories.length, processCategories]);

  // Reset the audiobook processing flag when book changes
  useEffect(() => {
    hasProcessedAudiobookRef.current = false;
  }, [book.id]);

  const toggleCategory = (processedCategory: string) => {
    setSelectedCategories(prev => 
      prev.includes(processedCategory)
        ? prev.filter(cat => cat !== processedCategory)
        : [...prev, processedCategory]
    );
    // After user interaction, preserve selections on future processing
    preserveSelectionsRef.current = true;
  };

  const selectAllCategories = () => {
    const availableCategories = processedCategories
      .filter(cat => !cat.isIgnored)
      .map(cat => cat.processed);
    setSelectedCategories(availableCategories);
    preserveSelectionsRef.current = true;
  };

  const deselectAllCategories = () => {
    setSelectedCategories([]);
    preserveSelectionsRef.current = true;
  };

  const handleIgnoreCategory = (category: ProcessedCategory) => {
    // Remove the category from selected categories if it's currently selected
    setSelectedCategories(prev => prev.filter(cat => cat !== category.processed));
    
    CategoryService.addIgnoredCategory(category.original);
    const updatedSettings = CategoryService.loadSettings();
    setCategorySettings(updatedSettings);
    
    // Immediately reprocess categories with the updated settings to show visual changes
    processCategories(true, updatedSettings);
    
    preserveSelectionsRef.current = true; // Preserve selections after ignoring
    toast.success(`"${category.original}" will always be ignored`);
  };

  const handleUnignoreCategory = (category: ProcessedCategory) => {
    CategoryService.removeIgnoredCategory(category.original);
    const updatedSettings = CategoryService.loadSettings();
    setCategorySettings(updatedSettings);
    
    // Immediately reprocess categories with the updated settings to show visual changes
    processCategories(true, updatedSettings);
    
    preserveSelectionsRef.current = true; // Preserve selections after unignoring
    toast.success(`"${category.original}" is no longer ignored`);
  };

  const handleMergeCategories = (fromCategory: string, toCategory: string) => {
    CategoryService.addCategoryMapping(fromCategory, toCategory);
    const updatedSettings = CategoryService.loadSettings();
    setCategorySettings(updatedSettings);
    
    // Immediately reprocess categories with the updated settings to show visual changes
    processCategories(true, updatedSettings);
    
    preserveSelectionsRef.current = true; // Preserve selections after mapping
    toast.success(`"${fromCategory}" will now map to "${toCategory}"`);
  };

  const handleUnmapCategory = (category: ProcessedCategory) => {
    if (category.mappedFrom) {
      // This category is the result of a mapping, remove the mapping
      CategoryService.removeCategoryMapping(category.mappedFrom);
      const updatedSettings = CategoryService.loadSettings();
      setCategorySettings(updatedSettings);
      
      // Immediately reprocess categories with the updated settings to show visual changes
      processCategories(true, updatedSettings);
      
      preserveSelectionsRef.current = true; // Preserve selections after unmapping
      toast.success(`Removed mapping: "${category.mappedFrom}" → "${category.processed}"`);
    } else {
      // This category might be mapped to other categories, remove all mappings to it
      const removedMappings = CategoryService.removeAllMappingsTo(category.processed);
      if (removedMappings.length > 0) {
        const updatedSettings = CategoryService.loadSettings();
        setCategorySettings(updatedSettings);
        
        // Immediately reprocess categories with the updated settings to show visual changes
        processCategories(true, updatedSettings);
        
        preserveSelectionsRef.current = true; // Preserve selections after unmapping
        toast.success(`Removed ${removedMappings.length} mapping(s) to "${category.processed}"`);
      } else {
        toast(`No mappings found for "${category.processed}"`, {
          icon: 'ℹ️',
          duration: 3000,
        });
      }
    }
  };

  return {
    rawCategories,
    setRawCategories,
    processedCategories,
    selectedCategories,
    setSelectedCategories,
    categorySettings,
    setCategorySettings,
    showSimilarCategories,
    processCategories,
    toggleCategory,
    selectAllCategories,
    deselectAllCategories,
    handleIgnoreCategory,
    handleUnignoreCategory,
    handleMergeCategories,
    handleUnmapCategory,
  };
}; 