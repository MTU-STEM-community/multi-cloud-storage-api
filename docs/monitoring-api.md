# Monitoring Module API Documentation

The Monitoring Module provides comprehensive performance monitoring and metrics collection for the Multi-Cloud Storage API, including system metrics, provider performance analysis, and operational insights.

## Base URL
```
http://localhost:3000/monitoring
```

## 📊 System Performance Endpoints

### System Metrics Overview
Get comprehensive system performance data including response times, success rates, memory usage, and uptime statistics.

**Endpoint:** `GET /monitoring/performance/system`

**Example:**
```bash
curl -X GET http://localhost:3000/monitoring/performance/system
```

**Response:**
```json
{
  "timestamp": "2024-06-24T21:30:00.000Z",
  "timeRange": "last_24_hours",
  "system": {
    "averageResponseTime": 850,
    "successRate": 98.5,
    "totalRequests": 1250,
    "errorRate": 1.5,
    "uptime": 86400,
    "memoryUsage": {
      "used": 134217728,
      "total": 2147483648,
      "percentage": 6.25
    },
    "cpuUsage": {
      "percentage": 15.3,
      "loadAverage": [0.8, 0.9, 1.1]
    }
  },
  "operationBreakdown": {
    "upload": {
      "count": 450,
      "averageTime": 1200,
      "successRate": 97.8
    },
    "download": {
      "count": 380,
      "averageTime": 650,
      "successRate": 99.2
    },
    "delete": {
      "count": 120,
      "averageTime": 400,
      "successRate": 98.3
    },
    "list": {
      "count": 300,
      "averageTime": 300,
      "successRate": 99.7
    }
  }
}
```

### Provider Performance Analysis
Get performance metrics for each cloud storage provider including response times, success rates, and health status.

**Endpoint:** `GET /monitoring/performance/providers`

**Example:**
```bash
curl -X GET http://localhost:3000/monitoring/performance/providers
```

**Response:**
```json
[
  {
    "provider": "google-cloud",
    "averageResponseTime": 750,
    "successRate": 99.2,
    "totalOperations": 450,
    "lastChecked": "2024-06-24T21:29:00.000Z",
    "status": "healthy",
    "operationBreakdown": {
      "upload": {
        "count": 180,
        "averageTime": 950,
        "successRate": 98.9
      },
      "download": {
        "count": 150,
        "averageTime": 580,
        "successRate": 99.3
      },
      "delete": {
        "count": 70,
        "averageTime": 420,
        "successRate": 100.0
      },
      "list": {
        "count": 50,
        "averageTime": 280,
        "successRate": 100.0
      }
    }
  },
  {
    "provider": "dropbox",
    "averageResponseTime": 920,
    "successRate": 97.8,
    "totalOperations": 380,
    "lastChecked": "2024-06-24T21:29:00.000Z",
    "status": "healthy",
    "operationBreakdown": {
      "upload": {
        "count": 150,
        "averageTime": 1100,
        "successRate": 96.7
      },
      "download": {
        "count": 120,
        "averageTime": 750,
        "successRate": 98.3
      },
      "delete": {
        "count": 60,
        "averageTime": 380,
        "successRate": 98.3
      },
      "list": {
        "count": 50,
        "averageTime": 320,
        "successRate": 100.0
      }
    }
  },
  {
    "provider": "mega",
    "averageResponseTime": 1850,
    "successRate": 94.2,
    "totalOperations": 200,
    "lastChecked": "2024-06-24T21:29:00.000Z",
    "status": "degraded",
    "warning": "High response time and lower success rate detected",
    "operationBreakdown": {
      "upload": {
        "count": 80,
        "averageTime": 2200,
        "successRate": 92.5
      },
      "download": {
        "count": 70,
        "averageTime": 1600,
        "successRate": 95.7
      },
      "delete": {
        "count": 30,
        "averageTime": 1200,
        "successRate": 96.7
      },
      "list": {
        "count": 20,
        "averageTime": 800,
        "successRate": 95.0
      }
    }
  }
]
```

### Hourly Performance Summary
Get performance summary for different operations in the last hour, useful for real-time monitoring.

**Endpoint:** `GET /monitoring/performance/summary`

**Example:**
```bash
curl -X GET http://localhost:3000/monitoring/performance/summary
```

**Response:**
```json
{
  "timestamp": "2024-06-24T21:30:00.000Z",
  "timeRange": "last_hour",
  "summary": {
    "totalOperations": 85,
    "averageResponseTime": 780,
    "successRate": 98.8,
    "errorCount": 1
  },
  "operationTypes": {
    "upload": {
      "count": 25,
      "averageTime": 1150,
      "successRate": 96.0,
      "errors": 1
    },
    "download": {
      "count": 35,
      "averageTime": 620,
      "successRate": 100.0,
      "errors": 0
    },
    "delete": {
      "count": 15,
      "averageTime": 450,
      "successRate": 100.0,
      "errors": 0
    },
    "list": {
      "count": 10,
      "averageTime": 280,
      "successRate": 100.0,
      "errors": 0
    }
  },
  "providerBreakdown": {
    "google-cloud": {
      "operations": 35,
      "averageTime": 680,
      "successRate": 100.0
    },
    "dropbox": {
      "operations": 30,
      "averageTime": 820,
      "successRate": 100.0
    },
    "mega": {
      "operations": 20,
      "averageTime": 950,
      "successRate": 95.0
    }
  }
}
```

## 🔍 Detailed Analytics Endpoints

### Detailed Performance Metrics
Get detailed performance metrics with optional filtering by time period, operation type, and provider.

**Endpoint:** `GET /monitoring/performance/metrics`

**Query Parameters:**
- `hours` (optional) - Number of hours to look back (default: 24, max: 168)
- `operation` (optional) - Filter by operation type (upload, download, delete, list)
- `provider` (optional) - Filter by cloud storage provider
- `minDuration` (optional) - Filter operations with minimum duration in ms
- `maxDuration` (optional) - Filter operations with maximum duration in ms

**Example:**
```bash
# Get metrics for last 12 hours
curl -X GET "http://localhost:3000/monitoring/performance/metrics?hours=12"

# Get upload metrics for Google Cloud
curl -X GET "http://localhost:3000/monitoring/performance/metrics?operation=upload&provider=google-cloud"

# Get slow operations (>2 seconds)
curl -X GET "http://localhost:3000/monitoring/performance/metrics?minDuration=2000"
```

**Response:**
```json
{
  "timeRange": {
    "start": "2024-06-24T09:30:00.000Z",
    "end": "2024-06-24T21:30:00.000Z",
    "hours": 12
  },
  "filters": {
    "operation": "upload",
    "provider": "google-cloud"
  },
  "summary": {
    "totalOperations": 180,
    "averageResponseTime": 950,
    "successRate": 98.9,
    "errorCount": 2
  },
  "metrics": [
    {
      "timestamp": "2024-06-24T21:25:00.000Z",
      "operation": "upload",
      "provider": "google-cloud",
      "duration": 850,
      "success": true,
      "fileSize": 1024000,
      "contentType": "application/pdf"
    },
    {
      "timestamp": "2024-06-24T21:20:00.000Z",
      "operation": "upload",
      "provider": "google-cloud",
      "duration": 1200,
      "success": true,
      "fileSize": 2048000,
      "contentType": "image/jpeg"
    }
  ],
  "trends": {
    "hourlyAverages": [
      {
        "hour": "2024-06-24T21:00:00.000Z",
        "averageTime": 920,
        "operationCount": 15,
        "successRate": 100.0
      },
      {
        "hour": "2024-06-24T20:00:00.000Z",
        "averageTime": 880,
        "operationCount": 18,
        "successRate": 94.4
      }
    ]
  }
}
```

### Slow Operations Analysis
Identify and analyze operations that exceed specified performance thresholds.

**Endpoint:** `GET /monitoring/performance/slow-operations`

**Query Parameters:**
- `threshold` (optional) - Minimum duration in milliseconds to consider "slow" (default: 5000)
- `hours` (optional) - Number of hours to look back (default: 24)
- `limit` (optional) - Maximum number of results to return (default: 50)

**Example:**
```bash
# Get operations slower than 3 seconds in last 6 hours
curl -X GET "http://localhost:3000/monitoring/performance/slow-operations?threshold=3000&hours=6"
```

**Response:**
```json
{
  "threshold": 3000,
  "timeRange": "last_6_hours",
  "slowOperations": [
    {
      "operation": "upload",
      "provider": "mega",
      "duration": 8500,
      "timestamp": "2024-06-24T20:15:00.000Z",
      "success": false,
      "error": "Connection timeout",
      "fileSize": 5242880,
      "contentType": "video/mp4"
    },
    {
      "operation": "download",
      "provider": "mega",
      "duration": 6200,
      "timestamp": "2024-06-24T19:45:00.000Z",
      "success": true,
      "fileSize": 3145728,
      "contentType": "application/zip"
    }
  ],
  "summary": {
    "totalSlowOperations": 15,
    "slowestOperation": 12000,
    "averageSlowDuration": 7200,
    "providerBreakdown": {
      "mega": 12,
      "dropbox": 2,
      "google-cloud": 1
    },
    "operationBreakdown": {
      "upload": 8,
      "download": 5,
      "delete": 2
    }
  }
}
```

## 📈 Dashboard and Overview Endpoints

### Performance Dashboard
Get comprehensive dashboard data including system metrics, provider performance, recent activity, and alerts for monitoring overview.

**Endpoint:** `GET /monitoring/dashboard`

**Example:**
```bash
curl -X GET http://localhost:3000/monitoring/dashboard
```

**Response:**
```json
{
  "timestamp": "2024-06-24T21:30:00.000Z",
  "system": {
    "averageResponseTime": 850,
    "successRate": 98.5,
    "totalRequests": 1250,
    "uptime": 86400,
    "memoryUsage": {
      "percentage": 6.25
    }
  },
  "providers": [
    {
      "provider": "google-cloud",
      "averageResponseTime": 750,
      "successRate": 99.2,
      "totalOperations": 450,
      "status": "healthy"
    },
    {
      "provider": "dropbox",
      "averageResponseTime": 920,
      "successRate": 97.8,
      "totalOperations": 380,
      "status": "healthy"
    },
    {
      "provider": "mega",
      "averageResponseTime": 1850,
      "successRate": 94.2,
      "totalOperations": 200,
      "status": "degraded"
    }
  ],
  "hourlyActivity": {
    "totalOperations": 85,
    "averageResponseTime": 780,
    "successRate": 98.8,
    "operationTypes": {
      "upload": 25,
      "download": 35,
      "delete": 15,
      "list": 10
    }
  },
  "alerts": {
    "slowOperations": 3,
    "unhealthyProviders": 0,
    "degradedProviders": 1,
    "lowSuccessRate": false
  },
  "recentSlowOperations": [
    {
      "operation": "upload",
      "provider": "mega",
      "duration": 8500,
      "timestamp": "2024-06-24T20:15:00.000Z",
      "error": "Connection timeout"
    },
    {
      "operation": "download",
      "provider": "mega",
      "duration": 6200,
      "timestamp": "2024-06-24T19:45:00.000Z"
    }
  ]
}
```

## 📊 Metrics and KPIs

### Key Performance Indicators
The monitoring system tracks several important KPIs:

#### Response Time Metrics
- **Average Response Time**: Mean response time across all operations
- **95th Percentile**: 95% of requests complete within this time
- **99th Percentile**: 99% of requests complete within this time
- **Maximum Response Time**: Slowest operation in the time period

#### Success Rate Metrics
- **Overall Success Rate**: Percentage of successful operations
- **Provider Success Rate**: Success rate per cloud provider
- **Operation Success Rate**: Success rate per operation type

#### Throughput Metrics
- **Requests Per Second**: Average request rate
- **Operations Per Hour**: Hourly operation count
- **Peak Throughput**: Maximum requests handled per second

#### Error Metrics
- **Error Rate**: Percentage of failed operations
- **Error Count**: Total number of errors
- **Error Types**: Breakdown of error categories

### Performance Thresholds

#### Response Time Thresholds
- **Good**: < 1000ms
- **Acceptable**: 1000-3000ms
- **Poor**: > 3000ms

#### Success Rate Thresholds
- **Excellent**: > 99%
- **Good**: 95-99%
- **Poor**: < 95%

#### Provider Health Status
- **Healthy**: Success rate > 95%, avg response time < 1000ms
- **Degraded**: Success rate 90-95% or avg response time 1000-3000ms
- **Unhealthy**: Success rate < 90% or avg response time > 3000ms

## 🚨 Alerting and Notifications

### Alert Conditions
The monitoring system generates alerts for:

1. **High Response Time**: Average response time > 2000ms for 5+ minutes
2. **Low Success Rate**: Success rate < 95% for 10+ minutes
3. **Provider Degradation**: Provider response time > 3000ms or success rate < 90%
4. **High Error Rate**: Error rate > 5% for 5+ minutes
5. **Memory Usage**: Memory usage > 80% for 10+ minutes
6. **Slow Operations**: More than 10 operations > 5000ms in 1 hour

### Alert Severity Levels
- **Critical**: Service-affecting issues requiring immediate attention
- **Warning**: Performance degradation that should be investigated
- **Info**: Notable events for awareness

## 🎯 Best Practices

### For Operations Teams
1. **Set up dashboards** using the dashboard endpoint for real-time monitoring
2. **Configure alerts** based on your SLA requirements
3. **Monitor trends** to identify performance degradation early
4. **Use provider metrics** to optimize cloud storage selection

### For Development Teams
1. **Monitor during deployments** to catch performance regressions
2. **Use detailed metrics** to identify bottlenecks
3. **Track slow operations** to optimize code paths
4. **Monitor error patterns** to improve error handling

### For Business Teams
1. **Track success rates** to measure service reliability
2. **Monitor costs** by correlating usage with provider performance
3. **Plan capacity** using throughput and trend data
4. **Optimize provider mix** based on performance data
