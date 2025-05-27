# Notion Books Web App

A web application that fetches book information from Google Books API and Open Library API, presents the data to users for approval/editing, then creates or updates pages in their Notion database.

## Features

- **Dual API Integration**: Primary Google Books API with Open Library fallback
- **User Approval Workflow**: Review and edit book data before adding to Notion
- **Notion OAuth Integration**: Secure authentication with Notion workspaces
- **Field Mapping**: Customize how book data maps to your Notion database properties
- **Session Management**: Temporary storage for book editing sessions
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS

## Tech Stack

### Backend
- **Node.js** with Express
- **PostgreSQL** for data storage
- **Notion API** for workspace integration
- **Google Books API** for primary book data
- **Open Library API** for fallback book data

### Frontend
- **React 18** with TypeScript
- **React Router** for navigation
- **Tailwind CSS** for styling
- **React Hook Form** for form management
- **Axios** for API calls

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Notion integration credentials
- Google Books API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd notion-books-webapp
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   
   Copy the example environment file:
   ```bash
   cp backend/env.example backend/.env
   ```
   
   Fill in your configuration:
   ```env
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/notion_books_db
   
   # Notion API
   NOTION_CLIENT_ID=your_notion_client_id
   NOTION_CLIENT_SECRET=your_notion_client_secret
   NOTION_REDIRECT_URI=http://localhost:3000/auth/callback
   
   # Google Books API
   GOOGLE_BOOKS_API_KEY=your_google_books_api_key
   
   # Session Secret
   SESSION_SECRET=your_super_secret_session_key
   ```

4. **Set up the database**
   
   Create a PostgreSQL database and run the schema:
   ```bash
   createdb notion_books_db
   psql notion_books_db < backend/src/config/database.sql
   ```

5. **Start the development servers**
   ```bash
   npm run dev
   ```
   
   This will start:
   - Backend server on http://localhost:5000
   - Frontend server on http://localhost:3000

## API Configuration

### Notion Integration

1. Go to [Notion Developers](https://developers.notion.com/)
2. Create a new integration
3. Copy the Client ID and Client Secret
4. Set the redirect URI to `http://localhost:3000/auth/callback`

### Google Books API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Books API
3. Create credentials (API Key)
4. Copy the API key to your environment variables

## Project Structure

```
notion-books-webapp/
├── backend/
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── config/          # Database schema and config
│   │   └── server.js        # Express server setup
│   ├── package.json
│   └── env.example
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API service functions
│   │   └── types/           # TypeScript type definitions
│   ├── package.json
│   └── tailwind.config.js
├── package.json             # Root package.json for scripts
└── README.md
```

## Development Workflow

### Phase 1: MVP (Current)
- [x] Project structure setup
- [x] Database schema
- [x] Basic API routes
- [x] Frontend foundation
- [ ] Notion OAuth implementation
- [ ] Book search functionality
- [ ] Basic book review interface

### Phase 2: Enhanced Features
- [ ] Open Library API integration
- [ ] Data merging logic
- [ ] Field mapping interface
- [ ] Batch processing
- [ ] Error handling improvements

### Phase 3: Advanced Features
- [ ] Custom field mapping
- [ ] Duplicate detection
- [ ] Export functionality
- [ ] Advanced search filters

## API Endpoints

### Authentication
- `POST /auth/notion` - Initiate Notion OAuth
- `GET /auth/callback` - Handle OAuth callback
- `GET /auth/status` - Check authentication status
- `POST /auth/logout` - Logout user

### Books
- `GET /api/books/search` - Search books
- `POST /api/books/session` - Create book session
- `GET /api/books/session/:id` - Get book session
- `PUT /api/books/session/:id` - Update book session

### Notion
- `GET /api/notion/databases` - List user databases
- `GET /api/notion/database/:id/properties` - Get database schema
- `POST /api/notion/pages` - Create Notion page
- `POST /api/notion/pages/book` - Create book page with formatting

### User
- `GET /api/user/settings` - Get user settings
- `PUT /api/user/settings` - Update user settings
- `GET /api/user/stats` - Get user statistics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details 