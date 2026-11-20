# Architecture Documentation - SecureChat

## 1. System Overview
SecureChat is composed of three decoupled sub-systems:
1. **Backend Service (`backend/`)**: Node.js + Express + TypeScript + MongoDB + Socket.IO.
2. **Mobile Application (`mobile-app/`)**: React Native + TypeScript + React Navigation + Zustand.
3. **Web Application (`web-app/`)**: React 18 + Vite + TypeScript + Zustand + Socket.IO-Client.

```
+-------------------------------------------------------------------------+
|                              Clients                                    |
|   +-----------------------------+     +-----------------------------+   |
|   |   Android App (RN + TS)     |     |    Web Client (React+Vite)  |   |
|   +--------------+--------------+     +--------------+--------------+   |
+------------------|-----------------------------------|------------------+
                   |  HTTPS REST / WSS Socket.IO       |
                   +-----------------+-----------------+
                                     |
+------------------------------------v------------------------------------+
|                         Backend Infrastructure                          |
|   +-----------------------------------------------------------------+   |
|   | Express API Layer (Helmet, RateLimit, Zod Validation, RBAC Gate)|   |
|   +-----------------------------------------------------------------+   |
|   | Socket.IO Gateway (Auth Middleware, Rooms, Direct P2P Signaling)|   |
|   +-----------------------------------------------------------------+   |
|   | Services: Auth (Argon2id), QR Engine, Chat Dispatcher, Admin   |   |
|   +-----------------------------------------------------------------+   |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------v------------------------------------+
|                             Data Layer                                  |
|   +-----------------------------------------------------------------+   |
|   | MongoDB Community (Mongoose 8): Users, Sessions, Convos, Msgs   |   |
|   +-----------------------------------------------------------------+   |
+-------------------------------------------------------------------------+
```

## 2. Security Architecture
- **Password Storage**: Argon2id hashing with dummy password timing equalisation to mitigate username enumeration.
- **Session Tokens**: Dual-token architecture. Short-lived JWT (15 mins) + single-use rotating refresh tokens stored in hashed format (SHA-256). Single device per account enforced at session creation.
- **Role-Based Access Control**:
  - Global defaults overridden by per-user rules in MongoDB.
  - Enforced dynamically in middleware before every controller execution and in Socket.IO event handlers.
- **End-to-End Encryption (E2EE)**:
  - Text messages are encrypted client-side using audited Signal Protocol primitives (X3DH + Double Ratchet).
  - WebRTC DTLS-SRTP authentication validated over the E2EE signalling channel.

## 3. Real-Time Communication Design
- **Socket.IO Namespaces & Rooms**:
  - `user:<userId>`: Personal notifications, single-device session revocations, and WebRTC call offers/answers.
  - `conversation:<conversationId>`: Live messaging, typing status, voice recording status, and delivery/read receipts.
