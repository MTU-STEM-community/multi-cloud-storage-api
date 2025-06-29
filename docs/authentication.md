# Authentication Guide

## 🔐 Overview

The Multi-Cloud Storage API uses JWT-based authentication for admin-only access. All storage endpoints require authentication, while health check endpoints remain public.

## 🚀 Quick Start

### 1. **Default Admin Credentials**
After running the seed script, use these credentials:
```
Username: admin
Email: admin@example.com
Password: admin123
```

### 2. **Environment Setup**
Add these variables to your `.env` file:
```bash
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h
```

## 📋 API Endpoints

### **Login**
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clp1234567890abcdef",
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

### **Register New Admin**
```http
POST /auth/register
Content-Type: application/json

{
  "username": "newadmin",
  "email": "newadmin@example.com",
  "password": "securepassword123"
}
```

### **Change Password** ⭐
```http
POST /auth/change-password
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "currentPassword": "admin123",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password changed successfully"
}
```

### **Get Profile**
```http
GET /auth/profile
Authorization: Bearer <your-jwt-token>
```

## 🔧 Using Authentication

### **1. Login and Get Token**
1. Send POST request to `/auth/login` with credentials
2. Copy the `access_token` from the response

### **2. Access Protected Endpoints**
Include the token in the Authorization header:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **3. Change Default Password** 🔒
**IMPORTANT:** Change the default password immediately!

1. Login with default credentials
2. Use the `/auth/change-password` endpoint
3. Provide current password (`admin123`) and new secure password

## 🛡️ Security Features

- **Password Hashing**: All passwords are hashed with bcrypt
- **JWT Tokens**: Secure token-based authentication
- **Global Protection**: All storage endpoints require authentication
- **Token Expiration**: Configurable token lifetime (default: 24h)

## 📖 Swagger Documentation

Visit `/api/docs` to see the interactive API documentation with authentication support.

## 🔄 Token Management

- **Token Expiration**: Tokens expire after the configured time (default: 24h)
- **Refresh**: Login again to get a new token when expired
- **Security**: Keep your JWT_SECRET secure and never expose it

## ❓ Troubleshooting

### **401 Unauthorized**
- Check if token is included in Authorization header
- Verify token hasn't expired
- Ensure JWT_SECRET is set correctly

### **Invalid Credentials**
- Verify username/password combination
- Check if user account is active

### **Password Change Issues**
- Ensure current password is correct
- New password must be at least 6 characters
- Must be authenticated to change password
