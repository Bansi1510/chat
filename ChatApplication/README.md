# Chat Application Workspace

This repository houses three coordinated applications:
1. **`backend/`**: Node.js, Express, TypeScript, MongoDB, and Socket.IO real-time backend.
2. **`mobile-app/`**: Full React Native (TypeScript) mobile client ready for Android.
3. **`web-app/`**: React 18, TypeScript, and Vite responsive web client.

---

## 1. Backend (`backend/`)
- **Database**: MongoDB (pinned to Mongoose 8 for stability).
- **Security & Auth**: Argon2id password hashing, rotating JWT access & refresh tokens, single-device session locking, rate limiting, and server-side RBAC.
- **Messaging**: 1:1 real-time messaging, delivery (✓✓) & read (blue ✓✓) ticks, typing indicators, soft delete, disappearing messages, and scheduled payloads.
- **Connections**: QR-based pairing preventing username search or unsolicited requests.
- **Admin**: Full Super Admin management endpoints and audit logs.
- **Tests**: 27 unit and integration tests passing.

### Run Backend
```bash
cd backend
npm install
npm run build
npm run dev   # Runs server on http://localhost:4000
```

---

## 2. Web Application (`web-app/`)
- Responsive React + Vite application.
- Supports QR display and QR scan/paste pairing.
- Real-time 1:1 messaging via Socket.IO.
- Instant connection to backend API and sockets.

### Run Web App
```bash
cd web-app
npm install
npm run dev   # Runs on http://localhost:3000
```

---

## 3. Android Mobile Application (`mobile-app/`)
- Architecture: React Native, TypeScript, Zustand, and React Navigation.
- Native navigation stack:
  - `LoginScreen.tsx` & `RegisterScreen.tsx`
  - `ChatListScreen.tsx` (pinned, muted, unread badges)
  - `ChatScreen.tsx` (bubbles, timestamps, delivery ticks, typing events)
  - `MyQRScreen.tsx` (QR generation via `react-native-qrcode-svg`)
  - `ScanQRScreen.tsx` (QR connection module)
  - `AdminScreen.tsx` (superadmin control panel)
- Custom Light/Dark themes and multi-language support (English, Gujarati, Hindi).

### Testing on Real Android Mobile
1. Connect device via USB with USB Debugging enabled.
2. Verify connection: `adb devices`
3. Reverse backend port: `adb reverse tcp:4000 tcp:4000`
4. Build and run: `npx react-native run-android`
