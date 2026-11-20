# Development Plan – Status

Approved plan: see the Phase 1–4 plan. Status is updated only after implementation and testing.

| Step | Status | Notes |
|---|---|---|
| Backend foundation (Express, TS, Mongoose, config, logging, error handling) | DONE | `tsc` and build pass |
| Auth: register, login, refresh rotation, logout, change username/password | DONE | 27 automated tests pass |
| One device per account, login lockout, Argon2id | DONE | tested |
| RBAC (global + per-user permissions, server-enforced) | DONE | tested via guarded route |
| Admin API: users, delete, permissions, settings, audit logs | DONE | tested |
| Super Admin bootstrap script | DONE (not yet run manually) | `npm run bootstrap:admin` |
| Encrypted integration credentials (Cloudinary/Firebase/TURN) in admin settings | NOT STARTED | |
| QR, conversations, messages, receipts, Socket.IO | NOT STARTED | |
| Media, scheduler, disappearing, backup, calls signalling, FCM, location | NOT STARTED | |
| Mobile app (React Native), E2EE, calls, admin UI | NOT STARTED | |
| Real-device QA | NOT STARTED | Android Studio and adb installed; no device checked yet |

## Environment notes
- mongoose is pinned to v8: mongoose 9 / mongodb 7 failed the handshake against MongoDB 9.0 under Jest.
- typescript is pinned to v5: TypeScript 7 is incompatible with ts-jest.
- Tests use the local MongoDB database `chat_app_test` and drop it on each run.
