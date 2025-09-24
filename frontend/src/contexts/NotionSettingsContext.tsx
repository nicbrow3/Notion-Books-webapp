import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { NotionService } from '../services/notionService';
import { NotionDatabase, NotionIntegrationSettings, BookToNotionMapping } from '../types/notion';

type DatabaseWithSources = NotionDatabase & {
  data_sources?: Array<{ id: string; name?: string; properties?: any; database_id?: string }>;
  is_data_source?: boolean;
};

interface NotionSettingsContextType {
  databases: DatabaseWithSources[];
  selectedDatabase: string;
  databaseProperties: any;
  notionSettings: NotionIntegrationSettings | null;
  fieldMappings: Omit<BookToNotionMapping, 'pageIcon'>;
  usePageIcon: boolean;
  useEnglishOnlySources: boolean;
  isLoadingDatabases: boolean;
  isLoadingProperties: boolean;
  isSavingSettings: boolean;
  loadDatabases: () => Promise<void>;
  loadSettings: () => Promise<void>;
  loadDatabaseProperties: (databaseId: string) => Promise<void>;
  saveSettings: (settings: NotionIntegrationSettings) => Promise<void>;
  setSelectedDatabase: (databaseId: string) => void;
  setFieldMappings: React.Dispatch<React.SetStateAction<Omit<BookToNotionMapping, 'pageIcon'>>>;
  setUsePageIcon: React.Dispatch<React.SetStateAction<boolean>>;
  setUseEnglishOnlySources: React.Dispatch<React.SetStateAction<boolean>>;
  resetState: () => void;
}

const NotionSettingsContext = createContext<NotionSettingsContextType | undefined>(undefined);

export const useNotionSettings = () => {
  const context = useContext(NotionSettingsContext);
  if (!context) {
    throw new Error('useNotionSettings must be used within a NotionSettingsProvider');
  }
  return context;
};

interface NotionSettingsProviderProps {
  children: ReactNode;
}

export const NotionSettingsProvider: React.FC<NotionSettingsProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  // Database and settings state
  const [databases, setDatabases] = useState<DatabaseWithSources[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [databaseProperties, setDatabaseProperties] = useState<any>(null);
  const [notionSettings, setNotionSettings] = useState<NotionIntegrationSettings | null>(null);

  // Field mapping state
  const [fieldMappings, setFieldMappings] = useState<Omit<BookToNotionMapping, 'pageIcon'>>({
    title: '',
    authors: '',
    description: '',
    isbn: '',
    releaseDate: '',
    publisher: '',
    pageCount: '',
    categories: '',
    rating: '',
    thumbnail: '',
    status: '',
    notes: '',
    // Audiobook-specific fields
    audiobookPublisher: '',
    audiobookChapters: '',
    audiobookASIN: '',
    audiobookNarrators: '',
    audiobookDuration: '',
    audiobookURL: '',
    audiobookRating: '',
  });

  // Settings
  const [usePageIcon, setUsePageIcon] = useState<boolean>(false);
  const [useEnglishOnlySources, setUseEnglishOnlySources] = useState<boolean>(true);

  // Loading states
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [hasLoadedDatabases, setHasLoadedDatabases] = useState(false);

  // Prevent multiple simultaneous operations
  const loadingSettingsRef = useRef(false);
  const loadingDatabasesRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const savedDatabaseIdRef = useRef<string | null>(null);

  const resetState = () => {
    setDatabases([]);
    setSelectedDatabase('');
    setDatabaseProperties(null);
    setNotionSettings(null);
    savedDatabaseIdRef.current = null;
    setHasLoadedDatabases(false);
    setFieldMappings({
      title: '',
      authors: '',
      description: '',
      isbn: '',
      releaseDate: '',
      publisher: '',
      pageCount: '',
      categories: '',
      rating: '',
      thumbnail: '',
      status: '',
      notes: '',
      audiobookPublisher: '',
      audiobookChapters: '',
      audiobookASIN: '',
      audiobookNarrators: '',
      audiobookDuration: '',
      audiobookURL: '',
      audiobookRating: '',
    });
    setUsePageIcon(false);
    setUseEnglishOnlySources(true);
  };
  const loadDatabases = useCallback(async () => {
    if (loadingDatabasesRef.current) {
      console.log('🔧 NotionSettingsContext: Database loading already in progress, skipping...');
      return;
    }

    try {
      loadingDatabasesRef.current = true;
      setIsLoadingDatabases(true);
      setHasLoadedDatabases(false);
      console.log('🔧 NotionSettingsContext: 🔍 Loading databases...');
      
      const databaseList = await NotionService.getDatabases();
      console.log('🔧 NotionSettingsContext: 📊 Received databases:', databaseList);
      const extendedDatabaseList = databaseList as DatabaseWithSources[];
      setDatabases(extendedDatabaseList);

      if (extendedDatabaseList.length === 0) {
        console.log('🔧 NotionSettingsContext: ⚠️ No databases found');
        toast('No databases found. Make sure you have shared at least one database with this integration.', {
          icon: 'ℹ️',
          duration: 5000,
        });
      } else {
        console.log(`🔧 NotionSettingsContext: ✅ Found ${extendedDatabaseList.length} databases`);
        toast.success(`Found ${extendedDatabaseList.length} database${extendedDatabaseList.length === 1 ? '' : 's'}`);
      }

      const savedDatabaseId = savedDatabaseIdRef.current;
      if (savedDatabaseId) {
        const hasExactMatch = extendedDatabaseList.some((db) => db.id === savedDatabaseId);

        if (!hasExactMatch) {
          const legacyMatch = extendedDatabaseList.find((db) =>
            Array.isArray(db.data_sources) && db.data_sources.some((ds) => ds.id === savedDatabaseId)
          );

          if (legacyMatch) {
            const newDatabaseId = legacyMatch.id;
            console.log('🔧 NotionSettingsContext: Migrating legacy data source ID to database ID', {
              legacyId: savedDatabaseId,
              newDatabaseId,
            });

            savedDatabaseIdRef.current = newDatabaseId;
            setSelectedDatabase(newDatabaseId);

            try {
              const existingSettings = notionSettings || await NotionService.getSettings();
              if (existingSettings) {
                const updatedSettings: NotionIntegrationSettings = {
                  ...existingSettings,
                  databaseId: newDatabaseId,
                };
                setNotionSettings(updatedSettings);
                await NotionService.saveSettings(updatedSettings);
              }
            } catch (migrationError) {
              console.warn('🔧 NotionSettingsContext: Failed to persist migrated database ID', migrationError);
            }
          } else {
            console.warn('🔧 NotionSettingsContext: Saved database ID not found in available databases', savedDatabaseId);
          }
        }
      }
    } catch (error) {
      console.error('🔧 NotionSettingsContext: ❌ Failed to load databases:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to load Notion databases: ${errorMessage}`);
    } finally {
      setIsLoadingDatabases(false);
      loadingDatabasesRef.current = false;
      setHasLoadedDatabases(true);
    }
  }, [notionSettings]);

  const loadDatabaseProperties = useCallback(async (databaseId: string) => {
    if (!databaseId || !isAuthenticated) return;

    try {
      setIsLoadingProperties(true);
      console.log('🔧 NotionSettingsContext: Loading database properties for:', databaseId);
      const properties = await NotionService.getDatabaseProperties(databaseId);
      setDatabaseProperties(properties);
      console.log('🔧 NotionSettingsContext: Database properties loaded');
    } catch (error) {
      console.error('🔧 NotionSettingsContext: Failed to load database properties:', error);
      toast.error('Failed to load database properties');
    } finally {
      setIsLoadingProperties(false);
    }
  }, [isAuthenticated]);

  // Load database properties when database is selected and available
  useEffect(() => {
    if (!selectedDatabase) {
      setDatabaseProperties(null);
      savedDatabaseIdRef.current = null;
      return;
    }

    if (!hasLoadedDatabases) {
      return;
    }

    const databaseExists = databases.some((db) => {
      if (db.id === selectedDatabase) return true;
      return Array.isArray(db.data_sources) && db.data_sources.some((ds) => ds.id === selectedDatabase);
    });

    if (!databaseExists) {
      console.warn('🔧 NotionSettingsContext: Selected database no longer available:', selectedDatabase);
      setSelectedDatabase('');
      setDatabaseProperties(null);
      savedDatabaseIdRef.current = null;
      return;
    }

    savedDatabaseIdRef.current = selectedDatabase;

    if (isAuthenticated) {
      loadDatabaseProperties(selectedDatabase);
    }
  }, [selectedDatabase, databases, isAuthenticated, loadDatabaseProperties, hasLoadedDatabases]);

  useEffect(() => {
    if (!selectedDatabase) {
      savedDatabaseIdRef.current = null;
    }
  }, [selectedDatabase]);

  const loadSettings = useCallback(async () => {
    if (loadingSettingsRef.current) {
      console.log('🔧 NotionSettingsContext: Settings loading already in progress, skipping...');
      return;
    }

    try {
      loadingSettingsRef.current = true;
      console.log('🔧 NotionSettingsContext: 🔧 Loading settings...');
      const settings = await NotionService.getSettings();
      console.log('🔧 NotionSettingsContext: ✅ Settings loaded:', settings);
      savedDatabaseIdRef.current = settings?.databaseId || null;
      
      if (settings) {
        setNotionSettings(settings);
        setSelectedDatabase(settings.databaseId || '');
        const { pageIcon, ...rawMappings } = settings.fieldMapping || {};
        
        // Migration: consolidate old date fields to releaseDate
        let releaseDate = '';
        if (rawMappings.releaseDate) {
          releaseDate = rawMappings.releaseDate;
        } else if ((rawMappings as any).publishedDate) {
          releaseDate = (rawMappings as any).publishedDate;
        } else if ((rawMappings as any).originalPublishedDate) {
          releaseDate = (rawMappings as any).originalPublishedDate;
        }
        
        // Filter out old date field names and create new mapping object
        const { publishedDate: _, originalPublishedDate: __, ...cleanMappings } = rawMappings as any;
        
        const defaultMappings = {
          title: '',
          authors: '',
          description: '',
          isbn: '',
          releaseDate: '',
          publisher: '',
          pageCount: '',
          categories: '',
          rating: '',
          thumbnail: '',
          status: '',
          notes: '',
          audiobookPublisher: '',
          audiobookChapters: '',
          audiobookASIN: '',
          audiobookNarrators: '',
          audiobookDuration: '',
          audiobookURL: '',
          audiobookRating: '',
        };
        
        setFieldMappings({
          ...defaultMappings,
          ...cleanMappings,
          releaseDate
        });
        setUsePageIcon(pageIcon || false);
        setUseEnglishOnlySources(settings.useEnglishOnlySources ?? true); // Default to true
      }
    } catch (error) {
      console.error('🔧 NotionSettingsContext: ❌ Failed to load settings:', error);
      // Don't show error toast for missing settings - it's expected for new users
    } finally {
      loadingSettingsRef.current = false;
    }
  }, []);

  // Initialize data when authenticated
  useEffect(() => {
    if (isAuthenticated && !hasInitializedRef.current) {
      console.log('🔧 NotionSettingsContext: First initialization');
      loadSettings();
      loadDatabases();
      hasInitializedRef.current = true;
    } else if (!isAuthenticated) {
      console.log('🔧 NotionSettingsContext: Not authenticated, resetting state');
      resetState();
      hasInitializedRef.current = false;
    }
  }, [isAuthenticated, loadSettings, loadDatabases]);

  const saveSettings = async (settings: NotionIntegrationSettings) => {
    if (!settings.databaseId) {
      toast.error('Please select a database first');
      return;
    }

    try {
      setIsSavingSettings(true);
      console.log('🔧 NotionSettingsContext: 💾 Saving settings');
      
      await NotionService.saveSettings(settings);
      setNotionSettings(settings);
      // Keep individual context slices in sync with saved settings immediately
      // so that the UI doesn't show false unsaved changes and other parts
      // of the app get updated values without requiring a reload.
      try {
        setSelectedDatabase(settings.databaseId || '');
        const { pageIcon, ...rawMappings } = settings.fieldMapping || {};

        // Migration: consolidate old date fields to releaseDate
        let releaseDate = '';
        if ((rawMappings as any)?.releaseDate) {
          releaseDate = (rawMappings as any).releaseDate;
        } else if ((rawMappings as any)?.publishedDate) {
          releaseDate = (rawMappings as any).publishedDate;
        } else if ((rawMappings as any)?.originalPublishedDate) {
          releaseDate = (rawMappings as any).originalPublishedDate;
        }

        // Filter out old date field names and create new mapping object
        const { publishedDate: _pd, originalPublishedDate: _opd, ...cleanMappings } = (rawMappings as any) || {};

        const defaultMappings = {
          title: '',
          authors: '',
          description: '',
          isbn: '',
          releaseDate: '',
          publisher: '',
          pageCount: '',
          categories: '',
          rating: '',
          thumbnail: '',
          status: '',
          notes: '',
          audiobookPublisher: '',
          audiobookChapters: '',
          audiobookASIN: '',
          audiobookNarrators: '',
          audiobookDuration: '',
          audiobookURL: '',
          audiobookRating: '',
        };

        setFieldMappings({
          ...defaultMappings,
          ...cleanMappings,
          releaseDate,
        });
        setUsePageIcon(pageIcon || false);
        setUseEnglishOnlySources(settings.useEnglishOnlySources ?? true);
      } catch (syncError) {
        console.warn('🔧 NotionSettingsContext: Non-fatal: failed to sync derived state after save:', syncError);
      }
      
      const mappingCount = Object.values(settings.fieldMapping || {}).filter(Boolean).length;
      toast.success(`Settings saved! ${mappingCount} field mappings configured.`);
      console.log('🔧 NotionSettingsContext: ✅ Settings saved successfully');
    } catch (error) {
      console.error('🔧 NotionSettingsContext: Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <NotionSettingsContext.Provider value={{
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
      loadSettings,
      loadDatabaseProperties,
      saveSettings,
      setSelectedDatabase,
      setFieldMappings,
      setUsePageIcon,
      setUseEnglishOnlySources,
      resetState
    }}>
      {children}
    </NotionSettingsContext.Provider>
  );
};
