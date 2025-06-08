import { execa } from 'execa';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { FullConfig } from '@playwright/test';
import { loginViaApi } from './auth/auth-helpers';

const TEST_DB_COMPOSE_DIR = path.resolve(__dirname, 'test-utils', '__db__');
const TOKEN_FILE = path.resolve(__dirname, '.auth-token.json');

const prisma = new PrismaClient();

async function createTestUser() {
  const email = 'testuser@example.com';
  const plainPassword = 'testpassword123';

  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  await prisma.user.deleteMany({
    where: { email },
  });

  await prisma.user.create({
    data: {
      email,
      name: 'Test User',
      hashedPassword: passwordHash,
    },
  });

  console.log(`✅ Test user created: ${email}`);

  // Login und echten Token holen
  const token = await loginViaApi(email, plainPassword);

  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ token }), 'utf-8');
  console.log(`✅ Token stored in ${TOKEN_FILE}`);
}

async function globalSetup(config: FullConfig) {
  const isCI = !!process.env.CI;

  const { stdout: whichDocker } = await execa('which', ['docker']);
  const dockerPath = whichDocker.trim();
  console.log('Using docker binary:', dockerPath);

  if (!isCI) {
    console.log('🔄 Global Setup: Starting test DB with docker compose...');
    await execa(dockerPath, ['compose', 'up', '-d'], {
      cwd: TEST_DB_COMPOSE_DIR,
      stdio: 'inherit',
    });
  } else {
    console.log('🏃 Running in CI → assuming Postgres service is provided');
  }

  console.log('🔄 Global Setup: Applying DB migrations...');
  await execa(
    'npx',
    ['prisma', 'migrate', 'deploy', '--schema=prisma/schema.prisma'],
    {
      stdio: 'inherit',
    }
  );

  console.log('🔄 Global Setup: Creating test user...');
  await createTestUser();

  await prisma.$disconnect();

  console.log('✅ Global Setup done.');
}

export default globalSetup;
