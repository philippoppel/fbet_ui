import { signJwt } from './jwt';
import { prisma } from './prisma'; // Prisma-Client-Instanz
import { User } from '@prisma/client';
import { hashPassword, verifyPassword } from '@/app/api/lib/hash';

// Gibt den User zurück ohne das gehashte Passwort
type PublicUser = Omit<User, 'hashedPassword'>;

export async function createUser(
  email: string,
  name: string | null,
  password: string
): Promise<PublicUser> {
  // Prüfen, ob E-Mail schon existiert
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    throw new Error('Email already registered.');
  }

  const hashed = await hashPassword(password);

  // User erstellen
  const user = await prisma.user.create({
    data: {
      email,
      name,
      hashedPassword: hashed,
    },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.isActive) {
    console.log(`Authentication failed for ${email} (not found or inactive)`);
    return null;
  }

  const isValidPassword = await verifyPassword(password, user.hashedPassword);
  if (!isValidPassword) {
    console.log(`Invalid password attempt for user: ${email}`);
    return null;
  }

  const token = signJwt({ sub: user.id });

  // User ohne Passwort zurückgeben
  const { hashedPassword, ...userWithoutPassword } = user;

  return {
    token,
    user: userWithoutPassword,
  };
}
