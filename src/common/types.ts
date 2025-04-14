import { PrismaClient } from '@prisma/client';
import { createPrismaProxy } from './prisma-proxy';

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

export const createPrismaTransactional = <Client extends PrismaClient>(client: Client, name: string = 'default') => {
  const proxiedClient = createPrismaProxy(client);
  prismaClients.set(name, { client: proxiedClient, name });
  return proxiedClient as Client
};
