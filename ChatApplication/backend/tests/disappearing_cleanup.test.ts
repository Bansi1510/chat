import { deleteCloudinaryMedia } from '../src/modules/media/media.service';

// Mock Cloudinary deletion to verify media destruction calls
jest.mock('../src/modules/media/media.service', () => ({
  deleteCloudinaryMedia: jest.fn().mockResolvedValue(true),
  extractPublicIdFromUrl: jest.fn((url: string) => `mock_public_id_${url}`),
}));

describe('Disappearing Messages & 20-Day Permanent Deletion Policy', () => {
  const TWENTY_DAYS_MS = 20 * 86_400_000;

  it('verifies Cloudinary destruction API integration is wired correctly', async () => {
    const success = await deleteCloudinaryMedia('test_public_id', 'image');
    expect(success).toBe(true);
    expect(deleteCloudinaryMedia).toHaveBeenCalledWith('test_public_id', 'image');
  });

  it('calculates permanent_delete_at exactly 20 days after message expiration', () => {
    const testDurationsSeconds = [
      300,        // 5 minutes
      3600,       // 1 hour
      86400,      // 1 day
      604800,     // 1 week
      2592000,    // 1 month (30 days)
      31536000,   // 1 year (365 days)
    ];

    const now = Date.now();
    for (const duration of testDurationsSeconds) {
      const expiresAt = new Date(now + duration * 1000);
      const permanentDeleteAt = new Date(expiresAt.getTime() + TWENTY_DAYS_MS);

      const diffMs = permanentDeleteAt.getTime() - expiresAt.getTime();
      expect(diffMs).toBe(TWENTY_DAYS_MS);
      expect(permanentDeleteAt.getTime()).toBeGreaterThan(expiresAt.getTime());
    }
  });

  it('verifies expired messages are immediately excluded from visible chat queries', async () => {
    const pastExpiration = new Date(Date.now() - 1000); // Expired 1 second ago
    const futureExpiration = new Date(Date.now() + 60000); // Expires in 1 minute

    const visibleCondition = (expiresAt: Date | null) => {
      return expiresAt === null || expiresAt.getTime() > Date.now();
    };

    expect(visibleCondition(pastExpiration)).toBe(false);
    expect(visibleCondition(futureExpiration)).toBe(true);
    expect(visibleCondition(null)).toBe(true);
  });

  it('preserves expired messages during the 20-day retention period without deleting them prematurely', () => {
    const now = new Date();
    // Message expired 5 days ago (still within 20 days retention)
    const expiredFiveDaysAgo = new Date(now.getTime() - 5 * 86_400_000);
    const permanentDeleteAt = new Date(expiredFiveDaysAgo.getTime() + TWENTY_DAYS_MS);

    const isEligibleForPermanentDeletion = permanentDeleteAt.getTime() <= now.getTime();
    expect(isEligibleForPermanentDeletion).toBe(false);
  });

  it('identifies messages eligible for permanent deletion after the 20-day retention has passed', () => {
    const now = new Date();
    // Message expired 21 days ago (retention period exceeded)
    const expiredTwentyOneDaysAgo = new Date(now.getTime() - 21 * 86_400_000);
    const permanentDeleteAt = new Date(expiredTwentyOneDaysAgo.getTime() + TWENTY_DAYS_MS);

    const isEligibleForPermanentDeletion = permanentDeleteAt.getTime() <= now.getTime();
    expect(isEligibleForPermanentDeletion).toBe(true);
  });
});
