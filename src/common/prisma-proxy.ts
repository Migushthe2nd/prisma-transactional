import { PrismaClient } from '@prisma/client';
import { getTransactionalContext } from '.';
import { PrismaTransactionalClient } from './types';
import { StorageDriver } from '../storage/driver/interface';

const PRISMA_TRANSACTION_KEY = '@prisma/transaction';

type PrismaDelegate = { [K in keyof PrismaClient]: PrismaClient[K] };

export const createPrismaProxy = (target: PrismaClient, customStorageDriver?: StorageDriver): PrismaClient => {
  const handler: ProxyHandler<PrismaDelegate> = {
    get(target, prop) {
      const context = customStorageDriver || getTransactionalContext();
      console.log("Getting property ", prop, " from target");
      if (!context?.active) {
        return Reflect.get(target, prop);
      }

      const tx = context.get(PRISMA_TRANSACTION_KEY) as PrismaTransactionalClient | null;
      if (!tx) {
        console.log("Transaciton not found for property ", prop);
        return Reflect.get(target, prop);
      }

      console.log("Getting property ", prop, " from transaction");
      // Return the transaction's delegate if it exists
      if (prop in tx && (tx as any)[prop] !== null) {
        return (tx as any)[prop];
      }

      return Reflect.get(target, prop);
    },
  };

  return new Proxy(target as PrismaDelegate, handler) as PrismaClient;
};
