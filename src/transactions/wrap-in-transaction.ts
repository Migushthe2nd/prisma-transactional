import { PrismaClient } from '@prisma/client';
import { getTransactionalContext } from '../common';
import { IsolationLevel } from '../enums/isolation-level';
import { Propagation } from '../enums/propagation';
import { TransactionalError } from '../errors/transactional';
import { runInNewHookContext } from '../hooks';
import { getPrismaClientByName, PrismaTransactionalClient } from '../common/types';

export interface WrapInTransactionOptions {
  clientName?: string;
  propagation?: Propagation;
  isolationLevel?: IsolationLevel;
  name?: string | symbol;
}

const PRISMA_TRANSACTION_KEY = '@prisma/transaction';

export const wrapInTransaction = <Fn extends (this: any, ...args: any[]) => ReturnType<Fn>>(
  fn: Fn,
  options?: WrapInTransactionOptions,
) => {
  function wrapper(this: unknown, ...args: unknown[]) {
    const context = getTransactionalContext();
    if (!context) {
      throw new Error(
        'No CLS namespace defined in your app ... please call initializeTransactionalContext() before application start.',
      );
    }

    const clientName = options?.clientName ?? 'default';
    const prismaClient = getPrismaClientByName(clientName);

    if (!prismaClient) {
      throw new Error(
        'No Prisma client defined in your app ... please call createPrismaTransactional() before application start.',
      );
    }

    const propagation = options?.propagation ?? Propagation.REQUIRED;
    const isolationLevel = options?.isolationLevel;

    const runOriginal = () => fn.apply(this, args);
    const runWithNewHook = () => runInNewHookContext(context, runOriginal);

    const runWithNewTransaction = () => {
      const transactionCallback = async (tx: PrismaTransactionalClient) => {
        context.set(PRISMA_TRANSACTION_KEY, tx);
        try {
          const result = await runOriginal();
          return result;
        } finally {
          context.set(PRISMA_TRANSACTION_KEY, null);
        }
      };

      return runInNewHookContext(context, () => {
        return prismaClient.$transaction(transactionCallback, {
          isolationLevel,
        });
      });
    };

    return context.run(async () => {
      const currentTransaction = context.get(PRISMA_TRANSACTION_KEY) as PrismaTransactionalClient | null;

      switch (propagation) {
        case Propagation.MANDATORY:
          if (!currentTransaction) {
            throw new TransactionalError(
              "No existing transaction found for transaction marked with propagation 'MANDATORY'",
            );
          }
          return runOriginal();

        case Propagation.NESTED:
          return runWithNewTransaction();

        case Propagation.NEVER:
          if (currentTransaction) {
            throw new TransactionalError(
              "Found an existing transaction, transaction marked with propagation 'NEVER'",
            );
          }
          return runWithNewHook();

        case Propagation.NOT_SUPPORTED:
          if (currentTransaction) {
            context.set(PRISMA_TRANSACTION_KEY, null);
            const result = await runWithNewHook();
            context.set(PRISMA_TRANSACTION_KEY, currentTransaction);
            return result;
          }
          return runOriginal();

        case Propagation.REQUIRED:
          if (currentTransaction) {
            return runOriginal();
          }
          return runWithNewTransaction();

        case Propagation.REQUIRES_NEW:
          return runWithNewTransaction();

        case Propagation.SUPPORTS:
          return currentTransaction ? runOriginal() : runWithNewHook();
      }
    });
  }

  return wrapper as Fn;
};
