# Database Schema Documentation - MongoDB

All collections use Mongoose 8 models in `backend/src/models/`.

### 1. `users`
| Field | Type | Attributes | Description |
|---|---|---|---|
| `username` | String | required, trim | Display name |
| `usernameKey`| String | required, unique | Lowercase representation for case-insensitive uniqueness |
| `passwordHash` | String | required | Argon2id hash |
| `role` | String | enum: `['user', 'superadmin']` | RBAC role |
| `status` | String | enum: `['active', 'deleted']` | Soft delete status |
| `avatarUrl` | String | nullable | Cloudinary/local media reference |
| `failedLoginCount` | Number | default: 0 | Lockout counter |
| `lockUntil` | Date | nullable | Lockout timestamp |
| `lastSeenAt` | Date | nullable | Presence tracking |

### 2. `sessions`
| Field | Type | Attributes | Description |
|---|---|---|---|
| `userId` | ObjectId | ref: User, required, index | Session owner |
| `refreshHash` | String | required, index | SHA-256 hash of refresh token |
| `deviceName` | String | default: 'unknown' | User agent/device descriptor |
| `revokedAt` | Date | nullable | Set on logout or new device login |
| `expiresAt` | Date | required, TTL index | Automatic deletion on expiry |

### 3. `conversations`
| Field | Type | Attributes | Description |
|---|---|---|---|
| `participants` | [ObjectId] | ref: User, required, index | Exactly 2 users |
| `pairKey` | String | required, unique | Sorted composite key: `<userA>_<userB>` |
| `disappearingSeconds` | Number | default: 0 | 0 = disabled, else seconds |
| `lastMessageAt` | Date | index | Sort order for chat list |
| `pinnedBy` | [ObjectId] | ref: User | Users who pinned this chat |
| `mutedBy` | [ObjectId] | ref: User | Users who muted notifications |
| `wallpapers` | Map<String> | default: {} | Custom chat wallpaper per user |

### 4. `messages`
| Field | Type | Attributes | Description |
|---|---|---|---|
| `conversationId` | ObjectId | ref: Conversation, index | Parent chat |
| `senderId` | ObjectId | ref: User, index | Message author |
| `clientMsgId` | String | required | Client UUID for deduplication |
| `ciphertext` | String | required | E2EE payload |
| `type` | String | enum (text, image, video, doc, audio, voice, location) | Media classification |
| `deliveredTo` | [ObjectId] | ref: User | Delivery receipts (✓✓) |
| `readBy` | [ObjectId] | ref: User | Read receipts (blue ✓✓) |
| `deletedFor` | [ObjectId] | ref: User | "Delete for Me" soft-delete list |
| `deletedForEveryone` | Boolean | default: false | "Delete for Everyone" flag |
| `expiresAt` | Date | index, nullable | Disappearing message expiration |
| `isScheduled` | Boolean | default: false | Scheduled message flag |
| `scheduledFor` | Date | index, nullable | Scheduled dispatch time |

### 5. `qrtokens`
| Field | Type | Attributes | Description |
|---|---|---|---|
| `userId` | ObjectId | ref: User, index | QR owner |
| `tokenHash` | String | required, unique | SHA-256 hash of random token |
| `expiresAt` | Date | required, TTL index | Expiry time set by Super Admin |
| `revokedAt` | Date | nullable | Invalidation timestamp |

### 6. `permissions` & `userpermissions`
- `globalpermissions`: Key-value rules overriding app-wide capabilities.
- `userpermissions`: Unique compound index `(userId, key)` overriding global rules.

### 7. `auditlogs`
- Append-only log recording actor, action, target entity, metadata, and timestamps.
