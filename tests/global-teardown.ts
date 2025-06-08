import { execa } from 'execa';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const TEST_DB_COMPOSE_DIR = path.resolve(__dirname, 'test-utils', '__db__');
const TOKEN_FILE = path.resolve(__dirname, '.auth-token.json');

const prisma = new PrismaClient();

async function deleteTestUser() {
  const email = 'testuser@example.com';

  await prisma.user.deleteMany({
    where: { email },
  });

  console.log(`✅ Test user deleted: ${email}`);
}

async function globalTeardown() {
  const isCI = !!process.env.CI;

  const { stdout: whichDocker } = await execa('which', ['docker']);
  const dockerPath = whichDocker.trim();
  console.log('Using docker binary:', dockerPath);

  console.log('🧹 Global Teardown: Deleting test user...');
  await deleteTestUser();

  await prisma.$disconnect();

  if (!isCI) {
    console.log('🧹 Global Teardown: Stopping test DB with docker compose...');

    await execa(dockerPath, ['compose', 'down'], {
      cwd: TEST_DB_COMPOSE_DIR,
      stdio: 'inherit',
    });
  } else {
    console.log(
      '🏃 Running in CI → Postgres service will be stopped by CI runner'
    );
  }

  if (fs.existsSync(TOKEN_FILE)) {
    fs.unlinkSync(TOKEN_FILE);
    console.log('🧹 Token file deleted.');
  }

  console.log('✅ Global Teardown done.');
}

export default globalTeardown;
