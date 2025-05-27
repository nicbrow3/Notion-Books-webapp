import React from 'react';
import { Link } from 'react-router-dom';

const Landing: React.FC = () => {
  return (
    <div className="text-center max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Welcome to Notion Books
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        Search and add books to your Notion database with ease using the Google Books API
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
        <Link
          to="/search"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          🔍 Start Searching Books
        </Link>
        <Link
          to="/notion"
          className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
        >
          📝 Connect to Notion
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">📚 Search Books</h3>
          <p className="text-gray-600">
            Search for books by title, author, ISBN, or general keywords using the Google Books API.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">✏️ Review & Edit</h3>
          <p className="text-gray-600">
            Review all book data including cover, description, categories, and ratings before adding.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">📝 Add to Notion</h3>
          <p className="text-gray-600">
            Seamlessly add approved books to your Notion database with all metadata.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Landing; 