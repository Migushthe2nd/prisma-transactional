import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';

import { UserReaderService } from './services/user-reader.service';
import { UserWriterService } from './services/user-writer.service';

import { initializeTransactionalContext, addPrismaClient, StorageDriver } from '../src';

describe('Integration with Nest.js', () => {
  let app: TestingModule;

  let readerService: UserReaderService;
  let writerService: UserWriterService;

  let prisma: PrismaClient;

  beforeAll(async () => {
    const storageDriver =
      process.env.TEST_STORAGE_DRIVER && process.env.TEST_STORAGE_DRIVER in StorageDriver
        ? StorageDriver[process.env.TEST_STORAGE_DRIVER as keyof typeof StorageDriver]
        : StorageDriver.CLS_HOOKED;

    initializeTransactionalContext({ storageDriver });

    prisma = addPrismaClient(new PrismaClient({
      datasourceUrl: 'postgresql://postgres:postgres@localhost:5445/test',
    }));

    app = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaClient,
          useValue: prisma,
        },
        UserReaderService,
        UserWriterService,
      ],
    }).compile();

    readerService = app.get<UserReaderService>(UserReaderService);
    writerService = app.get<UserWriterService>(UserWriterService);

    await prisma.$connect();
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('should create a user using service if transaction was completed successfully', async () => {
    const name = 'John Doe';
    const onTransactionCompleteSpy = jest.fn();

    const writtenUser = await writerService.createUser(name, onTransactionCompleteSpy);
    expect(writtenUser.name).toBe(name);

    const readUser = await readerService.findUserByName(name);
    expect(readUser?.name).toBe(name);

    expect(onTransactionCompleteSpy).toBeCalledTimes(1);
    expect(onTransactionCompleteSpy).toBeCalledWith(true);
  });

  it('should fail to create a user using service if error was thrown', async () => {
    const name = 'John Doe';
    const onTransactionCompleteSpy = jest.fn();

    expect(() =>
      writerService.createUserAndThrow(name, onTransactionCompleteSpy),
    ).rejects.toThrowError();

    const readUser = await readerService.findUserByName(name);
    expect(readUser).toBeNull();

    expect(onTransactionCompleteSpy).toBeCalledTimes(1);
    expect(onTransactionCompleteSpy).toBeCalledWith(false);
  });
});
