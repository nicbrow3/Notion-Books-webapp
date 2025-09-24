import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { BookSearchResult } from '../../../types/book';
import { NotionService } from '../../../services/notionService';
import { CreateNotionPageRequest } from '../../../types/notion';

const areMappingsEqual = (a: any, b: any) => {
  if (a === b) return true;
  if (!a || !b) return false;

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (a[key] !== b[key]) {
      return false;
    }
  }

  return true;
};

interface UseNotionIntegrationProps {
  isOpen: boolean;
  isNotionConnected: boolean;
  notionSettings?: any;
  onSettingsUpdated?: (updatedSettings: any) => void;
  currentBook?: BookSearchResult;
}

interface SuccessModalData {
  bookTitle: string;
  notionUrl: string;
  categoriesCount: number;
  dateType: string;
  actionType: 'added' | 'updated' | 'added as separate entry';
}

interface UseNotionIntegrationReturn {
  duplicateStatus: 'unknown' | 'checking' | 'duplicate' | 'unique';
  duplicateCount: number;
  existingNotionPage: { url: string; title: string } | null;
  duplicatePages: Array<{ title: string; url: string }>;
  isAddingToNotion: boolean;
  duplicateAction: 'cancel' | 'replace' | 'keep-both' | null;
  showDuplicateModal: boolean;
  showSuccessModal: boolean;
  successModalData: SuccessModalData | null;
  tempFieldMappings: any;
  databaseProperties: any;
  loadingDatabaseProperties: boolean;
  duplicateCheckButtonRef: React.RefObject<HTMLButtonElement>;
  checkForDuplicates: (showToast?: boolean) => Promise<string>;
  addToNotion: (finalBookData: BookSearchResult, selectedCategories: string[]) => Promise<void>;
  replaceExistingNotionPage: (finalBookData: BookSearchResult, selectedCategories: string[]) => Promise<void>;
  createNewNotionPage: (finalBookData: BookSearchResult, selectedCategories: string[]) => Promise<void>;
  handleDuplicateCancel: () => void;
  handleDuplicateReplace: (finalBookData: BookSearchResult, selectedCategories: string[]) => void;
  handleDuplicateKeepBoth: (finalBookData: BookSearchResult, selectedCategories: string[]) => void;
  setShowSuccessModal: (show: boolean) => void;
  setSuccessModalData: (data: SuccessModalData | null) => void;
  handleTempFieldMappingChange: (bookField: string, notionProperty: string) => void;
  resetTempFieldMappings: () => void;
  saveTempFieldMappings: () => Promise<void>;
  hasUnsavedChanges: () => boolean;
}

export const useNotionIntegration = ({
  isOpen,
  isNotionConnected,
  notionSettings,
  onSettingsUpdated,
  currentBook
}: UseNotionIntegrationProps): UseNotionIntegrationReturn => {
  const [duplicateStatus, setDuplicateStatus] = useState<'unknown' | 'checking' | 'duplicate' | 'unique'>('unknown');
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const [existingNotionPage, setExistingNotionPage] = useState<{ url: string; title: string } | null>(null);
  const [duplicatePages, setDuplicatePages] = useState<Array<{ title: string; url: string }>>([]);
  const [isAddingToNotion, setIsAddingToNotion] = useState(false);
  const [duplicateAction, setDuplicateAction] = useState<'cancel' | 'replace' | 'keep-both' | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState<SuccessModalData | null>(null);
  const [tempFieldMappings, setTempFieldMappings] = useState<any>(null);
  const [databaseProperties, setDatabaseProperties] = useState<any>(null);
  const [loadingDatabaseProperties, setLoadingDatabaseProperties] = useState(false);
  const lastLoadedDatabaseIdRef = useRef<string | null>(null);

  const duplicateCheckButtonRef = useRef<HTMLButtonElement>(null);
  const hasAutoChecked = useRef(false);

  // Initialize temp field mappings when modal opens or settings change
  useEffect(() => {
    if (!isOpen || !notionSettings?.fieldMapping) return;

    const nextMapping = notionSettings.fieldMapping;

    setTempFieldMappings((prev: any) => {
      if (prev && areMappingsEqual(prev, nextMapping)) {
        return prev;
      }

      return { ...nextMapping };
    });
  }, [isOpen, notionSettings?.fieldMapping]);

  // Load database properties for the selected database when needed
  useEffect(() => {
    if (!isOpen) {
      setLoadingDatabaseProperties(false);
      return;
    }

    if (!notionSettings?.databaseId) {
      lastLoadedDatabaseIdRef.current = null;
      setDatabaseProperties(null);
      setLoadingDatabaseProperties(false);
      return;
    }

    if (lastLoadedDatabaseIdRef.current === notionSettings.databaseId) {
      return;
    }

    let isActive = true;
    setLoadingDatabaseProperties(true);

    NotionService.getDatabaseProperties(notionSettings.databaseId)
      .then((properties) => {
        if (!isActive) return;
        setDatabaseProperties(properties);
        lastLoadedDatabaseIdRef.current = notionSettings.databaseId;
      })
      .catch((error) => {
        if (!isActive) return;
        console.error('🔧 Failed to load database properties:', error);
        toast.error('Failed to load database properties for field mapping');
      })
      .finally(() => {
        if (!isActive) return;
        setLoadingDatabaseProperties(false);
      });

    return () => {
      isActive = false;
    };
  }, [isOpen, notionSettings?.databaseId]);

  // Reset auto-check flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasAutoChecked.current = false;
      setDuplicateStatus('unknown');
      setDuplicateCount(0);
      setExistingNotionPage(null);
      setDuplicatePages([]);
      setShowDuplicateModal(false);
      setDuplicateAction(null);
    }
  }, [isOpen]);

  // Check for duplicates
  const checkForDuplicates = useCallback(async (showToast: boolean = true) => {
    if (!isNotionConnected || !notionSettings?.databaseId) {
      return 'unknown';
    }

    try {
      setDuplicateStatus('checking');
      // Note: We need the current book to be passed in somehow, for now using a placeholder
      // This will need to be refactored to accept the current book as a parameter
      const existingBooks = await NotionService.searchExistingBooks(
        notionSettings.databaseId,
        currentBook?.isbn13 || currentBook?.isbn10 || '',
        currentBook?.title || '',
        notionSettings.fieldMapping
      );

      if (existingBooks.length > 0) {
        setDuplicateStatus('duplicate');
        setDuplicateCount(existingBooks.length);
        setExistingNotionPage({
          url: existingBooks[0].url,
          title: existingBooks[0].title
        });
        setDuplicatePages(existingBooks.map(book => ({
          title: book.title,
          url: book.url
        })));
        if (showToast) {
          toast(`This book already exists in your Notion database (${existingBooks.length} match${existingBooks.length > 1 ? 'es' : ''})`, {
            duration: 4000,
          });
        }
        return 'duplicate';
      } else {
        setDuplicateStatus('unique');
        setDuplicateCount(0);
        setExistingNotionPage(null);
        setDuplicatePages([]);
        if (showToast) {
          toast.success('No duplicates found! This book is unique in your database.', {
            duration: 3000,
          });
        }
        return 'unique';
      }
    } catch (error) {
      console.error('Duplicate check failed:', error);
      setDuplicateStatus('unknown');
      if (showToast) {
        toast.error('Failed to check for duplicates');
      }
      return 'unknown';
    }
  }, [isNotionConnected, notionSettings]);

  // Auto-check for duplicates when modal opens
  useEffect(() => {
    if (isOpen && isNotionConnected && notionSettings?.databaseId && !hasAutoChecked.current) {
      setTimeout(() => {
        hasAutoChecked.current = true;
        checkForDuplicates(false); // Auto-check without showing toast
      }, 100);
    }
  }, [isOpen, isNotionConnected, notionSettings?.databaseId, checkForDuplicates]);

  // Create a notion page request helper
  const createNotionRequest = (finalBookData: BookSearchResult, selectedCategories: string[]): CreateNotionPageRequest => {
    // Don't override date fields - they should already be correct in finalBookData
    const bookDataWithSelectedCategories = {
      ...finalBookData,
      categories: selectedCategories,
      // Keep existing date fields from finalBookData - they already reflect user's choices
      audiobookPublishedDate: finalBookData.audiobookData?.publishedDate
    };


    return {
      databaseId: notionSettings!.databaseId,
      bookData: bookDataWithSelectedCategories,
      fieldMapping: tempFieldMappings || notionSettings!.fieldMapping,
      customValues: notionSettings!.defaultValues
    };
  };

  // Add to Notion
  const addToNotion = async (finalBookData: BookSearchResult, selectedCategories: string[]) => {
    if (!isNotionConnected || !notionSettings) {
      toast.error('Please connect to Notion and configure your settings first');
      return;
    }

    try {
      setIsAddingToNotion(true);

      // Check authentication status before proceeding
      try {
        const authStatus = await NotionService.checkAuth();
        if (!authStatus.authenticated) {
          toast.error('Your session has expired. Please refresh the page and try again.');
          setIsAddingToNotion(false);
          return;
        }
      } catch (authError) {
        console.error('Authentication check failed:', authError);
        toast.error('Authentication check failed. Please refresh the page and try again.');
        setIsAddingToNotion(false);
        return;
      }

      let currentDuplicateStatus = duplicateStatus;
      if (duplicateStatus === 'unknown') {
        currentDuplicateStatus = await checkForDuplicates();
      }

      // If duplicate found and no action set, show modal
      if (currentDuplicateStatus === 'duplicate' && !duplicateAction) {
        setShowDuplicateModal(true);
        return; // Modal handlers will take care of the rest
      }

      const request = createNotionRequest(finalBookData, selectedCategories);
      const createdPage = await NotionService.createPage(request);
      
      if (createdPage) {
        const actionType = duplicateAction === 'keep-both' ? 'added as separate entry' : 'added';
        
        toast.success(`"${finalBookData.title}" ${actionType} to Notion!`);
        
        setSuccessModalData({
          bookTitle: finalBookData.title,
          notionUrl: createdPage.url,
          categoriesCount: selectedCategories.length,
          dateType: 'multiple dates available',
          actionType: actionType as 'added' | 'added as separate entry'
        });
        
        setDuplicateAction(null);
        setShowSuccessModal(true);
      } else {
        throw new Error('Failed to create page');
      }
    } catch (error) {
      console.error('Add to Notion failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to add book to Notion: ${errorMessage}`);
    } finally {
      setIsAddingToNotion(false);
    }
  };

  // Replace existing Notion page
  const replaceExistingNotionPage = async (finalBookData: BookSearchResult, selectedCategories: string[]) => {
    if (!existingNotionPage || !notionSettings) {
      toast.error('Cannot replace: existing page not found');
      return;
    }

    try {
      setIsAddingToNotion(true);

      // Check authentication status before proceeding
      const authStatus = await NotionService.checkAuth();
      if (!authStatus.authenticated) {
        toast.error('Your session has expired. Please refresh the page and try again.');
        return;
      }

      // Extract page ID from URL
      const urlPart = existingNotionPage.url.split('/').pop()?.split('?')[0];
      
      if (!urlPart) {
        throw new Error('Could not extract page information from Notion URL');
      }
      
      const pageIdMatch = urlPart.match(/([a-f0-9]{32})$/i);
      const pageId = pageIdMatch ? pageIdMatch[1] : urlPart;
      
      if (!pageId || pageId.length !== 32) {
        throw new Error(`Invalid Notion page ID extracted: "${pageId}". Expected 32-character hex string.`);
      }

      const request = createNotionRequest(finalBookData, selectedCategories);
      await NotionService.updateBookPage(pageId, request);
      
      toast.success(`"${finalBookData.title}" updated in Notion!`);
      
      setSuccessModalData({
        bookTitle: finalBookData.title,
        notionUrl: existingNotionPage.url,
        categoriesCount: selectedCategories.length,
        dateType: 'multiple dates available',
        actionType: 'updated'
      });
      
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Replace existing page failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to update existing book: ${errorMessage}`);
    } finally {
      setIsAddingToNotion(false);
    }
  };

  // Create new Notion page (for keep-both option)
  const createNewNotionPage = async (finalBookData: BookSearchResult, selectedCategories: string[]) => {
    if (!isNotionConnected || !notionSettings) {
      toast.error('Please connect to Notion and configure your settings first');
      return;
    }

    try {
      setIsAddingToNotion(true);

      const authStatus = await NotionService.checkAuth();
      if (!authStatus.authenticated) {
        toast.error('Your session has expired. Please refresh the page and try again.');
        return;
      }

      const request = createNotionRequest(finalBookData, selectedCategories);
      const createdPage = await NotionService.createPage(request);
      
      if (createdPage) {
        toast.success(`"${finalBookData.title}" added to Notion!`);
        
        setSuccessModalData({
          bookTitle: finalBookData.title,
          notionUrl: createdPage.url,
          categoriesCount: selectedCategories.length,
          dateType: 'multiple dates available',
          actionType: 'added'
        });
        
        setShowSuccessModal(true);
      } else {
        throw new Error('Failed to create page');
      }
    } catch (error) {
      console.error('Create new page failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to add book to Notion: ${errorMessage}`);
    } finally {
      setIsAddingToNotion(false);
    }
  };

  // Duplicate modal handlers
  const handleDuplicateCancel = () => {
    setDuplicateAction('cancel');
    setShowDuplicateModal(false);
    setIsAddingToNotion(false);
  };

  const handleDuplicateReplace = (finalBookData: BookSearchResult, selectedCategories: string[]) => {
    setDuplicateAction('replace');
    setShowDuplicateModal(false);
    setTimeout(() => replaceExistingNotionPage(finalBookData, selectedCategories), 50);
  };

  const handleDuplicateKeepBoth = (finalBookData: BookSearchResult, selectedCategories: string[]) => {
    setDuplicateAction('keep-both');
    setShowDuplicateModal(false);
    setTimeout(() => createNewNotionPage(finalBookData, selectedCategories), 50);
  };

  // Handle temporary field mapping changes
  const handleTempFieldMappingChange = (bookField: string, notionProperty: string) => {
    setTempFieldMappings((prev: any) => ({
      ...prev,
      [bookField]: notionProperty
    }));
  };

  // Reset temporary field mappings to original settings
  const resetTempFieldMappings = () => {
    if (notionSettings?.fieldMapping) {
      setTempFieldMappings({ ...notionSettings.fieldMapping });
      toast.success('Field mappings reset to saved settings');
    }
  };

  // Save temporary field mappings to permanent settings
  const saveTempFieldMappings = async () => {
    if (!tempFieldMappings || !notionSettings) {
      toast.error('No changes to save');
      return;
    }

    try {
      const updatedSettings = {
        ...notionSettings,
        fieldMapping: { ...tempFieldMappings }
      };

      await NotionService.saveSettings(updatedSettings);
      
      if (onSettingsUpdated) {
        onSettingsUpdated(updatedSettings);
      }
      
      toast.success('Field mappings saved permanently! These mappings will be used for all future books.');
    } catch (error) {
      console.error('Failed to save field mappings:', error);
      toast.error('Failed to save field mappings');
    }
  };

  // Check if temp mappings differ from saved settings
  const hasUnsavedChanges = () => {
    if (!tempFieldMappings || !notionSettings?.fieldMapping) return false;
    return JSON.stringify(tempFieldMappings) !== JSON.stringify(notionSettings.fieldMapping);
  };

  return {
    duplicateStatus,
    duplicateCount,
    existingNotionPage,
    duplicatePages,
    isAddingToNotion,
    duplicateAction,
    showDuplicateModal,
    showSuccessModal,
    successModalData,
    tempFieldMappings,
    databaseProperties,
    loadingDatabaseProperties,
    duplicateCheckButtonRef,
    checkForDuplicates,
    addToNotion,
    replaceExistingNotionPage,
    createNewNotionPage,
    handleDuplicateCancel,
    handleDuplicateReplace,
    handleDuplicateKeepBoth,
    setShowSuccessModal,
    setSuccessModalData,
    handleTempFieldMappingChange,
    resetTempFieldMappings,
    saveTempFieldMappings,
    hasUnsavedChanges,
  };
}; 
