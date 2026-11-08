/**
 * Shubash & Co. — Super Admin Bootstrap Script
 * Run securely via: node scripts/bootstrap-admin.js
 *
 * Reads credentials from environment variables:
 * - ADMIN_BOOTSTRAP_EMAIL
 * - ADMIN_BOOTSTRAP_PASSWORD
 * - ADMIN_BOOTSTRAP_NAME (optional, defaults to "Super Admin")
 */

const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function bootstrap() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const name = process.env.ADMIN_BOOTSTRAP_NAME || 'Super Admin';

  if (!email || !password) {
    console.error('Error: ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD environment variables are required.');
    console.error('Example:');
    console.error('  $env:ADMIN_BOOTSTRAP_EMAIL="admin@shubashco.com"; $env:ADMIN_BOOTSTRAP_PASSWORD="YourStrongPassword123!"; node scripts/bootstrap-admin.js');
    process.exit(1);
  }

  if (password.length < 10) {
    console.error('Error: Super Admin password must be at least 10 characters long.');
    process.exit(1);
  }

  console.log(`Checking existing super admin accounts...`);
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: UserRole.SUPER_ADMIN, active: true }
  });

  if (existingSuperAdmin) {
    console.log(`An active super admin already exists (${existingSuperAdmin.email}).`);
    console.log(`To create or update, specify a different email or update via the admin dashboard.`);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  if (existingUser) {
    console.log(`Updating existing user ${email} to SUPER_ADMIN...`);
    const updated = await prisma.user.update({
      where: { email },
      data: {
        role: UserRole.SUPER_ADMIN,
        passwordHash,
        active: true,
      }
    });
    console.log(`✔ Super Admin successfully updated: ${updated.email}`);
  } else {
    console.log(`Creating initial Super Admin ${email}...`);
    const created = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        active: true,
      }
    });
    console.log(`✔ Super Admin successfully created: ${created.email} (ID: ${created.id})`);
  }

  // Create audit log entry
  await prisma.auditLog.create({
    data: {
      action: 'admin.bootstrap',
      entityType: 'User',
      diff: JSON.stringify({ email, role: 'SUPER_ADMIN', bootstrappedAt: new Date().toISOString() }),
    }
  });

  console.log('Done.');
}

bootstrap()
  .catch(err => {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
