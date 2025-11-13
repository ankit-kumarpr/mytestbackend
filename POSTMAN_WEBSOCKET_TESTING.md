# Postman Me WebSocket Testing - Step by Step Guide

## Prerequisites
1. Postman installed (latest version)
2. Server running on `http://localhost:5000`
3. Two JWT tokens ready:
   - User token (for submitting lead)
   - Vendor token (for WebSocket connection)

---

## Step 1: User Side - Lead Submit (REST API)

### Create New Request
1. Postman kholo
2. **New** button click karo
3. **HTTP Request** select karo
4. Method: **POST** select karo
5. URL enter karo: `http://localhost:5000/api/lead/submit`

### Setup Headers
1. **Headers** tab click karo
2. Add these headers:
   ```
   Key: Authorization
   Value: Bearer YOUR_USER_JWT_TOKEN
   
   Key: Content-Type
   Value: application/json
   ```

### Setup Body
1. **Body** tab click karo
2. **raw** select karo
3. **JSON** dropdown select karo
4. Body me ye paste karo:

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

### Send Request
1. **Send** button click karo
2. Response me dikhega:
```json
{
  "success": true,
  "message": "Lead submitted successfully! 5 vendor(s) notified in real-time",
  "data": { ... }
}
```

**Note:** Abhi mat send karo, pehle vendor WebSocket connect karo!

---

## Step 2: Vendor Side - WebSocket Connection

### Create WebSocket Request
1. Postman me **New** button click karo
2. **WebSocket Request** select karo (HTTP Request ke neeche option hai)
3. Ya phir URL bar me directly type karo: `ws://localhost:5000`

### Setup Authentication
**Method 1: Connection Params (Recommended)**
1. WebSocket request me **Params** tab click karo
2. Add parameter:
   ```
   Key: auth.token
   Value: YOUR_VENDOR_JWT_TOKEN
   ```

**Method 2: Headers (Alternative)**
1. **Headers** tab click karo
2. Add header:
   ```
   Key: auth
   Value: {"token": "YOUR_VENDOR_JWT_TOKEN"}
   ```

### Connect to Server
1. **Connect** button click karo (top right me)
2. Status check karo:
   - ✅ **Connected** - Sahi hai!
   - ❌ **Disconnected** - Token check karo ya server check karo

### Check Connection Status
1. Connection hone ke baad, bottom me **Messages** tab dikhega
2. Status dikhega: `Connected to ws://localhost:5000`
3. Console me dikhega: `User connected: {vendorId} (vendor)`

---

## Step 3: Test Real-time Notification

### Now Submit Lead from User Side
1. **Step 1** wali request me wapas jao (User REST API)
2. **Send** button click karo
3. Response aayega: "Lead submitted successfully!"

### Check Vendor WebSocket
1. **Step 2** wali WebSocket request me jao
2. **Messages** tab check karo
3. **New message** dikhega automatically:

```json
{
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
```

---

## Complete Testing Flow

### Setup (Ek baar):
```
1. Postman kholo
2. User REST API request banao (Step 1)
3. Vendor WebSocket request banao (Step 2)
4. Vendor WebSocket connect karo
```

### Testing (Har baar):
```
1. Vendor WebSocket connected hai? ✅
2. User REST API se lead submit karo
3. Vendor WebSocket me notification check karo
4. Real-time notification aaya? ✅
```

---

## Troubleshooting

### Problem: WebSocket Connect Nahi Ho Raha
**Solution:**
- Server running hai? Check karo: `http://localhost:5000`
- Token sahi hai? Vendor token use karo, user token nahi
- URL sahi hai? `ws://localhost:5000` (http nahi, ws use karo)

### Problem: Notification Nahi Aa Raha
**Solution:**
- Vendor WebSocket connected hai? Status check karo
- Vendor token me vendor role hai? Check karo
- User ne lead submit kiya? Response check karo
- Vendor location me lead aaya? Radius check karo

### Problem: "Authentication error"
**Solution:**
- Token sahi format me hai? `Bearer` prefix nahi chahiye WebSocket me
- Token expire to nahi hua? Naya token generate karo
- `auth.token` parameter sahi se set kiya? Check karo

---

## Quick Reference

### User REST API
```
POST http://localhost:5000/api/lead/submit
Headers: Authorization: Bearer {user_token}
Body: JSON with searchKeyword, location, etc.
```

### Vendor WebSocket
```
URL: ws://localhost:5000
Params: auth.token = {vendor_token}
Status: Connected
Listen: Messages tab me new_lead event
```

---

## Example Screenshots Description

### WebSocket Request Setup:
```
┌─────────────────────────────────────┐
│ WebSocket Request                  │
├─────────────────────────────────────┤
│ URL: ws://localhost:5000           │
│                                     │
│ [Params] [Headers] [Messages]      │
│                                     │
│ Params:                            │
│   auth.token = {vendor_token}      │
│                                     │
│ [Connect] button                   │
└─────────────────────────────────────┘
```

### Messages Tab:
```
┌─────────────────────────────────────┐
│ Messages                            │
├─────────────────────────────────────┤
│ ✅ Connected to ws://localhost:5000│
│                                     │
│ 📨 new_lead                        │
│ {                                   │
│   "leadResponse": {...},            │
│   "lead": {...}                    │
│ }                                   │
└─────────────────────────────────────┘
```

---

## Tips:
1. **Two Tabs Rakhna:** Ek tab User REST API, ek tab Vendor WebSocket
2. **Pehle Connect:** Vendor WebSocket pehle connect karo, phir lead submit karo
3. **Token Check:** Har baar token valid hai ya nahi check karo
4. **Messages Tab:** WebSocket me Messages tab me notifications dikhenge
5. **Auto-Connect:** Postman me WebSocket auto-connect nahi hota, manually connect karna padta hai

---

## Summary:
1. ✅ User REST API se lead submit → `POST /api/lead/submit`
2. ✅ Vendor WebSocket connect → `ws://localhost:5000` with token
3. ✅ Real-time notification → Messages tab me `new_lead` event
4. ✅ Vendor ko lead details mil jayenge instantly!

