# API Documentation - Endpoint Management Platform

## Base URL
`http://localhost:3000/api`

## Authentication
All API endpoints require JWT Bearer token authentication.

### Obtain Token
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

### Response
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Endpoints

### Agents

#### Create Agent
```http
POST /agents
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Agent-001",
  "platform": "windows",
  "version": "1.0.0"
}
```

#### Get All Agents
```http
GET /agents
Authorization: Bearer <token>
```

#### Get Agent by ID
```http
GET /agents/{id}
Authorization: Bearer <token>
```

#### Update Agent
```http
PUT /agents/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "version": "1.1.0",
  "description": "Updated agent description"
}
```

#### Deploy Agent
```http
POST /agents/{id}/deploy
Authorization: Bearer <token>
```

#### Collect Data from Agent
```http
POST /agents/{id}/collect-data
Authorization: Bearer <token>
```

### Vulnerabilities

#### Create Vulnerability
```http
POST /vulnerabilities
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "CVE-2024-XXXX",
  "cveId": "CVE-2024-XXXX",
  "severity": "high",
  "type": "os"
}
```

#### Get All Vulnerabilities
```http
GET /vulnerabilities?severity=high&unpatched=true&page=1&limit=10
Authorization: Bearer <token>
```

#### Get Vulnerability by ID
```http
GET /vulnerabilities/{id}
Authorization: Bearer <token>
```

#### Get Unpatched Vulnerabilities
```http
GET /vulnerabilities/unpatched
Authorization: Bearer <token>
```

#### Get Critical Vulnerabilities
```http
GET /vulnerabilities/critical
Authorization: Bearer <token>
```

#### Get Vulnerabilities by Severity
```http
GET /vulnerabilities/by-severity/critical
Authorization: Bearer <token>
```

#### Patch Vulnerability
```http
POST /vulnerabilities/{id}/patche
Authorization: Bearer <token>
```

#### Batch Patch Vulnerabilities
```http
POST /vulnerabilities/batch-patch
Authorization: Bearer <token>
Content-Type: application/json

{
  "ids": ["vuln-1", "vuln-2", "vuln-3"]
}
```

### Configuration

#### Get All Configurations
```http
GET /configuration
Authorization: Bearer <token>
```

#### Get Configuration by Key
```http
GET /configuration/{key}
Authorization: Bearer <token>
```

#### Update Configuration
```http
PUT /configuration/{key}
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": "new-value"
}
```

#### Create Configuration Backup
```http
POST /configuration/backup
Authorization: Bearer <token>
```

#### Restore Configuration
```http
POST /configuration/restore
Authorization: Bearer <token>
Content-Type: application/json

{
  "backupData": "{...}"
}
```

### Compliance

#### Get ISO 27001 Assessment
```http
GET /compliance/assessment
Authorization: Bearer <token>
```

#### Create Audit Log
```http
POST /compliance/audit-log
Authorization: Bearer <token>
Content-Type: application/json

{
  "eventType": "vulnerability-remediation",
  "user": "admin",
  "details": {
    "vulnerabilityId": "vuln-123",
    "result": "success"
  },
  "complianceRelevance": ["iso27001"]
}
```

### DLP Policies

#### Create DLP Policy
```http
POST /dlp/policies
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Confidential Data Policy",
  "description": "Policy to protect confidential data",
  "rules": [
    {
      "name": "Confidential Keyword",
      "type": "content",
      "operator": "contains",
      "pattern": "confidential",
      "action": "block",
      "severity": "high",
      "enabled": true
    }
  ],
  "enabled": true
}
```

#### Get All DLP Policies
```http
GET /dlp/policies
Authorization: Bearer <token>
```

#### Create DLP Violation
```http
POST /dlp/violations
Authorization: Bearer <token>
Content-Type: application/json

{
  "policyId": "policy-123",
  "endpointId": "endpoint-456",
  "user": "john.doe",
  "matchedContent": "confidential credit card info",
  "ruleType": "content",
  "severity": "high"
}
```

#### Get Violations by Policy
```http
GET /dlp/violations/policy/{policyId}
Authorization: Bearer <token>
```

## Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden",
  "error": "Forbidden"
}
```

### 422 Validation Error
```json
{
  "statusCode": 422,
  "message": "Validation failed",
  "errors": [
    {
      "property": "severity",
      "constraints": {
        "enum": ["low", "medium", "high", "critical"]
      }
    }
  ]
}
```

### 429 Too Many Requests
```json
{
  "statusCode": 429,
  "message": "Too many requests, please try again later",
  "error": "Rate Limit Exceeded"
}
```