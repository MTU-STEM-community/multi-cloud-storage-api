# Multi-Cloud Storage API

A NestJS application for managing files across multiple cloud storage providers (Google Cloud Storage, Dropbox).

## Features

- Upload files to Google Cloud Storage or Dropbox
- List files from cloud providers
- Download files from cloud providers
- Delete files from cloud providers
- Secure API with proper error handling
- Swagger documentation

## Installation

```bash
# Clone the repository
git clone <repo-url>

# Install dependencies
npm install

# Set up environment variables (see below)
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/multi_cloud_storage?schema=public"

# Encryption
ENCRYPTION_SECRET="your-secure-encryption-key"

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT_ID="your-google-cloud-project-id"
GOOGLE_CLOUD_BUCKET_NAME="your-google-cloud-bucket"
GOOGLE_CLOUD_KEYFILE_PATH="./google-service-account.json"
GOOGLE_API_KEY="your-google-api-key"

# Dropbox
DROPBOX_ACCESS_TOKEN="your-dropbox-access-token"
```

## Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

## Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Documentation

Swagger documentation is available at `http://localhost:3000/api` when the application is running.

## API Endpoints

### Upload File

```
POST /storage/upload/:provider
```

- Uploads a file to the specified cloud provider
- Parameters:
  - `provider`: Cloud provider name (`google` or `dropbox`)
- Body: Form data with a `file` field
- Returns: URL to access the uploaded file

### List Files

```
GET /storage/list/:provider
```

- Lists all files from the specified cloud provider
- Parameters:
  - `provider`: Cloud provider name (`google` or `dropbox`)
- Returns: Array of file objects with metadata

### Download File

```
GET /storage/download/:provider/:fileId
```

- Downloads a file from the specified cloud provider
- Parameters:
  - `provider`: Cloud provider name (`google` or `dropbox`)
  - `fileId`: ID or name of the file to download
  - `originalName` (optional query param): Original file name for the download
- Returns: The file content with appropriate headers for download

### Delete File

```
DELETE /storage/delete/:provider/:fileId
```

- Deletes a file from the specified cloud provider
- Parameters:
  - `provider`: Cloud provider name (`google` or `dropbox`)
  - `fileId`: ID or name of the file to delete
- Returns: Success message

## File Naming

Files are automatically renamed when uploaded to ensure uniqueness by adding a timestamp prefix.
For example, uploading `document.txt` will store it as `1747134130426_document.txt`.

When downloading files:
- Use the full name with timestamp (as shown in the list endpoint) in the `fileId` parameter
- If you want the file to download with its original name, include the `originalName` query parameter

## Example Usage

```bash
# Upload a file to Dropbox
curl -X POST http://localhost:3000/storage/upload/dropbox \
  -H "Content-Type: multipart/form-data" \
  -F "file=@./test-files/testdoc.txt"

# List files in Dropbox
curl -X GET http://localhost:3000/storage/list/dropbox

# Download a file from Dropbox (with timestamp name)
curl -X GET http://localhost:3000/storage/download/dropbox/1747134130426_testdoc.txt \
  -o downloaded_file.txt

# Download a file from Dropbox (with original name)
curl -X GET "http://localhost:3000/storage/download/dropbox/1747134130426_testdoc.txt?originalName=testdoc.txt" \
  -o testdoc.txt

# Delete a file from Dropbox
curl -X DELETE http://localhost:3000/storage/delete/dropbox/1747134130426_testdoc.txt
```
