-- Database initialization script for Notion Books webapp

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for storing Notion OAuth information
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    notion_user_id VARCHAR(255) UNIQUE NOT NULL,
    notion_access_token TEXT NOT NULL,
    notion_workspace_name VARCHAR(255),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Book sessions table for temporary data storage during user approval process
CREATE TABLE IF NOT EXISTS book_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL UNIQUE,
    book_data JSONB NOT NULL,
    approved BOOLEAN DEFAULT FALSE,
    notion_page_id VARCHAR(255), -- Store Notion page ID after creation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- User settings table for storing Notion database configurations and preferences
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    notion_database_id VARCHAR(255),
    field_mappings JSONB, -- Store custom field mapping configurations
    default_properties JSONB, -- Store default values for Notion properties
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session table for express-session (required by connect-pg-simple)
CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR NOT NULL COLLATE "default",
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
)
WITH (OIDS=FALSE);

-- Add primary key and index to session table
ALTER TABLE session ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_notion_user_id ON users(notion_user_id);
CREATE INDEX IF NOT EXISTS idx_book_sessions_user_id ON book_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_book_sessions_session_id ON book_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_book_sessions_expires_at ON book_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Function to update updated_at column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update the updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired book sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM book_sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create a function to be called daily to clean up expired sessions
-- In production, you would set up a cron job or scheduled task to call this
COMMENT ON FUNCTION cleanup_expired_sessions() IS 'Call this function regularly to clean up expired book sessions';

-- Insert sample data for development (optional)
-- Uncomment the following lines if you want some test data

/*
INSERT INTO users (notion_user_id, notion_access_token, notion_workspace_name, email) 
VALUES 
    ('test-user-1', 'test-token-1', 'Test Workspace', 'test@example.com')
ON CONFLICT (notion_user_id) DO NOTHING;

INSERT INTO user_settings (user_id, notion_database_id, field_mappings, default_properties)
VALUES 
    (1, 'test-database-id', '{"title": "Title", "authors": "Authors", "isbn": "ISBN"}', '{"Status": "To Read"}')
ON CONFLICT DO NOTHING;
*/ 