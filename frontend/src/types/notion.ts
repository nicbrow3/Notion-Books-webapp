export interface NotionUser {
  id: string;
  name: string;
  avatar_url?: string;
  type: 'person' | 'bot';
  person?: {
    email: string;
  };
}

export interface NotionWorkspace {
  id: string;
  name: string;
  icon?: {
    type: 'emoji' | 'external' | 'file';
    emoji?: string;
    external?: { url: string };
    file?: { url: string };
  };
}

export interface NotionDatabase {
  id: string;
  title: string;
  description?: string;
  icon?: {
    type: 'emoji' | 'external' | 'file';
    emoji?: string;
    external?: { url: string };
    file?: { url: string };
  };
  cover?: {
    type: 'external' | 'file';
    external?: { url: string };
    file?: { url: string };
  };
  properties: Record<string, NotionProperty>;
  created_time: string;
  last_edited_time: string;
  url: string;
}

export interface NotionProperty {
  id: string;
  name: string;
  type: NotionPropertyType;
  [key: string]: any; // Additional type-specific properties
}

export type NotionPropertyType = 
  | 'title'
  | 'rich_text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'people'
  | 'files'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone_number'
  | 'formula'
  | 'relation'
  | 'rollup'
  | 'created_time'
  | 'created_by'
  | 'last_edited_time'
  | 'last_edited_by';

export interface NotionPage {
  id: string;
  created_time: string;
  last_edited_time: string;
  created_by: NotionUser;
  last_edited_by: NotionUser;
  cover?: {
    type: 'external' | 'file';
    external?: { url: string };
    file?: { url: string };
  };
  icon?: {
    type: 'emoji' | 'external' | 'file';
    emoji?: string;
    external?: { url: string };
    file?: { url: string };
  };
  parent: {
    type: 'database_id';
    database_id: string;
  };
  archived: boolean;
  properties: Record<string, any>;
  url: string;
}

export interface BookToNotionMapping {
  title: string; // Notion property name for book title
  authors: string; // Notion property name for authors
  description?: string; // Notion property name for description
  isbn?: string; // Notion property name for ISBN
  publishedDate?: string; // Notion property name for published date (edition)
  originalPublishedDate?: string; // Notion property name for original published date (first edition)
  publisher?: string; // Notion property name for publisher
  pageCount?: string; // Notion property name for page count
  categories?: string; // Notion property name for categories
  rating?: string; // Notion property name for rating
  thumbnail?: string; // Notion property name for cover image
  pageIcon?: boolean; // Whether to set the cover image as the page icon
  status?: string; // Notion property name for reading status
  notes?: string; // Notion property name for personal notes
  // Audiobook-specific fields
  audiobookPublisher?: string; // Notion property name for audiobook publisher
  audiobookChapters?: string; // Notion property name for audiobook chapter count
  audiobookASIN?: string; // Notion property name for audiobook ASIN
  audiobookNarrators?: string; // Notion property name for audiobook narrators
  audiobookDuration?: string; // Notion property name for audiobook duration
  audiobookURL?: string; // Notion property name for audiobook URL (Audible link)
  audiobookRating?: string; // Notion property name for audiobook rating
}

export interface NotionIntegrationSettings {
  databaseId: string;
  fieldMapping: BookToNotionMapping;
  defaultValues: Record<string, any>;
  autoAddBooks: boolean;
  useEnglishOnlySources?: boolean; // Filter out non-English sources
}

export interface NotionAuthResponse {
  access_token: string;
  token_type: 'bearer';
  bot_id: string;
  workspace_name: string;
  workspace_icon?: string;
  workspace_id: string;
  owner: NotionUser;
  duplicated_template_id?: string;
}

export interface CreateNotionPageRequest {
  databaseId: string;
  bookData: any; // Book data from Google Books API
  fieldMapping: BookToNotionMapping;
  customValues?: Record<string, any>;
}

export interface NotionBookSearchResult {
  id: string;
  url: string;
  title: string;
  isbn: string;
  created_time: string;
} 