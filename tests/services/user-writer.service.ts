import { Injectable } from '@nestjs/common';
import { PrismaClient, User } from '@prisma/client';

import { UserReaderService } from './user-reader.service';

import { runOnTransactionCommit, runOnTransactionRollback, Transactional } from '../../src';

@Injectable()
export class UserWriterService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly readerService: UserReaderService,
  ) {}

  @Transactional()
  async createUser(name: string, hookHandler?: (isCommitted: boolean) => any): Promise<User> {
    if (hookHandler) {
      runOnTransactionCommit(() => hookHandler(true));
      runOnTransactionRollback(() => hookHandler(false));
    }

    const user = await this.prisma.user.create({
      data: { name, money: 0 }
    });

    return user;
  }

  @Transactional()
  async createUserAndThrow(
    name: string,
    hookHandler?: (isCommitted: boolean) => any,
  ): Promise<User> {
    if (hookHandler) {
      runOnTransactionCommit(() => hookHandler(true));
      runOnTransactionRollback(() => hookHandler(false));
    }

    const user = await this.prisma.user.create({
      data: { name, money: 0 }
    });

    throw new Error('Some error');
  }
}
