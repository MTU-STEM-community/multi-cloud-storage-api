# Storage Module API Documentation

The Storage Module provides comprehensive file management capabilities across multiple cloud storage providers including Google Cloud Storage, Dropbox, MEGA, Google Drive, Backblaze, and OneDrive.

## Base URL
```
http://localhost:3000/storage
```

## Supported Providers
- `google-cloud` - Google Cloud Storage
- `dropbox` - Dropbox
- `mega` - MEGA
- `google-drive` - Google Drive
- `backblaze` - Backblaze B2
- `onedrive` - Microsoft OneDrive

## 📤 File Upload Operations

### Upload File to Single Provider
Upload a file to a specific cloud storage provider.

**Endpoint:** `POST /upload/{provider}`

**Parameters:**
- `provider` (path) - Cloud storage provider name
- `folderPath` (query, optional) - Destination folder path

**Request Body:**
- `file` (multipart/form-data) - File to upload

**Example:**
```bash
curl -X POST \
  http://localhost:3000/storage/upload/dropbox \
  -F "file=@document.pdf" \
  -F "folderPath=projects/q4"
```

**Response:**
```json
{
  "url": "https://dropbox.com/s/abc123/document.pdf",
  "originalName": "document.pdf",
  "storageName": "1640995200000_document.pdf",
  "fileId": "clp1234567890abcdef",
  "folderPath": "projects/q4"
}
```

### Bulk Upload Files
Upload multiple files to a single provider.

**Endpoint:** `POST /bulk-upload/{provider}`

**Parameters:**
- `provider` (path) - Cloud storage provider name
- `folderPath` (query, optional) - Destination folder path

**Request Body:**
- `files` (multipart/form-data) - Array of files to upload

**Example:**
```bash
curl -X POST \
  http://localhost:3000/storage/bulk-upload/dropbox \
  -F "files=@document1.pdf" \
  -F "files=@document2.pdf" \
  -F "folderPath=projects/q4"
```

**Response:**
```json
{
  "results": [
    {
      "success": true,
      "fileId": "clp1234567890abcdef",
      "originalName": "document1.pdf",
      "url": "https://dropbox.com/s/abc123/document1.pdf"
    },
    {
      "success": true,
      "fileId": "clp0987654321fedcba",
      "originalName": "document2.pdf",
      "url": "https://dropbox.com/s/def456/document2.pdf"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

### Multi-Provider Upload
Upload the same file to multiple cloud storage providers simultaneously.

**Endpoint:** `POST /multi-provider-upload`

**Request Body:**
- `file` (multipart/form-data) - File to upload
- `providers` (JSON array) - List of provider names
- `folderPath` (optional) - Destination folder path

**Example:**
```bash
curl -X POST \
  http://localhost:3000/storage/multi-provider-upload \
  -F "file=@document.pdf" \
  -F 'providers=["dropbox", "google-cloud"]' \
  -F "folderPath=projects/q4"
```

**Response:**
```json
{
  "fileId": "clp1234567890abcdef",
  "originalName": "document.pdf",
  "results": [
    {
      "provider": "dropbox",
      "success": true,
      "url": "https://dropbox.com/s/abc123/document.pdf"
    },
    {
      "provider": "google-cloud",
      "success": true,
      "url": "https://storage.googleapis.com/bucket/document.pdf"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

## 📥 File Download Operations

### Download File
Download a file using its database ID from a specific provider.

**Endpoint:** `GET /download/{provider}/{fileId}`

**Parameters:**
- `provider` (path) - Cloud storage provider name
- `fileId` (path) - Database file ID (UUID)
- `originalName` (query, optional) - Custom filename for download

**Example:**
```bash
# Download with original filename
curl -X GET \
  http://localhost:3000/storage/download/dropbox/clp1234567890abcdef \
  --output document.pdf

# Download with custom filename
curl -X GET \
  "http://localhost:3000/storage/download/dropbox/clp1234567890abcdef?originalName=my-document.pdf" \
  --output my-document.pdf
```

**Response:** File content with appropriate headers for download

## 📋 File Listing Operations

### List Files
Retrieve a list of files from a specific cloud storage provider.

**Endpoint:** `GET /list/{provider}`

**Parameters:**
- `provider` (path) - Cloud storage provider name
- `folderPath` (query, optional) - Folder path to list files from

**Example:**
```bash
# List all files
curl -X GET http://localhost:3000/storage/list/dropbox

# List files in specific folder
curl -X GET "http://localhost:3000/storage/list/dropbox?folderPath=projects/q4"
```

**Response:**
```json
[
  {
    "name": "document.pdf",
    "size": "1024",
    "contentType": "application/pdf",
    "created": "2024-06-24T21:30:00.000Z",
    "updated": "2024-06-24T21:30:00.000Z",
    "path": "projects/q4/document.pdf",
    "isFolder": false
  }
]
```

## 🗑️ File Deletion Operations

### Delete Single File
Delete a file using its database ID from a specific provider.

**Endpoint:** `DELETE /delete/{provider}/{fileId}`

**Parameters:**
- `provider` (path) - Cloud storage provider name
- `fileId` (path) - Database file ID (UUID)

**Example:**
```bash
curl -X DELETE \
  http://localhost:3000/storage/delete/dropbox/clp1234567890abcdef
```

**Response:**
```json
{
  "message": "File clp1234567890abcdef successfully deleted from dropbox"
}
```

### Bulk Delete Files
Delete multiple files from a single provider.

**Endpoint:** `DELETE /files/bulk`

**Request Body:**
```json
{
  "fileIds": ["clp1234567890abcdef", "clp0987654321fedcba"],
  "provider": "dropbox"
}
```

**Example:**
```bash
curl -X DELETE \
  http://localhost:3000/storage/files/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "fileIds": ["clp1234567890abcdef", "clp0987654321fedcba"],
    "provider": "dropbox"
  }'
```

**Response:**
```json
{
  "results": [
    {
      "fileId": "clp1234567890abcdef",
      "success": true,
      "message": "File deleted successfully"
    },
    {
      "fileId": "clp0987654321fedcba",
      "success": true,
      "message": "File deleted successfully"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

### Multi-Provider Delete
Delete the same file from multiple cloud storage providers simultaneously.

**Endpoint:** `DELETE /multi-provider-delete`

**Request Body:**
```json
{
  "fileId": "clp1234567890abcdef",
  "providers": ["dropbox", "google-cloud"]
}
```

**Example:**
```bash
curl -X DELETE \
  http://localhost:3000/storage/multi-provider-delete \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "clp1234567890abcdef",
    "providers": ["dropbox", "google-cloud"]
  }'
```

**Response:**
```json
{
  "fileId": "clp1234567890abcdef",
  "results": [
    {
      "provider": "dropbox",
      "success": true,
      "message": "File deleted successfully"
    },
    {
      "provider": "google-cloud",
      "success": true,
      "message": "File deleted successfully"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

## 📁 Folder Operations

### Create Folder
Create a new folder in a specific cloud storage provider.

**Endpoint:** `POST /{provider}/folder`

**Parameters:**
- `provider` (path) - Cloud storage provider name

**Request Body:**
```json
{
  "folderPath": "projects/q4"
}
```

**Example:**
```bash
curl -X POST \
  http://localhost:3000/storage/dropbox/folder \
  -H "Content-Type: application/json" \
  -d '{"folderPath": "projects/q4"}'
```

**Response:**
```json
{
  "message": "Folder successfully created in dropbox",
  "folderPath": "projects/q4"
}
```

### Delete Folder
Delete a folder from a specific cloud storage provider.

**Endpoint:** `DELETE /{provider}/folder`

**Parameters:**
- `provider` (path) - Cloud storage provider name
- `folderPath` (query) - Path of the folder to delete

**Example:**
```bash
curl -X DELETE \
  "http://localhost:3000/storage/dropbox/folder?folderPath=projects/q4"
```

**Response:**
```json
{
  "message": "Folder 'projects/q4' successfully deleted from dropbox"
}
```

## 📄 File Metadata Operations

### Get File by ID
Retrieve detailed information about a specific file.

**Endpoint:** `GET /files/{fileId}`

**Parameters:**
- `fileId` (path) - Database file ID (UUID)

**Example:**
```bash
curl -X GET http://localhost:3000/storage/files/clp1234567890abcdef
```

**Response:**
```json
{
  "id": "clp1234567890abcdef",
  "originalName": "document.pdf",
  "storageName": "1640995200000_document.pdf",
  "size": 1024,
  "contentType": "application/pdf",
  "description": "Important Q4 planning document",
  "tags": ["project", "important", "q4"],
  "metadata": {
    "department": "engineering",
    "priority": "high"
  },
  "isPublic": false,
  "downloadCount": 5,
  "lastAccessed": "2024-06-24T21:30:00.000Z",
  "createdAt": "2024-06-24T20:00:00.000Z",
  "updatedAt": "2024-06-24T21:30:00.000Z",
  "cloudStorages": [
    {
      "provider": "dropbox",
      "url": "https://dropbox.com/s/abc123/document.pdf",
      "folderPath": "projects/q4"
    }
  ]
}
```

### Update File Metadata
Update metadata, description, tags, and other properties of a file.

**Endpoint:** `PATCH /files/{fileId}/metadata`

**Parameters:**
- `fileId` (path) - Database file ID (UUID)

**Request Body:**
```json
{
  "description": "Important Q4 planning document",
  "tags": ["project", "important", "q4"],
  "metadata": {
    "department": "engineering",
    "priority": "high"
  },
  "isPublic": false
}
```

**Example:**
```bash
curl -X PATCH \
  http://localhost:3000/storage/files/clp1234567890abcdef/metadata \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Important Q4 planning document",
    "tags": ["project", "important", "q4"],
    "metadata": {
      "department": "engineering",
      "priority": "high"
    },
    "isPublic": false
  }'
```

**Response:**
```json
{
  "id": "clp1234567890abcdef",
  "originalName": "document.pdf",
  "description": "Important Q4 planning document",
  "tags": ["project", "important", "q4"],
  "metadata": {
    "department": "engineering",
    "priority": "high"
  },
  "isPublic": false,
  "updatedAt": "2024-06-24T21:30:00.000Z"
}
```

## 🔍 File Search Operations

### Search Files
Search for files based on various criteria including name, tags, metadata, and more.

**Endpoint:** `GET /files/search`

**Query Parameters:**
- `name` (optional) - Search by file name (partial match)
- `tags` (optional) - Comma-separated list of tags to search for
- `contentType` (optional) - Filter by content type (e.g., "application/pdf")
- `provider` (optional) - Filter by cloud storage provider
- `isPublic` (optional) - Filter by public/private status (true/false)
- `page` (optional) - Page number for pagination (default: 1)
- `limit` (optional) - Number of results per page (default: 20, max: 100)
- `sortBy` (optional) - Sort field (name, createdAt, updatedAt, size, downloadCount)
- `sortOrder` (optional) - Sort order (asc, desc, default: desc)

**Example:**
```bash
# Search by name and tags
curl -X GET \
  "http://localhost:3000/storage/files/search?name=project&tags=important,urgent&page=1&limit=20"

# Search with multiple filters
curl -X GET \
  "http://localhost:3000/storage/files/search?contentType=application/pdf&provider=dropbox&sortBy=createdAt&sortOrder=desc"
```

**Response:**
```json
{
  "files": [
    {
      "id": "clp1234567890abcdef",
      "originalName": "project-document.pdf",
      "size": 1024,
      "contentType": "application/pdf",
      "description": "Important Q4 planning document",
      "tags": ["project", "important", "q4"],
      "isPublic": false,
      "downloadCount": 5,
      "createdAt": "2024-06-24T20:00:00.000Z",
      "cloudStorages": [
        {
          "provider": "dropbox",
          "folderPath": "projects/q4"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

## 🏷️ Tag Management Operations

### Create File Tag
Create a new tag that can be applied to files.

**Endpoint:** `POST /tags`

**Request Body:**
```json
{
  "name": "important",
  "color": "#ff0000",
  "description": "Files marked as important"
}
```

**Example:**
```bash
curl -X POST \
  http://localhost:3000/storage/tags \
  -H "Content-Type: application/json" \
  -d '{
    "name": "important",
    "color": "#ff0000",
    "description": "Files marked as important"
  }'
```

**Response:**
```json
{
  "id": "tag_1234567890abcdef",
  "name": "important",
  "color": "#ff0000",
  "description": "Files marked as important",
  "createdAt": "2024-06-24T21:30:00.000Z"
}
```

### Get All File Tags
Retrieve a list of all available file tags.

**Endpoint:** `GET /tags`

**Example:**
```bash
curl -X GET http://localhost:3000/storage/tags
```

**Response:**
```json
[
  {
    "id": "tag_1234567890abcdef",
    "name": "important",
    "color": "#ff0000",
    "description": "Files marked as important",
    "fileCount": 15,
    "createdAt": "2024-06-24T21:30:00.000Z"
  },
  {
    "id": "tag_0987654321fedcba",
    "name": "project",
    "color": "#00ff00",
    "description": "Project-related files",
    "fileCount": 32,
    "createdAt": "2024-06-24T20:00:00.000Z"
  }
]
```

## 🔑 Key Concepts

### File Identifiers
- **`fileId`**: Database UUID (e.g., `clp1234567890abcdef`) - Use this for all API operations
- **`storageName`**: Cloud storage filename (e.g., `1640995200000_document.pdf`) - Internal use only

### Multi-Provider Operations
- Files can be stored across multiple cloud providers simultaneously
- Each file has a single `fileId` but can have multiple cloud storage locations
- Operations like multi-provider upload and delete work with retry logic for failed providers

### Error Handling
All endpoints return appropriate HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

Error responses include detailed error messages:
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    "File is required",
    "Provider must be one of: google-cloud, dropbox, mega, google-drive, backblaze, onedrive"
  ]
}
```

## 🎯 Best Practices

1. **Always use `fileId`** for file operations instead of storage names
2. **Handle multi-provider operations** gracefully - some providers may fail while others succeed
3. **Use pagination** for search and list operations to avoid large response payloads
4. **Implement retry logic** for failed operations, especially with multi-provider endpoints
5. **Use appropriate content types** when uploading files
6. **Tag files consistently** to improve searchability and organization
