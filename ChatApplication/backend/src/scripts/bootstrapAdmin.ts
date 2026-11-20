import { connectDatabase, disconnectDatabase } from '../config/db';
import { env } from '../config/env';
import { User } from '../models/User';
import { hashPassword } from '../security/password';
import { passwordSchema, usernameSchema } from '../modules/auth/auth.validators';

/** Creates the single Super Admin from environment variables. Safe to run repeatedly. */
async function main() {
  const username = usernameSchema.parse(env.BOOTSTRAP_ADMIN_USERNAME);
  const password = passwordSchema.parse(env.BOOTSTRAP_ADMIN_PASSWORD);
  await connectDatabase();
  if (await User.exists({ role: 'superadmin' })) {
    console.log('Super Admin already exists; nothing to do.');
  } else {
    await User.create({
      username,
      usernameKey: username.toLowerCase(),
      passwordHash: await hashPassword(password),
      role: 'superadmin',
    });
    console.log(`Super Admin "${username}" created.`);
  }
  await disconnectDatabase();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
