import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import fs from 'fs';
import path from 'path';

const BACKUP_STORAGE_DIR = path.join(process.cwd(), 'storage', 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_STORAGE_DIR)) {
    fs.mkdirSync(BACKUP_STORAGE_DIR, { recursive: true });
  }
}

export async function uploadBackup(
  userId: string,
  backupHash: string,
  sizeBytes: number,
  encryptedBlob: string
) {
  ensureBackupDir();
  const fileName = `backup_${userId}_${Date.now()}.enc`;
  const filePath = path.join(BACKUP_STORAGE_DIR, fileName);

  fs.writeFileSync(filePath, encryptedBlob, 'utf8');

  const metadata = await prisma.backupMetadata.create({
    data: {
      userId,
      backupHash,
      sizeBytes: BigInt(sizeBytes),
      storagePath: filePath,
    },
  });

  return {
    id: metadata.id,
    backupHash: metadata.backupHash,
    sizeBytes: Number(metadata.sizeBytes),
    createdAt: metadata.createdAt,
  };
}

export async function getLatestBackup(userId: string) {
  const metadata = await prisma.backupMetadata.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!metadata) return null;

  return {
    id: metadata.id,
    backupHash: metadata.backupHash,
    sizeBytes: Number(metadata.sizeBytes),
    createdAt: metadata.createdAt,
  };
}

export async function downloadBackup(userId: string) {
  const metadata = await prisma.backupMetadata.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!metadata || !fs.existsSync(metadata.storagePath)) {
    throw AppError.notFound('No backup found');
  }

  const content = fs.readFileSync(metadata.storagePath, 'utf8');
  return {
    backupHash: metadata.backupHash,
    sizeBytes: Number(metadata.sizeBytes),
    createdAt: metadata.createdAt,
    encryptedBlob: content,
  };
}
