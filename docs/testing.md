# Testing & Validation Guide

## Overview

This guide provides comprehensive testing procedures for the ProcureIntel platform. All features have been implemented with production-ready code, and this guide helps validate functionality across the entire system.

## Environment Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Docker & Docker Compose (for containerized testing)
- pnpm package manager
- Postman or similar API testing tool

### Development Environment

```bash
# 1. Install dependencies
cd Procurement-Intelligence-Platform-bid
pnpm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# 3. Start PostgreSQL
docker-compose up -d postgres

# 4. Run database migrations
cd lib/db
pnpm drizzle-kit migrate

# 5. Start API server
cd ../../artifacts/api-server
pnpm run dev

# 6. Start frontend (in another terminal)
cd artifacts/procurement-platform
pnpm run dev
```

## API Testing

### 1. Authentication Testing

**Test 1.1: User Login**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Expected Response**: 200 OK
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Test User",
    "role": "manager"
  },
  "token": "eyJhbGc..."
}
```

### 2. Tender Management Testing

**Test 2.1: List Tenders**
```bash
GET /api/tenders?page=1&limit=20
Authorization: Bearer {token}
```

**Test 2.2: Create Tender**
```bash
POST /api/tenders
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "IT Infrastructure Supply",
  "referenceNumber": "GEM/2024/001",
  "authority": "Ministry of IT",
  "category": "IT Hardware",
  "state": "Delhi",
  "estimatedValue": "5000000",
  "closingDate": "2024-06-20"
}
```

**Test 2.3: Track Tender**
```bash
POST /api/tenders/1/track
Authorization: Bearer {token}
```

**Expected**: Tender marked as tracked

**Test 2.4: Get Watchlist**
```bash
GET /api/tenders/watchlist/list
Authorization: Bearer {token}
```

### 3. Supplier Management Testing

**Test 3.1: Create Supplier**
```bash
POST /api/suppliers
Authorization: Bearer {token}
Content-Type: application/json

{
  "companyName": "TechCorp India",
  "email": "contact@techcorp.com",
  "type": "Manufacturer",
  "categories": ["IT Hardware", "Networking"],
  "rating": 4.5
}
```

**Test 3.2: Find Matching Suppliers**
```bash
POST /api/suppliers/match/find
Authorization: Bearer {token}
Content-Type: application/json

{
  "categories": ["IT Hardware"],
  "minRating": 4.0,
  "limit": 10
}
```

### 4. Bid Management Testing

**Test 4.1: Create Bid**
```bash
POST /api/bids
Authorization: Bearer {token}
Content-Type: application/json

{
  "tenderId": 1,
  "targetValue": "4500000",
  "stage": "draft"
}
```

**Test 4.2: Create Bid Task**
```bash
POST /api/bids/1/tasks
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Prepare technical proposal",
  "assignedRole": "Technical",
  "dueDate": "2024-06-15"
}
```

**Test 4.3: Compare Bids**
```bash
POST /api/bids/compare/multi
Authorization: Bearer {token}
Content-Type: application/json

{
  "bidIds": [1, 2, 3]
}
```

### 5. Keyword Alerts Testing

**Test 5.1: Create Alert Rule**
```bash
POST /api/alerts
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "IT Hardware Tenders",
  "keywords": ["server", "networking"],
  "sources": ["GeM"],
  "categories": ["IT Hardware"],
  "minValue": 500000,
  "maxValue": 10000000
}
```

**Test 5.2: Check and Notify**
```bash
POST /api/alerts/1/check-and-notify
Authorization: Bearer {token}
```

### 6. Document & OCR Testing

**Test 6.1: Upload Document with OCR**
```bash
POST /api/documents/upload-with-ocr
Authorization: Bearer {token}
Content-Type: multipart/form-data

- file: (PDF or image)
- name: "RFQ-2024-001"
- category: "RFQ"
- expiryDate: "2024-06-30"
```

**Expected Response**:
```json
{
  "document": { ... },
  "ocr": {
    "textLength": 5420,
    "confidence": 92.5,
    "language": "en",
    "keywords": ["payment", "delivery"],
    "sections": 5
  }
}
```

**Test 6.2: Get OCR Content**
```bash
GET /api/documents/1/ocr-content
Authorization: Bearer {token}
```

**Test 6.3: Search Document Text**
```bash
GET /api/documents/search-text/server
Authorization: Bearer {token}
```

### 7. Data Ingestion Testing

**Data Source Note**: The system uses enhanced mock data that simulates real GeM and CPPP tender structures. This provides realistic testing data without violating government portal terms of service or requiring complex scraping setups.

**Test 7.1: Manual Tender Ingestion (Admin Only)**
```bash
POST /api/data-management/tenders/ingest
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "sources": ["GeM", "CPPP"],
  "filters": {
    "category": "IT Hardware",
    "minValue": 500000
  }
}
```

**Expected Response**:
```json
{
  "message": "Tender ingestion completed",
  "result": {
    "imported": 42,
    "skipped": 8,
    "errors": []
  }
}
```

**Test 7.2: Get Ingestion Status**
```bash
GET /api/data-management/tenders/ingestion-status
Authorization: Bearer {admin-token}
```

### 8. Notification Testing

**Test 8.1: Get In-App Notifications**
```bash
GET /api/notifications
Authorization: Bearer {token}
```

**Test 8.2: Update Notification Preferences**
```bash
PUT /api/notifications/preferences
Authorization: Bearer {token}
Content-Type: application/json

{
  "emailNotifications": true,
  "tenderAlerts": true,
  "bidUpdates": true,
  "frequency": "daily"
}
```

**Test 8.3: Test Email Configuration (Admin Only)**
```bash
GET /api/notifications/email/test
Authorization: Bearer {admin-token}
```

### 9. Analytics Testing

**Test 9.1: Get Dashboard Summary**
```bash
GET /api/analytics/dashboard
Authorization: Bearer {token}
```

**Test 9.2: Get Activity Logs**
```bash
GET /api/analytics/activity?limit=20&page=1
Authorization: Bearer {token}
```

## Frontend Testing

### Component Testing

1. **Tender List Page**
   - [ ] List displays correctly
   - [ ] Filtering works (category, state, value)
   - [ ] Pagination works
   - [ ] Add to watchlist works

2. **Bid Management Page**
   - [ ] Create bid works
   - [ ] Edit bid works
   - [ ] Compare bids works
   - [ ] Bid tasks can be created and updated

3. **Analytics Dashboard**
   - [ ] Metrics display correctly
   - [ ] Charts render properly
   - [ ] Filters update data

4. **Admin Panel**
   - [ ] User management works
   - [ ] Tenant management works
   - [ ] Audit logs display correctly

## Database Testing

### Test Data Verification

```sql
-- Check multi-tenant isolation
SELECT COUNT(*) FROM tenders WHERE tenant_id = 1;
SELECT COUNT(*) FROM bids WHERE tenant_id = 1;

-- Check audit logs
SELECT COUNT(*) FROM activity_logs WHERE tenant_id = 1;

-- Check document OCR fields
SELECT id, name, text_confidence, language FROM documents LIMIT 5;
```

## Performance Testing

### Load Testing with Apache Bench

```bash
# Test tender list endpoint
ab -n 1000 -c 10 -H "Authorization: Bearer {token}" http://localhost:3000/api/tenders

# Test create tender endpoint
ab -n 100 -c 5 -p tender.json -T application/json -H "Authorization: Bearer {token}" http://localhost:3000/api/tenders
```

### Response Time Targets

- List endpoints: < 500ms
- Create/Update endpoints: < 1000ms
- Search endpoints: < 2000ms
- Analytics endpoints: < 3000ms

## Integration Testing

### Complete Workflow Test

1. Login with test user
2. Create a tender
3. Track the tender
4. Create an alert rule
5. Create a bid for the tender
6. Add bid tasks
7. Upload a document with OCR
8. Search document text
9. Compare bids
10. Check notifications
11. View analytics

## Security Testing

### Test Cases

1. **Authentication**
   - [ ] Missing token returns 401
   - [ ] Invalid token returns 401
   - [ ] Expired token returns 401

2. **Authorization**
   - [ ] User cannot access other tenant's data
   - [ ] Non-admin cannot access admin endpoints
   - [ ] User cannot delete other user's data

3. **Input Validation**
   - [ ] Invalid email returns 400
   - [ ] Missing required fields return 400
   - [ ] SQL injection attempts are blocked

4. **Rate Limiting**
   - [ ] Excessive requests are blocked
   - [ ] Rate limit headers are returned

## Deployment Testing

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Check health
curl http://localhost/api/health

# Check API response
curl -H "Authorization: Bearer {token}" http://localhost/api/tenders
```

## Verification Checklist

### Core Features ✅
- [ ] Multi-tenant data isolation working
- [ ] Tender management (CRUD) working
- [ ] Supplier management working
- [ ] Bid lifecycle working
- [ ] Watchlist tracking working
- [ ] Keyword alerts working
- [ ] Bid comparison working
- [ ] Eligibility checking working
- [ ] Document OCR working
- [ ] Email notifications working
- [ ] Analytics dashboard working
- [ ] Admin panel working

### Quality Metrics ✅
- [ ] No console errors in frontend
- [ ] No TypeScript compilation errors
- [ ] All API tests passing
- [ ] Database integrity maintained
- [ ] Response times within targets
- [ ] Zero security vulnerabilities

### Documentation ✅
- [ ] API documentation complete
- [ ] Architecture documentation updated
- [ ] README instructions accurate
- [ ] Code comments where needed

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running
   - Verify DATABASE_URL environment variable
   - Ensure database user has correct permissions

2. **API Server Won't Start**
   - Check port 3000 is not in use
   - Verify all environment variables set
   - Check database migrations applied

3. **OCR Processing Fails**
   - Ensure Tesseract.js is installed
   - Check file size < 50MB
   - Verify file format is supported

4. **Email Notifications Not Sending**
   - Verify SMTP configuration
   - Check MailHog is running for development
   - Verify user email preferences

## Sign-Off

- **Tested By**: _______________
- **Test Date**: _______________
- **Status**: _____ Passed / _____ Failed
- **Notes**: _______________

---

**Version**: 1.0.0
**Last Updated**: May 14, 2026
