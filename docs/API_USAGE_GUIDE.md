# Multi-Cloud Storage API - Usage Guide

## 🔑 Key Concepts

### File Identifiers
- **`fileId`**: Database UUID (e.g., `clp1234567890abcdef`) - Use this for all API operations
- **`storageName`**: Cloud storage filename (e.g., `1640995200000_document.pdf`) - Internal use only

## 📤 Upload File

```bash
curl -X POST \
  http://localhost:3000/storage/upload/dropbox \
  -F "file=@document.pdf" \
  -F "folderPath=projects/q4"
```

**Response:**
```json
{
  "fileId": "clp1234567890abcdef",
  "url": "https://dropbox.com/s/abc123/document.pdf",
  "originalName": "document.pdf",
  "storageName": "1640995200000_document.pdf",
  "folderPath": "projects/q4",
  "message": "File uploaded successfully. Use fileId 'clp1234567890abcdef' for future operations."
}
```

## 📥 Download File

```bash
# Use the fileId from upload response
curl -X GET \
  http://localhost:3000/storage/download/dropbox/clp1234567890abcdef \
  --output document.pdf
```

**Optional Parameters:**
```bash
# Custom download filename
curl -X GET \
  "http://localhost:3000/storage/download/dropbox/clp1234567890abcdef?originalName=my-document.pdf"
```

## 🗑️ Delete File

```bash
# Use the fileId from upload response
curl -X DELETE \
  http://localhost:3000/storage/delete/dropbox/clp1234567890abcdef
```

## 📋 List Files

```bash
# List all files
curl -X GET http://localhost:3000/storage/list/dropbox

# List files in specific folder
curl -X GET "http://localhost:3000/storage/list/dropbox?folderPath=projects/q4"
```

## 🔍 Enhanced File Operations

### Get File Details
```bash
curl -X GET http://localhost:3000/storage/files/clp1234567890abcdef
```

### Update File Metadata
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

### Search Files
```bash
# Search by name and tags
curl -X GET \
  "http://localhost:3000/storage/files/search?name=project&tags=important,urgent&page=1&limit=20"
```

### Bulk Delete Files
```bash
curl -X DELETE \
  http://localhost:3000/storage/files/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "fileIds": ["clp1234567890abcdef", "clp0987654321fedcba"],
    "provider": "dropbox"
  }'
```

## 🏷️ Tag Management

### Create Tag
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

### Get All Tags
```bash
curl -X GET http://localhost:3000/storage/tags
```

## 📁 Folder Operations

### Create Folder
```bash
curl -X POST \
  http://localhost:3000/storage/dropbox/folder \
  -H "Content-Type: application/json" \
  -d '{"folderPath": "projects/q4"}'
```

### Delete Folder
```bash
curl -X DELETE \
  "http://localhost:3000/storage/dropbox/folder?folderPath=projects/q4"
```

## ⚡ Key Improvements

### Before (Inconsistent)
```bash
# Upload returns fileId
POST /storage/upload/dropbox → { "fileId": "clp123...", "storageName": "1640995200000_doc.pdf" }

# But download/delete used storageName (confusing!)
GET /storage/download/dropbox/1640995200000_doc.pdf
DELETE /storage/delete/dropbox/1640995200000_doc.pdf
```

### After (Consistent)
```bash
# Upload returns fileId
POST /storage/upload/dropbox → { "fileId": "clp123...", "storageName": "1640995200000_doc.pdf" }

# Download/delete use fileId (consistent!)
GET /storage/download/dropbox/clp123...
DELETE /storage/delete/dropbox/clp123...
```

## 🎯 Benefits

1. **Consistent API**: Always use `fileId` for operations
2. **Better UX**: No need to remember timestamped filenames
3. **Enhanced Features**: Metadata, tags, search, bulk operations
4. **Automatic Tracking**: Download counts, access times
5. **Provider Abstraction**: Cloud storage details are hidden

## 🔒 Security Notes

- File IDs are UUIDs, making them hard to guess
- Cloud storage filenames are abstracted from users
- Access tracking helps with audit trails
- Metadata supports custom security fields
