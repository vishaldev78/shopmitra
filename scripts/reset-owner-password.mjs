#!/usr/bin/env node
/**
 * reset-owner-password.mjs — set a new password for an account directly in the DB.
 *
 * Passwords are bcrypt-hashed, so the original can never be read back.
 * This script is the escape hatch when the account owner forgets it:
 * it overwrites passwordHash with a fresh bcrypt hash.
 *
 * Usage:
 *   node scripts/with-env.mjs node scripts/reset-owner-password.mjs <email> <new-password>
 */
import { loadProjectEnv } from './with-env.mjs';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

loadProjectEnv();
const db = new PrismaClient();

const [email, newPassword] = process.argv.slice(2);
if (!email || !newPassword) {
  console.error('Usage: node scripts/reset-owner-password.mjs <email> <new-password>');
  process.exit(2);
}
if (newPassword.length < 6) {
  console.error('Password must be at least 6 characters.');
  process.exit(2);
}

try {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    console.error(`No account found for ${email}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.user.update({ where: { id: user.id }, data: { passwordHash } });

  console.log(`✅ Password updated for ${user.email}`);
  console.log(`   name: ${user.name} | role: ${user.role} | shop: ${user.shopName ?? '—'} | active: ${user.isActive}`);
} finally {
  await db.$disconnect();
}
