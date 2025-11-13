# Individual Role API Documentation

## 1. Submit KYC (Individual Registration)

### Endpoint
`POST /api/kyc/submit`

### Authentication
Required (Bearer Token)

### Request Body (Form-Data)
**Note:** Use `multipart/form-data` for file uploads

#### Required Fields:
```json
{
  "businessName": "John's Services",
  "title": "Mr",
  "contactPerson": "John Doe",
  "mobileNumber": "9876543210",
  "email": "john@example.com",
  "workingDays": "[\"Monday\", \"Tuesday\", \"Wednesday\", \"Thursday\", \"Friday\"]",
  "businessHoursOpen": "09:00",
  "businessHoursClose": "18:00",
  "aadharNumber": "123456789012",
  "aadharImage": "<file>",  // Image file (max 5MB)
  "videoKyc": "<file>"      // Video file (max 50MB)
}
```

#### Address Fields (Personal Address - Required for Individual):
```json
{
  "personalPlotNo": "123",
  "personalBuildingName": "My Home",
  "personalStreet": "Main Street",
  "personalLandmark": "Near Park",
  "personalArea": "Downtown",
  "personalPincode": "123456",
  "personalState": "Maharashtra",
  "personalCity": "Mumbai",
  "personalAddress": "123 Main Street, Downtown, Mumbai, Maharashtra 123456"
}
```

#### Optional Fields:
```json
{
  "gstNumber": "",  // Leave empty for individual (or provide if you have GST)
  "whatsappNumber": "9876543210",  // Optional, defaults to mobileNumber
  
  // Business Address (Optional for Individual)
  "businessPlotNo": "",
  "businessBuildingName": "",
  "businessStreet": "",
  "businessLandmark": "",
  "businessArea": "",
  "businessPincode": "",
  "businessState": "",
  "businessCity": "",
  "businessAddress": "",
  
  // Legacy Address Fields (Optional - for backward compatibility)
  "plotNo": "",
  "buildingName": "",
  "street": "",
  "landmark": "",
  "area": "",
  "pincode": "",
  "state": "",
  "city": ""
}
```

### Example Request (Postman/Form-Data):
```
businessName: "John's Services"
title: "Mr"
contactPerson: "John Doe"
mobileNumber: "9876543210"
email: "john@example.com"
workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
businessHoursOpen: "09:00"
businessHoursClose: "18:00"
aadharNumber: "123456789012"
personalPlotNo: "123"
personalBuildingName: "My Home"
personalStreet: "Main Street"
personalLandmark: "Near Park"
personalArea: "Downtown"
personalPincode: "123456"
personalState: "Maharashtra"
personalCity: "Mumbai"
personalAddress: "123 Main Street, Downtown, Mumbai, Maharashtra 123456"
aadharImage: <file>
videoKyc: <file>
```

### Success Response (201):
```json
{
  "success": true,
  "message": "KYC submitted successfully. You will receive an email confirmation shortly.",
  "data": {
    "kycId": "507f1f77bcf86cd799439011",
    "status": "pending",
    "businessName": "John's Services"
  }
}
```

### Error Response (400):
```json
{
  "success": false,
  "message": "Personal address is required when GST number is not provided"
}
```

---

## 2. Get My KYC (Individual)

### Endpoint
`GET /api/kyc/my-kyc`

### Query Parameters (Optional):
- `status`: Filter by status (`pending`, `approved`, `rejected`)

### Authentication
Required (Bearer Token)

### Success Response (200):
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "507f1f77bcf86cd799439012",
      "businessName": "John's Services",
      "gstNumber": "",
      "businessType": "individual",
      "personalPlotNo": "123",
      "personalBuildingName": "My Home",
      "personalStreet": "Main Street",
      "personalLandmark": "Near Park",
      "personalArea": "Downtown",
      "personalPincode": "123456",
      "personalState": "Maharashtra",
      "personalCity": "Mumbai",
      "personalAddress": "123 Main Street, Downtown, Mumbai, Maharashtra 123456",
      "businessPlotNo": "",
      "businessBuildingName": "",
      "businessStreet": "",
      "businessLandmark": "",
      "businessArea": "",
      "businessPincode": "",
      "businessState": "",
      "businessCity": "",
      "businessAddress": "",
      "title": "Mr",
      "contactPerson": "John Doe",
      "mobileNumber": "9876543210",
      "whatsappNumber": "9876543210",
      "email": "john@example.com",
      "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "businessHoursOpen": "09:00",
      "businessHoursClose": "18:00",
      "aadharNumber": "123456789012",
      "aadharImage": "/uploads/aadhar/abc123.jpg",
      "videoKyc": "/uploads/video/xyz789.mp4",
      "status": "pending",
      "location": {
        "type": "Point",
        "coordinates": [72.8777, 19.0760]
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

## 3. Update KYC (Individual)

### Endpoint
`PUT /api/kyc/update`

### Authentication
Required (Bearer Token)

### Request Body (Form-Data)
Same as Submit KYC, but files are optional (only update if provided)

### Success Response (200):
```json
{
  "success": true,
  "message": "KYC updated successfully. Status reset to pending. You will receive an email confirmation shortly.",
  "data": {
    "kycId": "507f1f77bcf86cd799439011",
    "status": "pending",
    "businessName": "John's Services"
  }
}
```

---

## 4. After Approval - User Role

### After Admin Approval:
- User role automatically changes to `"individual"` (if no GST)
- User role automatically changes to `"vendor"` (if GST provided)

### Check User Role:
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "role": "individual"  // or "vendor" if GST was provided
}
```

---

## 5. Individual Can Use These APIs:

### Add Service
`POST /api/service-catalog/serviceadd/:vendorId`

**Note:** `vendorId` parameter me individual ka bhi ID ho sakta hai. Parameter name `vendorId` hai, lekin individual ke liye bhi kaam karta hai.

**Request:**
- URL me individual ka own user ID pass karein
- Example: `POST /api/service-catalog/serviceadd/507f1f77bcf86cd799439012`
- Individual can add services (same as vendor)

**Request Body (Form-Data):**
```json
{
  "serviceName": "Plumbing Service",
  "priceType": "single",  // or "range" or "quantity"
  "actualPrice": "500",
  "discountPrice": "450",
  "unit": "per hour",
  "description": "Professional plumbing services",
  "serviceImage": "<file>",  // Optional
  "attachments": ["<file1>", "<file2>"]  // Optional, max 10
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Service added successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "vendorId": "507f1f77bcf86cd799439012",  // Individual ka ID (field name vendorId hai but individual ka ID store hota hai)
    "serviceName": "Plumbing Service",
    "priceType": "single",
    "actualPrice": 500,
    "discountPrice": 450,
    "unit": "per hour",
    "description": "Professional plumbing services",
    "serviceImage": "/uploads/services/abc123.jpg",
    "attachments": ["/uploads/attachments/file1.pdf"],
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Important:** 
- `vendorId` field name hai, lekin individual ka ID bhi store hota hai
- Individual apna own ID pass karega URL me
- Service successfully add ho jayega individual ke liye bhi

### Get My Services
`GET /api/service-catalog/my-services`
- Individual can view their services
- Returns all services added by the logged-in individual

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "vendorId": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "individual"
      },
      "serviceName": "Plumbing Service",
      "priceType": "single",
      "actualPrice": 500,
      "discountPrice": 450,
      "unit": "per hour",
      "description": "Professional plumbing services",
      "serviceImage": "/uploads/services/abc123.jpg",
      "attachments": ["/uploads/attachments/file1.pdf"],
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Get Individual's Services (Public)
`GET /api/service-catalog/allservice/:vendorId`

**Note:** `vendorId` me individual ka user ID pass karein

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "vendorId": "507f1f77bcf86cd799439012",  // Individual ka ID
      "serviceName": "Plumbing Service",
      "priceType": "single",
      "actualPrice": 500,
      "discountPrice": 450,
      "unit": "per hour",
      "description": "Professional plumbing services",
      "serviceImage": "/uploads/services/abc123.jpg",
      "attachments": ["/uploads/attachments/file1.pdf"],
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Update Service
`PUT /api/service-catalog/:serviceId`
- Individual can update their services

### Delete Service
`DELETE /api/service-catalog/:serviceId`
- Individual can delete their services

### Vendor Profile Management
`GET /api/vendor-profile/:vendorId`
`PUT /api/vendor-profile/:vendorId`
- Individual can manage their profile (same as vendor)

---

## 6. Website & Social Media Links (Individual)

### Add Website Link
`POST /api/vendor-profile/addwebsite/:vendorId`

**Note:** `vendorId` me individual ka own user ID pass karein

**Request Body:**
```json
{
  "website": "https://www.johnservices.com"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Website link created successfully",
  "data": {
    "vendorId": "507f1f77bcf86cd799439012",
    "website": "https://www.johnservices.com"
  }
}
```

---

### Get Website Link
`GET /api/vendor-profile/viewwebsite/:vendorId`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "vendorId": "507f1f77bcf86cd799439012",
    "website": "https://www.johnservices.com"
  }
}
```

---

### Update Website Link
`PUT /api/vendor-profile/updatewebsite/:vendorId`

**Request Body:**
```json
{
  "website": "https://www.johnservices-new.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Website link updated successfully",
  "data": {
    "vendorId": "507f1f77bcf86cd799439012",
    "website": "https://www.johnservices-new.com"
  }
}
```

---

### Delete Website Link
`DELETE /api/vendor-profile/deletewebsite/:vendorId`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Website link deleted successfully",
  "data": {
    "vendorId": "507f1f77bcf86cd799439012",
    "website": ""
  }
}
```

---

### Add Social Media Links
`POST /api/vendor-profile/addsocial-links/:vendorId`

**Note:** `vendorId` me individual ka own user ID pass karein

**Request Body:**
```json
{
  "facebook": "https://www.facebook.com/johnservices",
  "instagram": "https://www.instagram.com/johnservices",
  "twitter": "https://www.twitter.com/johnservices",
  "linkedin": "https://www.linkedin.com/company/johnservices",
  "youtube": "https://www.youtube.com/@johnservices"
}
```

**Note:** At least ek social media link required hai

**Success Response (201):**
```json
{
  "success": true,
  "message": "Social media links created successfully",
  "data": {
    "vendorId": "507f1f77bcf86cd799439012",
    "socialMediaLinks": {
      "facebook": "https://www.facebook.com/johnservices",
      "instagram": "https://www.instagram.com/johnservices",
      "twitter": "https://www.twitter.com/johnservices",
      "linkedin": "https://www.linkedin.com/company/johnservices",
      "youtube": "https://www.youtube.com/@johnservices"
    }
  }
}
```

---

### Get Social Media Links
`GET /api/vendor-profile/getsocial-links/:vendorId`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "vendorId": "507f1f77bcf86cd799439012",
    "socialMediaLinks": {
      "facebook": "https://www.facebook.com/johnservices",
      "instagram": "https://www.instagram.com/johnservices",
      "twitter": "https://www.twitter.com/johnservices",
      "linkedin": "https://www.linkedin.com/company/johnservices",
      "youtube": "https://www.youtube.com/@johnservices"
    }
  }
}
```

---

### Update Social Media Links
`PUT /api/vendor-profile/updatesocial-links/:vendorId`

**Request Body:**
```json
{
  "facebook": "https://www.facebook.com/johnservices-updated",
  "instagram": "https://www.instagram.com/johnservices-updated"
}
```

**Note:** Sirf jo fields update karni hain, woh bhejein. Baaki fields unchanged rahengi.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Social media links updated successfully",
  "data": {
    "vendorId": "507f1f77bcf86cd799439012",
    "socialMediaLinks": {
      "facebook": "https://www.facebook.com/johnservices-updated",
      "instagram": "https://www.instagram.com/johnservices-updated",
      "twitter": "https://www.twitter.com/johnservices",
      "linkedin": "https://www.linkedin.com/company/johnservices",
      "youtube": "https://www.youtube.com/@johnservices"
    }
  }
}
```

---

### Delete Social Media Links

#### Delete Single Platform
`DELETE /api/vendor-profile/deletesocial-links/:vendorId?platform=facebook`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Social media link (facebook) deleted successfully",
  "data": {
    "vendorId": "507f1f77bcf86cd799439012",
    "socialMediaLinks": {
      "facebook": "",
      "instagram": "https://www.instagram.com/johnservices",
      "twitter": "https://www.twitter.com/johnservices",
      "linkedin": "https://www.linkedin.com/company/johnservices",
      "youtube": "https://www.youtube.com/@johnservices"
    }
  }
}
```

#### Delete All Social Media Links
`DELETE /api/vendor-profile/deletesocial-links/:vendorId`

**Success Response (200):**
```json
{
  "success": true,
  "message": "All social media links deleted successfully",
  "data": {
    "vendorId": "507f1f77bcf86cd799439012",
    "socialMediaLinks": {
      "facebook": "",
      "instagram": "",
      "twitter": "",
      "linkedin": "",
      "youtube": ""
    }
  }
}
```

**Available Platforms:**
- `facebook`
- `instagram`
- `twitter`
- `linkedin`
- `youtube`

### Reviews (Receive)
`GET /api/review/getvendorreviews/:vendorId`
- Individual can receive reviews (same as vendor)

### Favorites/Saved
`POST /api/favorite/add`
`POST /api/saved/add`
- Individual can be added to favorites/saved (same as vendor)

---

## Key Differences: Individual vs Vendor

| Feature | Individual | Vendor |
|---------|-----------|--------|
| GST Number | Optional (not required) | Required |
| Business Address | Optional | Required |
| Personal Address | Required | Optional |
| Role After Approval | `individual` | `vendor` |
| Can Add Services | ✅ Yes | ✅ Yes |
| Can Receive Reviews | ✅ Yes | ✅ Yes |
| Can Manage Profile | ✅ Yes | ✅ Yes |

---

## Notes:
1. **GST-based Logic:**
   - If `gstNumber` is provided → Treated as Vendor
   - If `gstNumber` is empty → Treated as Individual

2. **Address Requirements:**
   - Individual: Personal address required
   - Vendor: Business address required

3. **Role Assignment:**
   - Automatically set on KYC approval
   - Based on GST presence

4. **Backward Compatibility:**
   - Legacy address fields (`plotNo`, `buildingName`, etc.) still work
   - Will be mapped to appropriate address type

