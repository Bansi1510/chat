import { connectDatabase, disconnectDatabase } from '../config/db';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { hashPassword } from '../security/password';
import { passwordSchema, usernameSchema } from '../modules/auth/auth.validators';

/** Creates the single Super Admin from environment variables. Safe to run repeatedly. */
async function main() {
  const username = usernameSchema.parse(env.BOOTSTRAP_ADMIN_USERNAME);
  const password = passwordSchema.parse(env.BOOTSTRAP_ADMIN_PASSWORD);
  await connectDatabase();
  const existing = await prisma.user.findFirst({
    where: { role: 'superadmin' },
  });
  if (existing) {
    console.log('Super Admin already exists; nothing to do.');
  } else {
    await prisma.user.create({
      data: {
        username,
        usernameClean: username.toLowerCase().trim(),
        passwordHash: await hashPassword(password),
        role: 'superadmin',
        status: 'active',
      },
    });
    console.log(`Super Admin "${username}" created.`);
  }
  await disconnectDatabase();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
