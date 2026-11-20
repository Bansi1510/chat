# API Documentation - SecureChat

Base URL: `http://localhost:4000/api/v1`  
All responses follow the unified envelope:
```json
{
  "success": true,
  "data": { ... }
}
```
Error responses:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable description"
  }
}
```

---

## 1. Authentication & Profile
- **POST `/auth/register`**: Register new user.
  - Body: `{ username, password, deviceName? }`
- **POST `/auth/login`**: Authenticate and initiate a single-device session.
  - Body: `{ username, password, deviceName? }`
- **POST `/auth/refresh`**: Rotate refresh token and obtain new JWT.
  - Body: `{ refreshToken }`
- **POST `/auth/logout`**: Terminate active session.
- **GET `/me`**: Fetch active user profile.
- **GET `/me/permissions`**: Fetch dynamic RBAC permissions map.
- **PATCH `/me/username`**: Update username.
- **PATCH `/me/password`**: Change password with current password confirmation.

## 2. QR Connection
- **GET `/qr`**: Retrieve current valid QR token or generate a new one.
- **POST `/qr/regenerate`**: Invalidate existing token and create a fresh QR code.
- **POST `/qr/scan`**: Scan peer QR token and establish mutual connection & conversation.
  - Body: `{ token }` (format: `<userId>:<rawToken>`)
- **GET `/connections`**: List active user connections.

## 3. Conversations & Messaging
- **GET `/conversations`**: List all active chats with unread counts and last message previews.
- **GET `/conversations/:id/messages?before=&limit=`**: Paginated message history.
- **POST `/messages`**: Dispatch message.
  - Body: `{ conversationId, clientMsgId, ciphertext, type?, replyToId?, forwarded?, isScheduled?, scheduledFor? }`
- **POST `/messages/:id/react`**: Add or replace emoji reaction.
- **DELETE `/messages/:id?forEveryone=true|false`**: Soft delete message for self or everyone.
- **PATCH `/conversations/:id/settings`**: Update disappearing timer, pin, mute, or wallpaper.

## 4. Super Admin
- **GET `/admin/users?page=&limit=&q=`**: Paginated search and list of users.
- **DELETE `/admin/users/:id`**: Administrative account deletion (revokes sessions and frees username).
- **GET `/admin/users/:id/permissions`**: View effective permissions for target user.
- **PUT `/admin/users/:id/permissions/:key`**: Override feature permission for specific user.
- **DELETE `/admin/users/:id/permissions/:key`**: Clear override and restore global rule.
- **GET `/admin/permissions`**: View app-wide feature flags.
- **PUT `/admin/permissions/:key`**: Update app-wide feature flag.
- **GET `/admin/settings`**: Get current system configuration.
- **PATCH `/admin/settings`**: Update QR expiry, file size limits, or login lockout parameters.
- **GET `/admin/audit-logs`**: Paginated audit log records.

---

## 5. Socket.IO Events
- **Client to Server**:
  - `chat:typing`: `{ conversationId, isTyping }`
  - `chat:recording`: `{ conversationId, isRecording }`
  - `message:send`: `{ conversationId, clientMsgId, ciphertext, type }`
  - `message:delivered`: `{ messageIds, conversationId }`
  - `message:read`: `{ messageIds, conversationId }`
  - `call:offer`, `call:answer`, `call:ice-candidate`, `call:end`: WebRTC signalling.
- **Server to Client**:
  - `message:new`: Broadcast new message to conversation room.
  - `message:delivered`: Broadcast delivery tick status.
  - `message:read`: Broadcast blue tick read status.
  - `chat:typing`: Forward typing indicators.
  - `call:incoming`: Alert callee device with caller SDP offer.
