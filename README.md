# Multi-Cloud Storage API

A comprehensive NestJS application for managing files across multiple cloud storage providers with advanced features including performance monitoring, health checks, and multi-provider operations.

## 🌟 Features

### 📤 File Management
- **Multi-Provider Support**: Google Cloud Storage, Dropbox, MEGA, Google Drive, Backblaze, OneDrive
- **Single & Bulk Operations**: Upload, download, delete single files or multiple files at once
- **Multi-Provider Operations**: Upload/delete the same file across multiple providers simultaneously
- **Folder Management**: Create and delete folders across cloud providers
- **File Metadata**: Rich metadata support with tags, descriptions, and custom properties
- **Advanced Search**: Search files by name, tags, content type, and custom metadata

### 🔍 Monitoring & Analytics
- **Performance Monitoring**: Real-time system and provider performance metrics
- **Detailed Analytics**: Operation-level metrics with filtering and trend analysis
- **Slow Operation Detection**: Identify and analyze performance bottlenecks
- **Provider Health Monitoring**: Track the health status of each cloud provider
- **Dashboard Data**: Comprehensive dashboard data for monitoring tools

### 🏥 Health Checks
- **Comprehensive Health Checks**: Database, memory, uptime, and provider status
- **Kubernetes-Ready**: Liveness and readiness probes for container orchestration
- **Performance Health**: Integration with performance monitoring for health status

### 🔧 Developer Experience
- **Interactive API Documentation**: Swagger/OpenAPI documentation with try-it-out functionality
- **Consistent API Design**: UUID-based file identifiers for all operations
- **Error Handling**: Comprehensive error responses with detailed messages
- **Retry Logic**: Built-in retry mechanisms for multi-provider operations

## Installation

```bash
# Clone the repository
git clone <repo-url>

# Install dependencies
npm install

# Set up environment variables (see below)
```

## 📚 API Documentation

### Complete API Reference
- **[Storage API](./docs/storage-api.md)** - File upload, download, delete, bulk operations, multi-provider operations, folder management, metadata, and search
- **[Health Check API](./docs/health-check-api.md)** - Application health monitoring, liveness and readiness probes
- **[Monitoring API](./docs/monitoring-api.md)** - Performance metrics, provider analytics, and dashboard data
- **[Root API](./docs/root-api.md)** - Basic application endpoints and API navigation
- **[Interactive Documentation](http://localhost:3000/api/docs)** - Swagger UI (when application is running)

### Quick API Overview

| Module | Base Path | Purpose | Key Endpoints |
|--------|-----------|---------|---------------|
| **Storage** | `/storage` | File operations | Upload, Download, Delete, List, Search |
| **Health** | `/health` | Health monitoring | Health check, Liveness, Readiness |
| **Monitoring** | `/monitoring` | Performance metrics | System metrics, Provider performance |
| **Root** | `/` | Basic info | Welcome message, API docs |

## 🚀 Supported Cloud Providers

| Provider | Status | Features |
|----------|--------|----------|
| **Google Cloud Storage** | ❌ Currently Inactive | Offline |
| **Dropbox** | ✅ Active | Full support |
| **MEGA** | ✅ Active | Full support |
| **Google Drive** | ✅ Active | Full support |
| **Backblaze B2** | ✅ Active | Full support |
| **Microsoft OneDrive** | ❌ Currently Inactive | Offline |

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
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

# MEGA
MEGA_EMAIL="your-mega-email"
MEGA_PASSWORD="your-mega-password"

# Google Drive
GOOGLE_DRIVE_CLIENT_ID="your-google-drive-client-id"
GOOGLE_DRIVE_CLIENT_SECRET="your-google-drive-client-secret"
GOOGLE_DRIVE_REFRESH_TOKEN="your-google-drive-refresh-token"

# Backblaze B2
BACKBLAZE_APPLICATION_KEY_ID="your-backblaze-key-id"
BACKBLAZE_APPLICATION_KEY="your-backblaze-application-key"
BACKBLAZE_BUCKET_ID="your-backblaze-bucket-id"

# OneDrive
ONEDRIVE_CLIENT_ID="your-onedrive-client-id"
ONEDRIVE_CLIENT_SECRET="your-onedrive-client-secret"
ONEDRIVE_REFRESH_TOKEN="your-onedrive-refresh-token"
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

# Watch mode (auto-restart on changes)
npm run start:dev

# Debug mode
npm run start:debug
```

The application will be available at:
- **API Base URL**: `http://localhost:3000`
- **Interactive Documentation**: `http://localhost:3000/api/docs`
- **Health Check**: `http://localhost:3000/health`
- **Performance Dashboard**: `http://localhost:3000/monitoring/dashboard`

## 🚀 Quick Start Examples

### Basic File Operations

```bash
# 1. Check API health
curl -X GET http://localhost:3000/health

# 2. Upload a file to Dropbox
curl -X POST \
  http://localhost:3000/storage/upload/dropbox \
  -F "file=@document.pdf" \
  -F "folderPath=projects/q4"

# 3. List files in Dropbox
curl -X GET http://localhost:3000/storage/list/dropbox

# 4. Download a file (use fileId from upload response)
curl -X GET \
  http://localhost:3000/storage/download/dropbox/clp1234567890abcdef \
  --output document.pdf

# 5. Delete a file
curl -X DELETE \
  http://localhost:3000/storage/delete/dropbox/clp1234567890abcdef
```

### Advanced Operations

```bash
# Multi-provider upload (upload to multiple providers at once)
curl -X POST \
  http://localhost:3000/storage/multi-provider-upload \
  -F "file=@document.pdf" \
  -F 'providers=["dropbox", "google-cloud"]'

# Bulk upload multiple files
curl -X POST \
  http://localhost:3000/storage/bulk-upload/dropbox \
  -F "files=@document1.pdf" \
  -F "files=@document2.pdf"

# Search files by tags and name
curl -X GET \
  "http://localhost:3000/storage/files/search?name=project&tags=important,urgent"

# Get performance metrics
curl -X GET http://localhost:3000/monitoring/performance/system
```

### File Management Features

```bash
# Update file metadata and tags
curl -X PATCH \
  http://localhost:3000/storage/files/clp1234567890abcdef/metadata \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Important Q4 planning document",
    "tags": ["project", "important", "q4"],
    "metadata": {"department": "engineering"}
  }'

# Create a folder
curl -X POST \
  http://localhost:3000/storage/dropbox/folder \
  -H "Content-Type: application/json" \
  -d '{"folderPath": "projects/q4"}'

# Bulk delete files
curl -X DELETE \
  http://localhost:3000/storage/files/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "fileIds": ["clp1234567890abcdef", "clp0987654321fedcba"],
    "provider": "dropbox"
  }'
```

## 🔑 Key Concepts

### File Identifiers
- **`fileId`**: Database UUID (e.g., `clp1234567890abcdef`) - Use this for all API operations
- **`storageName`**: Cloud storage filename (e.g., `1640995200000_document.pdf`) - Internal use only

### Multi-Provider Operations
- Files can be stored across multiple cloud providers simultaneously
- Each file has a single `fileId` but can have multiple cloud storage locations
- Operations support retry logic for failed providers

### Performance Monitoring
- All operations are automatically tracked for performance metrics
- Real-time monitoring of response times, success rates, and error patterns
- Provider-specific performance analysis and health monitoring

## 🏗️ Architecture Overview

### Technology Stack
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **Documentation**: Swagger/OpenAPI
- **Monitoring**: Custom performance tracking
- **Cloud SDKs**: Official provider SDKs for each cloud service

### Project Structure
```
src/
├── storage/           # File storage operations
├── monitoring/        # Performance monitoring
├── health-check/      # Health check endpoints
├── providers/         # Cloud provider implementations
│   ├── dropbox/
│   ├── google-cloud/
│   ├── mega/
│   ├── google-drive/
│   ├── backblaze/
│   └── onedrive/
├── common/           # Shared utilities and decorators
└── prisma/           # Database schema and client
```

### Database Schema
- **File**: Core file metadata and information
- **CloudStorage**: Provider-specific storage details
- **FileTag**: Tagging system for file organization
- **Many-to-Many**: Files can exist on multiple providers

## 🔧 Development

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- Cloud provider accounts and credentials

### Development Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
npx prisma generate
npx prisma migrate dev

# Start development server
npm run start:dev
```

### Testing
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Code Quality
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## 🚀 Deployment

### Docker Deployment
```bash
# Build image
docker build -t multi-cloud-storage-api .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="your-database-url" \
  -e DROPBOX_ACCESS_TOKEN="your-token" \
  multi-cloud-storage-api
```

### Docker Compose
```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/storage
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=storage
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: multi-cloud-storage-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: multi-cloud-storage-api
  template:
    metadata:
      labels:
        app: multi-cloud-storage-api
    spec:
      containers:
      - name: api
        image: multi-cloud-storage-api:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health/liveness
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health/readiness
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
```

## 📊 Monitoring and Observability

### Built-in Monitoring
- **Performance Metrics**: Response times, success rates, throughput
- **Provider Health**: Individual cloud provider status monitoring
- **System Health**: Memory usage, uptime, database connectivity
- **Error Tracking**: Detailed error logging and categorization

### Integration with External Tools
- **Prometheus**: Metrics export for monitoring systems
- **Grafana**: Dashboard templates for visualization
- **Kubernetes**: Health check endpoints for orchestration
- **Load Balancers**: Health endpoints for traffic routing

### Alerting
Configure alerts based on:
- High response times (>2000ms)
- Low success rates (<95%)
- Provider degradation
- System resource usage
- Error rate spikes

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

### Code Standards
- Follow NestJS conventions
- Use TypeScript strictly
- Write comprehensive tests
- Document API changes
- Update relevant documentation

### Commit Message Format
```
type(scope): description

feat(storage): add multi-provider upload support
fix(monitoring): resolve memory leak in metrics collection
docs(api): update storage endpoint documentation
```


## 🆘 Support

### Documentation
- [Storage API Documentation](./docs/storage-api.md)
- [Health Check API Documentation](./docs/health-check-api.md)
- [Monitoring API Documentation](./docs/monitoring-api.md)
- [Interactive API Docs](http://localhost:3000/api/docs)

### Getting Help
- Check the documentation first
- Review existing GitHub issues
- Create a new issue with detailed information
- Include relevant logs and configuration

### Common Issues
- **Database Connection**: Verify DATABASE_URL and PostgreSQL service
- **Provider Authentication**: Check cloud provider credentials
- **File Upload Limits**: Review provider-specific file size limits
- **Performance Issues**: Use monitoring endpoints to identify bottlenecks
