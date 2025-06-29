import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { username: 'admin' },
        { email: 'admin@example.com' },
      ],
    },
  });

  if (existingAdmin) {
    console.log('ℹ️  Admin user already exists, skipping creation');
    console.log(`   Username: ${existingAdmin.username}`);
    console.log(`   Email: ${existingAdmin.email}`);
    return;
  }

  // Create default admin user
  const saltRounds = 10;
  const defaultPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      isActive: true,
    },
  });

  console.log('✅ Admin user created successfully!');
  console.log('📋 Default Admin Credentials:');
  console.log(`   Username: ${adminUser.username}`);
  console.log(`   Email: ${adminUser.email}`);
  console.log(`   Password: ${defaultPassword}`);
  console.log('');
  console.log('⚠️  IMPORTANT SECURITY NOTICE:');
  console.log('   Please change the default password immediately after first login!');
  console.log('   You can use the /auth/register endpoint to create additional admin users.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
