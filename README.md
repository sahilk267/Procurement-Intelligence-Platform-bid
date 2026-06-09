# ProcureIntel - Procurement Intelligence Platform

A production-grade, local-first AI-powered SaaS platform for Indian businesses to discover, analyze, prepare, manage, and optimize government/private tenders.

## 🎯 Key Features

### Core Capabilities
- **Tender Discovery & Tracking** - Find and monitor tenders with advanced filtering
- **Tender Analysis** - AI-powered eligibility assessment and risk evaluation
- **Watchlist Management** - Track important tenders with real-time updates
- **Keyword Alerts** - Automated monitoring of tenders matching your criteria
- **Bid Management** - End-to-end bid lifecycle management
- **Supplier/Vendor Directory** - Manage and track vendor performance
- **BOQ Pricing Intelligence** - Smart pricing analysis and comparisons
- **Team Workflow** - Collaborate on bid preparation with task management
- **Post-Bid Tracking** - Monitor bid status and results
- **Analytics Dashboard** - Track KPIs, win rates, and trends
- **Go/No-Go Decision Support** - Intelligent bid recommendation engine
- **Multi-Tenant Support** - Isolated environments for multiple companies

### Tech Features
- JWT-based authentication with role-based access control
- Multi-tenant architecture with complete data isolation
- Activity logging and audit trails
- PostgreSQL with Drizzle ORM
- Real-time API with error handling
- Docker & Docker Compose support
- Scalable monolith architecture

## ✅ **Implementation Status**

### Completed Features
- ✅ Multi-tenant database schema (13 tables with audit fields)
- ✅ Tender management (CRUD, watchlist, filtering, pagination)
- ✅ Supplier/vendor management with matching algorithm
- ✅ Keyword alerts with email notifications
- ✅ Bid lifecycle management with task tracking
- ✅ Admin panel with user/tenant management
- ✅ Email notification system (SMTP, HTML templates)
- ✅ API documentation and architecture docs

### 🔄 **Remaining ToDo Items**

1. **OCR Document Processing** - Implement Tesseract/PaddleOCR for document text extraction
   - Add OCR dependencies (tesseract.js, node-tesseract-ocr)
   - Create OCR service for PDF/image processing
   - Integrate with documents route for automatic text extraction
   - Add document content indexing and search

2. **Real Tender Data Sources** - Set up web scraping/API integration
   - Add scraping libraries (puppeteer, cheerio)
   - Create data ingestion service for GeM, CPPP portals
   - Implement real-time tender updates and monitoring
   - Add data validation and deduplication

3. **Testing & Validation** - Create comprehensive test suite
   - Unit tests for all services and utilities
   - Integration tests for API endpoints
   - End-to-end tests for critical workflows
   - Performance and load testing

## 📁 Project Structure

```
├── artifacts/
│   ├── api-server/              # Express.js API backend
│   │   └── src/
│   │       ├── routes/          # API endpoints
│   │       ├── middlewares/     # Authentication, validation
│   │       ├── app.ts           # Express app setup
│   │       └── index.ts         # Server entry point
│   ├── procurement-platform/    # React/Vite frontend
│   │   └── src/
│   │       ├── components/      # React components
│   │       ├── pages/           # Page components
│   │       ├── hooks/           # Custom hooks
│   │       └── App.tsx          # Main app component
│   └── mockup-sandbox/          # Component development environment
├── lib/
│   ├── db/                      # Drizzle ORM schemas & config
│   │   └── src/
│   │       └── schema/          # Database table definitions
│   ├── api-client-react/        # React API client library
│   ├── api-spec/                # OpenAPI specifications
│   └── api-zod/                 # Zod validation schemas
├── database/
│   ├── migrations/              # SQL migration files
│   └── seeders/                 # Database seed data
├── docs/                        # Documentation
├── scripts/                     # Utility scripts
└── docker-compose.yml           # Docker Compose configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- PostgreSQL 14+
- Docker & Docker Compose (optional)

### Local Setup

1. **Clone and install dependencies:**
   ```bash
   cd Procurement-Intelligence-Platform-bid
   pnpm install
   ```

2. **Setup environment variables:**
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your database and API configurations.

3. **Initialize database:**
   ```bash
   pnpm run db:migrate
   pnpm run db:seed
   ```

4. **Start development server:**
   ```bash
   # Terminal 1: API Server
   cd artifacts/api-server
   pnpm run dev
   
   # Terminal 2: Frontend
   cd artifacts/procurement-platform
   pnpm run dev
   ```

API runs on `http://localhost:3000`
Frontend runs on `http://localhost:5173`

### Docker Setup

```bash
docker-compose up --build
```

This starts:
- PostgreSQL database
- Express API server
- React frontend  
- Nginx reverse proxy

Access at `http://localhost`

> If login fails immediately after the first Docker startup, the database seed may not have been initialized yet. Use `/register` to create an admin account or restart the stack after fixing database readiness.

## 📚 API Documentation

### Base URL
- Local: `http://localhost:3000/api`
- Production: Set in `.env`

### Authentication
All endpoints (except `/auth/login` and `/auth/register`) require:
```
Authorization: Bearer <JWT_TOKEN>
```

### Core Endpoints

#### Tenders
- `GET /api/tenders` - List all tenders
- `POST /api/tenders` - Create tender
- `GET /api/tenders/:id` - Get tender details
- `PUT /api/tenders/:id` - Update tender
- `DELETE /api/tenders/:id` - Delete tender
- `POST /api/tenders/:id/track` - Add to watchlist
- `POST /api/tenders/:id/untrack` - Remove from watchlist
- `GET /api/tenders/watchlist/list` - Get tracked tenders

#### Suppliers
- `GET /api/suppliers` - List all suppliers
- `POST /api/suppliers` - Create supplier
- `GET /api/suppliers/:id` - Get supplier details
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier
- `POST /api/suppliers/match/find` - Find matching suppliers

#### Bids
- `GET /api/bids` - List all bids
- `POST /api/bids` - Create bid
- `GET /api/bids/:id` - Get bid details
- `PUT /api/bids/:id` - Update bid
- `DELETE /api/bids/:id` - Delete bid
- `POST /api/bids/compare/multi` - Compare multiple bids

#### Alerts & Monitoring
- `GET /api/alerts` - List keyword alerts
- `POST /api/alerts` - Create alert rule
- `PUT /api/alerts/:id` - Update alert rule
- `DELETE /api/alerts/:id` - Delete alert rule
- `POST /api/alerts/:id/toggle` - Enable/disable alert

#### Analysis & Intelligence
- `GET /api/analysis/:tenderId` - Get tender analysis
- `POST /api/analysis/:tenderId` - Run AI analysis
- `GET /api/analysis/:tenderId/go-no-go` - Get bid recommendation

#### Analytics
- `GET /api/analytics/dashboard` - Dashboard summary
- `GET /api/analytics/bids/category` - Bid analytics by category
- `GET /api/analytics/tenders/sources` - Tender source analysis
- `GET /api/analytics/activity` - Activity logs

## 🗄️ Database Schema

### Key Tables
- **users** - User accounts with roles (admin, manager, viewer, etc.)
- **tenants** - Multi-tenant organizations
- **tenders** - Tender listings from various sources
- **bids** - Bid records for tracked tenders
- **boq_items** - Bill of Quantities for bids
- **vendors** - Supplier/vendor database
- **monitoring_rules** - Keyword alert configurations
- **tender_analysis** - AI-powered tender analysis results
- **activity_logs** - Audit trail of all actions
- **documents** - Uploaded documents and certifications

### Multi-Tenant Architecture
Every table includes:
- `tenant_id` - For data isolation
- `created_by` - User who created the record
- `updated_by` - User who last updated the record
- `created_at` - Timestamp of creation
- `updated_at` - Timestamp of last update

## 🔐 Security Features

- JWT authentication with refresh tokens
- Role-based access control (RBAC)
- Row-level security (RLS) via tenant_id
- Encrypted password storage
- SQL injection prevention via parameterized queries
- CORS configuration
- Rate limiting
- Activity audit logging

## 📊 Analytics & Reporting

Dashboard provides:
- Total tenders and tracked counts
- Bid win rate and total value
- Category-wise bid performance
- Tender source distribution
- Team activity logs
- Win/loss trends over time
- Supplier performance metrics

## 🛠️ Development

### Project Structure Standards
```
Feature Implementation:
1. Define schema in lib/db/src/schema/*.ts
2. Create migration in database/migrations/*.sql
3. Implement API routes in artifacts/api-server/src/routes/*.ts
4. Create React components in artifacts/procurement-platform/src/components/
5. Update API documentation
```

### Email Notifications Setup

The platform includes email notifications for tender alerts, bid updates, task assignments, and document expiries.

**For Development (Local Testing):**
1. Install MailHog for email testing: `choco install mailhog` (Windows)
2. Start MailHog: `mailhog`
3. Visit http://localhost:8025 to view sent emails
4. Set environment variables:
   ```bash
   SMTP_HOST=localhost
   SMTP_PORT=1025
   SMTP_SECURE=false
   ```

**For Production:**
- Configure SMTP settings in environment variables
- Use services like SendGrid, AWS SES, or your email provider

**Testing Notifications:**
```bash
cd artifacts/api-server
pnpm run test:notifications
```

### Running Tests
```bash
pnpm run test
```

### Building for Production
```bash
pnpm run build
```

## 📖 Documentation

- [Architecture](docs/architecture.md) - System design and technical overview
- [Database Schema](docs/database-schema.md) - Data model and relationships
- [API Reference](docs/api.md) - Complete REST API documentation
- [Features](docs/features.md) - Detailed feature descriptions
- [Testing Guide](docs/testing.md) - Comprehensive testing procedures
- [Deployment Guide](docs/deployment.md) - Production deployment instructions

## 🐛 Troubleshooting

**Database connection fails:**
- Ensure PostgreSQL is running
- Check `.env` DATABASE_URL
- Verify database exists

**API port in use:**
- Change PORT in `.env`
- Or kill process: `lsof -i :3000`

**Build errors:**
- Run `pnpm install` in root and subdirectories
- Clear cache: `pnpm run clean`
- Rebuild: `pnpm run build`

## 🤝 Contributing

1. Create a feature branch
2. Make changes following project structure standards
3. Test thoroughly
4. Update documentation
5. Submit pull request

## 📄 License

Proprietary - All rights reserved

## 📞 Support

For issues and support, contact the development team.

---

**Last Updated:** May 13, 2026
**Version:** 1.0.0-beta
