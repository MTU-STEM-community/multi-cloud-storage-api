# Health Check Module API Documentation

The Health Check Module provides comprehensive health monitoring endpoints for the Multi-Cloud Storage API, including application health status, liveness probes, and readiness checks.

## Base URL
```
http://localhost:3000/health
```

## 🏥 Health Check Endpoints

### Comprehensive Health Check
Get a complete health status report including database connectivity, memory usage, uptime, cloud provider status, and performance monitoring.

**Endpoint:** `GET /health`

**Example:**
```bash
curl -X GET http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-06-24T21:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "development",
  "checks": {
    "database": {
      "status": "ok",
      "responseTime": 45,
      "details": {
        "connection": "active",
        "pool": {
          "active": 2,
          "idle": 8,
          "total": 10
        }
      }
    },
    "memory": {
      "status": "ok",
      "usage": {
        "used": 134217728,
        "total": 2147483648,
        "percentage": 6.25
      },
      "heap": {
        "used": 89478485,
        "total": 1073741824,
        "percentage": 8.33
      }
    },
    "cloudProviders": {
      "status": "ok",
      "providers": [
        {
          "name": "dropbox",
          "status": "healthy",
          "responseTime": 250,
          "lastChecked": "2024-06-24T21:29:00.000Z"
        },
        {
          "name": "google-cloud",
          "status": "healthy",
          "responseTime": 180,
          "lastChecked": "2024-06-24T21:29:00.000Z"
        },
        {
          "name": "mega",
          "status": "degraded",
          "responseTime": 1200,
          "lastChecked": "2024-06-24T21:29:00.000Z",
          "warning": "High response time detected"
        }
      ]
    },
    "performance": {
      "status": "ok",
      "systemMetrics": {
        "averageResponseTime": 850,
        "successRate": 98.5,
        "totalRequests": 1250
      },
      "alerts": {
        "slowOperations": 2,
        "unhealthyProviders": 0,
        "degradedProviders": 1
      }
    }
  }
}
```

**Status Values:**
- `ok` - All systems are functioning normally
- `warning` - Some non-critical issues detected
- `error` - Critical issues that may affect functionality

### Liveness Probe
Simple endpoint to verify the application is running and responsive. Used by container orchestrators like Kubernetes.

**Endpoint:** `GET /health/liveness`

**Example:**
```bash
curl -X GET http://localhost:3000/health/liveness
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-06-24T21:30:00.000Z"
}
```

**Use Cases:**
- Kubernetes liveness probes
- Load balancer health checks
- Basic application monitoring
- Container restart decisions

### Readiness Probe
Check if the application is ready to accept traffic and handle requests. Includes basic dependency checks.

**Endpoint:** `GET /health/readiness`

**Example:**
```bash
curl -X GET http://localhost:3000/health/readiness
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-06-24T21:30:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "ok",
      "responseTime": 45
    },
    "dependencies": {
      "status": "ok",
      "services": [
        {
          "name": "prisma",
          "status": "connected"
        }
      ]
    }
  }
}
```

**Use Cases:**
- Kubernetes readiness probes
- Traffic routing decisions
- Deployment health validation
- Service mesh integration

## 📊 Health Status Indicators

### Overall Status
The overall health status is determined by the most critical issue found:

| Status | Description | HTTP Code |
|--------|-------------|-----------|
| `ok` | All systems healthy | 200 |
| `warning` | Non-critical issues detected | 200 |
| `error` | Critical issues affecting functionality | 503 |

### Database Health
- **Connection Status**: Active database connection
- **Response Time**: Database query response time in milliseconds
- **Connection Pool**: Active, idle, and total connections

### Memory Health
- **System Memory**: Total system memory usage
- **Heap Memory**: Node.js heap memory usage
- **Thresholds**: 
  - Warning: >80% memory usage
  - Critical: >95% memory usage

### Cloud Provider Health
Each cloud provider is monitored for:
- **Response Time**: API response time in milliseconds
- **Status**: healthy, degraded, or unhealthy
- **Last Checked**: Timestamp of last health check

**Provider Status Criteria:**
- `healthy`: Response time < 1000ms, no recent errors
- `degraded`: Response time 1000-3000ms or occasional errors
- `unhealthy`: Response time > 3000ms or frequent errors

### Performance Health
- **Average Response Time**: Overall API response time
- **Success Rate**: Percentage of successful requests
- **Total Requests**: Request count in monitoring period
- **Alerts**: Count of performance-related alerts

## 🔧 Configuration

### Health Check Intervals
- **Liveness**: Checked every 30 seconds
- **Readiness**: Checked every 10 seconds
- **Full Health**: Checked every 60 seconds
- **Provider Health**: Checked every 5 minutes

### Timeout Settings
- **Database Check**: 5 seconds
- **Provider Check**: 10 seconds
- **Memory Check**: 1 second

## 🚨 Error Responses

### Service Unavailable (503)
Returned when critical systems are unhealthy:

```json
{
  "status": "error",
  "timestamp": "2024-06-24T21:30:00.000Z",
  "message": "Service temporarily unavailable",
  "checks": {
    "database": {
      "status": "error",
      "error": "Connection timeout after 5000ms",
      "responseTime": 5000
    }
  }
}
```

### Partial Degradation (200 with warnings)
Returned when some non-critical systems have issues:

```json
{
  "status": "warning",
  "timestamp": "2024-06-24T21:30:00.000Z",
  "message": "Some services are degraded",
  "checks": {
    "cloudProviders": {
      "status": "warning",
      "providers": [
        {
          "name": "mega",
          "status": "degraded",
          "responseTime": 2500,
          "warning": "High response time detected"
        }
      ]
    }
  }
}
```

## 🎯 Best Practices

### For Monitoring Systems
1. **Use liveness probes** for basic application health
2. **Use readiness probes** for traffic routing decisions
3. **Use full health checks** for detailed monitoring and alerting
4. **Set appropriate timeouts** based on your infrastructure requirements

### For Development
1. **Monitor all health endpoints** during development
2. **Test failure scenarios** to ensure proper error handling
3. **Configure alerts** based on health status changes
4. **Use health data** for performance optimization

### For Production
1. **Implement circuit breakers** based on health status
2. **Configure auto-scaling** using health metrics
3. **Set up monitoring dashboards** with health data
4. **Plan maintenance windows** using health trends

## 🔗 Integration Examples

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: multi-cloud-storage-api
spec:
  template:
    spec:
      containers:
      - name: api
        image: multi-cloud-storage-api:latest
        livenessProbe:
          httpGet:
            path: /health/liveness
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
          timeoutSeconds: 5
        readinessProbe:
          httpGet:
            path: /health/readiness
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
```

### Docker Compose Health Check
```yaml
version: '3.8'
services:
  api:
    image: multi-cloud-storage-api:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health/liveness"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Load Balancer Configuration
```nginx
upstream api_backend {
    server api1:3000;
    server api2:3000;
}

location /health {
    proxy_pass http://api_backend;
    proxy_connect_timeout 5s;
    proxy_read_timeout 10s;
}
```
