import { Injectable } from '@nestjs/common';
import { PrismaClient, User } from '@prisma/client';

import { Transactional } from '../../src';

@Injectable()
export class UserReaderService {
  constructor(private readonly prisma: PrismaClient) {}

  @Transactional()
  async findUserByName(name: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { name }
    });
  }
}
