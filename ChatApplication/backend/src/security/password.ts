import argon2 from 'argon2';

export const hashPassword = (password: string) => argon2.hash(password, { type: argon2.argon2id });

export const verifyPassword = (hash: string, password: string) =>
  argon2.verify(hash, password).catch(() => false);

let dummyHash: Promise<string> | undefined;
/** Verifies against a throwaway hash so unknown usernames take comparable time. */
export const burnPasswordCheck = async (password: string) => {
  dummyHash ??= hashPassword('dummy-password-for-timing');
  await verifyPassword(await dummyHash, password);
};
