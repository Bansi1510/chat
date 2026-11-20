# QA Test Report - SecureChat Backend & Frontend

## 1. Automated Test Results (Backend)
Test Runner: Jest + Supertest  
Environment: Node.js 24 + MongoDB 9 Community (Mongoose 8)

| Test Case | Expected Result | Actual Result | Status | Remarks |
|---|---|---|---|---|
| TC-AUTH-01: Valid user registration | HTTP 201 + tokens + user profile | HTTP 201 + valid tokens | **PASS** | Password hash not leaked |
| TC-AUTH-02: Password stored as Argon2id | Password matches `$argon2id$` format | Hash verified as Argon2id | **PASS** | |
| TC-AUTH-03: Duplicate username rejected | HTTP 409 Conflict (case-insensitive) | HTTP 409 `USERNAME_TAKEN` | **PASS** | Verified with mixed case |
| TC-AUTH-04: Concurrent registration race | Only 1 user account created | Exactly 1 succeeded | **PASS** | Race condition handled |
| TC-AUTH-05: Validation: short username | HTTP 400 Bad Request | HTTP 400 `VALIDATION_ERROR` | **PASS** | |
| TC-AUTH-06: Validation: illegal characters | HTTP 400 Bad Request | HTTP 400 `VALIDATION_ERROR` | **PASS** | |
| TC-AUTH-07: Validation: short password | HTTP 400 Bad Request | HTTP 400 `VALIDATION_ERROR` | **PASS** | |
| TC-AUTH-08: Validation: empty username | HTTP 400 Bad Request | HTTP 400 `VALIDATION_ERROR` | **PASS** | |
| TC-AUTH-09: Malformed JSON payload | HTTP 400 Bad Request | HTTP 400 `INVALID_JSON` | **PASS** | |
| TC-AUTH-10: Superadmin registration exploit | Role forced to `user` | Role defaulted to `user` | **PASS** | Privilege escalation blocked |
| TC-AUTH-11: Valid login | HTTP 200 + access + refresh token | HTTP 200 + tokens returned | **PASS** | |
| TC-AUTH-12: Invalid login timing & error | Identical 401 error message | Identical error message | **PASS** | Prevents user enumeration |
| TC-AUTH-13: Account lockout on 5 failures | HTTP 429 Account Locked | HTTP 429 `ACCOUNT_LOCKED` | **PASS** | Lockout activated |
| TC-AUTH-14: Single device per account | Previous session revoked on login | Old session returns 401 | **PASS** | Real-time session revocation |
| TC-AUTH-15: Refresh token rotation | Old refresh token invalidated | Reused token returns 401 | **PASS** | Token rotation verified |
| TC-AUTH-16: Logout session revocation | Session invalidated immediately | Token returns 401 | **PASS** | |
| TC-AUTH-17: Token tampering & invalid signature | HTTP 401 Unauthorized | HTTP 401 Unauthorized | **PASS** | |
| TC-AUTH-18: Change username | HTTP 200 with new username | Username updated successfully | **PASS** | Uniqueness enforced |
| TC-AUTH-19: Change password verification | Requires valid current password | Invalid current rejected (401) | **PASS** | Sessions revoked on change |
| TC-RBAC-01: Standard user blocked from Admin | HTTP 403 Forbidden | HTTP 403 `ADMIN_ONLY` | **PASS** | Tested across 4 admin routes |
| TC-RBAC-02: Dynamic permission override | Live permission evaluation | User override takes precedence | **PASS** | Real-time enforcement |
| TC-RBAC-03: Invalid permission key | HTTP 400 Bad Request | HTTP 400 Bad Request | **PASS** | |
| TC-ADM-01: List users with pagination | Paginated list + search filter | Items correctly filtered | **PASS** | |
| TC-ADM-02: Admin deletes user account | Session revoked, username freed | Account marked deleted | **PASS** | Audit log recorded |
| TC-ADM-03: Cannot delete Superadmin | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** | Root admin protected |
| TC-ADM-04: System settings update | Settings persisted & validated | Settings updated | **PASS** | Audit log recorded |
| TC-PLAT-01: Health check & 404 envelope | Unified envelope response | Unified envelope response | **PASS** | |

---

## 2. Frontend Build Results
- **Web App (`web-app/`)**: TypeScript compile + Vite production build -> **PASS** (Zero warnings, zero errors).
- **Mobile App (`mobile-app/`)**: All TypeScript screens, navigation routes, stores, services, localization, and theme modules implemented -> **PASS** (Ready for device testing tomorrow).
- **Physical Device QA Status**: **NOT TESTED** (Scheduled for tomorrow when phone is connected).
