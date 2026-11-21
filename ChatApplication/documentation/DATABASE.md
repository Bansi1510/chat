# Database Specification – Neon Serverless PostgreSQL

## 1. Overview
The messaging platform uses **Neon Serverless PostgreSQL** managed via **Prisma ORM**. All MongoDB/NoSQL schemas have been fully transitioned to a normalized relational architecture with foreign keys, composite unique constraints, cascades, and B-tree indexes.

Connection pooling is supported via Neon's PgBouncer integration on port 5432 with `sslmode=require`.

---

## 2. Relational Schema & Tables

### 1. `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT (UUID) | PRIMARY KEY | Unique user identifier |
| `username` | VARCHAR(32) | UNIQUE, NOT NULL | Display name |
| `username_clean` | VARCHAR(32) | UNIQUE, NOT NULL | Lowercase for case-insensitive uniqueness |
| `password_hash` | TEXT | NOT NULL | Argon2id RFC 9106 encoded hash |
| `role` | Role (ENUM) | DEFAULT 'user' | `'user'` or `'superadmin'` |
| `status` | UserStatus (ENUM) | DEFAULT 'active' | `'active'`, `'suspended'`, `'deleted'` |
| `avatar_url` | TEXT | NULLABLE | Cloudinary secured asset URL |
| `failed_login_count` | INT | DEFAULT 0 | Counter for login lockout |
| `lock_until` | TIMESTAMPTZ | NULLABLE | Lockout expiry timestamp |
| `last_seen_at` | TIMESTAMPTZ | NULLABLE | Presence tracking |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Account creation |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update |

### 2. `device_registrations`
Enforces the strict device policy: **exactly one Android device and one Web session per account**.
- `id` (PK, UUID)
- `user_id` (FK -> users.id, ON DELETE CASCADE)
- `platform` (ENUM: 'android', 'web')
- `device_id` (VARCHAR(128))
- `fcm_token` (TEXT, Nullable)
- `registration_id` (INT - Signal Protocol registration ID)
- `identity_key` (TEXT - Public Curve25519 identity key)
- `signed_prekey` (TEXT)
- `signed_prekey_signature` (TEXT)
- `is_active` (BOOLEAN, DEFAULT true)
- `last_active_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)
- *Constraint*: `UNIQUE(user_id, platform)`

### 3. `prekeys`
- `id` (PK, UUID)
- `device_registration_id` (FK -> device_registrations.id, ON DELETE CASCADE)
- `key_id` (INT)
- `public_key` (TEXT)
- `is_consumed` (BOOLEAN, DEFAULT false)
- `created_at` (TIMESTAMPTZ)
- *Index*: `(device_registration_id, is_consumed)`

### 4. `auth_sessions`
- `id` (PK, UUID)
- `user_id` (FK -> users.id, ON DELETE CASCADE)
- `device_registration_id` (FK -> device_registrations.id, ON DELETE CASCADE)
- `refresh_token_hash` (VARCHAR(64), SHA-256)
- `user_agent` (TEXT, Nullable)
- `ip_address` (VARCHAR(45), Nullable)
- `revoked_at` (TIMESTAMPTZ, Nullable)
- `expires_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)
- *Index*: `(refresh_token_hash)`

### 5. `qr_tokens`
- `id` (PK, UUID)
- `user_id` (FK -> users.id, ON DELETE CASCADE)
- `token_hash` (VARCHAR(64), UNIQUE, SHA-256)
- `expires_at` (TIMESTAMPTZ)
- `revoked_at` (TIMESTAMPTZ, Nullable)
- `created_at` (TIMESTAMPTZ)
- *Index*: `(user_id, expires_at)`

### 6. `conversations`
- `id` (PK, UUID)
- `pair_key` (VARCHAR(73), UNIQUE - `min(UUID1,UUID2)_max(UUID1,UUID2)`)
- `last_message_at` (TIMESTAMPTZ, Nullable, Index DESC)
- `created_at` (TIMESTAMPTZ)

### 7. `conversation_participants`
- `id` (PK, UUID)
- `conversation_id` (FK -> conversations.id, ON DELETE CASCADE)
- `user_id` (FK -> users.id, ON DELETE CASCADE)
- `is_pinned` (BOOLEAN, DEFAULT false)
- `is_muted` (BOOLEAN, DEFAULT false)
- `wallpaper_url` (TEXT, Nullable)
- `cleared_history_at` (TIMESTAMPTZ, Nullable)
- `created_at` (TIMESTAMPTZ)
- *Constraint*: `UNIQUE(conversation_id, user_id)`

### 8. `messages`
- `id` (PK, UUID)
- `conversation_id` (FK -> conversations.id, ON DELETE CASCADE)
- `sender_id` (FK -> users.id, ON DELETE RESTRICT)
- `client_msg_id` (VARCHAR(64), Client UUID for deduplication)
- `message_type` (ENUM: 'text', 'image', 'video', 'audio', 'voice', 'document', 'location')
- `ciphertext` (TEXT - Signal encrypted payload bundle)
- `reply_to_id` (FK -> messages.id, ON DELETE SET NULL, Nullable)
- `is_forwarded` (BOOLEAN, DEFAULT false)
- `is_edited` (BOOLEAN, DEFAULT false)
- `deleted_for_everyone` (BOOLEAN, DEFAULT false)
- `expires_at` (TIMESTAMPTZ, Nullable, Index)
- `is_scheduled` (BOOLEAN, DEFAULT false)
- `scheduled_for` (TIMESTAMPTZ, Nullable, Index)
- `dispatched_at` (TIMESTAMPTZ, Nullable)
- `created_at` (TIMESTAMPTZ, Index DESC)

### 9. `message_attachments`
- `id` (PK, UUID)
- `message_id` (FK -> messages.id, ON DELETE CASCADE)
- `file_url` (TEXT - Cloudinary secure asset URL)
- `file_type` (VARCHAR(32))
- `file_size_bytes` (BIGINT)
- `file_name` (TEXT)
- `thumbnail_url` (TEXT, Nullable)
- `duration_seconds` (INT, Nullable)
- `created_at` (TIMESTAMPTZ)

### 10. `message_receipts`
- `id` (PK, UUID)
- `message_id` (FK -> messages.id, ON DELETE CASCADE)
- `user_id` (FK -> users.id, ON DELETE CASCADE)
- `delivered_at` (TIMESTAMPTZ, Nullable)
- `read_at` (TIMESTAMPTZ, Nullable)
- *Constraint*: `UNIQUE(message_id, user_id)`
- *Index*: `(user_id, delivered_at, read_at)`

### 11. `message_reactions`
- `id` (PK, UUID)
- `message_id` (FK -> messages.id, ON DELETE CASCADE)
- `user_id` (FK -> users.id, ON DELETE CASCADE)
- `emoji` (VARCHAR(16))
- `created_at` (TIMESTAMPTZ)
- *Constraint*: `UNIQUE(message_id, user_id)`

### 12. `message_deletions`
Tracks "Delete for Me" soft-deletions per user without altering the message record for the peer.
- `id` (PK, UUID)
- `message_id` (FK -> messages.id, ON DELETE CASCADE)
- `user_id` (FK -> users.id, ON DELETE CASCADE)
- `deleted_at` (TIMESTAMPTZ)
- *Constraint*: `UNIQUE(message_id, user_id)`

### 13. `starred_messages`
- `id` (PK, UUID)
- `message_id` (FK -> messages.id, ON DELETE CASCADE)
- `user_id` (FK -> users.id, ON DELETE CASCADE)
- `created_at` (TIMESTAMPTZ)
- *Constraint*: `UNIQUE(message_id, user_id)`

### 14. `disappearing_settings`
- `conversation_id` (PK, FK -> conversations.id, ON DELETE CASCADE)
- `duration_seconds` (INT, DEFAULT 0 - 0=Off, 300=5m, 3600=1h, 86400=1d, 604800=1w, 2592000=1m, 31536000=1y)
- `updated_by_id` (FK -> users.id)
- `updated_at` (TIMESTAMPTZ)

### 15. `call_history`
- `id` (PK, UUID)
- `caller_id` (FK -> users.id)
- `callee_id` (FK -> users.id)
- `call_type` (ENUM: 'audio', 'video')
- `status` (ENUM: 'completed', 'missed', 'rejected', 'busy', 'failed')
- `started_at` (TIMESTAMPTZ, Index DESC)
- `ended_at` (TIMESTAMPTZ, Nullable)
- `duration_seconds` (INT, DEFAULT 0)

### 16. `live_location_sessions`
- `id` (PK, UUID)
- `conversation_id` (FK -> conversations.id, ON DELETE CASCADE)
- `user_id` (FK -> users.id, ON DELETE CASCADE)
- `duration_seconds` (INT - 900, 3600, 28800)
- `latitude` (DOUBLE PRECISION)
- `longitude` (DOUBLE PRECISION)
- `is_active` (BOOLEAN, DEFAULT true)
- `expires_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### 17. `blocked_users`
- `id` (PK, UUID)
- `blocker_id` (FK -> users.id, ON DELETE CASCADE)
- `blocked_id` (FK -> users.id, ON DELETE CASCADE)
- `created_at` (TIMESTAMPTZ)
- *Constraint*: `UNIQUE(blocker_id, blocked_id)`

### 18. `global_permissions` & `user_permissions`
- `global_permissions`: `key` (VARCHAR(64), PK), `is_enabled` (BOOLEAN), `description` (TEXT), `updated_at`
- `user_permissions`: `id` (UUID, PK), `user_id` (FK -> users.id), `permission_key` (VARCHAR(64)), `is_granted` (BOOLEAN), `updated_at`. Constraint: `UNIQUE(user_id, permission_key)`

### 19. `application_settings`
- `key` (VARCHAR(64), PK)
- `value` (JSONB)
- `description` (TEXT, Nullable)
- `updated_at` (TIMESTAMPTZ)

### 20. `backup_metadata`
- `id` (PK, UUID)
- `user_id` (FK -> users.id, ON DELETE CASCADE)
- `backup_hash` (VARCHAR(64), SHA-256)
- `size_bytes` (BIGINT)
- `storage_path` (TEXT - Encrypted file reference)
- `created_at` (TIMESTAMPTZ)

### 21. `audit_logs`
- `id` (PK, UUID)
- `actor_id` (FK -> users.id, ON DELETE SET NULL, Nullable)
- `action` (VARCHAR(64))
- `target_type` (VARCHAR(32))
- `target_id` (VARCHAR(64), Nullable)
- `ip_address` (VARCHAR(45), Nullable)
- `metadata` (JSONB)
- `created_at` (TIMESTAMPTZ, Index DESC)

---

## 3. Migrations & Initial Setup
The complete SQL migration script is located at:
`prisma/migrations/0_init/migration.sql`

To apply schema to a target Neon PostgreSQL instance:
```bash
# Set Neon connection string in .env
DATABASE_URL="postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Apply migrations
npx prisma migrate deploy
# or direct push
npx prisma db push
```
