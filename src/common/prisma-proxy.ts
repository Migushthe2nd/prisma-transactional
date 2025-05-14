import { PrismaClient } from '@prisma/client';
import { getTransactionalContext } from '.';
import { PrismaTransactionalClient } from './types';

const PRISMA_TRANSACTION_KEY = '@prisma/transaction';

type PrismaDelegate = { [K in keyof PrismaClient]: PrismaClient[K] };

export const createPrismaProxy = (target: PrismaClient): PrismaClient => {
  const handler: ProxyHandler<PrismaDelegate> = {
    get(target, prop) {
      const context = getTransactionalContext();
      if (!context?.active) {
        return Reflect.get(target, prop);
      }

      const tx = context.get(PRISMA_TRANSACTION_KEY) as PrismaTransactionalClient | null;
      if (!tx) {
        return Reflect.get(target, prop);
      }

      // Return the transaction's delegate if it exists
      if (prop in tx && (tx as any)[prop] !== null) {
        return (tx as any)[prop];
      }

      return Reflect.get(target, prop);
    },
  };

  return new Proxy(target as PrismaDelegate, handler) as PrismaClient;
};
