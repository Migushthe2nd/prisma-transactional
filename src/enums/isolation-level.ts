import { Prisma } from '@prisma/client';

/**
 * Enumeration that represents transaction isolation levels for use with the {@link Transactional} annotation
 */
export type IsolationLevel = Prisma.TransactionIsolationLevel
