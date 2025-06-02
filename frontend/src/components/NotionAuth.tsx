import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface NotionAuthProps {
  onAuthChange?: (authenticated: boolean, user?: any) => void;
}

const NotionAuth: React.FC<NotionAuthProps> = ({ onAuthChange }) => {
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading, login, logout } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Notify parent component of auth changes
  React.useEffect(() => {
    if (onAuthChange) {
      onAuthChange(isAuthenticated, user);
    }
  }, [isAuthenticated, user, onAuthChange]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setIsTransitioning(true);

    try {
      toast.loading('Connecting to Notion...', { id: 'notion-auth' });
      const result = await login();

      if (result.success) {
        if (result.isFirstTime) {
          toast.success('Connected! You can now search and add books. Configure settings as needed using the gear icon.', { id: 'notion-auth' });
        } else {
          toast.success(result.message, { id: 'notion-auth' });
        }
        setTimeout(() => setIsTransitioning(false), 50);
      } else {
        toast.error(result.message, { id: 'notion-auth' });
        setTimeout(() => setIsTransitioning(false), 50);
      }
    } catch (error) {
      console.error('Connection failed:', error);
      toast.error('Failed to connect to Notion', { id: 'notion-auth' });
      setTimeout(() => setIsTransitioning(false), 50);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsTransitioning(true);

    try {
      await logout();
      toast.success('Disconnected from Notion');
      setTimeout(() => setIsTransitioning(false), 50); 
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Failed to disconnect from Notion');
      setTimeout(() => setIsTransitioning(false), 50);
    }
  };

  const testConnection = async () => {
    try {
      // We'll use the existing API endpoint through NotionService
      const { NotionService } = await import('../services/notionService');
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
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 transition-all duration-500 ease-in-out">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-600">Checking Notion connection...</span>
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">
          Looking for configured integration token...
        </p>
      </div>
    );
  }

  // Single morphing container
  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 transform transition-all duration-500 ease-out
      ${isAuthenticated ? 'p-6' : 'p-8'} // Dynamic padding
      ${isTransitioning 
        ? isAuthenticated // Target state is "connected"
          ? 'opacity-0 translate-x-12 -translate-y-12 scale-75' // Connected view STARTS here (small, up-right)
          : 'opacity-0 -translate-x-12 translate-y-12 scale-90'   // Disconnected view STARTS here (medium, down-left)
        : 'opacity-100 translate-x-0 translate-y-0 scale-100'   // Stable state: centered, full size
      }
    `}>
      {/* Inner container for layout and content opacity transition */}
      <div className={`transition-opacity duration-300 ease-out 
        ${isAuthenticated ? 'flex items-center justify-between' : 'text-center'}
        ${isTransitioning ? 'opacity-0' : 'opacity-100 delay-150'} // Content fades in after container starts settling
      `}>
        
        {/* Left side content - Icon and text (simplified transitions) */}
        <div className={`${isAuthenticated ? 'flex items-center space-x-4' : 'mb-6'}`}>
          
          {/* Icon (simpler style changes, subtle transition) */}
          <div className={`${isAuthenticated ? 'flex-shrink-0' : 'mx-auto mb-4'}`}>
            <div className={`rounded-lg flex items-center justify-center transition-all duration-300 ease-out
              ${isAuthenticated 
                ? 'w-12 h-12 bg-black border-2 border-green-500' 
                : 'w-16 h-16 bg-gray-100'}
              ${isTransitioning ? 'scale-90' : 'scale-100'} // Slight scale effect on icon during transition
            `}>
              <svg className={`transition-all duration-300 ease-out
                ${isAuthenticated ? 'w-6 h-6 text-white' : 'w-8 h-8 text-gray-400'}
              `} viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933l3.222-.187z"/>
              </svg>
            </div>
          </div>
          
          {/* Text content (no extra transitions, relies on parent opacity) */}
          <div>
            {isAuthenticated ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Connected to Notion</h3>
                <p className="text-sm text-gray-600">
                  Workspace: {user?.workspace_name || 'Unknown'}
                </p>
                <p className="text-xs text-gray-500">
                  User: {user?.owner?.name || user?.name || 'Unknown'}
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Connect to Notion
                </h3>
                <p className="text-gray-600 mb-6">
                  Connect to your personal Notion workspace to start adding books to your database.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right side content - Buttons or Connect Button + Help text (simplified transitions) */}
        <div className={`${isAuthenticated ? 'flex items-center space-x-2 ml-4' : 'w-full'}`}>
          {isAuthenticated ? (
            <>
              {/* Settings Button */}
              <div className="relative group">
                <button
                  onClick={() => navigate('/settings')}
                  className="p-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.50 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 pointer-events-none whitespace-nowrap z-10">
                  Settings
                </div>
              </div>
              
              {/* Test Connection Button */}
              <div className="relative group">
                <button
                  onClick={testConnection}
                  className="p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </button>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 pointer-events-none whitespace-nowrap z-10">
                  Test Connection
                </div>
              </div>
              
              {/* Disconnect Button */}
              <div className="relative group">
                <button
                  onClick={handleDisconnect}
                  className="p-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 pointer-events-none whitespace-nowrap z-10">
                  Disconnect
                </div>
              </div>
            </>
          ) :
            // Disconnected state: Connect Button and Help Text
            <div className="space-y-4"> 
              <button
                onClick={handleConnect}
                disabled={isConnecting || isTransitioning} 
                className={`w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white transition-all duration-300 ease-in-out transform
                  ${isConnecting ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 hover:scale-105'}
                  ${isTransitioning ? 'opacity-50' : 'opacity-100'} // Slight fade on button if container is already handling major opacity
                `}
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
                  'Connect to Notion'
                )}
              </button>

              <div className="text-center text-sm text-gray-500">
                <p>Make sure you have:</p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>• A Notion integration token in your environment variables</li>
                  <li>• The integration added to your Notion workspace</li>
                  <li>• A database shared with the integration</li>
                </ul>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  );
};

export default NotionAuth; 