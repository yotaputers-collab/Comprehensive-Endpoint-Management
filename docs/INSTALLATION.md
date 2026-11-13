# Endpoint Management Platform - Installation Guide

## Prerequisites

### System Requirements
- Node.js version 18 or higher
- PostgreSQL 13 or higher
- Git (for version control)
- Docker (optional, for containerized deployment)

### Required Ports
- 3000: NestJS Application
- 3001: WebSocket (SOC integration)
- 5432: PostgreSQL Database (default)

## Local Development Installation

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/endpoint-management-platform.git
cd endpoint-management-platform
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:

```env
# Application
APP_PORT=3000
APP_HOST=localhost

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=endpoint_management

# Security
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1h
BCRYPT_ROUNDS=10

# DLP Configuration
DLp_RETENTION_PERIOD=90
DLp_REAL_TIME_MONITORING=true

# Vulnerability Scan Configuration
VULNERABILITY_SCAN_INTERVAL=3600000
VULNERABILITY_AUTO_REMEDIATION=false

# Compliance
ISO27001_ENABLED=true
AUDIT_RETENTION_DAYS=365
```

### 4. Database Setup
```bash
# Create the database
createdb endpoint_management

# Run migrations (if using TypeORM migrations)
npm run typeorm migration:run
```

### 5. Start the Application
```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start
```

### 6. Verify Installation
```bash
# Check if the application is running
curl http://localhost:3000/api/auth/login

# Expected: Login endpoint response
```

## Docker Deployment

### 1. Build Docker Image
```bash
docker build -t endpoint-management-platform .
```

### 2. Run Docker Container
```bash
docker run -d \
  -p 3000:3000 \
  -p 3001:3001 \
  -p 5432:5432 \
  -v $(pwd)/.env:/app/.env \
  --name endpoint-management \
  endpoint-management-platform
```

### 3. Verify Docker Deployment
```bash
# Check container status
docker ps | grep endpoint-management

# Test the API
curl http://localhost:3000/api/auth/login
```

## Kubernetes Deployment

### 1. Deploy PostgreSQL
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:13
        env:
        - name: POSTGRES_PASSWORD
          value: "your_password"
        - name: POSTGRES_DB
          value: "endpoint_management"
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
  volumes:
  - name: postgres-data
    persistentVolumeClaim:
      claimName: postgres-pvc
```

### 2. Deploy the Application
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: endpoint-management
spec:
  replicas: 1
  selector:
    matchLabels:
      app: endpoint-management
  template:
    metadata:
      labels:
        app: endpoint-management
    spec:
      containers:
      - name: app
        image: endpoint-management-platform
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: endpoint-config
        - secretRef:
            name: endpoint-secrets
```

### 3. Expose the Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: endpoint-management
spec:
  selector:
    app: endpoint-management
  ports:
  - protocol: TCP
    port: 3000
    targetPort: 3000
```

## Production Checklist

### Security
- [ ] Change default JWT secret
- [ ] Enable HTTPS/SSL termination
- [ ] Configure firewall rules
- [ ] Set up authentication with external IdP (LDAP, Active Directory)
- [ ] Enable audit logging

### Performance
- [ ] Configure Redis for caching
- [ ] Set up connection pooling for database
- [ ] Implement rate limiting
- [ ] Configure load balancing for multiple instances

### Compliance
- [ ] Enable ISO 27001 compliance features
- [ ] Configure audit retention policies
- [ ] Set up data encryption at rest
- [ ] Implement proper access controls

### Monitoring
- [ ] Set up Prometheus metrics
- [ ] Configure Grafana dashboards
- [ ] Enable SOC integration
- [ ] Set up alerting for critical events