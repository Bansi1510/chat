# Security Architecture - SecureChat

## 1. Cryptographic Specifications
- **Argon2id (RFC 9106)**: Applied for all password hashing with parameter configuration resistant to GPU-based attacks.
- **Signal Protocol (E2EE)**:
  - Text messages are never in plaintext on network wires or server disks.
  - Key Exchange: Extended Triple Diffie-Hellman (X3DH) utilizing Curve25519 public prekey bundles.
  - Session Ratchet: Double Ratchet algorithm providing Forward Secrecy and Break-in Recovery.
- **WebRTC End-to-End Calling**:
  - Mandatory DTLS-SRTP encryption for audio/video media streams.
  - DTLS fingerprint validation exchanged through the authenticated Signal Protocol signalling channel to prevent man-in-the-middle attacks on the signalling server.

## 2. Session & Token Hardening
- **Strict Single Device Policy**: A user can only maintain one active session. Any subsequent login from another device or web browser invalidates the previous session immediately via socket notification and database revocation.
- **Token Rotation**: Every refresh request yields a fresh refresh token while invalidating the old one. Reused refresh tokens immediately trigger session revocation.
- **Timing Attack Mitigation**: When login fails with an unknown username, an Argon2id verification cycle is executed against a dummy hash to keep response latency consistent.

## 3. Disappearing Messages & Soft-Deletion Privacy Policy
- Disappearing messages and deleted messages are flagged with soft-delete indicators (`deletedFor`, `deletedForEveryone`, `expiresAt`).
- **Transparency Statement**: The server never decrypts message content. Soft-deletion removes message availability from user interfaces and APIs, but encrypted ciphertext records are preserved on backend storage subject to data retention policies. It is not represented to users as cryptographic permanent erasure from physical disks.

## 4. Admin Boundary Protections
- Super Admin accounts have no privilege to inspect, view, or decrypt any E2EE message ciphertext.
- All administrative mutations are recorded in immutable audit logs with actor identity and timestamp.
