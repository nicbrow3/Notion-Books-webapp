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

#### Method 1: Using Docker Hub/GitHub Container Registry

1. **Add Container in Unraid:**
   - Go to Docker tab in Unraid
   - Click "Add Container"
   - Use repository: `ghcr.io/yourusername/notion-books-webapp:latest`

2. **Port Configuration:**
   - Container Port: `3001`
   - Host Port: `3001` (or any available port you prefer)
   - Connection Type: `bridge`

3. **Environment Variables (Required for Full Functionality):**
   
   **Basic Variables (Container will start without these but features will be limited):**
   - `SESSION_SECRET`: Set a secure random string (32+ characters recommended)
   - `NODE_ENV`: `production` (auto-configured)
   - `PORT`: `3001` (auto-configured)
   - `FRONTEND_URL`: `http://YOUR_UNRAID_IP:3001` (replace with your actual IP)
   
   **API Keys (Add these via Unraid UI after container is running):**
   - `NOTION_INTEGRATION_TOKEN`: Your Notion integration token (required for Notion features)
   - `GOOGLE_BOOKS_API_KEY`: Google Books API key (optional, enhances book search)
   
   **How to add API keys in Unraid:**
   1. After container is created, click the container name to edit
   2. Scroll to "Environment Variables" section
   3. Click "Add another Path, Port, Variable, Label or Device"
   4. Add variable name and value, then click "Apply"

4. **Access:**
   - Visit `http://YOUR_UNRAID_IP:3001`

#### Troubleshooting CORS Issues

If you see CORS (Cross-Origin Resource Sharing) errors in the browser console:

**Problem:** `Access to fetch at 'http://localhost:3001/...' from origin 'http://192.168.x.x:3001' has been blocked by CORS policy`

**Solution:** The frontend is trying to access `localhost` but running from a different IP. This is automatically handled by:

1. **Dynamic API Detection**: The frontend automatically detects if it's running on the same port and uses the current origin
2. **CORS Configuration**: The backend allows requests from Docker bridge network IPs (192.168.x.x, 172.x.x.x, 10.x.x.x)
3. **Environment Variables**: Set `FRONTEND_URL` to match your server's actual IP address

**Manual Fix (if needed):**
```bash
# In Unraid Docker settings, set:
FRONTEND_URL=http://YOUR_ACTUAL_SERVER_IP:3001
```

#### Environment Variables Not Showing Up

If environment variables don't appear automatically in your Docker UI:

**Problem:** Variables like `NOTION_INTEGRATION_TOKEN` and `GOOGLE_BOOKS_API_KEY` aren't visible in Unraid's Docker container settings.

**Solution:** 
1. **Manual Addition**: Click "Add another Path, Port, Variable, Label or Device" in Unraid
2. **Add Required Variables**:
   - `NOTION_INTEGRATION_TOKEN` = `secret_your_actual_token_here`
   - `GOOGLE_BOOKS_API_KEY` = `your_api_key_here`
   - `SESSION_SECRET` = `your_secure_random_string`
   - `FRONTEND_URL` = `http://YOUR_SERVER_IP:3001`

**Template**: Use the `docker-compose.template.yml` file for easy copy-paste configuration.

#### Connection Refused Errors

If you see `ERR_CONNECTION_REFUSED` in browser console:

**Problem:** Frontend can't connect to backend API endpoints.

**Symptoms:**
```
GET http://localhost:3001/api/books/test/connection net::ERR_CONNECTION_REFUSED
GET http://localhost:3001/api/books/suggestions?q=... net::ERR_CONNECTION_REFUSED
```

**Solution:**
1. **Check Container Status**: Ensure the container is running in Unraid Docker tab
2. **Verify Port Mapping**: Container port 3001 should be mapped to your chosen host port
3. **Check Logs**: Look for "🚀 Starting Notion Books..." and "🌟 Starting backend server..." messages
4. **Test Health Endpoint**: `curl http://YOUR_UNRAID_IP:3001/health`
5. **Check Environment**: Verify `FRONTEND_URL` matches your server's IP and port

#### Method 2: Using Docker Compose in Unraid

If you want the full setup with database:

1. **Install Compose Manager plugin** (if not already installed)
2. **Create compose file** in `/mnt/user/appdata/notion-books/docker-compose.yml`
3. **Use the provided docker-compose.yml** from this repository
4. **Start via Compose Manager**

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

# Notion Books Web Application

A web application for managing and organizing your book collection with Notion integration.

## Features

- Book collection management
- Notion integration for syncing book data
- User authentication and sessions
- Modern React frontend with responsive design
- RESTful API backend

## Quick Start

### Using Docker (Recommended)

#### Option 1: Docker Compose (Full Setup with Database)
```bash
# Clone the repository
git clone <your-repo-url>
cd notion-books-webapp

# Start the application
docker-compose up -d

# Access the application at http://localhost:8080
```

#### Option 2: Single Container (Standalone)
```bash
# Pull and run the latest image
docker run -d \
  --name notion-books \
  -p 3001:3001 \
  -e SESSION_SECRET=your-secure-session-secret \
  ghcr.io/yourusername/notion-books-webapp:latest

# Access the application at http://localhost:3001
```

### Unraid Deployment

#### Method 1: Using Docker Hub/GitHub Container Registry

1. **Add Container in Unraid:**
   - Go to Docker tab in Unraid
   - Click "Add Container"
   - Use repository: `ghcr.io/yourusername/notion-books-webapp:latest`

2. **Port Configuration:**
   - Container Port: `3001`
   - Host Port: `3001` (or any available port you prefer)
   - Connection Type: `bridge`

3. **Environment Variables (Required for Full Functionality):**
   
   **Basic Variables (Container will start without these but features will be limited):**
   - `SESSION_SECRET`: Set a secure random string (32+ characters recommended)
   - `NODE_ENV`: `production` (auto-configured)
   - `PORT`: `3001` (auto-configured)
   - `FRONTEND_URL`: `http://YOUR_UNRAID_IP:3001` (replace with your actual IP)
   
   **API Keys (Add these via Unraid UI after container is running):**
   - `NOTION_INTEGRATION_TOKEN`: Your Notion integration token (required for Notion features)
   - `GOOGLE_BOOKS_API_KEY`: Google Books API key (optional, enhances book search)
   
   **How to add API keys in Unraid:**
   1. After container is created, click the container name to edit
   2. Scroll to "Environment Variables" section
   3. Click "Add another Path, Port, Variable, Label or Device"
   4. Add variable name and value, then click "Apply"

4. **Access:**
   - Visit `http://YOUR_UNRAID_IP:3001`

#### Troubleshooting CORS Issues

If you see CORS (Cross-Origin Resource Sharing) errors in the browser console:

**Problem:** `Access to fetch at 'http://localhost:3001/...' from origin 'http://192.168.x.x:3001' has been blocked by CORS policy`

**Solution:** The frontend is trying to access `localhost` but running from a different IP. This is automatically handled by:

1. **Dynamic API Detection**: The frontend automatically detects if it's running on the same port and uses the current origin
2. **CORS Configuration**: The backend allows requests from Docker bridge network IPs (192.168.x.x, 172.x.x.x, 10.x.x.x)
3. **Environment Variables**: Set `FRONTEND_URL` to match your server's actual IP address

**Manual Fix (if needed):**
```bash
# In Unraid Docker settings, set:
FRONTEND_URL=http://YOUR_ACTUAL_SERVER_IP:3001
```

#### Environment Variables Not Showing Up

If environment variables don't appear automatically in your Docker UI:

**Problem:** Variables like `NOTION_INTEGRATION_TOKEN` and `GOOGLE_BOOKS_API_KEY` aren't visible in Unraid's Docker container settings.

**Solution:** 
1. **Manual Addition**: Click "Add another Path, Port, Variable, Label or Device" in Unraid
2. **Add Required Variables**:
   - `NOTION_INTEGRATION_TOKEN` = `secret_your_actual_token_here`
   - `GOOGLE_BOOKS_API_KEY` = `your_api_key_here`
   - `SESSION_SECRET` = `your_secure_random_string`
   - `FRONTEND_URL` = `http://YOUR_SERVER_IP:3001`

**Template**: Use the `docker-compose.template.yml` file for easy copy-paste configuration.

#### Connection Refused Errors

If you see `ERR_CONNECTION_REFUSED` in browser console:

**Problem:** Frontend can't connect to backend API endpoints.

**Symptoms:**
```
GET http://localhost:3001/api/books/test/connection net::ERR_CONNECTION_REFUSED
GET http://localhost:3001/api/books/suggestions?q=... net::ERR_CONNECTION_REFUSED
```

**Solution:**
1. **Check Container Status**: Ensure the container is running in Unraid Docker tab
2. **Verify Port Mapping**: Container port 3001 should be mapped to your chosen host port
3. **Check Logs**: Look for "🚀 Starting Notion Books..." and "🌟 Starting backend server..." messages
4. **Test Health Endpoint**: `curl http://YOUR_UNRAID_IP:3001/health`
5. **Check Environment**: Verify `FRONTEND_URL` matches your server's IP and port

#### Method 2: Using Docker Compose in Unraid

If you want the full setup with database:

1. **Install Compose Manager plugin** (if not already installed)
2. **Create compose file** in `/mnt/user/appdata/notion-books/docker-compose.yml`
3. **Use the provided docker-compose.yml** from this repository
4. **Start via Compose Manager**

### Troubleshooting

#### "Can't access the web interface"
1. **Check port mapping**: Ensure the container port 3001 is mapped to a host port
2. **Check Unraid firewall**: Make sure the port is not blocked
3. **Verify container is running**: Check Docker tab in Unraid
4. **Check logs**: Look for "🚀 Server running on port 3001" message

#### Container Health Check
- The container includes a health check endpoint at `/health`
- You can verify it's working: `curl http://YOUR_UNRAID_IP:3001/health`
- Should return: `{"status":"OK","timestamp":"...","environment":"production","storage":"browser-local-storage"}`

#### Data Storage
- This application uses **browser local storage** for data persistence
- No database is required - all data is stored locally in your browser
- Data will persist between browser sessions but is tied to the specific browser/device
- To backup your data, use the export functionality in the app (if available)

### Development

#### Prerequisites
- Node.js 18+
- PostgreSQL (optional, for full features)

#### Setup
```bash
# Install dependencies
cd frontend && npm install
cd ../backend && npm install

# Set up environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Start development servers
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm start
```

## Docker Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Application environment |
| `PORT` | `3001` | Server port |
| `SESSION_SECRET` | `default-session-secret-change-in-production` | Session encryption key |
| `FRONTEND_URL` | `http://localhost:3001` | Frontend URL for CORS |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |
| `SESSION_COOKIE_MAX_AGE` | `86400000` | Session cookie lifetime (24 hours) |

### Ports

- **3001**: Main application port (HTTP)

### Data Storage

This application uses browser local storage for data persistence:
- No external database required
- Data is stored locally in the user's browser
- Sessions use memory store (will reset on container restart)
- Suitable for single-user or small-scale deployments

## API Endpoints

- `GET /health` - Health check endpoint
- `POST /auth/*` - Authentication routes
- `GET /api/books/*` - Book management routes
- `GET /api/notion/*` - Notion integration routes
- `GET /api/user/*` - User management routes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Your License Here] 