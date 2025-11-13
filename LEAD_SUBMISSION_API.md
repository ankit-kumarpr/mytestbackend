# Lead Submission API Documentation

## User Lead Submit API

### Endpoint
`POST /api/lead/submit`

### Authentication
Required (Bearer Token - User must be logged in)

### Request Body
```json
{
  "searchKeyword": "plumbing",
  "description": "Need plumbing service for bathroom repair",
  "location": {
    "longitude": 72.8777,
    "latitude": 19.0760,
    "address": "123 Main Street, Andheri",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400053"
  },
  "radius": 15000
}
```

### Field Details:
- `searchKeyword` (required): Service keyword (e.g., "plumbing", "electrician")
- `description` (optional): Additional details about the requirement
- `location` (required): User's location object
  - `longitude` (required): Longitude coordinate
  - `latitude` (required): Latitude coordinate
  - `address` (optional): Full address string
  - `city` (optional): City name
  - `state` (optional): State name
  - `pincode` (optional): Pincode
- `radius` (optional): Search radius in meters (default: 15000 = 15km)

### Success Response (201)
```json
{
  "success": true,
  "message": "Lead submitted successfully. Vendors will be notified in real-time.",
  "data": {
    "leadId": "507f1f77bcf86cd799439011",
    "searchKeyword": "plumbing",
    "description": "Need plumbing service for bathroom repair",
    "userLocation": {
      "type": "Point",
      "coordinates": [72.8777, 19.0760],
      "address": "123 Main Street, Andheri",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400053"
    },
    "radius": 15000,
    "vendorsNotified": 5,
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Response (400)
```json
{
  "success": false,
  "message": "Search keyword and location are required"
}
```

---

## How It Works:

### 1. User Submits Lead via REST API
- User calls `POST /api/lead/submit` with search keyword and location
- System finds all vendors within radius matching the keyword
- Lead is created in database
- LeadResponse records are created for each matching vendor

### 2. Real-time Notification via WebSocket
- When lead is submitted, system emits WebSocket event to all matching vendors
- Vendors receive notification in real-time (if connected via WebSocket)
- Vendor's room: `vendor_{vendorId}`

### 3. WebSocket Events

#### For Vendor (Receiving Lead):
**Event Name:** `new_lead`
**Room:** `vendor_{vendorId}`

**Event Data:**
```json
{
  "leadId": "507f1f77bcf86cd799439011",
  "leadResponseId": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439013",
  "userName": "John Doe",
  "userPhone": "9876543210",
  "searchKeyword": "plumbing",
  "description": "Need plumbing service for bathroom repair",
  "location": {
    "address": "123 Main Street, Andheri",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400053"
  },
  "distance": 5.2,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### Vendor Acknowledgment:
**Event Name:** `lead_received`
**From Vendor to Server:**

```json
{
  "leadResponseId": "507f1f77bcf86cd799439012"
}
```

---

## Postman Setup for WebSocket Testing

### Step 1: Connect Vendor to WebSocket Server

**WebSocket URL:**
```
ws://localhost:5000
```

**Connection Headers (in Postman WebSocket):**
```
auth.token: YOUR_VENDOR_JWT_TOKEN
```

**Note:** Vendor automatically joins room: `vendor_{vendorId}` when connected

### Step 2: Submit Lead via REST API (User Side)

**POST** `http://localhost:5000/api/lead/submit`

**Headers:**
```
Authorization: Bearer YOUR_USER_JWT_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "searchKeyword": "plumbing",
  "description": "Need plumbing service for bathroom repair",
  "location": {
    "longitude": 72.8777,
    "latitude": 19.0760,
    "address": "123 Main Street, Andheri",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400053"
  },
  "radius": 15000
}
```

### Step 3: Receive Real-time Notification (Vendor Side)
- Vendor will automatically receive `new_lead` event on WebSocket connection
- Event will be received in Postman WebSocket client
- Check "Messages" tab in Postman WebSocket

**Received Event:**
```json
{
  "event": "new_lead",
  "data": {
    "leadResponse": {
      "_id": "507f1f77bcf86cd799439012",
      "leadId": "507f1f77bcf86cd799439011",
      "vendorId": {
        "_id": "507f1f77bcf86cd799439010",
        "name": "ABC Plumbing",
        "email": "abc@example.com",
        "phone": "9876543210"
      },
      "businessId": {
        "_id": "507f1f77bcf86cd799439009",
        "businessName": "ABC Plumbing Services",
        "city": "Mumbai",
        "state": "Maharashtra",
        "mobileNumber": "9876543210",
        "email": "abc@example.com"
      },
      "matchedKeywords": ["plumbing"],
      "distance": 5200,
      "status": "pending"
    },
    "lead": {
      "searchKeyword": "plumbing",
      "description": "Need plumbing service for bathroom repair",
      "userLocation": {
        "type": "Point",
        "coordinates": [72.8777, 19.0760],
        "address": "123 Main Street, Andheri",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400053"
      },
      "user": {
        "name": "John Doe",
        "phone": "9876543210",
        "email": "john@example.com"
      }
    }
  }
}
```

---

## Complete Flow:

```
1. User submits lead → POST /api/lead/submit
   ↓
2. System finds matching vendors within radius
   ↓
3. Lead created in database
   ↓
4. LeadResponse created for each vendor
   ↓
5. WebSocket emits 'new_lead' to vendor rooms
   ↓
6. Vendors receive real-time notification
   ↓
7. Vendor can respond via API
```

---

## Complete Postman Testing Guide

### Setup:
1. **Two Postman Windows/Tabs:**
   - Tab 1: User (for submitting lead)
   - Tab 2: Vendor (for WebSocket connection)

### Tab 1: User - Submit Lead

**Request:**
```
POST http://localhost:5000/api/lead/submit
```

**Headers:**
```
Authorization: Bearer {user_jwt_token}
Content-Type: application/json
```

**Body:**
```json
{
  "searchKeyword": "plumbing",
  "description": "Need plumbing service for bathroom repair",
  "location": {
    "longitude": 72.8777,
    "latitude": 19.0760,
    "address": "123 Main Street, Andheri",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400053"
  },
  "radius": 15000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lead submitted successfully! 5 vendor(s) notified in real-time",
  "data": {
    "lead": { ... },
    "notifiedVendors": [ ... ]
  }
}
```

### Tab 2: Vendor - WebSocket Connection

**Step 1: Create WebSocket Request in Postman**
- New Request → WebSocket
- URL: `ws://localhost:5000`

**Step 2: Add Authentication**
- Go to "Headers" or "Params" tab
- Add: `auth.token` = `{vendor_jwt_token}`

**Step 3: Connect**
- Click "Connect" button
- You should see: "Connected" status

**Step 4: Wait for Notification**
- When user submits lead (Tab 1), vendor will receive `new_lead` event
- Check "Messages" tab in WebSocket request
- You'll see incoming message with lead details

**Received Message:**
```json
{
  "leadResponse": {
    "_id": "...",
    "leadId": "...",
    "vendorId": { ... },
    "businessId": { ... },
    "matchedKeywords": ["plumbing"],
    "distance": 5200,
    "status": "pending"
  },
  "lead": {
    "searchKeyword": "plumbing",
    "description": "Need plumbing service for bathroom repair",
    "userLocation": { ... },
    "user": {
      "name": "John Doe",
      "phone": "9876543210",
      "email": "john@example.com"
    }
  }
}
```

---

## Notes:
- WebSocket is optional - vendors can still see leads via REST API
- If vendor is not connected via WebSocket, they can check leads via `GET /api/lead/vendor/leads`
- Real-time notification only works if vendor is connected via WebSocket
- User must be authenticated to submit lead
- Vendor must be authenticated to receive WebSocket notifications

