import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { NotionService } from '../services/notionService';
import { NotionDatabase, NotionIntegrationSettings, BookToNotionMapping } from '../types/notion';

const Settings: React.FC = () => {
  // Authentication state
  const [isNotionConnected, setIsNotionConnected] = useState(false);
  const [notionUser, setNotionUser] = useState<any>(null);

  // Database and settings state
  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [databaseProperties, setDatabaseProperties] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [notionSettings, setNotionSettings] = useState<NotionIntegrationSettings | null>(null);

  // Field mapping state
  const [fieldMappings, setFieldMappings] = useState<Omit<BookToNotionMapping, 'pageIcon'>>({
    title: '',
    authors: '',
    description: '',
    isbn: '',
    publishedDate: '',
    originalPublishedDate: '',
    publisher: '',
    pageCount: '',
    categories: '',
    rating: '',
    thumbnail: '',
    status: '',
    notes: '',
  });

  // Page icon setting (separate from field mappings)
  const [usePageIcon, setUsePageIcon] = useState<boolean>(false);

  // Loading states
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Available book fields for mapping
  const bookFields = [
    { key: 'title', label: 'Title', description: 'Book title' },
    { key: 'authors', label: 'Authors', description: 'Book authors' },
    { key: 'description', label: 'Description', description: 'Book description/summary' },
    { key: 'isbn', label: 'ISBN', description: 'ISBN-13 or ISBN-10' },
    { key: 'publishedDate', label: 'Edition Published Date', description: 'Publication date of this specific edition' },
    { key: 'originalPublishedDate', label: 'Original Published Date', description: 'Original publication date (first edition)' },
    { key: 'publisher', label: 'Publisher', description: 'Publishing company' },
    { key: 'pageCount', label: 'Page Count', description: 'Number of pages' },
    { key: 'categories', label: 'Categories', description: 'Book genres/categories' },
    { key: 'rating', label: 'Rating', description: 'Average rating' },
    { key: 'thumbnail', label: 'Cover Image', description: 'Book cover image URL' },
    { key: 'pageIcon', label: 'Use Cover as Page Icon', description: 'Set the book cover image as the Notion page icon' },
    { key: 'status', label: 'Reading Status', description: 'Reading status (To Read, Reading, etc.)' },
    { key: 'notes', label: 'Notes', description: 'Personal notes about the book' },
  ];

  // Load initial data
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Load databases when authenticated
  useEffect(() => {
    if (isNotionConnected) {
      loadDatabases();
      loadSettings();
    }
  }, [isNotionConnected]);

  // Load database properties when database is selected
  useEffect(() => {
    if (selectedDatabase) {
      loadDatabaseProperties(selectedDatabase);
    }
  }, [selectedDatabase]);

  const checkAuthStatus = async () => {
    try {
      setIsLoadingAuth(true);
      const authStatus = await NotionService.checkAuth();
      setIsNotionConnected(authStatus.authenticated);
      setNotionUser(authStatus.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      toast.error('Failed to check Notion authentication status');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      toast.loading('Connecting to Notion...', { id: 'notion-auth' });
      
      const result = await NotionService.setupIntegration();
      
      if (result.success) {
        if (result.isFirstTime) {
          toast.success('Welcome! Let\'s configure your Notion integration.', { id: 'notion-auth' });
        } else {
          toast.success(result.message, { id: 'notion-auth' });
        }
        // Refresh auth status
        await checkAuthStatus();
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
      await NotionService.logout();
      setIsNotionConnected(false);
      setNotionUser(null);
      setDatabases([]);
      setSelectedDatabase('');
      setDatabaseProperties(null);
      setNotionSettings(null);
      
      toast.success('Disconnected from Notion');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Failed to disconnect from Notion');
    }
  };

  const loadDatabases = async () => {
    try {
      setIsLoadingDatabases(true);
      console.log('🔍 Attempting to load databases...');
      
      const databaseList = await NotionService.getDatabases();
      console.log('📊 Received databases:', databaseList);
      setDatabases(databaseList);
      
      if (databaseList.length === 0) {
        console.log('⚠️ No databases found');
        toast('No databases found. Make sure you have shared at least one database with this integration.', {
          icon: 'ℹ️',
          duration: 5000,
        });
      } else {
        console.log(`✅ Found ${databaseList.length} databases:`, databaseList.map(db => ({ id: db.id, title: db.title })));
        toast.success(`Found ${databaseList.length} database${databaseList.length === 1 ? '' : 's'}`);
      }
    } catch (error) {
      console.error('❌ Failed to load databases:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to load Notion databases: ${errorMessage}`);
    } finally {
      setIsLoadingDatabases(false);
    }
  };

  const loadDatabaseProperties = async (databaseId: string) => {
    try {
      setIsLoadingProperties(true);
      const properties = await NotionService.getDatabaseProperties(databaseId);
      setDatabaseProperties(properties);
    } catch (error) {
      console.error('Failed to load database properties:', error);
      toast.error('Failed to load database properties');
    } finally {
      setIsLoadingProperties(false);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await NotionService.getSettings();
      if (settings) {
        setNotionSettings(settings);
        setSelectedDatabase(settings.databaseId || '');
        const { pageIcon, ...mappings } = settings.fieldMapping || {};
        setFieldMappings(mappings || {
          title: '',
          authors: '',
          description: '',
          isbn: '',
          publishedDate: '',
          originalPublishedDate: '',
          publisher: '',
          pageCount: '',
          categories: '',
          rating: '',
          thumbnail: '',
          status: '',
          notes: '',
        });
        setUsePageIcon(pageIcon || false);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Don't show error toast for missing settings - it's expected for new users
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
        newMappings[googleField as keyof Omit<BookToNotionMapping, 'pageIcon'>] = mapping.notionProperty;
      }
    });

    setFieldMappings(newMappings);
    toast.success('Applied suggested field mappings');
  };

  const saveSettings = async () => {
    if (!selectedDatabase) {
      toast.error('Please select a database first');
      return;
    }

    try {
      setIsSavingSettings(true);

      const settings: NotionIntegrationSettings = {
        databaseId: selectedDatabase,
        fieldMapping: { ...fieldMappings, pageIcon: usePageIcon },
        defaultValues: {},
        autoAddBooks: false,
      };

      await NotionService.saveSettings(settings);
      setNotionSettings(settings);
      
      const mappingCount = Object.values(fieldMappings).filter(Boolean).length;
      toast.success(`Settings saved! ${mappingCount} field mappings configured.`);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>
      
      {/* Notion Connection Section */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Notion Integration</h2>
        
        {!isNotionConnected ? (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="h-6 w-6 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="text-lg font-medium text-yellow-800">Connect to Notion</h3>
                  <p className="text-yellow-700 mt-1">Connect your Notion account to configure database settings and field mappings.</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isConnecting ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </>
              ) : (
                <>
                  📝 Connect to Notion
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <span className="text-green-800 font-medium">Connected to Notion</span>
                    {notionUser?.workspace_name && (
                      <span className="text-green-600 ml-2">({notionUser.workspace_name})</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Disconnect
                </button>
              </div>
            </div>
            
            {/* Test Connection and Refresh Buttons */}
            <div className="flex space-x-2">
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
                className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                Test Connection
              </button>
              <button
                onClick={loadDatabases}
                className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
              >
                Refresh Databases
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Database Selection and Field Mappings - Only show when connected */}
      {isNotionConnected && (
        <>
          {/* Database Selection */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Database Selection</h2>
            
            {isLoadingDatabases ? (
              <div className="flex items-center py-4">
                <svg className="animate-spin h-5 w-5 text-blue-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-gray-600">Loading databases...</span>
              </div>
            ) : databases.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a database...</option>
                    {databases.map((db) => (
                      <option key={db.id} value={db.id}>
                        {db.title}
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedDatabase && (
                  <div className="text-sm text-gray-600">
                    Selected: {databases.find(db => db.id === selectedDatabase)?.title}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Field Mappings */}
          {selectedDatabase && databaseProperties && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Field Mappings</h2>
                {databaseProperties.suggestedMappings && (
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
                  <svg className="animate-spin h-5 w-5 text-blue-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-gray-600">Loading database properties...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookFields.map((field) => (
                    <div key={field.key} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {field.label}
                        </label>
                        <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                      </div>
                      
                      <div>
                        {field.key === 'pageIcon' ? (
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={usePageIcon}
                              onChange={(e) => setUsePageIcon(e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700">Use book cover as page icon</span>
                          </label>
                        ) : (
                          <select
                            value={fieldMappings[field.key as keyof typeof fieldMappings] || ''}
                            onChange={(e) => handleFieldMappingChange(field.key, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                          >
                            <option value="">Don't map</option>
                            {databaseProperties.properties?.map((prop: any) => (
                              <option key={prop.id} value={prop.name}>
                                {prop.name} ({prop.type})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save Settings Button */}
          {selectedDatabase && (
            <div className="flex justify-end">
              <button
                onClick={saveSettings}
                disabled={isSavingSettings}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSavingSettings ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Settings; 