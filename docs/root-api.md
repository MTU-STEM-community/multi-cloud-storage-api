# Root API Documentation

The Root API provides basic application information and entry points for the Multi-Cloud Storage API.

## Base URL
```
http://localhost:3000
```

## 🏠 Root Endpoints

### Application Welcome
Get basic application information and welcome message.

**Endpoint:** `GET /`

**Example:**
```bash
curl -X GET http://localhost:3000/
```

**Response:**
```
Hello World!
```

**Description:**
This is the basic root endpoint that returns a simple welcome message. It serves as a basic health check to verify the application is running and responsive.

**Use Cases:**
- Basic connectivity test
- Load balancer health check
- Simple application status verification
- Development environment testing

## 📚 API Documentation Access

### Swagger/OpenAPI Documentation
Access the interactive API documentation powered by Swagger UI.

**Endpoint:** `GET /api/docs`

**Example:**
Open in browser: `http://localhost:3000/api/docs`

**Features:**
- Interactive API explorer
- Complete endpoint documentation
- Request/response examples
- Authentication testing
- Schema definitions
- Try-it-out functionality

**Description:**
The Swagger UI provides a comprehensive, interactive documentation interface for all API endpoints. It includes:

- **Complete API Reference**: All endpoints with detailed descriptions
- **Request Examples**: Sample requests for each endpoint
- **Response Schemas**: Detailed response structure documentation
- **Authentication**: API key and authentication testing
- **Interactive Testing**: Execute API calls directly from the documentation
- **Schema Validation**: Request/response validation examples

### OpenAPI Specification
Access the raw OpenAPI specification in JSON format.

**Endpoint:** `GET /api/docs-json`

**Example:**
```bash
curl -X GET http://localhost:3000/api/docs-json
```

**Response:**
```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Multi-Cloud Storage API",
    "description": "API for managing files across multiple cloud providers",
    "version": "1.0",
    "contact": {},
    "license": {}
  },
  "servers": [
    {
      "url": "http://localhost:3000"
    }
  ],
  "tags": [
    {
      "name": "storage",
      "description": "File storage operations across multiple cloud providers"
    },
    {
      "name": "monitoring",
      "description": "Performance monitoring and metrics"
    },
    {
      "name": "health",
      "description": "Application health checks and status"
    }
  ],
  "paths": {
    "/storage/upload/{provider}": {
      "post": {
        "tags": ["storage"],
        "summary": "Upload file to cloud storage",
        "description": "Upload a file to the specified cloud storage provider with optional folder path",
        "operationId": "uploadFile",
        "parameters": [
          {
            "name": "provider",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "enum": ["google-cloud", "dropbox", "mega", "google-drive", "backblaze", "onedrive"]
            }
          }
        ]
      }
    }
  }
}
```

**Use Cases:**
- API client generation
- Integration with API management tools
- Automated testing setup
- Documentation generation
- Schema validation

## 🔗 API Navigation

### Available API Modules

The Multi-Cloud Storage API is organized into several modules:

#### 1. Storage Module (`/storage`)
**Base Path:** `/storage`
**Documentation:** [Storage API Documentation](./storage-api.md)

**Key Features:**
- File upload/download operations
- Multi-provider file management
- Bulk operations
- Folder management
- File metadata and tagging
- Search functionality

**Main Endpoints:**
- `POST /storage/upload/{provider}` - Upload files
- `GET /storage/download/{provider}/{fileId}` - Download files
- `DELETE /storage/delete/{provider}/{fileId}` - Delete files
- `GET /storage/list/{provider}` - List files
- `POST /storage/multi-provider-upload` - Multi-provider upload
- `DELETE /storage/multi-provider-delete` - Multi-provider delete

#### 2. Health Check Module (`/health`)
**Base Path:** `/health`
**Documentation:** [Health Check API Documentation](./health-check-api.md)

**Key Features:**
- Comprehensive health monitoring
- Liveness and readiness probes
- Database connectivity checks
- Cloud provider health status
- Performance health indicators

**Main Endpoints:**
- `GET /health` - Comprehensive health check
- `GET /health/liveness` - Basic liveness probe
- `GET /health/readiness` - Readiness probe

#### 3. Monitoring Module (`/monitoring`)
**Base Path:** `/monitoring`
**Documentation:** [Monitoring API Documentation](./monitoring-api.md)

**Key Features:**
- System performance metrics
- Provider performance analysis
- Detailed operation analytics
- Slow operation identification
- Performance dashboard data

**Main Endpoints:**
- `GET /monitoring/performance/system` - System metrics
- `GET /monitoring/performance/providers` - Provider performance
- `GET /monitoring/performance/metrics` - Detailed metrics
- `GET /monitoring/dashboard` - Dashboard data

## 🚀 Getting Started

### Quick Start Guide

1. **Verify Application Status**
   ```bash
   curl -X GET http://localhost:3000/
   ```

2. **Check Application Health**
   ```bash
   curl -X GET http://localhost:3000/health
   ```

3. **Explore API Documentation**
   Open `http://localhost:3000/api/docs` in your browser

4. **Upload Your First File**
   ```bash
   curl -X POST \
     http://localhost:3000/storage/upload/dropbox \
     -F "file=@your-file.pdf"
   ```

5. **Monitor Performance**
   ```bash
   curl -X GET http://localhost:3000/monitoring/performance/system
   ```

### API Versioning

**Current Version:** `1.0`

The API follows semantic versioning principles:
- **Major Version**: Breaking changes
- **Minor Version**: New features, backward compatible
- **Patch Version**: Bug fixes, backward compatible

**Version Information:**
- Version is included in the OpenAPI specification
- No version prefix in URLs (current version is default)
- Future versions may include version prefixes (e.g., `/v2/storage/upload`)

### Rate Limiting

**Current Status:** No rate limiting implemented

**Future Considerations:**
- Rate limiting may be implemented based on usage patterns
- Limits would be applied per IP address or API key
- Standard HTTP headers would be used for rate limit information

### Authentication

**Current Status:** No authentication required

**Security Considerations:**
- Authentication may be required for production deployments
- Supported methods may include API keys, JWT tokens, or OAuth
- Security headers and CORS policies should be configured appropriately

## 🔧 Configuration

### Environment-Specific URLs

**Development:**
```
http://localhost:3000
```

**Production:**
```
https://your-domain.com
```

**Docker:**
```
http://container-name:3000
```

### CORS Configuration

The API supports Cross-Origin Resource Sharing (CORS) for web applications:

**Allowed Origins:** Configurable via environment variables
**Allowed Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS
**Allowed Headers:** Content-Type, Authorization, Accept

### Content Types

**Supported Request Content Types:**
- `application/json` - JSON data
- `multipart/form-data` - File uploads
- `application/x-www-form-urlencoded` - Form data

**Response Content Types:**
- `application/json` - JSON responses
- `application/octet-stream` - File downloads
- `text/plain` - Simple text responses

## 🎯 Best Practices

### API Usage Guidelines

1. **Use Appropriate HTTP Methods**
   - GET for retrieving data
   - POST for creating resources
   - PUT/PATCH for updating resources
   - DELETE for removing resources

2. **Handle Errors Gracefully**
   - Check HTTP status codes
   - Parse error response messages
   - Implement retry logic for transient errors

3. **Use Proper Content Types**
   - Set correct Content-Type headers
   - Handle multipart/form-data for file uploads
   - Accept appropriate response formats

4. **Monitor API Usage**
   - Use health check endpoints for monitoring
   - Track performance metrics
   - Set up alerts for critical issues

### Integration Examples

**JavaScript/Node.js:**
```javascript
const response = await fetch('http://localhost:3000/health');
const health = await response.json();
console.log('API Status:', health.status);
```

**Python:**
```python
import requests

response = requests.get('http://localhost:3000/health')
health = response.json()
print(f"API Status: {health['status']}")
```

**cURL:**
```bash
curl -X GET http://localhost:3000/health | jq '.status'
```
