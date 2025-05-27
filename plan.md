# Book to Notion Web App - Development Plan

## Project Overview

A web application that fetches book information from Google Books API (primary) and Open Library API (fallback), presents the data to users for approval/editing, then creates or updates pages in their Notion database.

## Architecture

### Tech Stack
- **Frontend**: React.js with TypeScript
- **Backend**: Node.js with Express
- **Database**: PostgreSQL (for user sessions, API keys, and temp data)
- **Authentication**: OAuth 2.0 for Notion integration
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (frontend) + Railway/Render (backend)

### System Architecture
```
User Interface (React)
	↓
Backend API (Express)
	↓
Book APIs (Google Books → Open Library fallback)
	↓
Data Processing & Merging
	↓
User Approval Interface
	↓
Notion API Integration
```

## Core Features

### Phase 1: MVP
- [ ] User authentication with Notion
- [ ] Single book search by ISBN/title
- [ ] Google Books API integration
- [ ] Basic data display and editing interface  
- [ ] Manual Notion page creation
- [ ] Error handling and validation

### Phase 2: Enhanced
- [ ] Open Library API fallback integration
- [ ] Data merging logic (Google Books primary)
- [ ] Batch book processing
- [ ] Notion database field mapping
- [ ] Cover image handling
- [ ] Search history and favorites

### Phase 3: Advanced
- [ ] Custom field mapping interface
- [ ] Duplicate detection in Notion
- [ ] Export functionality (CSV/JSON)
- [ ] User settings and preferences
- [ ] Advanced search filters

## API Integration Strategy

### Book Data Fetching (Primary + Fallback Approach)

1. **Primary: Google Books API**
	- Query by ISBN, title, or author
	- Parse response for core metadata
	- Extract: title, authors, ISBN, description, categories, thumbnail, publication date

2. **Fallback: Open Library API** 
	- Triggered when Google Books returns no results or incomplete data
	- Fill missing fields from Open Library response
	- Particularly useful for: subjects, additional ISBNs, publisher details

3. **Data Merging Logic**
	```javascript
	const mergeBookData = (googleData, openLibData) => {
		return {
			title: googleData?.title || openLibData?.title,
			authors: [...(googleData?.authors || []), ...(openLibData?.authors || [])],
			isbn13: googleData?.isbn13 || openLibData?.isbn13,
			description: googleData?.description || openLibData?.description,
			publishedDate: googleData?.publishedDate || openLibData?.publishDate,
			categories: mergeAndDeduplicate(googleData?.categories, openLibData?.subjects),
			thumbnail: googleData?.thumbnail || openLibData?.coverImage,
			pageCount: googleData?.pageCount || openLibData?.numberOfPages,
			publisher: googleData?.publisher || openLibData?.publishers?.[0]
		}
	}
	```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
	id SERIAL PRIMARY KEY,
	notion_user_id VARCHAR(255) UNIQUE NOT NULL,
	notion_access_token TEXT NOT NULL,
	notion_workspace_name VARCHAR(255),
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Book Sessions Table (Temporary data storage)
```sql
CREATE TABLE book_sessions (
	id SERIAL PRIMARY KEY,
	user_id INTEGER REFERENCES users(id),
	session_id VARCHAR(255) NOT NULL,
	book_data JSONB NOT NULL,
	approved BOOLEAN DEFAULT FALSE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	expires_at TIMESTAMP NOT NULL
);
```

### User Settings Table
```sql
CREATE TABLE user_settings (
	id SERIAL PRIMARY KEY,
	user_id INTEGER REFERENCES users(id),
	notion_database_id VARCHAR(255),
	field_mappings JSONB,
	default_properties JSONB,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## User Interface Design

### 1. Authentication Page
- Notion OAuth integration
- Workspace selection
- Database selection for books

### 2. Search Page
- Search input (ISBN, title, author)
- Search type selector
- Recent searches
- Quick ISBN scanner (future: camera integration)

### 3. Book Review Page (Core Feature)
- **Left Panel**: Fetched book data with edit capabilities
	- Cover image preview
	- Editable text fields (title, authors, description)
	- Category/genre multi-select
	- Publication details
	- Custom notes field
- **Right Panel**: Notion page preview
	- Shows how data will appear in Notion
	- Field mapping indicators
	- Property validation status
- **Bottom Actions**: 
	- "Approve & Add to Notion" button
	- "Save as Draft" button
	- "Cancel" button

### 4. Batch Processing Page
- Upload CSV of ISBNs
- Progress tracker
- Individual book approval queue
- Bulk actions (approve all, reject all)

### 5. Settings Page
- Notion database configuration
- Field mapping customization
- Default values setup
- API usage statistics

## API Endpoints

### Authentication
- `POST /auth/notion` - Initiate Notion OAuth
- `GET /auth/callback` - Handle OAuth callback
- `POST /auth/logout` - Clear session

### Book Operations
- `GET /api/books/search?q={query}&type={isbn|title|author}` - Search books
- `POST /api/books/session` - Create book editing session
- `GET /api/books/session/:sessionId` - Get session data
- `PUT /api/books/session/:sessionId` - Update session data
- `POST /api/books/session/:sessionId/approve` - Approve and send to Notion

### Notion Integration
- `GET /api/notion/databases` - List user's databases
- `GET /api/notion/database/:id/properties` - Get database schema
- `POST /api/notion/pages` - Create page in Notion
- `PUT /api/notion/pages/:id` - Update existing page

### User Management
- `GET /api/user/settings` - Get user preferences
- `PUT /api/user/settings` - Update user preferences
- `GET /api/user/stats` - Get usage statistics

## Implementation Timeline

### Step 1: Foundation
- [ ] Set up React + Express project structure
- [ ] Implement Notion OAuth authentication
- [ ] Create basic database schema
- [ ] Set up Google Books API integration

### Step 2: Core Functionality
- [ ] Build book search interface
- [ ] Implement book data fetching and parsing
- [ ] Create book review/editing interface
- [ ] Add basic Notion page creation

### Step 3: MVP Completion
- [ ] Add form validation and error handling
- [ ] Implement session management
- [ ] Basic styling with Tailwind CSS
- [ ] Deploy MVP version

### Step 4: Enhanced Features
- [ ] Add Open Library API fallback
- [ ] Implement data merging logic
- [ ] Create batch processing interface
- [ ] Add notion database field mapping

### Step 5-6: Polish & Testing
- [ ] Advanced UI/UX improvements
- [ ] Comprehensive error handling
- [ ] Performance optimizations
- [ ] User testing and bug fixes

### Step 7-8: Advanced Features
- [ ] Custom field mapping interface
- [ ] Duplicate detection
- [ ] Export functionality
- [ ] Advanced search and filtering

## Security Considerations

### API Security
- Rate limiting for book API calls
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### Authentication & Authorization
- Secure Notion token storage
- Session management
- CORS configuration
- Environment variable protection

### Data Privacy
- Temporary session data cleanup
- User data encryption
- GDPR compliance considerations
- Secure API key management

## Deployment Strategy

### Development Environment
- Local PostgreSQL database
- Environment variables for API keys
- Hot reloading for both frontend and backend

### Production Environment
- **Frontend**: Vercel with automatic deployments
- **Backend**: Railway or Render with PostgreSQL addon
- **Database**: Managed PostgreSQL instance
- **Monitoring**: Error tracking with Sentry
- **Analytics**: Basic usage analytics

## Testing Strategy

### Unit Tests
- API endpoint testing
- Book data parsing functions
- Data merging logic
- Notion API integration

### Integration Tests  
- Full book search and approval flow
- Notion database creation
- Authentication flow
- Error handling scenarios

### User Acceptance Testing
- Search accuracy and performance
- UI/UX feedback
- Cross-browser compatibility
- Mobile responsiveness

## Success Metrics

### Technical Metrics
- API response times < 2 seconds
- 99.5% uptime
- Zero data loss incidents
- < 5% error rate

### User Metrics
- Book search success rate > 90%
- User session completion rate > 80%
- Average time from search to Notion creation < 2 minutes
- User retention after first week > 60%

## Future Enhancements

### Phase 4: Advanced Features
- Mobile app (React Native)
- Browser extension for quick book adding
- Integration with library systems
- Barcode scanning via camera
- Book recommendation engine
- Reading progress tracking
- Social features (book sharing, reviews)

### Integration Opportunities
- Goodreads integration
- Amazon wishlist import
- Library management systems
- Reading apps (Kindle, Apple Books)
- Bookstore APIs for pricing

## Risk Mitigation

### Technical Risks
- **API Rate Limits**: Implement caching and request queuing
- **Third-party API Changes**: Version pinning and fallback strategies  
- **Scalability**: Database optimization and caching layers

### Business Risks
- **Notion API Changes**: Stay updated with Notion developer updates
- **User Adoption**: Focus on clear value proposition and smooth UX
- **Competition**: Differentiate through superior data quality and user experience

---

## Getting Started

1. Clone repository and install dependencies
2. Set up local PostgreSQL database
3. Configure environment variables (Notion, Google Books API keys)
4. Run database migrations
5. Start development servers
6. Begin with authentication implementation

This plan provides a solid foundation for building a comprehensive book-to-Notion web application with user approval workflows and dual API integration.