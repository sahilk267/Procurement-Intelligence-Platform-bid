# API Documentation

## Overview

ProcureIntel REST API provides endpoints for managing tenders, bids, suppliers, and procurement workflows. All endpoints return JSON responses and require authentication except for auth endpoints.

## Authentication

### Base URL
```
http://localhost:3000/api
```

### Authentication Methods

#### 1. Login (Get JWT Token)
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response: {
  "user": { "id": 1, "email": "user@example.com", "name": "John", "role": "manager" },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 2. Using Token
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Tender Management

### List Tenders
```
GET /api/tenders?q=search&category=IT&state=Mumbai&status=open&minValue=100000&maxValue=10000000&page=1&limit=20

Response: {
  "data": [ { tender objects } ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

### Create Tender
```
POST /api/tenders
Content-Type: application/json

{
  "title": "IT Infrastructure Supply",
  "referenceNumber": "GEM/2024/001",
  "authority": "Ministry of IT",
  "category": "IT Hardware",
  "state": "Delhi",
  "estimatedValue": "5000000",
  "emdAmount": "250000",
  "source": "GeM",
  "openingDate": "2024-05-20",
  "closingDate": "2024-06-20",
  "preBidDate": "2024-06-15",
  "description": "Supply of servers and networking equipment",
  "eligibilityCriteria": "GST registered, 3+ years experience",
  "technicalSpecs": "Dell/HP servers, Cisco switches",
  "paymentTerms": "30 days after delivery"
}

Response: {
  "id": 1,
  "tenantId": 5,
  "title": "IT Infrastructure Supply",
  "status": "open",
  "createdBy": 10,
  "createdAt": "2024-05-13T10:30:00Z",
  ...
}
```

### Get Tender
```
GET /api/tenders/1

Response: { tender object }
```

### Update Tender
```
PUT /api/tenders/1
Content-Type: application/json

{
  "status": "closed",
  "description": "Updated description"
}

Response: { updated tender object }
```

### Delete Tender
```
DELETE /api/tenders/1

Response: { "success": true, "message": "Tender deleted" }
```

### Watchlist Operations

#### Get Watchlist
```
GET /api/tenders/watchlist/list?q=server&category=IT&source=GeM&status=open&closingWithin=7

Response: {
  "data": [ { tracked tenders } ],
  "total": 25
}
```

#### Add to Watchlist
```
POST /api/tenders/1/track

Response: { updated tender object with isTracked: true }
```

#### Remove from Watchlist
```
POST /api/tenders/1/untrack

Response: { updated tender object with isTracked: false }
```

## Supplier Management

### List Suppliers
```
GET /api/suppliers?q=search&type=Manufacturer&category=IT&rating=4&page=1&limit=20

Response: {
  "data": [ { supplier objects } ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

### Create Supplier
```
POST /api/suppliers
Content-Type: application/json

{
  "companyName": "TechCorp India",
  "contactName": "Raj Kumar",
  "email": "raj@techcorp.com",
  "phone": "+91-9876543210",
  "type": "Manufacturer",
  "categories": ["IT Hardware", "Networking"],
  "oemProducts": ["Dell", "Cisco"],
  "notes": "Reliable partner with good track record"
}

Response: { supplier object }
```

### Get Supplier Details
```
GET /api/suppliers/5

Response: {
  supplier object with performanceHistory: [ past projects ]
}
```

### Update Supplier
```
PUT /api/suppliers/5
Content-Type: application/json

{
  "rating": 4.5,
  "notes": "Updated notes",
  "categories": ["IT Hardware", "Networking", "Security"]
}

Response: { updated supplier object }
```

### Delete Supplier
```
DELETE /api/suppliers/5

Response: { "success": true, "message": "Supplier deleted" }
```

### Find Matching Suppliers
```
POST /api/suppliers/match/find
Content-Type: application/json

{
  "categories": ["IT Hardware", "Networking"],
  "minRating": 3.5,
  "limit": 10
}

Response: [
  {
    supplier object,
    "matchScore": 85.5,
    "categoryMatches": 2
  },
  ...
]
```

### Supplier Analytics
```
GET /api/suppliers/analytics/summary

Response: {
  "totalSuppliers": 45,
  "averageRating": 4.2,
  "byType": [
    { "type": "Manufacturer", "count": 20, "avgRating": 4.5 },
    { "type": "Distributor", "count": 25, "avgRating": 4.0 }
  ]
}
```

## Bid Management

### List Bids
```
GET /api/bids?stage=draft&page=1&limit=20

Response: {
  "data": [ { bid objects with tender info } ],
  "total": 35,
  "page": 1,
  "limit": 20
}
```

### Create Bid
```
POST /api/bids
Content-Type: application/json

{
  "tenderId": 1,
  "targetValue": "4500000",
  "submissionDate": "2024-06-19",
  "notes": "Bid prepared by Raj",
  "stage": "shortlisted"
}

Response: { bid object }
```

### Get Bid Details
```
GET /api/bids/10

Response: {
  bid object,
  "boqItems": [ { items } ],
  "boqTotal": 4500000,
  "tasks": [ { bid tasks } ],
  "proposals": [ { proposal versions } ]
}
```

### Update Bid
```
PUT /api/bids/10
Content-Type: application/json

{
  "stage": "submitted",
  "submissionDate": "2024-06-18",
  "notes": "Submitted with all documents"
}

Response: { updated bid object }
```

### Delete Bid
```
DELETE /api/bids/10

Response: { "success": true, "message": "Bid deleted" }
```

### Bid Tasks

#### Get Bid Tasks
```
GET /api/bids/10/tasks

Response: [
  {
    "id": 1,
    "bidId": 10,
    "title": "Prepare technical proposal",
    "status": "pending",
    "dueDate": "2024-06-17"
  },
  ...
]
```

#### Create Task
```
POST /api/bids/10/tasks
Content-Type: application/json

{
  "title": "Get quote from supplier",
  "description": "Get updated pricing from TechCorp",
  "assignedRole": "Sales",
  "dueDate": "2024-06-16"
}

Response: { task object }
```

#### Update Task
```
PUT /api/bids/10/tasks/1
Content-Type: application/json

{
  "status": "completed",
  "completedAt": "2024-05-13T15:30:00Z"
}

Response: { updated task object }
```

### Compare Bids
```
POST /api/bids/compare/multi
Content-Type: application/json

{
  "bidIds": [1, 2, 3]
}

Response: [
  {
    bid object,
    "boqTotal": 4500000,
    "itemCount": 15,
    "margin": 500000
  },
  ...
]
```

### Bid Analytics
```
GET /api/bids/analytics/summary

Response: {
  "totalBids": 45,
  "submittedBids": 30,
  "wonBids": 8,
  "winRate": "17.78",
  "totalBidValue": 135000000,
  "wonValue": 42000000
}
```

## Alerts & Monitoring

### List Alerts
```
GET /api/alerts?active=true&page=1&limit=20

Response: {
  "data": [ { alert rules } ],
  "total": 12,
  "page": 1,
  "limit": 20
}
```

### Create Alert Rule
```
POST /api/alerts
Content-Type: application/json

{
  "name": "IT Hardware Tenders",
  "keywords": ["server", "networking", "storage"],
  "sources": ["GeM", "CPPP"],
  "categories": ["IT Hardware", "Networking"],
  "states": ["Delhi", "Mumbai"],
  "minValue": 500000,
  "maxValue": 10000000
}

Response: { alert rule object }
```

### Get Alert Details with Matches
```
GET /api/alerts/5

Response: {
  rule object,
  "matchedTenders": [ { matching tenders } ],
  "matchCount": 42
}
```

### Update Alert
```
PUT /api/alerts/5
Content-Type: application/json

{
  "keywords": ["server", "cloud", "infrastructure"],
  "isActive": true
}

Response: { updated alert object }
```

### Delete Alert
```
DELETE /api/alerts/5

Response: { "success": true, "message": "Rule deleted" }
```

### Toggle Alert Active/Inactive
```
POST /api/alerts/5/toggle

Response: { alert object with toggled isActive status }
```

## Tender Analysis

### Get Analysis
```
GET /api/analysis/1

Response: {
  "id": 1,
  "tenderId": 1,
  "eligibilityScore": 75,
  "riskScore": "yellow",
  "eligibilityCriteria": [ { criteria objects } ],
  "keyDeadlines": [ { deadline objects } ],
  "riskFactors": [ { risk objects } ],
  "hiddenClauses": [ { clause strings } ],
  "aiSummary": "This tender is suitable for bidding..."
}
```

### Run Analysis
```
POST /api/analysis/1

Response: { analysis object with AI-generated data }
```

### Go/No-Go Decision
```
GET /api/analysis/1/go-no-go

Response: {
  "tenderId": 1,
  "decision": "bid",
  "score": 72,
  "strategicFit": 78,
  "eligibilityScore": 75,
  "marginPotential": 65,
  "competitionLevel": "medium",
  "reasoning": "...",
  "recommendation": "Strong fit. Proceed with bid preparation..."
}
```

## Notifications

### Get In-App Notifications
```
GET /api/notifications

Response: {
  "data": [
    {
      "id": "tender-123",
      "type": "tender_deadline",
      "severity": "urgent",
      "title": "Tender Closing Soon",
      "message": "Tender closes in 2 days",
      "date": "2024-06-20",
      "entityId": 123,
      "entityType": "tender",
      "link": "/tenders"
    }
  ],
  "total": 5,
  "unread": 2,
  "counts": { "urgent": 1, "warning": 1, "info": 3 }
}
```

### Get Notification Preferences
```
GET /api/notifications/preferences

Response: {
  "emailNotifications": true,
  "tenderAlerts": true,
  "bidUpdates": true,
  "taskAssignments": true,
  "documentExpiry": true,
  "frequency": "immediate"
}
```

### Update Notification Preferences
```
PUT /api/notifications/preferences
Content-Type: application/json

{
  "emailNotifications": true,
  "tenderAlerts": false,
  "bidUpdates": true,
  "taskAssignments": true,
  "documentExpiry": true,
  "frequency": "daily"
}

Response: { "success": true, "preferences": { ... } }
```

### Get Recent Notification Activity
```
GET /api/notifications/recent?page=1&limit=20

Response: {
  "data": [ { activity log objects } ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

### Test Email Configuration (Admin Only)
```
GET /api/notifications/email/test

Response: {
  "emailConfigured": true,
  "smtpHost": "localhost",
  "smtpPort": "1025"
}
```

## Documents & OCR

### List Documents
```
GET /api/documents?category=RFQ&page=1&limit=20

Response: [
  {
    "id": 1,
    "name": "RFQ-2024-001",
    "category": "RFQ",
    "fileName": "rfq.pdf",
    "fileUrl": "/uploads/rfq.pdf",
    "expiryDate": "2024-06-30",
    "mimeType": "application/pdf",
    "fileSize": 102400,
    "language": "en",
    "textConfidence": 92.5,
    "createdAt": "2024-05-13T10:30:00Z"
  },
  ...
]
```

### Upload Document with OCR Processing
```
POST /api/documents/upload-with-ocr
Content-Type: multipart/form-data

Parameters:
- file: Binary PDF or image file
- name: Document name (e.g., "RFQ-2024-001")
- category: Document category (e.g., "RFQ", "Contract", "Invoice")
- expiryDate: Optional expiry date (YYYY-MM-DD)

Response: {
  "document": {
    "id": 1,
    "name": "RFQ-2024-001",
    "category": "RFQ",
    "fileName": "rfq.pdf"
  },
  "ocr": {
    "textLength": 5420,
    "confidence": 92.5,
    "language": "en",
    "keywords": ["payment", "delivery", "terms"],
    "sections": 5
  }
}
```

### Get Extracted OCR Content
```
GET /api/documents/1/ocr-content

Response: {
  "documentId": 1,
  "documentName": "RFQ-2024-001",
  "extractedText": "Full text extracted from document...",
  "textLength": 5420,
  "confidence": 92.5,
  "language": "en",
  "parsedContent": {
    "title": "Request for Quotation - IT Infrastructure",
    "keywords": ["payment", "delivery", "terms"],
    "sections": [
      {
        "heading": "REQUIREMENTS",
        "content": "Supply of 10 Dell servers..."
      },
      ...
    ],
    "summary": "This RFQ requests quotations for IT infrastructure..."
  },
  "processedAt": "2024-05-13T10:35:00Z"
}
```

### Search in Document Text
```
GET /api/documents/search-text/server?limit=20

Response: {
  "query": "server",
  "results": [
    {
      "documentId": 1,
      "documentName": "RFQ-2024-001",
      "matchCount": 5,
      "context": "...Dell servers, HP servers, and IBM servers...",
      "confidence": 92.5
    },
    ...
  ],
  "totalMatches": 8
}
```

### Get Document Details
```
GET /api/documents/1

Response: {
  document object with enriched data
}
```

### Update Document
```
PUT /api/documents/1
Content-Type: application/json

{
  "name": "RFQ-2024-001-Updated",
  "category": "RFQ",
  "expiryDate": "2024-07-30"
}

Response: { updated document object }
```

### Delete Document
```
DELETE /api/documents/1

Response: { "success": true, "message": "Document deleted" }
```

### Check Expiring Documents
```
POST /api/documents/check-expiries
Content-Type: application/json

{
  "daysAhead": 30
}

Response: {
  "message": "Checked 5 expiring documents",
  "notificationsSent": 25
}
```

## Data Management & Ingestion

### Ingest Tenders from Sources (Admin Only)
```
POST /api/data-management/tenders/ingest
Content-Type: application/json

{
  "sources": ["GeM", "CPPP"],
  "filters": {
    "category": "IT Hardware",
    "state": "Delhi",
    "minValue": 500000,
    "maxValue": 50000000
  }
}

Response: {
  "message": "Tender ingestion completed",
  "result": {
    "imported": 42,
    "skipped": 8,
    "errors": []
  },
  "timestamp": "2024-05-14T10:30:00Z"
}
```

### Get Ingestion Status (Admin Only)
```
GET /api/data-management/tenders/ingestion-status

Response: {
  "lastIngestion": {
    "timestamp": "2024-05-13T20:30:00Z",
    "source": ["GeM", "CPPP"],
    "imported": 245,
    "status": "completed"
  },
  "nextScheduledIngestion": "2024-05-14T20:30:00Z",
  "ingestingNow": false
}
```

**Notes:**
- Tenders are automatically ingested daily at 2:00 AM IST
- Supports multiple sources: GeM (Government e-Marketplace) and CPPP (Central Public Procurement Portal)
- Automatic deduplication prevents duplicate tenders
- Only tenants with active subscriptions receive ingestion
- Real-time ingestion available for premium users

## Analytics Dashboard

### Dashboard Summary
```
GET /api/analytics/dashboard

Response: {
  "bids": {
    "total": 45,
    "won": 8,
    "submitted": 30,
    "winRate": "17.78"
  },
  "tenders": {
    "total": 250,
    "tracked": 45,
    "untouched": 205
  },
  "financial": {
    "totalBidValue": 135000000,
    "wonValue": 42000000,
    "avgBidValue": 3000000
  },
  "suppliers": 52
}
```

### Bids by Category
```
GET /api/analytics/bids/category

Response: [
  {
    "category": "IT Hardware",
    "bidCount": 15,
    "wonCount": 3,
    "totalValue": 45000000
  },
  ...
]
```

### Tender Source Analysis
```
GET /api/analytics/tenders/sources

Response: [
  {
    "source": "GeM",
    "count": 150,
    "tracked": 42,
    "value": 2500000
  },
  ...
]
```

### Activity Logs
```
GET /api/analytics/activity?limit=20&page=1

Response: {
  "data": [
    {
      "id": 100,
      "type": "bid_created",
      "entityType": "bid",
      "entityId": 10,
      "entityName": "IT Infrastructure",
      "description": "Bid created for tender...",
      "createdAt": "2024-05-13T10:30:00Z"
    },
    ...
  ],
  "total": 1250,
  "page": 1,
  "limit": 20
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message describing the issue"
}
```

### Common HTTP Status Codes
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - No permission
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Pagination

Endpoints that return lists support pagination:

```
?page=2&limit=50
```

Response includes:
```json
{
  "data": [ ...items ],
  "total": 250,
  "page": 2,
  "limit": 50
}
```

## Filtering

Supported filter operations:
- `q` - Full-text search on title/name
- `status` - Filter by status (open, closed, etc.)
- `category` - Filter by category
- `state` - Filter by state
- `source` - Filter by tender source
- `minValue` / `maxValue` - Filter by value range
- `rating` - Minimum supplier rating

## Rate Limiting

API endpoints are rate-limited:
- `100 requests per minute` for standard endpoints
- `10 requests per minute` for resource-intensive endpoints

## Response Examples

### Tender Object
```json
{
  "id": 1,
  "tenantId": 5,
  "createdBy": 10,
  "updatedBy": 12,
  "title": "IT Infrastructure Supply",
  "referenceNumber": "GEM/2024/001",
  "authority": "Ministry of IT",
  "category": "IT Hardware",
  "state": "Delhi",
  "estimatedValue": "5000000.00",
  "emdAmount": "250000.00",
  "status": "open",
  "source": "GeM",
  "openingDate": "2024-05-20",
  "closingDate": "2024-06-20",
  "preBidDate": "2024-06-15",
  "description": "Supply of servers and networking equipment",
  "eligibilityCriteria": "GST registered, 3+ years experience",
  "technicalSpecs": "Dell/HP servers, Cisco switches",
  "paymentTerms": "30 days after delivery",
  "riskScore": "yellow",
  "aiSummary": "This tender is suitable for bidding...",
  "portalUrl": "https://gem.gov.in/...",
  "isTracked": true,
  "createdAt": "2024-05-13T10:30:00Z",
  "updatedAt": "2024-05-14T15:45:00Z"
}
```

### Bid Object
```json
{
  "id": 10,
  "tenantId": 5,
  "tenderId": 1,
  "createdBy": 10,
  "updatedBy": 12,
  "stage": "submitted",
  "assignedTo": 11,
  "notes": "Bid prepared by Raj with full documentation",
  "targetValue": "4500000.00",
  "submissionDate": "2024-06-18",
  "resultDate": "2024-07-15",
  "wonValue": "4500000.00",
  "lostReason": null,
  "createdAt": "2024-05-20T10:30:00Z",
  "updatedAt": "2024-06-18T14:30:00Z"
}
```

---

**API Version:** 1.0.0
**Last Updated:** May 13, 2026
