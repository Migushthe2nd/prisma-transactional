import { PrismaClient } from '@prisma/client';
import {
  addPrismaClient,
  initializeTransactionalContext,
  Propagation,
  runInTransaction,
  runOnTransactionCommit,
  runOnTransactionComplete,
  runOnTransactionRollback,
  StorageDriver,
} from '../src';

import { sleep, getCurrentTransactionId } from './utils';
import { TransactionalError } from '../src/errors/transactional';

const prisma = addPrismaClient(new PrismaClient({
  datasourceUrl: 'postgresql://postgres:postgres@localhost:5445/test',
}));

const storageDriver =
  process.env.TEST_STORAGE_DRIVER && process.env.TEST_STORAGE_DRIVER in StorageDriver
    ? StorageDriver[process.env.TEST_STORAGE_DRIVER as keyof typeof StorageDriver]
    : StorageDriver.CLS_HOOKED;

initializeTransactionalContext({ storageDriver });

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.counter.deleteMany();
  await prisma.$disconnect();
});

describe('Transactional', () => {
  afterEach(async () => {
    await prisma.user.deleteMany();
    await prisma.counter.deleteMany();
  });

  describe('General', () => {
    it('supports basic transactions', async () => {
      let transactionIdBefore: number | null = null;

      await runInTransaction(async () => {
        transactionIdBefore = await getCurrentTransactionId(prisma);
        await prisma.user.create({ data: { name: 'John Doe', money: 100 } });
        const transactionIdAfter = await getCurrentTransactionId(prisma);

        expect(transactionIdBefore).toBeTruthy();
        expect(transactionIdBefore).toBe(transactionIdAfter);
      });

      const transactionIdOutside = await getCurrentTransactionId(prisma);
      expect(transactionIdOutside).toBe(null);
      expect(transactionIdOutside).not.toBe(transactionIdBefore);
    });

    it('supports nested transactions', async () => {
      await runInTransaction(async () => {
        const transactionIdBefore = await getCurrentTransactionId(prisma);
        await prisma.user.create({ data: { name: 'John Doe', money: 100 } });

        await runInTransaction(async () => {
          const transactionIdAfter = await getCurrentTransactionId(prisma);
          expect(transactionIdBefore).toBe(transactionIdAfter);
        });
      });

      expect.assertions(1);
    });

    it('supports several concurrent transactions', async () => {
      let transactionA: number | null = null;
      let transactionB: number | null = null;
      let transactionC: number | null = null;

      await Promise.all([
        runInTransaction(async () => {
          await prisma.user.create({ data: { name: 'John Doe', money: 100 } });
          transactionA = await getCurrentTransactionId(prisma);
        }),
        runInTransaction(async () => {
          await prisma.user.create({ data: { name: 'Bob Smith', money: 100 } });
          transactionB = await getCurrentTransactionId(prisma);
        }),
        runInTransaction(async () => {
          await prisma.user.create({ data: { name: 'Alice Watson', money: 100 } });
          transactionC = await getCurrentTransactionId(prisma);
        }),
      ]);

      expect(transactionA).toBeTruthy();
      expect(transactionB).toBeTruthy();
      expect(transactionC).toBeTruthy();

      expect(transactionA).not.toBe(transactionB);
      expect(transactionA).not.toBe(transactionC);
      expect(transactionB).not.toBe(transactionC);
    });
  });

  describe('Hooks', () => {
    it('should run "runOnTransactionCommit" hook', async () => {
      const commitSpy = jest.fn();
      const rollbackSpy = jest.fn();
      const completeSpy = jest.fn();

      await runInTransaction(async () => {
        await prisma.user.create({ data: { name: 'John Doe', money: 100 } });
        runOnTransactionCommit(commitSpy);
      });

      await sleep(1);

      expect(commitSpy).toHaveBeenCalledTimes(1);
      expect(rollbackSpy).not.toHaveBeenCalled();
      expect(completeSpy).not.toHaveBeenCalled();
    });

    it('should run "runOnTransactionRollback" hook', async () => {
      const commitSpy = jest.fn();
      const rollbackSpy = jest.fn();
      const completeSpy = jest.fn();

      try {
        await runInTransaction(async () => {
          runOnTransactionRollback(rollbackSpy);
          await prisma.user.create({ data: { name: 'John Doe', money: 100 } });
          throw new Error('Rollback transaction');
        });
      } catch {}

      await sleep(1);

      expect(rollbackSpy).toHaveBeenCalledTimes(1);
      expect(commitSpy).not.toHaveBeenCalled();
      expect(completeSpy).not.toHaveBeenCalled();
    });

    it('should run "runOnTransactionComplete" hook', async () => {
      const commitSpy = jest.fn();
      const rollbackSpy = jest.fn();
      const completeSpy = jest.fn();

      await runInTransaction(async () => {
        await prisma.user.create({ data: { name: 'John Doe', money: 100 } });
        runOnTransactionComplete(completeSpy);
      });

      await sleep(1);

      expect(commitSpy).not.toHaveBeenCalled();
      expect(rollbackSpy).not.toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Propagation', () => {
    it('should support "REQUIRED" propagation', async () => {
      await runInTransaction(async () => {
        const transactionId = await getCurrentTransactionId(prisma);
        await prisma.user.create({ data: { name: 'John Doe', money: 100 } });

        await runInTransaction(
          async () => {
            await prisma.user.create({ data: { name: 'Bob Smith', money: 100 } });
            const transactionIdNested = await getCurrentTransactionId(prisma);
            expect(transactionId).toBe(transactionIdNested);
          },
          { propagation: Propagation.REQUIRED },
        );
      });
    });

    it('should support "SUPPORTS" propagation if active transaction exists', async () => {
      await runInTransaction(async () => {
        const transactionId = await getCurrentTransactionId(prisma);
        await prisma.user.create({ data: { name: 'John Doe', money: 100 } });

        await runInTransaction(
          async () => {
            await prisma.user.create({ data: { name: 'Bob Smith', money: 100 } });
            const transactionIdNested = await getCurrentTransactionId(prisma);
            expect(transactionId).toBe(transactionIdNested);
          },
          { propagation: Propagation.SUPPORTS },
        );
      });
    });

    it('should support "SUPPORTS" propagation if active transaction doesn\'t exist', async () => {
      await runInTransaction(
        async () => {
          const transactionId = await getCurrentTransactionId(prisma);
          expect(transactionId).toBe(null);
        },
        { propagation: Propagation.SUPPORTS },
      );
    });

    it('should support "MANDATORY" propagation if active transaction exists', async () => {
      await runInTransaction(async () => {
        const transactionId = await getCurrentTransactionId(prisma);

        await runInTransaction(
          async () => {
            const transactionIdNested = await getCurrentTransactionId(prisma);
            expect(transactionId).toBe(transactionIdNested);
          },
          { propagation: Propagation.MANDATORY },
        );
      });
    });

    it('should throw an error if "MANDATORY" propagation is used without an active transaction', async () => {
      await expect(
        runInTransaction(() => prisma.user.findMany(), { propagation: Propagation.MANDATORY }),
      ).rejects.toThrowError(TransactionalError);
    });

    it('should support "REQUIRES_NEW" propagation', async () => {
      await runInTransaction(async () => {
        const transactionId = await getCurrentTransactionId(prisma);

        await runInTransaction(
          async () => {
            const transactionIdNested = await getCurrentTransactionId(prisma);
            expect(transactionId).not.toBe(transactionIdNested);
          },
          { propagation: Propagation.REQUIRES_NEW },
        );

        const transactionIdAfter = await getCurrentTransactionId(prisma);
        expect(transactionId).toBe(transactionIdAfter);
      });
    });

    it('should support "NOT_SUPPORTED" propagation', async () => {
      await runInTransaction(async () => {
        const transactionId = await getCurrentTransactionId(prisma);

        await runInTransaction(
          async () => {
            const transactionIdNested = await getCurrentTransactionId(prisma);
            expect(transactionIdNested).toBe(null);
          },
          { propagation: Propagation.NOT_SUPPORTED },
        );

        const transactionIdAfter = await getCurrentTransactionId(prisma);
        expect(transactionId).toBe(transactionIdAfter);
      });
    });

    it('should support "NEVER" propagation if active transaction doesn\'t exist', async () => {
      await runInTransaction(
        async () => {
          const transactionId = await getCurrentTransactionId(prisma);
          expect(transactionId).toBe(null);
        },
        { propagation: Propagation.NEVER },
      );
    });

    it('should throw an error if "NEVER" propagation is used with an active transaction', async () => {
      await runInTransaction(async () => {
        await expect(
          runInTransaction(() => prisma.user.findMany(), { propagation: Propagation.NEVER }),
        ).rejects.toThrowError(TransactionalError);
      });
    });
  });

  describe('Isolation', () => {
    it('should read the most recent committed rows when using READ COMMITTED isolation level', async () => {
      await runInTransaction(
        async () => {
          const totalUsers = await prisma.user.count();
          expect(totalUsers).toBe(0);

          // Outside of the transaction
          await prisma.$transaction(async (tx) => {
            await tx.user.create({ data: { name: 'John Doe', money: 100 } });
          });

          const totalUsers2 = await prisma.user.count();
          expect(totalUsers2).toBe(1);
        },
        { isolationLevel: 'ReadCommitted' },
      );
    });

    it('shouldn\'t see the most recent committed rows when using REPEATABLE READ isolation level', async () => {
      await runInTransaction(
        async () => {
          const totalUsers = await prisma.user.count();
          expect(totalUsers).toBe(0);

          // Outside of the transaction
          await prisma.$transaction(async (tx) => {
            await tx.user.create({ data: { name: 'John Doe', money: 100 } });
          });

          const totalUsers2 = await prisma.user.count();
          expect(totalUsers2).toBe(0);
        },
        { isolationLevel: 'RepeatableRead' },
      );
    });
  });
});
