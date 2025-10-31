# Lead Management API Documentation 🔥

Complete API documentation for User-Vendor Lead Management System with Real-time Notifications

---

## 📌 Installation

```bash
npm install socket.io
```

---

## 🎯 Overview

### Search Flow (No Radius)
1. User searches → Gets keyword suggestions
2. User clicks suggestion → Gets ALL vendors with that keyword (full business details)
3. User submits lead with location → Only nearby vendors (within radius) get real-time notification

### Lead Flow (With Radius + Real-time)
1. User submits lead with location + radius (default 15km)
2. System finds vendors within radius with matching keywords
3. Real-time notification sent to ALL matching vendors via Socket.IO
4. Each vendor can Accept/Reject independently
5. All responses saved in vendor's history

---

## 🔍 API 1: GET KEYWORD SUGGESTIONS (No Radius)

**Purpose:** User types search term, gets keyword suggestions only

```
Method: GET
URL: http://localhost:3000/api/lead/search-suggestions?searchTerm=react training
```

**Headers:**
```
Content-Type: application/json
```

**Query Parameters:**
- `searchTerm` (required) - Search term with spaces allowed

**Response:**
```json
{
  "success": true,
  "data": {
    "searchTerm": "react training",
    "totalSuggestions": 5,
    "suggestions": [
      "react training",
      "react course",
      "best react training",
      "react training center",
      "react development training"
    ]
  }
}
```

---

## 🏢 API 2: SEARCH VENDORS BY KEYWORD WITH LOCATION (With Radius)

**Purpose:** User types keyword (tuta futa bhi chalega) + location, gets nearby vendors with matching keywords

```
Method: GET
URL: http://localhost:3000/api/lead/search-vendors?keyword=react train&longitude=72.8777&latitude=19.0760&radius=15000&page=1&limit=20
```

**Headers:**
```
Content-Type: application/json
```

**Query Parameters:**
- `keyword` (required) - Search keyword (spaces allowed, partial match bhi chalega)
- `longitude` (required) - User's longitude
- `latitude` (required) - User's latitude
- `radius` (optional, default: 15000) - Search radius in meters
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Results per page

**Response:**
```json
{
  "success": true,
  "data": {
    "searchKeyword": "react train",
    "userLocation": {
      "longitude": 72.8777,
      "latitude": 19.0760
    },
    "radius": 15000,
    "radiusKm": "15.0",
    "totalVendors": 5,
    "vendors": [
      {
        "_id": "business_id",
        "businessName": "Tech Academy",
        "gstNumber": "27AABCU9603R1ZM",
        "panNumber": "AABCU9603R",
        "email": "contact@techacademy.com",
        "mobileNumber": "+919876543210",
        "alternateNumber": "+919876543211",
        "businessAddress": "123, MG Road, Andheri West",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400053",
        "location": {
          "type": "Point",
          "coordinates": [72.8777, 19.0760]
        },
        "category": "Education",
        "subCategory": "IT Training",
        "businessDescription": "Professional IT training institute",
        "website": "https://techacademy.com",
        "socialMedia": {
          "facebook": "techacademy",
          "instagram": "techacademy"
        },
        "operatingHours": {
          "monday": "9:00 AM - 6:00 PM",
          "tuesday": "9:00 AM - 6:00 PM"
        },
        "vendor": {
          "_id": "vendor_id",
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "+919876543210"
        },
        "matchedKeywords": [
          "react training",
          "react course",
          "best react training"
        ],
        "distance": 2500,
        "distanceKm": "2.50"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 20,
      "pages": 1
    }
  }
}
```

**Note:** Vendors are sorted by distance (nearest first)

---

## 📝 API 3: SUBMIT LEAD (With Radius + Real-time Socket.IO)

**Purpose:** User submits inquiry, vendors within radius get real-time notification

```
Method: POST
URL: http://localhost:3000/api/lead/submit
```

**Headers:**
```
Authorization: Bearer user_jwt_token
Content-Type: application/json
```

**Body:**
```json
{
  "searchKeyword": "best react training center",
  "description": "I need a React.js training course for beginners. Looking for weekend batches.",
  "location": {
    "longitude": 72.8777,
    "latitude": 19.0760,
    "address": "Andheri West, Mumbai",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400053"
  },
  "radius": 15000
}
```

**Notes:**
- `description` is **OPTIONAL** (can be empty or omitted)
- `searchKeyword` allows spaces (e.g., "best react training center")
- `radius` in meters (default: 15000 = 15km)
- Only vendors within radius with matching keywords will receive notification

**Response:**
```json
{
  "success": true,
  "message": "Lead submitted successfully! 3 vendor(s) notified in real-time",
  "data": {
    "lead": {
      "_id": "lead_id_123",
      "userId": {
        "name": "Amit Kumar",
        "email": "amit@example.com",
        "phone": "+919876543210"
      },
      "searchKeyword": "best react training center",
      "description": "I need a React.js training course...",
      "userLocation": {
        "coordinates": [72.8777, 19.0760],
        "address": "Andheri West, Mumbai",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400053"
      },
      "matchedKeywords": ["react training", "best react", "training center"],
      "radius": 15000,
      "status": "pending",
      "totalVendorsNotified": 3,
      "totalAccepted": 0,
      "totalRejected": 0,
      "totalPending": 3,
      "createdAt": "2025-10-31T10:30:00.000Z"
    },
    "notifiedVendors": [
      {
        "_id": "lead_response_id_1",
        "vendorId": {
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "+919876543210"
        },
        "businessId": {
          "businessName": "Tech Academy",
          "city": "Mumbai",
          "state": "Maharashtra",
          "mobileNumber": "+919876543210",
          "email": "contact@techacademy.com"
        },
        "matchedKeywords": ["react training", "best react"],
        "distance": 2500,
        "status": "pending",
        "createdAt": "2025-10-31T10:30:00.000Z",
        "expiresAt": "2025-11-01T10:30:00.000Z"
      }
    ]
  }
}
```

---

## 👤 API 4: GET USER'S LEADS

**Purpose:** User can see all their submitted leads and vendor responses

```
Method: GET
URL: http://localhost:3000/api/lead/my-leads?status=pending&page=1&limit=10
```

**Headers:**
```
Authorization: Bearer user_jwt_token
Content-Type: application/json
```

**Query Parameters:**
- `status` (optional) - Filter: pending, in-progress, completed, cancelled
- `page` (optional, default: 1)
- `limit` (optional, default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "leads": [
      {
        "_id": "lead_id",
        "searchKeyword": "react training",
        "description": "Need training...",
        "userLocation": {
          "address": "Andheri West, Mumbai"
        },
        "status": "in-progress",
        "totalVendorsNotified": 3,
        "totalAccepted": 1,
        "totalRejected": 1,
        "totalPending": 1,
        "responses": [
          {
            "_id": "response_id_1",
            "vendorId": {
              "name": "John Doe",
              "email": "john@example.com"
            },
            "businessId": {
              "businessName": "Tech Academy",
              "city": "Mumbai"
            },
            "status": "accepted",
            "distance": 2500,
            "notes": "We have weekend batches available",
            "respondedAt": "2025-10-31T11:00:00.000Z"
          }
        ]
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "pages": 1
    }
  }
}
```

---

## 🏪 API 5: GET VENDOR'S LEADS (Real-time Received)

**Purpose:** Vendor sees all leads received in real-time

```
Method: GET
URL: http://localhost:3000/api/lead/vendor/leads?status=pending&page=1&limit=10
```

**Headers:**
```
Authorization: Bearer vendor_jwt_token
Content-Type: application/json
```

**Query Parameters:**
- `status` (optional) - Filter: pending, accepted, rejected, expired
- `page` (optional, default: 1)
- `limit` (optional, default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "leads": [
      {
        "_id": "lead_response_id",
        "leadId": {
          "_id": "lead_id",
          "searchKeyword": "best react training center",
          "description": "I need a React.js training course...",
          "userLocation": {
            "coordinates": [72.8777, 19.0760],
            "address": "Andheri West, Mumbai",
            "city": "Mumbai"
          },
          "userId": {
            "name": "Amit Kumar",
            "email": "amit@example.com",
            "phone": "+919876543210"
          },
          "createdAt": "2025-10-31T10:30:00.000Z"
        },
        "businessId": {
          "businessName": "Tech Academy",
          "city": "Mumbai",
          "state": "Maharashtra"
        },
        "matchedKeywords": ["react training", "best react", "training center"],
        "distance": 2500,
        "status": "pending",
        "createdAt": "2025-10-31T10:30:00.000Z",
        "expiresAt": "2025-11-01T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "pages": 1
    }
  }
}
```

---

## ✅❌ API 6: ACCEPT/REJECT LEAD

**Purpose:** Vendor accepts or rejects lead (saves in history)

```
Method: POST
URL: http://localhost:3000/api/lead/vendor/respond/lead_response_id_123
```

**Headers:**
```
Authorization: Bearer vendor_jwt_token
Content-Type: application/json
```

**Body for ACCEPT:**
```json
{
  "status": "accepted",
  "notes": "We have weekend batches available. Will contact customer soon."
}
```

**Body for REJECT:**
```json
{
  "status": "rejected",
  "notes": "Currently no weekend batches available."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lead accepted successfully",
  "data": {
    "_id": "lead_response_id",
    "leadId": {
      "_id": "lead_id",
      "searchKeyword": "react training",
      "userId": {
        "name": "Amit Kumar",
        "phone": "+919876543210",
        "email": "amit@example.com"
      }
    },
    "businessId": {
      "businessName": "Tech Academy",
      "city": "Mumbai"
    },
    "status": "accepted",
    "notes": "We have weekend batches available...",
    "respondedAt": "2025-10-31T11:00:00.000Z",
    "matchedKeywords": ["react training"],
    "distance": 2500
  }
}
```

---

## 📊 API 7: GET VENDOR STATISTICS

**Purpose:** Vendor dashboard - see accept/reject history

```
Method: GET
URL: http://localhost:3000/api/lead/vendor/stats
```

**Headers:**
```
Authorization: Bearer vendor_jwt_token
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "data": {
    "statistics": {
      "total": 25,
      "accepted": 15,
      "rejected": 5,
      "pending": 5,
      "acceptanceRate": 75.0
    },
    "recentActivity": [
      {
        "_id": "response_id",
        "leadId": {
          "searchKeyword": "react training",
          "description": "Need training..."
        },
        "businessId": {
          "businessName": "Tech Academy"
        },
        "status": "accepted",
        "distance": 2500,
        "createdAt": "2025-10-31T11:00:00.000Z"
      }
    ]
  }
}
```

---

## 🔌 Socket.IO Integration (Real-time)

### Client Setup (Vendor Side)

```javascript
import io from 'socket.io-client';

// Connect with JWT token
const socket = io('http://localhost:3000', {
  auth: {
    token: 'vendor_jwt_token_here'
  }
});

// Listen for new leads
socket.on('new_lead', (data) => {
  console.log('New lead received!', data);
  
  // data structure:
  // {
  //   leadResponse: { ... },
  //   lead: {
  //     searchKeyword: "react training",
  //     description: "...",
  //     userLocation: { ... },
  //     user: {
  //       name: "Amit Kumar",
  //       phone: "+919876543210",
  //       email: "amit@example.com"
  //     }
  //   }
  // }
  
  // Show notification to vendor
  showNotification('New Lead Received!', data.lead.searchKeyword);
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

### Client Setup (User Side)

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'user_jwt_token_here'
  }
});

// Listen for vendor responses
socket.on('lead_update', (data) => {
  console.log('Vendor responded!', data);
  
  // data structure:
  // {
  //   leadId: "lead_id",
  //   status: "accepted",
  //   message: "A vendor has accepted your lead"
  // }
  
  showNotification('Lead Update', data.message);
});
```

---

## 📝 Key Features

✅ **Search Suggestions** - No radius, just keyword suggestions
✅ **Search Vendors** - With location & radius, tuta futa keyword match bhi chalega
✅ **Distance Sorting** - Nearest vendors first
✅ **Lead Submission** - With radius (15km default), only nearby vendors notified
✅ **Real-time Notifications** - Socket.IO for instant vendor notifications
✅ **Multiple Vendors** - Same lead sent to all matching vendors in radius
✅ **Accept/Reject** - Each vendor responds independently
✅ **History Tracking** - All responses saved
✅ **Statistics** - Vendor performance metrics
✅ **Flexible Search** - Spaces allowed, partial match supported
✅ **Optional Description** - Not mandatory in search or lead submission

---

## 🔄 Complete Flow Example

### 1. User Searches
```
GET /api/lead/search-suggestions?searchTerm=react
→ Gets: ["react training", "react course", ...]
```

### 2. User Views Vendors (With Location & Radius)
```
GET /api/lead/search-vendors?keyword=react train&longitude=72.8777&latitude=19.0760&radius=15000
→ Gets: Nearby vendors (within 15km) with matching keywords (tuta futa match bhi chalega)
→ Results sorted by distance (nearest first)
```

### 3. User Submits Lead
```
POST /api/lead/submit
Body: {
  searchKeyword: "react training",
  description: "Need weekend batches",  // OPTIONAL
  location: { longitude: 72.8777, latitude: 19.0760 },
  radius: 15000
}
→ Only vendors within 15km get real-time notification
```

### 4. Vendors Receive (Real-time)
```
Socket.IO event: 'new_lead'
→ All matching vendors within radius receive notification instantly
```

### 5. Vendor Responds
```
POST /api/lead/vendor/respond/response_id
Body: { status: "accepted", notes: "..." }
→ Saved in vendor's history
```

### 6. User Sees Responses
```
GET /api/lead/my-leads
→ Sees all vendor responses (accepted/rejected)
```

---

## 🎯 Important Notes

1. **Search** = No radius, shows ALL vendors
2. **Lead Submission** = Uses radius, only nearby vendors notified
3. **Description** = Optional everywhere
4. **Spaces** = Allowed in keywords and search terms
5. **Real-time** = Socket.IO for instant notifications
6. **History** = All accept/reject saved in database
7. **Multiple Vendors** = Same lead to all matching vendors
8. **24 Hour Expiry** = Leads expire after 24 hours if not responded

---

**Done! Complete Lead Management System with Real-time Notifications** 🚀

