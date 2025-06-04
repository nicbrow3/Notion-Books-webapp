import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SearchProvider } from './contexts/SearchContext';
import { NotionSettingsProvider } from './contexts/NotionSettingsContext';

// Pages
import Landing from './pages/Landing';
import BookReview from './pages/BookReview';
import Settings from './pages/Settings';
import Notion from './pages/Notion';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <NotionSettingsProvider>
        <SearchProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Navbar />
              <main className="container mx-auto px-4 py-8">
                <Routes>
                  <Route path="/" element={<Landing />} />
                  
                  {/* Protected Routes */}
                  <Route path="/notion" element={<Notion />} />
                  <Route path="/book-review/:sessionId" element={
                    <ProtectedRoute>
                      <BookReview />
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </main>
              
              {/* Toast notifications */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    style: {
                      background: '#10B981',
                    },
                  },
                  error: {
                    duration: 5000,
                    style: {
                      background: '#EF4444',
                    },
                  },
                }}
              />
            </div>
          </Router>
        </SearchProvider>
      </NotionSettingsProvider>
    </AuthProvider>
  );
}

export default App; 