import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { NotionService } from '../services/notionService';

interface NotionAuthProps {
  onAuthChange?: (authenticated: boolean, user?: any) => void;
}

const NotionAuth: React.FC<NotionAuthProps> = ({ onAuthChange }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const onAuthChangeRef = useRef(onAuthChange);

  // Keep the ref updated with the latest callback
  useEffect(() => {
    onAuthChangeRef.current = onAuthChange;
  }, [onAuthChange]);

  const checkAuthStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const authStatus = await NotionService.checkAuth();
      setIsAuthenticated(authStatus.authenticated);
      setUser(authStatus.user);
      
      if (onAuthChangeRef.current) {
        onAuthChangeRef.current(authStatus.authenticated, authStatus.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      toast.error('Failed to check Notion authentication status');
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies to prevent infinite loop

  useEffect(() => {
    checkAuthStatus();
  }, []); // Only run once on mount

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      toast.loading('Connecting to Notion...', { id: 'notion-auth' });
      
      const result = await NotionService.setupIntegration();
      
      if (result.success) {
        toast.success(result.message, { id: 'notion-auth' });
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
      setIsAuthenticated(false);
      setUser(null);
      
      if (onAuthChange) {
        onAuthChange(false);
      }
      
      toast.success('Disconnected from Notion');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Failed to disconnect from Notion');
    }
  };

  const testConnection = async () => {
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
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-600">Checking Notion connection...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933l3.222-.187z"/>
                </svg>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Connected to Notion</h3>
              <p className="text-sm text-gray-600">
                Workspace: {user.workspace_name || 'Unknown'}
              </p>
              <p className="text-xs text-gray-500">
                User: {user.owner?.name || user.name || 'Unknown'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={testConnection}
              className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            >
              Test Connection
            </button>
            <button
              onClick={handleDisconnect}
              className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-green-800 text-sm">
              Ready to add books to your Notion database!
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933l3.222-.187z"/>
          </svg>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect to Notion</h3>
        <p className="text-gray-600 mb-6">
          Connect to your personal Notion workspace to start adding books to your database.
        </p>

        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className={`w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white ${
            isConnecting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500'
          }`}
        >
          {isConnecting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933l3.222-.187z"/>
              </svg>
              Connect to Notion
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 mt-4">
          Make sure you have configured your Notion integration token in the backend.
        </p>
      </div>
    </div>
  );
};

export default NotionAuth; 