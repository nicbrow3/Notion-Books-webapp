# Notion Books Web App

A web application that fetches book information from Google Books API and Open Library API, presents the data to users for approval/editing, then creates or updates pages in their Notion database. Now includes comprehensive audiobook integration via Audnexus.

## Features

- **Dual API Integration**: Primary Google Books API with Open Library fallback
- **Audiobook Integration**: Comprehensive audiobook search and metadata via Audnexus
  - Uses Audible's search API (like Audnexus.bundle Plex agent) for better discovery
  - Interactive audiobook selection modal for multiple matches
  - Rich audiobook metadata including narrators, duration, chapters, and ratings
- **User Approval Workflow**: Review and edit book data before adding to Notion
- **Notion OAuth Integration**: Secure authentication with Notion workspaces
- **Field Mapping**: Customize how book data maps to your Notion database properties
- **Category Management**: Smart category processing with mapping and filtering
- **Session Management**: Temporary storage for book editing sessions
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS

## Tech Stack

### Backend
- **Node.js** with Express
- **PostgreSQL** for data storage
- **Notion API** for workspace integration
- **Google Books API** for primary book data
- **Open Library API** for fallback book data
- **Audnexus API** for audiobook metadata
- **Audible Search API** for audiobook discovery

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

## Docker Deployment

This project is automatically built and deployed as a Docker container using GitHub Actions.

### Container Registry

The Docker image is automatically built and pushed to GitHub Container Registry when code is pushed to the main branch.

**Docker Image**: `ghcr.io/nicbrow3/notion-books-webapp:latest`

### Running Locally with Docker

```bash
# Build the image
docker build -t notion-books-app .

# Run the container
docker run -p 8080:3001 notion-books-app
```

Visit `http://localhost:8080` to view the app.

### Docker Compose (Local Development)

For local development with a PostgreSQL database:

```bash
# Start the application with database
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

This will start:
- The application on `http://localhost:8080`
- PostgreSQL database on `localhost:5432`

**Note**: Make sure to create a `.env` file in the `backend/` directory with your API keys and configuration before running docker-compose.

### Unraid Deployment

1. In Unraid, go to Docker tab and click "Add Container"
2. Set these values:
   - **Name**: `notion-books-app` (or your preferred name)
   - **Repository**: `ghcr.io/nicbrow3/notion-books-webapp:latest` 
   - **Network Type**: `bridge`
   - **Port**: `8080:3001` (or your preferred external port)
   - **WebUI**: `http://[IP]:[PORT:8080]`

3. Click "Apply" to create and start the container

### Updating

When you push changes to the main branch:
1. GitHub Actions automatically builds a new Docker image
2. In Unraid, click the container and select "Update Container" to pull the latest version
3. The container will restart with your latest changes

### Making the Container Registry Public

By default, the GitHub Container Registry package is private. To make it publicly accessible:

1. Go to your GitHub repository
2. Click on "Packages" (right sidebar)
3. Click on your package name
4. Go to "Package settings"
5. Scroll down to "Danger Zone" and click "Change visibility"
6. Select "Public"

This allows Unraid to pull the image without authentication.

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

### Audiobook Features

The app automatically integrates with Audnexus for audiobook data:
- **No additional API keys required** - Uses public Audnexus API
- **Audible Search Integration** - Uses Audible's search API for better book discovery
- **Automatic Enrichment** - Audiobook data is automatically fetched for all books
- **User Selection** - Interactive modal for choosing from multiple audiobook matches

## Project Structure

```
notion-books-webapp/
├── backend/
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic services
│   │   │   └── audiobookService.js  # Audnexus integration
│   │   ├── config/          # Database schema and config
│   │   └── server.js        # Express server setup
│   ├── package.json
│   └── env.example
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   │   ├── BookDetailsModal.tsx     # Main book review interface
│   │   │   └── AudiobookSelectionModal.tsx  # Audiobook selection interface
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API service functions
│   │   └── types/           # TypeScript type definitions
│   ├── package.json
│   └── tailwind.config.js
├── package.json             # Root package.json for scripts
└── README.md
```

## Audiobook Integration

### How It Works

The app uses a sophisticated audiobook discovery system inspired by the Audnexus.bundle Plex agent:

1. **Audible Search**: Uses Audible's search API to find potential ASINs for books
2. **Audnexus Lookup**: Retrieves detailed audiobook metadata from Audnexus using discovered ASINs
3. **Fallback Methods**: Falls back to author search and other strategies if direct search fails
4. **User Selection**: Presents multiple matches in an interactive modal for user choice

### Features

- **Automatic Discovery**: Audiobook data is automatically searched for all books
- **Rich Metadata**: Includes narrators, duration, chapter count, ratings, and more
- **Multiple Sources**: Combines Audible search with Audnexus metadata
- **Smart Matching**: Uses sophisticated scoring algorithms to find the best matches
- **User Choice**: Interactive selection modal when multiple audiobooks are found
- **Fallback Support**: Graceful handling when audiobooks aren't available

### Audiobook Data Fields

When available, the following audiobook data is included:
- Title and ASIN
- Narrators
- Total duration (hours, minutes, milliseconds)
- Chapter count
- Publisher (audio)
- Rating and review count
- Release date
- Genres
- Description/summary

## Development Workflow

### Phase 1: MVP ✅
- [x] Project structure setup
- [x] Database schema
- [x] Basic API routes
- [x] Frontend foundation
- [x] Notion OAuth implementation
- [x] Book search functionality
- [x] Basic book review interface
- [x] Audiobook integration

### Phase 2: Enhanced Features ✅
- [x] Open Library API integration
- [x] Data merging logic
- [x] Field mapping interface
- [x] Category management system
- [x] Audiobook selection interface
- [x] Error handling improvements

### Phase 3: Advanced Features 🚧
- [ ] Custom field mapping enhancements
- [ ] Advanced duplicate detection
- [ ] Export functionality
- [ ] Advanced search filters
- [ ] Batch processing improvements

## API Endpoints

### Authentication
- `POST /auth/notion` - Initiate Notion OAuth
- `GET /auth/callback` - Handle OAuth callback
- `GET /auth/status` - Check authentication status
- `POST /auth/logout` - Logout user

### Books
- `GET /api/books/search` - Search books
- `GET /api/books/search/:query` - Enhanced book search with audiobooks
- `POST /api/books/session` - Create book session
- `GET /api/books/session/:id` - Get book session
- `PUT /api/books/session/:id` - Update book session
- `GET /api/books/editions/:workId` - Get book editions and categories

### Audiobooks
- `GET /api/audiobooks/search` - Search for audiobooks by title and author
- `GET /api/audiobooks/:asin` - Get specific audiobook by ASIN
- `POST /api/audiobooks/enrich` - Enrich book data with audiobook information

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