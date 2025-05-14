import { PrismaClient } from '@prisma/client';
import { createPrismaProxy } from './prisma-proxy';
import { ClsService } from 'nestjs-cls';
import { StorageDriver } from '../storage/driver/interface';

export type PrismaTransactionalClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends' | 'user' | 'counter'>;

export interface PrismaClientContainer {
  client: PrismaClient;
  name?: string;
}

export const prismaClients = new Map<string, PrismaClientContainer>();

export const getPrismaClientByName = (name: string = 'default'): PrismaClient | null => {
  const container = prismaClients.get(name);
  return container?.client ?? null;
};

export const createPrismaTransactional = <Client extends PrismaClient>(client: Client, name: string = 'default', storageDriver?: StorageDriver) => {
  const proxiedClient = createPrismaProxy(client, storageDriver);
  prismaClients.set(name, { client: proxiedClient, name });
  return proxiedClient as Client
};
