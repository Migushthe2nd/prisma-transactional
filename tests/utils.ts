import { PrismaClient } from '@prisma/client';

export const getCurrentTransactionId = async (
  prisma: PrismaClient,
): Promise<number | null> => {
  await prisma.$executeRaw`INSERT INTO "Counter" values (default)`;
  const result = await prisma.$queryRaw`SELECT txid_current_if_assigned()`;
  const id = (result as any[])[0]?.txid_current_if_assigned || null;
  return id ? Number.parseInt(id, 10) : null;
};

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
