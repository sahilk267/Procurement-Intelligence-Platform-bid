# Architecture Documentation

## Overview

ProcureIntel is a production-grade, multi-tenant SaaS platform for procurement intelligence and bid management. Built with modern web technologies, it provides comprehensive tender tracking, supplier management, and analytics capabilities.

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React/Vite    │    │   Express API   │    │   PostgreSQL    │
│   Frontend      │◄──►│   Backend       │◄──►│   Database      │
│                 │    │                 │    │                 │
│ - Components    │    │ - REST API      │    │ - Multi-tenant  │
│ - Routing       │    │ - Auth/JWT      │    │ - Drizzle ORM   │
│ - State Mgmt    │    │ - Middleware    │    │ - Audit Logs    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Docker/Nginx  │
                    │   Reverse Proxy │
                    └─────────────────┘
```

### Technology Stack

#### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Shadcn/UI + Tailwind CSS
- **State Management**: React hooks + Context
- **HTTP Client**: Custom fetch wrapper
- **Routing**: React Router

#### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT tokens
- **Validation**: Zod schemas
- **Logging**: Winston (structured logging)

#### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **Database**: PostgreSQL with connection pooling
- **Process Management**: PM2 (production)

#### Development Tools
- **Monorepo**: pnpm workspaces
- **Code Quality**: ESLint + Prettier
- **Testing**: Jest + React Testing Library
- **API Documentation**: OpenAPI/Swagger
- **Database Migrations**: Drizzle migrations

## Multi-Tenant Architecture

### Tenant Isolation

All data is isolated by `tenant_id` across all tables:

```sql
-- Every table includes tenant isolation
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  -- ... other fields
);

-- All queries filter by tenant_id
SELECT * FROM users WHERE tenant_id = $1;
```

### Database Schema

#### Core Tables

1. **tenants** - Organization/tenant information
2. **users** - User accounts with role-based access
3. **tenders** - Tender listings from various sources
4. **bids** - Bid records with lifecycle tracking
5. **suppliers** - Vendor/supplier management
6. **documents** - File uploads and certifications
7. **activity_logs** - Complete audit trail

#### Key Relationships

```
tenants (1) ──── (M) users
tenants (1) ──── (M) tenders
tenants (1) ──── (M) bids
tenants (1) ──── (M) suppliers
tenants (1) ──── (M) documents
tenants (1) ──── (M) activity_logs

tenders (1) ──── (M) bids
bids (1) ──── (M) boq_items
bids (1) ──── (M) proposals
bids (1) ──── (M) bid_tasks
```

### Audit Trail Architecture

Every operation is logged with complete context:

```typescript
// Activity logging on all operations
await db.insert(activityLogsTable).values({
  tenantId: req.user!.tenantId,
  userId: req.user!.id,
  type: "bid_created",
  entityType: "bid",
  entityId: bidId,
  entityName: "IT Infrastructure Tender",
  description: "Bid created for tender with target value ₹45L"
});
```

## API Architecture

### RESTful Design

- **Base URL**: `/api`
- **Authentication**: Bearer token in Authorization header
- **Response Format**: JSON
- **Error Handling**: Consistent error responses
- **Pagination**: Cursor-based with page/limit
- **Filtering**: Query parameters for search/filtering

### Route Structure

```
api/
├── auth/
│   ├── POST /login
│   └── POST /register
├── tenders/
│   ├── GET / (list with filters)
│   ├── POST / (create)
│   ├── GET /:id (get single)
│   ├── PUT /:id (update)
│   ├── DELETE /:id (delete)
│   └── watchlist/
│       ├── GET /list (tracked tenders)
│       ├── POST /:id/track
│       └── POST /:id/untrack
├── suppliers/
│   ├── GET / (list)
│   ├── POST / (create)
│   ├── GET /:id (details)
│   ├── PUT /:id (update)
│   ├── DELETE /:id (delete)
│   ├── POST /match/find (matching algorithm)
│   └── GET /analytics/summary
├── bids/
│   ├── GET / (list)
│   ├── POST / (create)
│   ├── GET /:id (details)
│   ├── PUT /:id (update)
│   ├── DELETE /:id (delete)
│   ├── GET /:id/tasks (bid tasks)
│   ├── POST /:id/tasks (create task)
│   ├── PUT /:bidId/tasks/:taskId (update task)
│   └── POST /compare/multi (bid comparison)
├── alerts/
│   ├── GET / (list rules)
│   ├── POST / (create rule)
│   ├── GET /:id (rule details with matches)
│   ├── PUT /:id (update rule)
│   ├── DELETE /:id (delete rule)
│   └── POST /:id/toggle (activate/deactivate)
├── analysis/
│   ├── GET /:id (tender analysis)
│   ├── POST /:id (run analysis)
│   └── GET /:id/go-no-go (decision support)
├── analytics/
│   ├── GET /dashboard (summary metrics)
│   ├── GET /bids/category (by category)
│   ├── GET /tenders/sources (by source)
│   └── GET /activity (audit logs)
└── admin/ (admin-only)
    ├── users/ (user management)
    ├── tenants/ (tenant management)
    ├── GET /analytics (admin metrics)
    └── GET /audit-logs (system audit)
```

### Middleware Stack

```typescript
// Request processing pipeline
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authenticate); // JWT validation
app.use(requireTenant); // Multi-tenant context
app.use(rateLimit()); // Rate limiting
app.use(logging()); // Request logging
```

## Security Architecture

### Authentication & Authorization

- **JWT Tokens**: Stateless authentication with expiration
- **Role-Based Access Control**: admin, manager, user, viewer roles
- **Tenant Isolation**: All queries filtered by tenant_id
- **Password Security**: bcrypt hashing (to be implemented)
- **Session Management**: Secure token storage and refresh

### Data Protection

- **Encryption**: Sensitive data encrypted at rest
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection Prevention**: Parameterized queries via Drizzle
- **XSS Protection**: Input sanitization and CSP headers
- **CSRF Protection**: Token-based prevention

### Audit & Compliance

- **Complete Audit Trail**: Every operation logged
- **Data Retention**: Configurable log retention policies
- **Access Logging**: All API access logged with context
- **Compliance Ready**: GDPR/CCPA compliant architecture

## Deployment Architecture

### Docker Containerization

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: procureintel
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password

  api:
    build: ./artifacts/api-server
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/procureintel
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres

  frontend:
    build: ./artifacts/procurement-platform
    ports:
      - "8080:80"
    depends_on:
      - api

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api
      - frontend
```

### Production Deployment

```
┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Application   │
│   (Nginx/Cloud) │────│   Servers       │
│                 │    │   (Docker)      │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   (RDS/Aurora)  │
                    │   Read Replicas │
                    └─────────────────┘
```

### Scalability Considerations

- **Horizontal Scaling**: Stateless API servers
- **Database Scaling**: Read replicas for analytics
- **Caching**: Redis for session and API caching
- **CDN**: Static assets served via CDN
- **Background Jobs**: Queue system for heavy processing

## Development Workflow

### Monorepo Structure

```
Procurement-Intelligence-Platform-bid/
├── artifacts/
│   ├── api-server/          # Express backend
│   ├── procurement-platform/# React frontend
│   └── mockup-sandbox/      # Component development
├── lib/
│   ├── db/                  # Database schemas & migrations
│   ├── api-client-react/    # Frontend API client
│   ├── api-spec/           # OpenAPI specifications
│   └── api-zod/            # Type-safe API schemas
├── scripts/                # Utility scripts
├── database/               # Migrations & seeds
└── docs/                   # Documentation
```

### Code Organization

#### Backend (api-server)
```
src/
├── app.ts              # Express app setup
├── index.ts            # Server entry point
├── config.ts           # Configuration
├── lib/
│   ├── auth.ts         # Authentication utilities
│   └── logger.ts       # Logging utilities
├── middlewares/
│   └── authenticate.ts # Auth middleware
├── routes/
│   ├── index.ts        # Route mounting
│   ├── auth.ts         # Authentication routes
│   ├── tenders.ts      # Tender management
│   ├── suppliers.ts    # Supplier management
│   ├── bids.ts         # Bid management
│   ├── alerts.ts       # Alert rules
│   ├── analysis.ts     # Tender analysis
│   ├── analytics.ts    # Dashboard analytics
│   └── admin.ts        # Admin panel
```

#### Frontend (procurement-platform)
```
src/
├── App.tsx            # Main app component
├── main.tsx           # Entry point
├── index.css          # Global styles
├── components/
│   ├── ui/            # Reusable UI components
│   └── pages/         # Page components
├── hooks/             # Custom React hooks
└── lib/
    └── utils.ts       # Utility functions
```

### Database Development

#### Schema Definition
```typescript
// lib/db/src/schema/users.ts
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("viewer"),
  createdBy: integer("created_by").references(() => usersTable.id),
  updatedBy: integer("updated_by").references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

#### Migration Generation
```bash
cd lib/db
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

## Monitoring & Observability

### Application Monitoring

- **Health Checks**: `/api/health` endpoint
- **Metrics**: Response times, error rates, throughput
- **Logging**: Structured JSON logs with correlation IDs
- **Alerts**: Automated alerts for critical issues

### Database Monitoring

- **Connection Pool**: Monitoring pool utilization
- **Query Performance**: Slow query analysis
- **Replication Lag**: Monitoring read replica lag
- **Storage**: Disk usage and growth trends

### Business Metrics

- **User Activity**: Daily/weekly active users
- **Feature Usage**: API endpoint usage statistics
- **Performance**: Bid win rates, tender tracking rates
- **System Health**: Uptime, error rates, response times

## Advanced Features Architecture

### OCR Document Processing

**Components**:
- Tesseract.js for text extraction from images and PDFs
- Cheerio for HTML parsing
- Multer for file upload handling

**Flow**:
```
Document Upload → File Storage → OCR Processing → Text Extraction
                                 ↓
                        Language Detection → Parsed Content
                                 ↓
                        Searchable Index → Analytics
```

**Supported Formats**: PDF, JPEG, PNG, GIF, BMP, TIFF
**Max File Size**: 50MB
**Confidence Scoring**: Automatic accuracy assessment

**Use Cases**:
- Automated document classification
- Text extraction from tenders and RFQs
- Content indexing and full-text search
- Compliance document processing

### Real-Time Tender Data Ingestion

**Live Data Architecture**:
```
GeM Portal (JSON APIs, RSS, Search) → Multi-Strategy Fetching Service
eProcure Portal (APIs, RSS, Search) → Data Normalization → Database
Real-Time Updates → Deduplication & Activity Logging
```

**Data Sources (Live)**:
1. **GeM (Government e-Marketplace)**:
   - Primary Strategy: JSON API (`https://gem.gov.in/api/v1/tenders`)
   - Secondary: Search API (`https://gem.gov.in/api/search`)
   - Fallback: RSS Feed (`https://gem.gov.in/feed`)
   - Last Resort: Public listings scraping

2. **CPPP (Central Public Procurement Portal via eProcure)**:
   - Primary Strategy: JSON API (`https://eprocure.gov.in/api/tenders`)
   - Secondary: Search API (`https://eprocure.gov.in/cppp/tenders/search`)
   - Fallback: RSS Feed (`https://eprocure.gov.in/feed.rss`)
   - Last Resort: Public listings scraping

**Components**:
- `lib/data-ingestion.ts`:
  - `fetchGeMMenders()`: Multi-strategy GeM tender fetching
  - `fetchCPPPTenders()`: Multi-strategy eProcure tender fetching
  - Helper functions for each API/RSS/scraping strategy
- `lib/scheduler.ts`: Cron-based scheduled ingestion
- `routes/data-management.ts`: Admin API endpoints

**Fetching Strategies** (in order):
1. **JSON APIs**: Direct API access for structured tender data
2. **Search APIs**: POST-based search with keyword filtering
3. **RSS Feeds**: XML feeds with item elements
4. **HTML Scraping**: Fallback HTML parsing for public listings

**Scheduling**:
- **Daily Ingestion**: 2:00 AM IST (20:30 UTC) - Full fetch from both portals
- **Hourly Check**: Urgent tenders (expiring within 7 days)
- **Real-time Ingestion**: Manual trigger via admin API

**Features**:
- ✅ Live tender data from government portals
- ✅ Automatic deduplication by reference number
- ✅ Multi-source data normalization
- ✅ Graceful fallback strategy (API → RSS → Scraping)
- ✅ Comprehensive error handling and logging
- ✅ Batch processing with transaction support
- ✅ Activity logging for audit trail
- ✅ HTTPS SSL verification disabled for Indian government portals

**Data Fields Extracted**:
- Title, Reference Number, Authority/Ministry
- Category, State/Location, Estimated Value
- EMD Amount, Opening/Closing Dates
- Pre-bid Date, Description, Eligibility Criteria
- Technical Specifications, Payment Terms
- Portal URL for direct access

### Email Notification System

**Components**:
- `lib/notifications.ts`: Email service with templates
- Nodemailer for SMTP integration
- HTML email templates for all scenarios

**Supported Notifications**:
1. **Tender Alerts**: New matching tenders found
2. **Bid Status Updates**: Bid stage changes
3. **Task Assignments**: Tasks assigned to team members
4. **Document Expiry**: Expiring documents alerts
5. **System Alerts**: Critical system events

**Configuration**:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=app-password
SMTP_FROM=noreply@procureintel.com
```

**Development**: MailHog for local email testing

## Advanced Route Architecture

### Documents Route Enhancements

```
POST /api/documents/upload-with-ocr
  ├─ Multipart file upload
  ├─ OCR processing
  ├─ Language detection
  └─ Content parsing

GET /api/documents/:id/ocr-content
  ├─ Extracted text retrieval
  ├─ Parsed content structure
  └─ Confidence metrics

GET /api/documents/search-text/:query
  ├─ Full-text search in documents
  ├─ Context extraction
  └─ Match scoring
```

### Data Management Route

```
POST /api/data-management/tenders/ingest (Admin)
  ├─ Trigger manual ingestion
  ├─ Multi-source support
  └─ Filter-based fetching

GET /api/data-management/tenders/ingestion-status (Admin)
  ├─ Last ingestion details
  ├─ Next scheduled run
  └─ Current status
```

### Notifications Route

```
GET /api/notifications
  ├─ In-app notifications
  ├─ Severity-based filtering
  └─ Unread tracking

POST /api/notifications/preferences
  └─ User notification preferences

GET /api/notifications/email/test (Admin)
  └─ Email configuration validation

GET /api/notifications/recent
  └─ Recent notification activity
```

## Performance Optimizations

### Database Optimizations

- **Indexing**: Strategic indexes on frequently queried columns
- **Query Optimization**: Efficient joins and aggregations
- **Connection Pooling**: PgBouncer for connection management
- **Read Replicas**: Offloading analytics queries

### API Optimizations

- **Caching**: Redis caching for frequently accessed data
- **Pagination**: Efficient pagination with cursor-based navigation
- **Compression**: Gzip compression for API responses
- **Rate Limiting**: Preventing abuse and ensuring fair usage

### Frontend Optimizations

- **Code Splitting**: Route-based code splitting
- **Lazy Loading**: Component lazy loading
- **Asset Optimization**: Image optimization and CDN delivery
- **Bundle Analysis**: Monitoring bundle sizes and dependencies

## Security Considerations

### Infrastructure Security

- **Network Security**: VPC isolation, security groups
- **Access Control**: Least privilege IAM roles
- **Encryption**: TLS 1.3, encrypted storage
- **Backup**: Automated backups with encryption

### Application Security

- **Input Validation**: Comprehensive input validation
- **Output Encoding**: XSS prevention
- **CSRF Protection**: Token-based CSRF prevention
- **Security Headers**: Comprehensive security headers

### Compliance

- **Data Privacy**: GDPR/CCPA compliance
- **Audit Trail**: Complete audit logging
- **Data Retention**: Configurable retention policies
- **Access Reviews**: Regular access permission reviews

## Future Enhancements

### Completed Features ✅

- ✅ **OCR Processing**: Document text extraction and content parsing
- ✅ **Real-time Data Ingestion**: Multi-source tender fetching with scheduling
- ✅ **Email Notifications**: Full notification system with templates
- ✅ **Multi-tenant Architecture**: Complete data isolation
- ✅ **Bid Management**: Full lifecycle with task tracking
- ✅ **Analytics Dashboard**: Comprehensive metrics and insights
- ✅ **Admin Panel**: User and tenant management
- ✅ **Audit Trail**: Complete activity logging

### Planned Features

- **Real-time WebSocket Notifications**: Push notifications via WebSocket
- **Advanced ML Analytics**: Predictive bid scoring and win-rate analysis
- **Integration APIs**: REST APIs for third-party system integration
- **Mobile App**: React Native application for iOS/Android
- **Document Collaboration**: Real-time document editing and comments
- **Approval Workflows**: Customizable multi-step approval process
- **Budget Forecasting**: AI-powered budget prediction
- **Competitor Intelligence**: Automated competitor analysis
- **Payment Integration**: Direct payment processing
- **Archive Management**: Document archiving and retrieval system

### Scalability Improvements

- **Microservices**: Service decomposition for independent scaling
- **Event Sourcing**: Event-driven architecture for audit trails
- **CQRS**: Command Query Responsibility Segregation
- **Global Deployment**: Multi-region redundancy
- **API Gateway**: Centralized API management and rate limiting
- **Message Queue**: Async processing with RabbitMQ/Kafka
- **Search Engine**: Elasticsearch integration for advanced search
- **Cache Layer**: Redis for distributed caching

---

**Version**: 1.0.0
**Last Updated**: May 14, 2026
**Architecture Review**: Quarterly reviews recommended
