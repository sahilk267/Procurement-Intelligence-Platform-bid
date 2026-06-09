# Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying ProcureIntel to production environments. The platform is designed to work with Docker/Docker Compose, Kubernetes, or traditional server deployments.

## Pre-Deployment Checklist

- [ ] All tests passing locally
- [ ] Environment variables configured
- [ ] Database backups configured
- [ ] SSL certificates obtained
- [ ] DNS records configured
- [ ] Monitoring alerts set up
- [ ] Logging infrastructure ready
- [ ] CDN configured (optional)

## Local Development Deployment

### Quick Start with Docker Compose

```bash
# 1. Clone repository
git clone <repository-url>
cd Procurement-Intelligence-Platform-bid

# 2. Create environment file
cp .env.example .env
# Edit .env with your settings

# 3. Start all services
docker-compose up -d

# 4. Run migrations
docker-compose exec api pnpm run migrate

# 5. Seed initial data (optional)
docker-compose exec api pnpm run seed

# 6. Access application
# Frontend: http://localhost:8080
# API: http://localhost:3000
# Admin: http://localhost:8080/admin
```

## Production Deployment

### Environment Configuration

Create `.env.production` with the following variables:

```bash
# Node environment
NODE_ENV=production

# Server
PORT=3000
API_URL=https://api.procureintel.com
FRONTEND_URL=https://procureintel.com

# Database
DATABASE_URL=postgresql://user:password@db.example.com:5432/procureintel
DATABASE_MAX_CONNECTIONS=20
DATABASE_CONNECTION_TIMEOUT=10000

# Authentication
JWT_SECRET=<strong-random-secret>
JWT_EXPIRATION=24h

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<email@gmail.com>
SMTP_PASS=<app-password>
SMTP_FROM=noreply@procureintel.com

# File Storage (Optional - for cloud storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
S3_BUCKET=procureintel-documents

# Data Ingestion (Optional - for authenticated access to GeM)
GEM_USERNAME=<gem-portal-username>
GEM_PASSWORD=<gem-portal-password>

# Monitoring
SENTRY_DSN=<sentry-dsn>
LOG_LEVEL=info

# Feature Flags
ENABLE_OCR=true
ENABLE_NOTIFICATIONS=true
ENABLE_DATA_INGESTION=true
```

### Docker Container Deployment

#### Step 1: Build Images

```bash
# Build API server
docker build -f artifacts/api-server/Dockerfile -t procureintel-api:1.0.0 .

# Build frontend
docker build -f artifacts/procurement-platform/Dockerfile -t procureintel-frontend:1.0.0 .

# Build reverse proxy
docker build -f nginx.dockerfile -t procureintel-nginx:1.0.0 .
```

#### Step 2: Push to Registry

```bash
# Tag images
docker tag procureintel-api:1.0.0 registry.example.com/procureintel-api:1.0.0
docker tag procureintel-frontend:1.0.0 registry.example.com/procureintel-frontend:1.0.0
docker tag procureintel-nginx:1.0.0 registry.example.com/procureintel-nginx:1.0.0

# Push to registry
docker push registry.example.com/procureintel-api:1.0.0
docker push registry.example.com/procureintel-frontend:1.0.0
docker push registry.example.com/procureintel-nginx:1.0.0
```

#### Step 3: Deploy with Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: procureintel
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: always
    networks:
      - procureintel

  api:
    image: registry.example.com/procureintel-api:1.0.0
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/procureintel
      JWT_SECRET: ${JWT_SECRET}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
    depends_on:
      - postgres
    restart: always
    networks:
      - procureintel
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: registry.example.com/procureintel-frontend:1.0.0
    environment:
      REACT_APP_API_URL: https://api.procureintel.com
    restart: always
    networks:
      - procureintel

  nginx:
    image: registry.example.com/procureintel-nginx:1.0.0
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api
      - frontend
    restart: always
    networks:
      - procureintel

  backup:
    image: postgres:15
    entrypoint: /bin/bash
    command: -c 'while true; do pg_dump postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/procureintel | gzip > /backups/backup-$(date +%Y%m%d-%H%M%S).sql.gz; sleep 86400; done'
    depends_on:
      - postgres
    volumes:
      - ./backups:/backups
    networks:
      - procureintel

volumes:
  postgres_data:

networks:
  procureintel:
    driver: bridge
```

Deploy:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment

#### Step 1: Create Namespace

```bash
kubectl create namespace procureintel
```

#### Step 2: Create Secrets

```bash
kubectl create secret generic procureintel-secrets \
  --from-literal=jwt-secret=$(openssl rand -base64 32) \
  --from-literal=db-password=$(openssl rand -base64 32) \
  --from-literal=smtp-password=$(cat <<EOF) \
  -n procureintel
```

#### Step 3: Create ConfigMaps

```bash
kubectl create configmap procureintel-config \
  --from-literal=database-url=postgresql://user:password@postgres:5432/procureintel \
  --from-literal=api-url=https://api.procureintel.com \
  -n procureintel
```

#### Step 4: Deploy Database

```yaml
# postgres-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: procureintel
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
        image: postgres:15
        env:
        - name: POSTGRES_DB
          value: procureintel
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: procureintel-secrets
              key: db-password
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: procureintel
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
```

#### Step 5: Deploy API

```yaml
# api-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: procureintel
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: registry.example.com/procureintel-api:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            configMapKeyRef:
              name: procureintel-config
              key: database-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: procureintel-secrets
              key: jwt-secret
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            cpu: 250m
            memory: 512Mi
          limits:
            cpu: 500m
            memory: 1Gi
---
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: procureintel
spec:
  selector:
    app: api
  ports:
  - protocol: TCP
    port: 3000
    targetPort: 3000
  type: ClusterIP
```

Deploy:
```bash
kubectl apply -f postgres-deployment.yml
kubectl apply -f api-deployment.yml
```

### Database Migrations

```bash
# Connect to database
docker exec procureintel-api npx drizzle-kit migrate --dialect postgres

# Or with kubectl
kubectl exec -it <api-pod-name> -n procureintel -- npx drizzle-kit migrate --dialect postgres
```

### SSL/TLS Setup

#### Using Let's Encrypt with Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name api.procureintel.com;

    ssl_certificate /etc/letsencrypt/live/api.procureintel.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.procureintel.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://api:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Post-Deployment

### Verification

```bash
# Health check
curl https://api.procureintel.com/api/health

# Test API
curl -H "Authorization: Bearer <token>" https://api.procureintel.com/api/tenders

# Check database
psql -h <db-host> -U <user> -d procureintel -c "SELECT version();"
```

### Monitoring Setup

```bash
# Setup Prometheus monitoring
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v ./prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Setup Grafana dashboards
docker run -d \
  --name grafana \
  -p 3001:3000 \
  grafana/grafana
```

### Backup Strategy

```bash
# Daily backups
0 2 * * * pg_dump postgresql://user:password@localhost/procureintel | gzip > /backups/procureintel-$(date +%Y%m%d).sql.gz

# Weekly backups to S3
0 3 * * 0 aws s3 cp /backups/ s3://backup-bucket/procureintel/ --recursive --include "*.sql.gz"
```

### Log Management

```bash
# Centralized logging with ELK stack
# Configure filebeat to ship logs
filebeat.inputs:
- type: container
  paths:
    - '/var/lib/docker/containers/*/*.log'

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
```

## Scaling Guidelines

### Horizontal Scaling
- API replicas: 3-5 for production
- Database read replicas: 1-2 for analytics
- Cache layer: Redis with 4GB minimum

### Vertical Scaling
- API memory: 512MB-1GB per replica
- Database memory: 4GB+ for 10,000+ users
- Storage: 100GB+ for 1 year of audit logs

## Troubleshooting

### Common Issues

1. **Database Connection Timeout**
   - Check network connectivity
   - Verify connection pool settings
   - Check database server load

2. **API Server Out of Memory**
   - Increase memory allocation
   - Check for memory leaks in logs
   - Optimize database queries

3. **High Response Times**
   - Check database indexes
   - Monitor network latency
   - Review slow query logs

## Security Hardening

- [ ] Enable firewall rules
- [ ] Set up WAF (Web Application Firewall)
- [ ] Configure DDoS protection
- [ ] Enable audit logging
- [ ] Setup intrusion detection
- [ ] Regular security updates

---

**Version**: 1.0.0
**Last Updated**: May 14, 2026
