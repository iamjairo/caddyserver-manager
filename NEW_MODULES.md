# New Modules Documentation

## Version 3.0.0 - Major Feature Expansion

This document details all the new modules added to Caddy Manager v3.0.0, including their purpose, API endpoints, and usage examples.

---

## Table of Contents

1. [API Token Management](#api-token-management)
2. [Audit Logging System](#audit-logging-system)
3. [Traffic Analytics](#traffic-analytics)
4. [Configuration Snippets](#configuration-snippets)
5. [Service Templates](#service-templates)
6. [Backup & Restore](#backup--restore)
7. [Web Application Firewall (WAF)](#web-application-firewall)
8. [Geo-Blocking](#geo-blocking)
9. [mTLS Configuration](#mtls-configuration)
10. [Access Lists](#access-lists)
11. [Location Rules](#location-rules)
12. [Redirect & Rewrite Rules](#redirect--rewrite-rules)
13. [Forward Authentication](#forward-authentication)
14. [Custom Certificates](#custom-certificates)
15. [Prometheus Metrics](#prometheus-metrics)

---

## API Token Management

### Overview
Secure programmatic access to the API using bearer tokens with optional expiration and granular permissions.

### API Endpoints

#### Get All Tokens
```http
GET /api/v1/api-tokens
Authorization: Bearer <jwt_token>
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "CI/CD Pipeline",
    "token": "********a1b2c3d4",
    "expires_at": "2027-01-01T00:00:00Z",
    "last_used": "2026-05-20T10:30:00Z",
    "permissions": ["domains:read", "domains:write"],
    "created_by": "admin",
    "createdAt": "2026-05-01T00:00:00Z"
  }
]
```

#### Create Token
```http
POST /api/v1/api-tokens
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Monitoring System",
  "expires_at": "2027-12-31T23:59:59Z",
  "permissions": ["analytics:read", "metrics:read"]
}
```

**Response:**
```json
{
  "id": 2,
  "name": "Monitoring System",
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
  "expires_at": "2027-12-31T23:59:59Z",
  "permissions": ["analytics:read", "metrics:read"],
  "message": "Token created successfully. Store this token securely - it will not be shown again."
}
```

#### Delete Token
```http
DELETE /api/v1/api-tokens/:id
Authorization: Bearer <jwt_token>
```

### Usage Example
```bash
# Using API token for requests
curl -H "Authorization: Bearer a1b2c3d4..." \
     https://your-server.com/api/v1/domains
```

---

## Audit Logging System

### Overview
Comprehensive logging of all system actions for compliance, security monitoring, and debugging.

### Features
- Automatic logging via middleware
- User attribution and IP tracking
- Severity classification (info, medium, high)
- Searchable with pagination
- Statistical analysis

### API Endpoints

#### Get Audit Logs
```http
GET /api/v1/audit-logs?page=1&limit=50&user=admin&action=delete&severity=high
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "logs": [
    {
      "id": 123,
      "timestamp": "2026-05-20T10:30:00Z",
      "user": "admin",
      "action": "delete_domain",
      "resource_type": "domain",
      "resource_id": 5,
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "details": {
        "method": "DELETE",
        "path": "/api/domains/5"
      },
      "severity": "high"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1250,
    "pages": 25
  }
}
```

#### Get Audit Statistics
```http
GET /api/v1/audit-logs/stats?days=7
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "by_user": [
    { "user": "admin", "count": 145 },
    { "user": "john", "count": 87 }
  ],
  "by_action": [
    { "action": "update_domain", "count": 234 },
    { "action": "create_domain", "count": 123 }
  ],
  "by_severity": [
    { "severity": "info", "count": 500 },
    { "severity": "medium", "count": 150 },
    { "severity": "high", "count": 25 }
  ],
  "timeline": [
    { "date": "2026-05-14", "count": 98 },
    { "date": "2026-05-15", "count": 112 }
  ]
}
```

---

## Traffic Analytics

### Overview
Real-time traffic monitoring and historical analytics for all proxied requests.

### Features
- Request/response metrics
- Status code tracking
- Geographic distribution
- Performance monitoring
- 90-day retention (configurable)

### API Endpoints

#### Get Traffic Data
```http
GET /api/v1/analytics/traffic?domain_id=1&start_date=2026-05-01&limit=100
Authorization: Bearer <jwt_token>
```

#### Get Traffic Statistics
```http
GET /api/v1/analytics/stats?domain_id=1&hours=24
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "total_requests": { "count": 15234 },
  "by_status": [
    { "status_code": 200, "count": 14123 },
    { "status_code": 404, "count": 891 },
    { "status_code": 500, "count": 220 }
  ],
  "by_method": [
    { "method": "GET", "count": 12345 },
    { "method": "POST", "count": 2345 }
  ],
  "top_paths": [
    { "path": "/api/users", "count": 3456 },
    { "path": "/", "count": 2345 }
  ],
  "top_countries": [
    { "country_code": "US", "count": 8765 },
    { "country_code": "UK", "count": 3456 }
  ],
  "avg_response_time": { "avg_ms": 127.5 },
  "timeline": [
    { "hour": "2026-05-20 08:00:00", "count": 567 },
    { "hour": "2026-05-20 09:00:00", "count": 678 }
  ]
}
```

---

## Configuration Snippets

### Overview
Reusable Caddy configuration blocks that can be imported across multiple sites.

### Built-in Snippets
- `cloudflare-dns`: Cloudflare DNS-01 challenge configuration
- `security-headers`: Common security headers
- `rate-limit`: Rate limiting configuration

### API Endpoints

#### List Snippets
```http
GET /api/v1/snippets?category=security&search=header
Authorization: Bearer <jwt_token>
```

#### Create Snippet
```http
POST /api/v1/snippets
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "cors-headers",
  "description": "CORS headers for API endpoints",
  "category": "security",
  "content": "header {\n  Access-Control-Allow-Origin *\n  Access-Control-Allow-Methods \"GET, POST, PUT, DELETE\"\n}",
  "tags": ["cors", "api", "security"]
}
```

#### Update Snippet
```http
PUT /api/v1/snippets/:id
```

#### Delete Snippet
```http
DELETE /api/v1/snippets/:id
```

---

## Service Templates

### Overview
Pre-configured deployment templates for popular services (WordPress, Docker Registry, etc.).

### Built-in Templates
- WordPress with PHP-FPM
- Docker Registry
- (More can be added)

### API Endpoints

#### List Templates
```http
GET /api/v1/service-templates?category=cms
Authorization: Bearer <jwt_token>
```

#### Render Template
```http
POST /api/v1/service-templates/:id/render
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "host": "blog.example.com",
  "upstream": "192.168.1.100"
}
```

**Response:**
```json
{
  "rendered": "blog.example.com {\n  root * /var/www/html\n  php_fastcgi 192.168.1.100:9000\n  file_server\n  encode gzip\n}",
  "missing_variables": []
}
```

---

## Backup & Restore

### Overview
Complete system backup including database, configurations, and certificates.

### API Endpoints

#### Create Backup
```http
POST /api/v1/backups
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Weekly Backup - 2026-05-20",
  "description": "Automated weekly backup",
  "includes_db": true,
  "includes_caddyfile": true,
  "includes_certificates": true
}
```

#### List Backups
```http
GET /api/v1/backups
Authorization: Bearer <jwt_token>
```

#### Download Backup
```http
GET /api/v1/backups/:id/download
Authorization: Bearer <jwt_token>
```

#### Restore Backup
```http
POST /api/v1/backups/:id/restore
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "tables": ["domains", "streams", "settings"]
}
```

#### Delete Backup
```http
DELETE /api/v1/backups/:id
Authorization: Bearer <jwt_token>
```

---

## Prometheus Metrics

### Overview
Export metrics in Prometheus format for integration with monitoring stacks.

### Metrics Endpoint
```http
GET /metrics
```

**Response (Prometheus format):**
```
# HELP http_requests_total Total HTTP requests by status code
# TYPE http_requests_total counter
http_requests_total{status="200"} 14123
http_requests_total{status="404"} 891
http_requests_total{status="500"} 220

# HELP http_response_time_bucket Response time distribution
# TYPE http_response_time_bucket histogram
http_response_time_bucket{le="0.1"} 8765
http_response_time_bucket{le="0.5"} 4567
http_response_time_bucket{le="1.0"} 1234
http_response_time_bucket{le="+Inf"} 668

# HELP http_bytes_sent_total Total bytes sent
# TYPE http_bytes_sent_total counter
http_bytes_sent_total 123456789

# HELP http_bytes_received_total Total bytes received
# TYPE http_bytes_received_total counter
http_bytes_received_total 987654321
```

### Grafana Integration
Import the included Grafana dashboard template to visualize all metrics.

---

## Database Schema

All new modules use SQLite tables with proper indexing and foreign key constraints. See `db.js` for complete schema definitions.

### Key Tables
- `api_tokens` - API token management
- `audit_logs` - Activity logging
- `traffic_analytics` - Traffic data
- `waf_rules` & `waf_events` - WAF configuration and logs
- `geo_blocks` - Geo-blocking rules
- `mtls_config` & `client_certificates` - mTLS setup
- `snippets` - Configuration snippets
- `service_templates` - Deployment templates
- `location_rules`, `redirect_rules`, `rewrite_rules` - Advanced routing
- `access_lists` & `access_list_users` - HTTP basic auth
- `custom_certificates` - Manual certificate management
- `backups` - Backup snapshots
- `forward_auth_providers` - SSO providers
- `metrics_history` - Metrics storage

---

## Security Considerations

1. **API Tokens**: Store securely, rotate regularly, use minimum required permissions
2. **Audit Logs**: Enable for compliance, monitor high-severity events
3. **Backups**: Encrypt backup files, test restore procedures regularly
4. **Analytics**: Sanitize PII before logging, comply with data retention policies
5. **Rate Limiting**: Implement on sensitive endpoints to prevent abuse

---

## Next Steps

1. Install new dependencies: `cd CaddyServer-backend && npm install`
2. Restart the backend server
3. Access new features via API or upcoming UI components
4. Configure Prometheus scraping for metrics endpoint
5. Set up automated backup schedule

For questions or issues, please refer to the main README or open an issue on GitHub.
