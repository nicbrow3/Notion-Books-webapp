import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useNotionSettings } from '../contexts/NotionSettingsContext';
import { NotionIntegrationSettings } from '../types/notion';
import NotionFieldMappings from '../components/BookDetailsModal/NotionFieldMappings';
import { NotionService } from '../services/notionService';
import { BookService } from '../services/bookService';
import { CategoryService, CategorySettings } from '../services/categoryService';
import Tooltip from '../components/ui/Tooltip';
import { 
  SpinnerGapIcon, 
  CheckIcon, 
  XIcon, 
  LightningIcon, 
  SignOutIcon, 
  DownloadIcon, 
  UploadIcon, 
  ArrowClockwiseIcon, 
  WarningIcon, 
  CaretRightIcon, 
  FloppyDiskIcon 
} from '@phosphor-icons/react';
import { ICON_CONTEXTS, ICON_WEIGHTS } from '../constants/iconConfig';

const Settings: React.FC = () => {
  // Use auth context
  const { isAuthenticated, user, login, logout } = useAuth();
  // Use notion settings context
  const {
    databases,
    selectedDatabase,
    databaseProperties,
    notionSettings,
    fieldMappings,
    usePageIcon,
    useEnglishOnlySources,
    isLoadingDatabases,
    isLoadingProperties,
    isSavingSettings,
    loadDatabases,
    saveSettings,
    setSelectedDatabase,
    setFieldMappings,
    setUsePageIcon,
    setUseEnglishOnlySources
  } = useNotionSettings();

  // Local state for connecting
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error' | 'idle'>(() => {
    const cached = sessionStorage.getItem('googleBooksStatus');
    return cached ? (cached as 'connected' | 'error') : 'idle';
  });
  const [openLibraryStatus, setOpenLibraryStatus] = useState<'checking' | 'connected' | 'error' | 'idle'>(() => {
    const cached = sessionStorage.getItem('openLibraryStatus');
    return cached ? (cached as 'connected' | 'error') : 'idle';
  });
  const [audnexusStatus, setAudnexusStatus] = useState<'checking' | 'connected' | 'error' | 'idle'>(() => {
    const cached = sessionStorage.getItem('audnexusStatus');
    return cached ? (cached as 'connected' | 'error') : 'idle';
  });

  // Category settings state
  const [categorySettings, setCategorySettings] = useState<CategorySettings>({
    ignoredCategories: [],
    categoryMappings: {},
    fieldDefaults: {},
    overriddenDefaultMappings: [],
    autoFilterLocations: false,
    splitCommas: true,
    splitAmpersand: true
  });
  const [initialCategorySettings, setInitialCategorySettings] = useState<CategorySettings | null>(null);
  const [showDefaultMappings, setShowDefaultMappings] = useState(false);
  const [isCustomMappingsCollapsed, setIsCustomMappingsCollapsed] = useState(false);
  const [isDefaultMappingsCollapsed, setIsDefaultMappingsCollapsed] = useState(false);
  const [isIgnoredCategoriesCollapsed, setIsIgnoredCategoriesCollapsed] = useState(false);
  const [isFieldMappingsCollapsed, setIsFieldMappingsCollapsed] = useState(false);

  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if there are any unsaved changes in any settings
  const hasUnsavedChanges = (): boolean => {
    // Check if Notion settings aren't loaded yet
    if (!notionSettings) return false;

    // Check database selection change
    if (selectedDatabase !== notionSettings.databaseId) return true;
    
    // Check field mappings changes
    if (notionSettings.fieldMapping) {
      const { pageIcon: savedPageIcon, ...savedMappings } = notionSettings.fieldMapping;

      // Normalize mappings to avoid false positives due to key order or missing empty keys
      const normalize = (m: Record<string, any>, pageIcon: boolean) => {
        const keys = Array.from(new Set([
          ...Object.keys(fieldMappings as Record<string, any>),
          ...Object.keys(m || {})
        ]));
        const obj: Record<string, any> = {};
        keys.forEach((k) => {
          obj[k] = (m && m[k] !== undefined && m[k] !== null) ? m[k] : '';
        });
        obj.pageIcon = !!pageIcon;
        return obj;
      };

      const deepEqual = (a: any, b: any): boolean => {
        if (a === b) return true;
        if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;
        for (const key of aKeys) {
          if (!deepEqual(a[key], (b as any)[key])) return false;
        }
        return true;
      };

      const currentNormalized = normalize(fieldMappings as Record<string, any>, usePageIcon);
      const savedNormalized = normalize(savedMappings as Record<string, any>, !!savedPageIcon);
      if (!deepEqual(currentNormalized, savedNormalized)) {
        return true;
      }
    }
    
    // Check English-only sources setting change
    if (useEnglishOnlySources !== (notionSettings.useEnglishOnlySources ?? true)) return true;
    
    // Check for changes in category settings
    if (initialCategorySettings && (
        categorySettings.autoFilterLocations !== initialCategorySettings.autoFilterLocations ||
        categorySettings.splitCommas !== initialCategorySettings.splitCommas ||
        categorySettings.splitAmpersand !== initialCategorySettings.splitAmpersand)) {
      return true;
    }
    
    // No changes detected
    return false;
  };

  // Test API connections on first visit to settings page (only if not cached)
  useEffect(() => {
    const testConnectionsOnFirstVisit = async () => {
      // Only test APIs that haven't been tested yet in this session
      if (!sessionStorage.getItem('googleBooksStatus')) {
        try {
          const result = await BookService.testConnection();
          if (result.success) {
            setConnectionStatus('connected');
            sessionStorage.setItem('googleBooksStatus', 'connected');
          } else {
            setConnectionStatus('error');
            sessionStorage.setItem('googleBooksStatus', 'error');
          }
        } catch (error) {
          setConnectionStatus('error');
          sessionStorage.setItem('googleBooksStatus', 'error');
        }
      }

      if (!sessionStorage.getItem('openLibraryStatus')) {
        try {
          const response = await fetch('https://openlibrary.org/search.json?q=test&limit=1');
          if (response.ok) {
            setOpenLibraryStatus('connected');
            sessionStorage.setItem('openLibraryStatus', 'connected');
          } else {
            setOpenLibraryStatus('error');
            sessionStorage.setItem('openLibraryStatus', 'error');
          }
        } catch (error) {
          setOpenLibraryStatus('error');
          sessionStorage.setItem('openLibraryStatus', 'error');
        }
      }

      if (!sessionStorage.getItem('audnexusStatus')) {
        try {
          const response = await fetch('https://api.audnex.us/books/B073H9PF2D?region=us');
          if (response.ok) {
            setAudnexusStatus('connected');
            sessionStorage.setItem('audnexusStatus', 'connected');
          } else {
            setAudnexusStatus('error');
            sessionStorage.setItem('audnexusStatus', 'error');
          }
        } catch (error) {
          setAudnexusStatus('error');
          sessionStorage.setItem('audnexusStatus', 'error');
        }
      }
    };

    testConnectionsOnFirstVisit();
  }, []);

  // Load category settings
  useEffect(() => {
    const settings = CategoryService.loadSettings();
    setCategorySettings(settings);
    setInitialCategorySettings(settings);
    console.log('Loaded category settings:', settings);
  }, []);

  /**
   * Exports all application settings to a JSON file
   * 
   * The exported file contains:
   * - Version information
   * - Timestamp
   * - Notion integration settings (database, field mappings, preferences)
   * - Category settings (mappings, ignored categories, defaults)
   * 
   * This creates a downloadable file named 'book-tracker-settings-{date}.json'
   */
  const handleExportSettings = () => {
    try {
      // Collect settings data
      const exportData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        notionSettings: {
          databaseId: selectedDatabase,
          databaseName: databases.find(db => db.id === selectedDatabase)?.title || "",
          fieldMappings,
          usePageIcon,
          useEnglishOnlySources
        },
        categorySettings: CategoryService.loadSettings()
      };
      
      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `book-tracker-settings-${new Date().toISOString().slice(0,10)}.json`;
      
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Settings exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Failed to export settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * Imports settings from a JSON file
   * 
   * Expected file structure:
   * {
   *   "version": "1.0",
   *   "timestamp": "ISO date string",
   *   "notionSettings": {
   *     "databaseId": "string",
   *     "databaseName": "string",
   *     "fieldMappings": { [key: string]: string },
   *     "usePageIcon": boolean,
   *     "useEnglishOnlySources": boolean
   *   },
   *   "categorySettings": {
   *     "ignoredCategories": string[],
   *     "categoryMappings": { [key: string]: string },
   *     "fieldDefaults": { [key: string]: any },
   *     "overriddenDefaultMappings": string[] // Default mappings that have been explicitly disabled
   *     "autoFilterLocations": boolean // Automatically filter out location genres
   *   }
   * }
   * 
   * @param e - File input change event
   */
  const handleImportSettings = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      const fileContents = await file.text();
      const importData = JSON.parse(fileContents);
      
      // Validate structure
      if (!importData.notionSettings || !importData.categorySettings) {
        throw new Error("Invalid settings file format");
      }
      
      // Update category settings - use merge strategy
      const currentCategorySettings = CategoryService.loadSettings();
      const mergedCategorySettings = {
        ...currentCategorySettings,
        // Merge category mappings
        categoryMappings: {
          ...currentCategorySettings.categoryMappings,
          ...importData.categorySettings.categoryMappings
        },
        // Merge ignored categories with deduplication
        ignoredCategories: Array.from(new Set([
          ...currentCategorySettings.ignoredCategories,
          ...(importData.categorySettings.ignoredCategories || [])
        ])),
        // Merge field defaults
        fieldDefaults: {
          ...currentCategorySettings.fieldDefaults,
          ...(importData.categorySettings.fieldDefaults || {})
        },
        // Merge overridden default mappings with deduplication
        overriddenDefaultMappings: Array.from(new Set([
          ...(currentCategorySettings.overriddenDefaultMappings || []),
          ...(importData.categorySettings.overriddenDefaultMappings || [])
        ])),
        // Update autoFilterLocations if present
        autoFilterLocations: importData.categorySettings.autoFilterLocations !== undefined 
          ? importData.categorySettings.autoFilterLocations 
          : currentCategorySettings.autoFilterLocations || false
      };
      
      CategoryService.saveSettings(mergedCategorySettings);
      setCategorySettings(mergedCategorySettings);
      setInitialCategorySettings(mergedCategorySettings);
      
      // Update notion settings if connected - use merge strategy for field mappings
      if (isAuthenticated && importData.notionSettings.databaseId) {
        // Set database ID from import
        setSelectedDatabase(importData.notionSettings.databaseId);
        
        // Merge field mappings
        const mergedFieldMappings = {
          ...fieldMappings,
          ...(importData.notionSettings.fieldMappings || {})
        };
        setFieldMappings(mergedFieldMappings);
        
        // Set boolean preferences (default English-only to true when missing)
        setUsePageIcon(importData.notionSettings.usePageIcon || false);
        setUseEnglishOnlySources(importData.notionSettings.useEnglishOnlySources ?? true);
        
        // Save to Notion settings context
        await saveSettings({
          databaseId: importData.notionSettings.databaseId,
          fieldMapping: { 
            ...mergedFieldMappings,
            pageIcon: importData.notionSettings.usePageIcon 
          },
          defaultValues: {},
          autoAddBooks: false,
          // Persist English-only preference with same default semantics (true when undefined)
          useEnglishOnlySources: importData.notionSettings.useEnglishOnlySources ?? true,
        });
      } else if (!isAuthenticated && importData.notionSettings) {
        toast.error("Notion settings imported but not applied - please connect to Notion first");
      }
      
      toast.success("Settings imported successfully");
    } catch (error) {
      console.error("Import error:", error);
      toast.error(`Failed to import settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Reset the file input
      if (e.target) e.target.value = '';
    }
  };

  // Helper to trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Get default mappings (work around the private property access)
  const getDefaultMappings = () => {
    // Now we can directly use the static method we added
    return CategoryService.getDefaultMappings();
  };

  // Check if a mapping is a custom mapping (not a default one or a modified default)
  const isCustomMapping = (key: string, value: string) => {
    const defaultMappings = getDefaultMappings();
    // It's a custom mapping if:
    // 1. It's not in the default mappings, OR
    // 2. Its value is different from the default value
    return !defaultMappings[key] || defaultMappings[key] !== value;
  };

  // Get all default mappings that haven't been overridden
  const getNonOverriddenDefaultMappings = () => {
    const defaultMappings = getDefaultMappings();
    // Filter out default mappings that aren't in the current settings
    // (those have been overridden by the user)
    const result: Record<string, string> = {};
    Object.entries(defaultMappings).forEach(([key, value]) => {
      if (key in categorySettings.categoryMappings) {
        result[key] = value;
      }
    });
    return result;
  };

  // Group mappings by target category for a more compact display
  const getGroupedMappings = () => {
    // Get only custom mappings
    const customMappings = Object.entries(categorySettings.categoryMappings)
      .filter(([key, value]) => isCustomMapping(key, value));
    
    // Group by target/parent category
    const grouped: Record<string, string[]> = {};
    customMappings.forEach(([fromCategory, toCategory]) => {
      if (!grouped[toCategory]) {
        grouped[toCategory] = [];
      }
      grouped[toCategory].push(fromCategory);
    });
    
    return grouped;
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      toast.loading('Connecting to Notion...', { id: 'notion-auth' });
      
      const result = await login();
      
      if (result.success) {
        if (result.isFirstTime) {
          toast.success('Welcome! Let\'s configure your Notion integration.', { id: 'notion-auth' });
        } else {
          toast.success(result.message, { id: 'notion-auth' });
        }
      } else {
        toast.error(result.message, { id: 'notion-auth' });
      }
    } catch (error) {
      console.error('Connection failed:', error);
      toast.error('Failed to connect to Notion', { id: 'notion-auth' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await logout();
      toast.success('Disconnected from Notion');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Failed to disconnect from Notion');
    }
  };

  const handleFieldMappingChange = (bookField: string, notionProperty: string) => {
    setFieldMappings(prev => ({
      ...prev,
      [bookField]: notionProperty
    }));
  };

  const applySuggestedMappings = () => {
    if (!databaseProperties?.suggestedMappings) return;

    const newMappings = { ...fieldMappings };
    
    Object.entries(databaseProperties.suggestedMappings).forEach(([googleField, mapping]: [string, any]) => {
      if (!mapping.ignored && mapping.notionProperty && googleField !== 'pageIcon') {
        newMappings[googleField as keyof typeof newMappings] = mapping.notionProperty;
      }
    });

    setFieldMappings(newMappings);
    toast.success('Applied suggested field mappings');
  };

  const handleSaveSettings = async () => {
    if (!selectedDatabase) {
      toast.error('Please select a database first');
      return;
    }

    const settings: NotionIntegrationSettings = {
      databaseId: selectedDatabase,
      fieldMapping: { ...fieldMappings, pageIcon: usePageIcon },
      defaultValues: {},
      autoAddBooks: false,
      useEnglishOnlySources: useEnglishOnlySources,
    };

    // Save Notion settings
    await saveSettings(settings);
    
    // Save category settings
    CategoryService.saveSettings(categorySettings);
    // Update initial settings to match current
    setInitialCategorySettings({...categorySettings});
    
    toast.success('All settings saved successfully');
  };

  // Handle removing a category mapping
  const handleRemoveCategoryMapping = (fromCategory: string) => {
    CategoryService.removeCategoryMapping(fromCategory);
    const updatedSettings = CategoryService.loadSettings();
    setCategorySettings(updatedSettings);
    setInitialCategorySettings(updatedSettings);
    toast.success(`Removed mapping for "${fromCategory}"`);
  };

  // Handle overriding a default category mapping
  const handleOverrideDefaultMapping = (fromCategory: string) => {
    // Get current settings
    const currentSettings = CategoryService.loadSettings();
    
    // Add to list of overridden default mappings
    const overriddenMappings = currentSettings.overriddenDefaultMappings || [];
    if (!overriddenMappings.includes(fromCategory)) {
      overriddenMappings.push(fromCategory);
    }
    
    // Update settings
    currentSettings.overriddenDefaultMappings = overriddenMappings;
    
    // Save updated settings
    CategoryService.saveSettings(currentSettings);
    
    // Update local state
    const refreshed = CategoryService.loadSettings();
    setCategorySettings(refreshed);
    setInitialCategorySettings(refreshed);
    
    toast.success(`Overrode default mapping for "${fromCategory}"`);
  };

  // Handle removing an ignored category
  const handleRemoveIgnoredCategory = (category: string) => {
    CategoryService.removeIgnoredCategory(category);
    const updatedSettings = CategoryService.loadSettings();
    setCategorySettings(updatedSettings);
    setInitialCategorySettings(updatedSettings);
    toast.success(`Removed "${category}" from ignored categories`);
  };

  // Toggle auto-filter locations setting
  const handleToggleAutoFilterLocations = () => {
    const updatedSettings = {
      ...categorySettings,
      autoFilterLocations: !categorySettings.autoFilterLocations
    };
    setCategorySettings(updatedSettings);
    CategoryService.saveSettings(updatedSettings);
    setInitialCategorySettings(updatedSettings);
    toast.success(`Auto-filter locations ${updatedSettings.autoFilterLocations ? 'enabled' : 'disabled'}`);
  };

  const handleToggleSplitCommas = () => {
    const updated = { ...categorySettings, splitCommas: !categorySettings.splitCommas };
    setCategorySettings(updated);
    CategoryService.saveSettings(updated);
    setInitialCategorySettings(updated);
    toast.success(`Split on commas ${updated.splitCommas ? 'enabled' : 'disabled'}`);
  };

  const handleToggleSplitAmpersand = () => {
    const updated = { ...categorySettings, splitAmpersand: !categorySettings.splitAmpersand };
    setCategorySettings(updated);
    CategoryService.saveSettings(updated);
    setInitialCategorySettings(updated);
    toast.success(`Split on "&" / "and" ${updated.splitAmpersand ? 'enabled' : 'disabled'}`);
  };

  const renderGoogleBooksStatus = () => {
    switch (connectionStatus) {
      case 'checking':
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-center">
              <SpinnerGapIcon 
                size={ICON_CONTEXTS.SETTINGS.DEFAULT} 
                weight={ICON_WEIGHTS.BOLD} 
                className="animate-spin text-yellow-600 mr-2" 
              />
              <span className="text-yellow-800">Checking API connection...</span>
            </div>
          </div>
        );
      case 'connected':
        return (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center">
              <CheckIcon 
                size={ICON_CONTEXTS.SETTINGS.DEFAULT} 
                weight={ICON_WEIGHTS.BOLD} 
                className="text-green-600 mr-2" 
              />
              <span className="text-green-800">Connected</span>
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <XIcon 
                size={ICON_CONTEXTS.SETTINGS.DEFAULT} 
                weight={ICON_WEIGHTS.FILL} 
                className="text-red-600 mr-2" 
              />
              <span className="text-red-800">API connection failed. Please check your configuration.</span>
            </div>
          </div>
        );
      case 'idle':
      default:
        return (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <div className="flex items-center">
              <WarningIcon 
                size={ICON_CONTEXTS.SETTINGS.DEFAULT} 
                weight={ICON_WEIGHTS.BOLD} 
                className="text-gray-600 mr-2" 
              />
              <span className="text-gray-800">Click the test button to check connection</span>
            </div>
          </div>
        );
    }
  };

  const renderOpenLibraryStatus = () => {
    switch (openLibraryStatus) {
      case 'checking':
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-center">
              <SpinnerGapIcon 
                size={ICON_CONTEXTS.SETTINGS.DEFAULT} 
                weight={ICON_WEIGHTS.BOLD} 
                className="animate-spin text-yellow-600 mr-2" 
              />
              <span className="text-yellow-800">Checking API connection...</span>
            </div>
          </div>
        );
      case 'connected':
        return (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center">
              <CheckIcon 
                size={ICON_CONTEXTS.SETTINGS.DEFAULT} 
                weight={ICON_WEIGHTS.BOLD} 
                className="text-green-600 mr-2" 
              />
              <span className="text-green-800">Connected</span>
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <XIcon 
                size={ICON_CONTEXTS.SETTINGS.DEFAULT} 
                weight={ICON_WEIGHTS.FILL} 
                className="text-red-600 mr-2" 
              />
              <span className="text-red-800">API connection failed</span>
            </div>
          </div>
        );
      case 'idle':
      default:
        return (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <div className="flex items-center">
              <WarningIcon 
                size={ICON_CONTEXTS.SETTINGS.DEFAULT} 
                weight={ICON_WEIGHTS.BOLD} 
                className="text-gray-600 mr-2" 
              />
              <span className="text-gray-800">Click the test button to check connection</span>
            </div>
          </div>
        );
    }
  };

  const renderAudnexusStatus = () => {
    switch (audnexusStatus) {
      case 'checking':
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-center">
              <SpinnerGapIcon 
                size={ICON_CONTEXTS.SETTINGS.DEFAULT} 
                weight={ICON_WEIGHTS.BOLD} 
                className="animate-spin text-yellow-600 mr-2" 
              />
              <span className="text-yellow-800">Checking API connection...</span>
            </div>
          </div>
        );
      case 'connected':
        return (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center">
              <CheckIcon 
                size={ICON_CONTEXTS.SETTINGS.DEFAULT} 
                weight={ICON_WEIGHTS.BOLD} 
                className="text-green-600 mr-2" 
              />
              <span className="text-green-800">Connected</span>
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <XIcon 
                size={ICON_CONTEXTS.SETTINGS.DEFAULT} 
                weight={ICON_WEIGHTS.FILL} 
                className="text-red-600 mr-2" 
              />
              <span className="text-red-800">API connection failed</span>
            </div>
          </div>
        );
      case 'idle':
      default:
        return (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <div className="flex items-center">
              <WarningIcon 
                size={ICON_CONTEXTS.SETTINGS.DEFAULT} 
                weight={ICON_WEIGHTS.BOLD} 
                className="text-gray-600 mr-2" 
              />
              <span className="text-gray-800">Click the test button to check connection</span>
            </div>
          </div>
        );
    }
  };

  const renderNotionConnection = () => {
    return (
      <div>
        {isAuthenticated ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-black border-2 border-green-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933l3.222-.187z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Connected to Notion</h3>
                <p className="text-sm text-gray-600">
                  Workspace: {user?.workspace_name || 'Unknown'}
                </p>
                <p className="text-xs text-gray-500">
                  User: {user?.owner?.name || user?.name || 'Unknown'}
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Tooltip content="Test Connection">
                <button
                  onClick={async () => {
                    try {
                      const result = await NotionService.testConnection();
                      if (result.success) {
                        toast.success('Notion connection is working!');
                      } else {
                        toast.error(`Connection test failed: ${result.message}`);
                      }
                    } catch (error) {
                      toast.error('Failed to test Notion connection');
                    }
                  }}
                  className="group p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                >
                  <LightningIcon size={ICON_CONTEXTS.SETTINGS.DEFAULT} weight={ICON_WEIGHTS.FILL} className="group-hover:animate-wiggle" />
                </button>
              </Tooltip>
              <Tooltip content="Disconnect">
                <button
                  onClick={handleDisconnect}
                  className="group p-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                >
                  <SignOutIcon size={ICON_CONTEXTS.SETTINGS.DEFAULT} weight={ICON_WEIGHTS.BOLD} className="group-hover:animate-wiggle" />
                </button>
              </Tooltip>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933l3.222-.187z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect to Notion</h3>
            <p className="text-gray-600 mb-6">Connect to your personal Notion workspace to configure settings.</p>
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className={`px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white transition-colors ${
                isConnecting ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500'
              }`}
            >
              {isConnecting ? 'Connecting...' : 'Connect to Notion'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-600">Configure your database connections and field mappings for book data.</p>
          </div>
          <div className="flex space-x-3 items-center">
            {/* Show unsaved changes indicator */}
            {isAuthenticated && hasUnsavedChanges() && (
              <span className="text-orange-600 bg-orange-50 px-3 py-1 rounded-md text-sm font-medium">
                Unsaved Changes
              </span>
            )}
            
            {/* Save Settings Button */}
            {isAuthenticated && (
              <Tooltip content={hasUnsavedChanges() ? "Save Settings" : "No changes to save"}>
                <button
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings || !hasUnsavedChanges()}
                  className={`group px-4 py-2 rounded-md text-white flex items-center transition-colors ${
                    !hasUnsavedChanges()
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isSavingSettings ? (
                    <>
                      <SpinnerGapIcon size={ICON_CONTEXTS.SETTINGS.DEFAULT} weight={ICON_WEIGHTS.BOLD} className="animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FloppyDiskIcon size={ICON_CONTEXTS.SETTINGS.DEFAULT} weight={ICON_WEIGHTS.FILL} className="mr-2 group-hover:animate-wiggle" />
                      Save
                    </>
                  )}
                </button>
              </Tooltip>
            )}
            
            {/* Hidden file input */}
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept=".json" 
              onChange={handleImportSettings} 
            />
            
            {/* Import Button */}
            <Tooltip content="Import Settings">
              <button
                onClick={triggerFileInput}
                className="group bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
              >
                <DownloadIcon size={ICON_CONTEXTS.SETTINGS.DEFAULT} weight={ICON_WEIGHTS.FILL} className="mr-2 group-hover:animate-wiggle" />
                Import
              </button>
            </Tooltip>
            
            {/* Export Button */}
            <Tooltip content="Export Settings">
              <button
                onClick={handleExportSettings}
                className="group bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center"
              >
                <UploadIcon size={ICON_CONTEXTS.SETTINGS.DEFAULT} weight={ICON_WEIGHTS.FILL} className="mr-2 group-hover:animate-wiggle" />
                Export
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Database Configuration */}
        <div className="space-y-6">
          {/* Database Selection and Field Mappings - Only show when connected */}
          {isAuthenticated ? (
            <>
              {/* Database Selection */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Database Selection</h2>
                  <Tooltip content="Refresh Databases">
                    <button
                      onClick={loadDatabases}
                      disabled={isLoadingDatabases}
                      className="group p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors disabled:opacity-50"
                    >
                      {isLoadingDatabases ? (
                        <SpinnerGapIcon size={ICON_CONTEXTS.SETTINGS.DEFAULT} weight={ICON_WEIGHTS.BOLD} className="animate-spin" />
                      ) : (
                        <ArrowClockwiseIcon size={ICON_CONTEXTS.SETTINGS.DEFAULT} weight={ICON_WEIGHTS.FILL} className="group-hover:animate-wiggle" />
                      )}
                    </button>
                  </Tooltip>
                </div>
                
                {isLoadingDatabases ? (
                  <div className="flex items-center py-4">
                    <SpinnerGapIcon size={ICON_CONTEXTS.SETTINGS.DEFAULT} weight={ICON_WEIGHTS.BOLD} className="animate-spin text-blue-600 mr-2" />
                    <span className="text-gray-600">Loading databases...</span>
                  </div>
                ) : databases.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <WarningIcon size={ICON_CONTEXTS.SETTINGS.DEFAULT} weight={ICON_WEIGHTS.FILL} className="text-yellow-600 mr-2" />
                      <div>
                        <p className="text-yellow-800 font-medium">No databases found</p>
                        <p className="text-yellow-700 text-sm mt-1">
                          Make sure you have shared at least one database with this integration.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="database-select" className="block text-sm font-medium text-gray-700 mb-2">
                        Select Database
                      </label>
                      <select
                        id="database-select"
                        value={selectedDatabase}
                        onChange={(e) => setSelectedDatabase(e.target.value)}
                        disabled={isLoadingDatabases}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {isLoadingDatabases ? "Loading databases..." : "Choose a database..."}
                        </option>
                        {databases
                          .slice()
                          .sort((a, b) => a.title.localeCompare(b.title))
                          .map((db) => (
                            <option key={db.id} value={db.id}>
                              {db.title}
                            </option>
                          ))}
                      </select>
                    </div>
                    
                    {selectedDatabase && (
                      <div className="text-sm text-gray-600">
                        Selected: {
                          isLoadingDatabases
                            ? <span className="italic">Loading...</span>
                            : databases.find(db => db.id === selectedDatabase)?.title ||
                              <span className="text-orange-600 font-medium">⚠️ Database ID {selectedDatabase.slice(0, 8)}... (not found in available databases)</span>
                        }
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Field Mappings */}
              {selectedDatabase && (
                <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Field Mappings</h2>
                      {isLoadingDatabases && (
                        <p className="text-sm text-gray-500 mt-1">
                          Database: <span className="italic">Loading...</span>
                        </p>
                      )}
                      {!isLoadingDatabases && databases.length > 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                          Database: {databases.find(db => db.id === selectedDatabase)?.title || `Unknown (${selectedDatabase.slice(0, 8)}...)`}
                        </p>
                      )}
                    </div>
                    {databaseProperties?.suggestedMappings && (
                      <button
                        onClick={applySuggestedMappings}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Apply Suggested Mappings
                      </button>
                    )}
                  </div>

                  {isLoadingProperties ? (
                    <div className="flex items-center py-4">
                      <SpinnerGapIcon size={ICON_CONTEXTS.SETTINGS.DEFAULT} weight={ICON_WEIGHTS.BOLD} className="animate-spin text-blue-600 mr-2" />
                      <span className="text-gray-600">Loading database properties...</span>
                    </div>
                  ) : (
                    <>
                      {/* Use NotionFieldMappings component for consistency */}
                      <NotionFieldMappings
                        book={{
                          // Mock book object with no data to show field structure
                          id: 'mock-book',
                          title: '',
                          authors: [],
                          description: '',
                          isbn13: '',
                          isbn10: '',
                          publisher: '',
                          pageCount: 0,
                          categories: [],
                          averageRating: 0,
                          thumbnail: '',
                          publishedDate: '2023-01-15',
                          source: 'mock',
                          audiobookData: {
                            hasAudiobook: false,
                            source: 'mock',
                            publisher: '',
                            chapters: 0,
                            chapterCount: 0,
                            asin: '',
                            narrators: [],
                            totalDurationHours: 0,
                            duration: '',
                            audibleUrl: '',
                            rating: 0,
                            ratingCount: 0,
                            publishedDate: '2023-03-01'
                          }
                        }}
                        selectedCategories={[]}
                        isCollapsed={isFieldMappingsCollapsed}
                        notionSettings={{
                          fieldMapping: { ...fieldMappings, pageIcon: usePageIcon }
                        }}
                        tempFieldMappings={{ ...fieldMappings, pageIcon: usePageIcon }}
                        databaseProperties={databaseProperties}
                        loadingDatabaseProperties={false}
                        formatAuthors={(authors: string[]) => authors.join(', ')}
                        onSetCollapsed={(collapsed) => setIsFieldMappingsCollapsed(collapsed)}
                        onTempFieldMappingChange={handleFieldMappingChange}
                        onResetTempFieldMappings={() => {
                          // Reset to saved settings
                          if (notionSettings?.fieldMapping) {
                            const { pageIcon, ...mappings } = notionSettings.fieldMapping;
                            setFieldMappings(mappings);
                            setUsePageIcon(pageIcon || false);
                            toast.success('Field mappings reset to saved settings');
                          }
                        }}
                        onSaveTempFieldMappings={async () => {
                          // Save the current field mappings
                          await handleSaveSettings();
                        }}
                        onHasUnsavedChanges={hasUnsavedChanges}
                        showDataValues={false}
                        hideUnsavedChangesIndicator={true}
                      />
                    </>
                  )}
                </div>
              )}

              {/* Display Preferences Section */}
              {selectedDatabase && databaseProperties && (
                <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Display Preferences</h2>
                  </div>

                  {/* Page Icon Setting */}
                  <div className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Page Icon
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Use book cover as page icon in Notion</p>
                      </div>
                      
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={usePageIcon}
                            onChange={(e) => setUsePageIcon(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">Use book cover as page icon</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* English-only Sources Setting */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Source Language Filtering
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Filter out non-English sources when selecting book data</p>
                      </div>
                      
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={useEnglishOnlySources}
                            onChange={(e) => setUseEnglishOnlySources(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">Use English-only sources</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="text-center">
                <p className="text-gray-600 mb-4">Connect to Notion to configure database settings.</p>
              </div>
            </div>
          )}

          {/* Genre Mappings */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Genres</h2>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Genre mappings allow you to standardize book genres across different sources. 
                When a genre matches a mapped entry, it will be converted to the preferred name.
              </p>
            </div>

            {/* Auto-filter Locations */}
            {/* Split by Commas */}
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Split Genres on Commas</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    When importing genres like "Mystery, Thriller", split them into separate genres.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={categorySettings.splitCommas} onChange={handleToggleSplitCommas} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* Split by Ampersand / "and" */}
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Split Genres on "&" / "and"</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Split compound genres connected with "&" or "and", e.g., "Science Fiction & Fantasy".
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={categorySettings.splitAmpersand} onChange={handleToggleSplitAmpersand} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* Auto-filter Locations */}
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Auto-filter Location Genres</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Automatically de-select location-based genres like "England" or "New York" when importing books
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={categorySettings.autoFilterLocations} 
                    onChange={handleToggleAutoFilterLocations}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* User Genre Mappings */}
            <div className="mb-6">
              <div 
                className="flex items-center justify-between p-3 mb-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
                onClick={() => setIsCustomMappingsCollapsed(!isCustomMappingsCollapsed)}
                title={isCustomMappingsCollapsed ? 'Expand custom mappings' : 'Collapse custom mappings'}
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">User Genre Mappings</h3>
                  <CaretRightIcon 
                    size={ICON_CONTEXTS.SETTINGS.DEFAULT} 
                    weight={ICON_WEIGHTS.FILL} 
                    className={`transition-transform duration-200 text-gray-600 ${isCustomMappingsCollapsed ? 'rotate-0' : 'rotate-90'}`} 
                  />
                </div>
              </div>

              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isCustomMappingsCollapsed 
                  ? 'max-h-0 opacity-0' 
                  : 'max-h-[1000px] opacity-100'
              }`}>
                <div className={`transform transition-all duration-300 ease-in-out ${
                  isCustomMappingsCollapsed 
                    ? 'translate-y-[-10px] scale-98' 
                    : 'translate-y-0 scale-100'
                }`}>
                  {Object.keys(getGroupedMappings()).length === 0 ? (
                    <p className="text-sm text-gray-500 italic p-3">No custom mappings defined.</p>
                  ) : (
                    <div className="border border-gray-200 rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Parent Genre
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Mapped Genres
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(getGroupedMappings())
                          .sort((a, b) => a[0].localeCompare(b[0]))
                          .map(([parentCategory, mappedCategories]) => (
                            <tr key={parentCategory} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {parentCategory}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                <div className="flex flex-wrap gap-2">
                                  {mappedCategories.sort().map(category => (
                                    <div 
                                      key={category} 
                                      className="flex items-center bg-gray-100 rounded-full px-3 py-1"
                                    >
                                      <span className="text-gray-800 mr-2">{category}</span>
                                      <button
                                        onClick={() => handleRemoveCategoryMapping(category)}
                                        className="text-gray-500 hover:text-red-600"
                                        title={`Remove mapping from "${category}" to "${parentCategory}"`}
                                      >
                                        <XIcon size={ICON_CONTEXTS.SETTINGS.DEFAULT} weight={ICON_WEIGHTS.FILL} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Default Mappings */}
            <div className="mb-6">
              <div 
                className="flex items-center justify-between p-3 mb-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
                onClick={() => {
                  setShowDefaultMappings(!showDefaultMappings);
                  setIsDefaultMappingsCollapsed(false);
                }}
                title={showDefaultMappings ? 'Hide default mappings' : 'Show default mappings'}
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">Default Genre Mappings</h3>
                  <CaretRightIcon 
                    size={ICON_CONTEXTS.SETTINGS.DEFAULT} 
                    weight={ICON_WEIGHTS.FILL} 
                    className={`transition-transform duration-200 text-gray-600 ${showDefaultMappings ? 'rotate-90' : 'rotate-0'}`} 
                  />
                </div>
              </div>

              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                !showDefaultMappings || isDefaultMappingsCollapsed
                  ? 'max-h-0 opacity-0' 
                  : 'max-h-[1000px] opacity-100'
              }`}>
                <div className={`transform transition-all duration-300 ease-in-out ${
                  !showDefaultMappings || isDefaultMappingsCollapsed
                    ? 'translate-y-[-10px] scale-98' 
                    : 'translate-y-0 scale-100'
                }`}>
                  <div className="border border-gray-200 rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Parent Genre
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mapped Genres
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        // Group default mappings by target category
                        const defaultMappings = getNonOverriddenDefaultMappings();
                        const grouped: Record<string, string[]> = {};
                        
                        Object.entries(defaultMappings).forEach(([fromCategory, toCategory]) => {
                          if (!grouped[toCategory]) {
                            grouped[toCategory] = [];
                          }
                          grouped[toCategory].push(fromCategory);
                        });
                        
                        if (Object.keys(grouped).length === 0) {
                          return (
                            <tr>
                              <td colSpan={2} className="px-4 py-4 text-center text-sm text-gray-500 italic">
                                No default mappings available or all have been overridden.
                              </td>
                            </tr>
                          );
                        }
                        
                        return Object.entries(grouped)
                          .sort((a, b) => a[0].localeCompare(b[0]))
                          .map(([parentCategory, mappedCategories]) => (
                            <tr key={parentCategory} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-500">
                                {parentCategory}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                <div className="flex flex-wrap gap-2">
                                  {mappedCategories.sort().map(category => (
                                    <div 
                                      key={category} 
                                      className="flex items-center bg-gray-50 rounded-full px-3 py-1 mr-1 mb-1"
                                    >
                                      <span className="text-gray-700 mr-2">{category}</span>
                                      <button
                                        onClick={() => handleOverrideDefaultMapping(category)}
                                        className="text-gray-400 hover:text-red-600"
                                        title={`Override default mapping from "${category}" to "${parentCategory}"`}
                                      >
                                        <XIcon size={ICON_CONTEXTS.SETTINGS.DEFAULT} weight={ICON_WEIGHTS.FILL} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ));
                      })()}
                    </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Ignored Genres */}
            <div>
              <div 
                className="flex items-center justify-between p-3 mb-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
                onClick={() => setIsIgnoredCategoriesCollapsed(!isIgnoredCategoriesCollapsed)}
                title={isIgnoredCategoriesCollapsed ? 'Expand ignored genres' : 'Collapse ignored genres'}
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">Ignored Genres</h3>
                  <CaretRightIcon 
                    size={ICON_CONTEXTS.SETTINGS.DEFAULT} 
                    weight={ICON_WEIGHTS.FILL} 
                    className={`transition-transform duration-200 text-gray-600 ${isIgnoredCategoriesCollapsed ? 'rotate-0' : 'rotate-90'}`} 
                  />
                </div>
              </div>

              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isIgnoredCategoriesCollapsed 
                  ? 'max-h-0 opacity-0' 
                  : 'max-h-[500px] opacity-100'
              }`}>
                <div className={`transform transition-all duration-300 ease-in-out ${
                  isIgnoredCategoriesCollapsed 
                    ? 'translate-y-[-10px] scale-98' 
                    : 'translate-y-0 scale-100'
                }`}>
                  {categorySettings.ignoredCategories.length === 0 ? (
                    <p className="text-sm text-gray-500 italic p-3">No ignored genres defined.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 p-3">
                    {categorySettings.ignoredCategories.sort().map((category) => (
                      <div key={category} className="flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm">
                        <span className="text-gray-800 mr-2">{category}</span>
                        <button
                          onClick={() => handleRemoveIgnoredCategory(category)}
                          className="text-gray-500 hover:text-red-600"
                          title="Remove from ignored"
                        >
                          <XIcon size={ICON_CONTEXTS.SETTINGS.DEFAULT} weight={ICON_WEIGHTS.FILL} />
                        </button>
                      </div>
                    ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column - API Connections */}
        <div className="space-y-6">
          {/* Notion Connection */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Notion Connection</h2>
            {renderNotionConnection()}
          </div>

          {/* Google Books API Connection */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-900">Google Books API</h2>
                <Tooltip content="Visit Google Books API documentation">
                  <a 
                    href="https://developers.google.com/books" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                    </svg>
                  </a>
                </Tooltip>
              </div>
              <Tooltip content="Test Connection">
                <button
                  onClick={async () => {
                    try {
                      setConnectionStatus('checking');
                      const result = await BookService.testConnection();
                      if (result.success) {
                        setConnectionStatus('connected');
                        sessionStorage.setItem('googleBooksStatus', 'connected');
                        toast.success('Google Books API connection is working!');
                      } else {
                        setConnectionStatus('error');
                        sessionStorage.setItem('googleBooksStatus', 'error');
                        toast.error(`Connection test failed: ${result.message}`);
                      }
                    } catch (error) {
                      setConnectionStatus('error');
                      sessionStorage.setItem('googleBooksStatus', 'error');
                      toast.error('Failed to test Google Books API connection');
                    }
                  }}
                  className="group p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                >
                  <LightningIcon
                  size={ICON_CONTEXTS.SETTINGS.DEFAULT}
                  weight={ICON_WEIGHTS.FILL}
                  className='group-hover:animate-wiggle'
                  />
                </button>
              </Tooltip>
            </div>
            {renderGoogleBooksStatus()}
          </div>

          {/* Open Library Connection */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-900">Open Library API</h2>
                <Tooltip content="Visit Open Library API documentation">
                  <a 
                    href="https://openlibrary.org/developers/api" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                    </svg>
                  </a>
                </Tooltip>
              </div>
              <Tooltip content="Test Connection">
                <button
                  onClick={async () => {
                    try {
                      setOpenLibraryStatus('checking');
                      const response = await fetch('https://openlibrary.org/search.json?q=test&limit=1');
                      if (response.ok) {
                        setOpenLibraryStatus('connected');
                        sessionStorage.setItem('openLibraryStatus', 'connected');
                        toast.success('Open Library API connection is working!');
                      } else {
                        setOpenLibraryStatus('error');
                        sessionStorage.setItem('openLibraryStatus', 'error');
                        toast.error('Open Library API connection failed');
                      }
                    } catch (error) {
                      setOpenLibraryStatus('error');
                      sessionStorage.setItem('openLibraryStatus', 'error');
                      toast.error('Failed to test Open Library API connection');
                    }
                  }}
                  className="group p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                >
                  <LightningIcon size={ICON_CONTEXTS.SETTINGS.DEFAULT} weight={ICON_WEIGHTS.FILL} className="group-hover:animate-wiggle" />
                </button>
              </Tooltip>
            </div>
            {renderOpenLibraryStatus()}
          </div>

          {/* Audnexus API Connection */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-900">Audnexus API</h2>
                <Tooltip content="Visit Audnexus API documentation">
                  <a 
                    href="https://github.com/djdembeck/Audnexus" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                    </svg>
                  </a>
                </Tooltip>
                <Tooltip content="How we get audiobook data: We search Audible for book ASINs, then use Audnexus to get detailed audiobook metadata. No API key required.">
                  <div className="text-blue-600 cursor-help">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                </Tooltip>
              </div>
              <Tooltip content="Test Connection">
                <button
                  onClick={async () => {
                    try {
                      setAudnexusStatus('checking');
                      const response = await fetch('https://api.audnex.us/books/B073H9PF2D?region=us');
                      if (response.ok) {
                        setAudnexusStatus('connected');
                        sessionStorage.setItem('audnexusStatus', 'connected');
                        toast.success('Audnexus API connection is working!');
                      } else {
                        setAudnexusStatus('error');
                        sessionStorage.setItem('audnexusStatus', 'error');
                        toast.error('Audnexus API connection failed');
                      }
                    } catch (error) {
                      setAudnexusStatus('error');
                      sessionStorage.setItem('audnexusStatus', 'error');
                      toast.error('Failed to test Audnexus API connection');
                    }
                  }}
                  className="group p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                >
                  <LightningIcon size={ICON_CONTEXTS.SETTINGS.DEFAULT} weight={ICON_WEIGHTS.FILL} className="group-hover:animate-wiggle" />
                </button>
              </Tooltip>
            </div>
            {renderAudnexusStatus()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;