import { connectPrisma, disconnectPrisma } from './prisma';

export async function connectDatabase(): Promise<void> {
  await connectPrisma();
}

export async function disconnectDatabase(): Promise<void> {
  await disconnectPrisma();
}
