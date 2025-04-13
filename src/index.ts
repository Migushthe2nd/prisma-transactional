import { PrismaClient } from '@prisma/client';
import { initializeTransactionalContext } from './common';
import { addPrismaClient, PrismaTransactionalClient } from './common/types';
import { createPrismaProxy } from './common/prisma-proxy';
import { Transactional } from './decorators/transactional';
import { IsolationLevel } from './enums/isolation-level';
import { Propagation } from './enums/propagation';
import { StorageDriver } from './enums/storage-driver';
import { runInTransaction } from './transactions/run-in-transaction';

export {
  addPrismaClient,
  createPrismaProxy,
  initializeTransactionalContext,
  IsolationLevel,
  PrismaTransactionalClient,
  Propagation,
  StorageDriver,
  Transactional,
  runInTransaction,
};

export {
  runOnTransactionCommit,
  runOnTransactionRollback,
  runOnTransactionComplete,
} from './hooks';

// Re-export types from Prisma
export type { PrismaClient };
