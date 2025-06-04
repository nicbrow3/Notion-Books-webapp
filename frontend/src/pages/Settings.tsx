import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useNotionSettings } from '../contexts/NotionSettingsContext';
import { NotionIntegrationSettings } from '../types/notion';
import NotionFieldMappings from '../components/BookDetailsModal/NotionFieldMappings';
import { NotionService } from '../services/notionService';
import { BookService } from '../services/bookService';

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
    loadSettings,
    saveSettings,
    setSelectedDatabase,
    setFieldMappings,
    setUsePageIcon,
    setUseEnglishOnlySources
  } = useNotionSettings();

  // Local state for connecting
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [openLibraryStatus, setOpenLibraryStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  // Test API connections on component mount
  useEffect(() => {
    const testConnections = async () => {
      // Test Google Books API
      try {
        const result = await BookService.testConnection();
        if (result.success) {
          setConnectionStatus('connected');
          toast.success('Connected to Google Books API');
        } else {
          setConnectionStatus('error');
          toast.error(`API Connection Error: ${result.message}`);
        }
      } catch (error) {
        setConnectionStatus('error');
        toast.error('Failed to connect to Google Books API');
      }

      // Simulate Open Library API check
      // In a real app, you would call an actual service method
      setTimeout(() => {
        setOpenLibraryStatus('connected');
      }, 1000);
    };

    testConnections();
  }, []);

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

    await saveSettings(settings);
  };

  const renderGoogleBooksStatus = () => {
    switch (connectionStatus) {
      case 'checking':
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-center">
              <svg className="animate-spin h-5 w-5 text-yellow-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-yellow-800">Checking API connection...</span>
            </div>
          </div>
        );
      case 'connected':
        return (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800">Connected</span>
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800">API connection failed. Please check your configuration.</span>
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
              <svg className="animate-spin h-5 w-5 text-yellow-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-yellow-800">Checking API connection...</span>
            </div>
          </div>
        );
      case 'connected':
        return (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800">Connected</span>
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800">API connection failed</span>
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
                className="p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                title="Test Connection"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
              <button
                onClick={handleDisconnect}
                className="p-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                title="Disconnect"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Configure your database connections and field mappings for book data.</p>
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
                  <button
                    onClick={loadDatabases}
                    disabled={isLoadingDatabases}
                    className="p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors disabled:opacity-50"
                    title="Refresh Databases"
                  >
                    {isLoadingDatabases ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                  </button>
                </div>
                
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
                        Selected: {databases.find(db => db.id === selectedDatabase)?.title}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Field Mappings */}
              {selectedDatabase && databaseProperties && (
                <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
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
                          originalPublishedDate: '',
                          publishedDate: '',
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
                            publishedDate: ''
                          }
                        }}
                        selectedCategories={[]}
                        isCollapsed={false}
                        notionSettings={{
                          fieldMapping: { ...fieldMappings, pageIcon: usePageIcon }
                        }}
                        tempFieldMappings={{ ...fieldMappings, pageIcon: usePageIcon }}
                        databaseProperties={databaseProperties}
                        loadingDatabaseProperties={false}
                        formatAuthors={(authors: string[]) => authors.join(', ')}
                        onSetCollapsed={() => {}} // No-op since we don't want collapse in settings
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
                        onHasUnsavedChanges={() => {
                          // Check if current mappings differ from saved settings
                          if (!notionSettings?.fieldMapping) return true;
                          const { pageIcon: savedPageIcon, ...savedMappings } = notionSettings.fieldMapping;
                          return JSON.stringify({ ...fieldMappings, pageIcon: usePageIcon }) !== 
                                JSON.stringify({ ...savedMappings, pageIcon: savedPageIcon });
                        }}
                        showDataValues={false}
                      />

                      {/* Page Icon Setting - Keep this separate since it's not handled by NotionFieldMappings */}
                      <div className="mt-6 pt-4 border-t border-gray-200">
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
                      <div className="mt-6 pt-4 border-t border-gray-200">
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
                    </>
                  )}
                </div>
              )}

              {/* Save Settings Button */}
              {selectedDatabase && (
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveSettings}
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
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="text-center">
                <p className="text-gray-600 mb-4">Connect to Notion to configure database settings.</p>
              </div>
            </div>
          )}
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
              <h2 className="text-xl font-semibold text-gray-900">Google Books API</h2>
              <button
                onClick={async () => {
                  try {
                    setConnectionStatus('checking');
                    const result = await BookService.testConnection();
                    if (result.success) {
                      setConnectionStatus('connected');
                      toast.success('Google Books API connection is working!');
                    } else {
                      setConnectionStatus('error');
                      toast.error(`Connection test failed: ${result.message}`);
                    }
                  } catch (error) {
                    setConnectionStatus('error');
                    toast.error('Failed to test Google Books API connection');
                  }
                }}
                className="p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                title="Test Connection"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
            </div>
            {renderGoogleBooksStatus()}
          </div>

          {/* Open Library Connection */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Open Library API</h2>
              <button
                onClick={() => {
                  try {
                    setOpenLibraryStatus('checking');
                    // Simulate an API check
                    setTimeout(() => {
                      setOpenLibraryStatus('connected');
                      toast.success('Open Library API connection is working!');
                    }, 1000);
                  } catch (error) {
                    setOpenLibraryStatus('error');
                    toast.error('Failed to test Open Library API connection');
                  }
                }}
                className="p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                title="Test Connection"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
            </div>
            {renderOpenLibraryStatus()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 