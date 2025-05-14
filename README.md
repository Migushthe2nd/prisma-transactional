
# Prisma Transactional
[![npm version](http://img.shields.io/npm/v/prisma-transactional.svg?style=flat)](https://npmjs.org/package/prisma-transactional "View this project on npm")

A `Transactional` decorator and utility library for [Prisma](https://www.prisma.io/) that provides transaction management with propagation control and hooks using [ALS](https://nodejs.org/api/async_context.html#class-asynclocalstorage) or [cls-hooked](https://www.npmjs.com/package/cls-hooked). Adapted from [Aliheym/typeorm-transactional](https://github.com/Aliheym/typeorm-transactional) for [Prisma](https://www.prisma.io/).

## Installation

```shell
## npm
npm install --save prisma-transactional

## Required dependencies
npm install --save @prisma/client

## Optional dependencies (for NestJS integration)
npm install --save nestjs-cls
```

Or using yarn:

```shell
yarn add prisma-transactional

## Required dependencies
yarn add @prisma/client

## Optional dependencies (for NestJS integration)
yarn add nestjs-cls
```

## Initialization

Initialize the transactional context before starting your application:

```typescript
import { initializeTransactionalContext, StorageDriver } from 'prisma-transactional';

// Using cls-hooked (legacy) or AsyncLocalStorage (Node.js >= 16)
initializeTransactionalContext({ storageDriver: StorageDriver.AUTO });

// Or explicitly choose a storage driver:
initializeTransactionalContext({ storageDriver: StorageDriver.CLS_HOOKED }); // Legacy support
initializeTransactionalContext({ storageDriver: StorageDriver.ASYNC_LOCAL_STORAGE }); // Node.js >= 16
```

Create a transactional Prisma client:

```typescript
import { PrismaClient } from '@prisma/client';
import { createPrismaTransactional } from 'prisma-transactional';

const prisma = createPrismaTransactional(new PrismaClient());
```

## Usage

### Basic Transactions

Use the `runInTransaction` function to execute code within a transaction:

```typescript
import { runInTransaction } from 'prisma-transactional';

await runInTransaction(async () => {
  await prisma.user.create({ data: { name: 'John Doe', money: 100 } });
});
```

### Nested Transactions

Transactions can be nested, with propagation behavior controlled by the `Propagation` enum:

```typescript
import { runInTransaction, Propagation } from 'prisma-transactional';

await runInTransaction(async () => {
  await prisma.user.create({ data: { name: 'John Doe', money: 100 } });
  
  // This will reuse the parent transaction
  await runInTransaction(async () => {
    await prisma.user.update({
      where: { name: 'John Doe' },
      data: { money: 200 }
    });
  });
});
```

### Transaction Hooks

Register callbacks for transaction lifecycle events:

```typescript
import { 
  runInTransaction, 
  runOnTransactionCommit,
  runOnTransactionRollback,
  runOnTransactionComplete 
} from 'prisma-transactional';

await runInTransaction(async () => {
  runOnTransactionCommit(() => console.log('Transaction committed'));
  runOnTransactionRollback(() => console.log('Transaction rolled back'));
  runOnTransactionComplete((committed) => 
    console.log(`Transaction completed, committed: ${committed}`)
  );
  
  await prisma.user.create({ data: { name: 'John Doe' } });
});
```

### NestJS Integration

Use with NestJS by initializing the context and creating the Prisma client:

```typescript
// main.ts
import { initializeTransactionalContext, StorageDriver } from 'prisma-transactional';
import { ClsModule, ClsService } from 'nestjs-cls';

const bootstrap = async () => {
  // Option 1: Using traditional storage drivers
  initializeTransactionalContext({ storageDriver: StorageDriver.AUTO });

  // Option 2: Using NestJS CLS integration
  const app = await NestFactory.create(AppModule);
  const cls = app.get(ClsService);
  initializeTransactionalContext({ storageDriver: StorageDriver.NESTJS_CLS, cls });

  await app.listen(3000);
};

// prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createPrismaTransactional } from 'prisma-transactional';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super();
    return createPrismaTransactional(this);
  }

  async onModuleInit() {
    await this.$connect();
  }
}
```

Use the `@Transactional()` decorator in your services:

```typescript
import { Injectable } from '@nestjs/common';
import { Transactional } from 'prisma-transactional';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  @Transactional()
  async createUser(name: string) {
    return this.prisma.user.create({
      data: { name }
    });
  }
}
```

## API Reference

### initializeTransactionalContext(options)
- `options.storageDriver`: Storage driver to use (CLS_HOOKED or ALS)

### createPrismaTransactional(prismaClient)
- Creates a transactional Prisma client instance

### @Transactional(options?)
- `options.propagation`: Transaction propagation behavior
- `options.isolationLevel`: Transaction isolation level

### runInTransaction(fn, options?)
- Executes a function within a transaction
- Returns the function's result

### Transaction Hooks
- `runOnTransactionCommit(callback)`
- `runOnTransactionRollback(callback)`
- `runOnTransactionComplete(callback)`

### Enums
- `Propagation`: Transaction propagation options
- `IsolationLevel`: Transaction isolation levels
- `StorageDriver`: Available storage drivers
  - `AUTO`: Uses AsyncLocalStorage when Node.js >= 16, falls back to cls-hooked
  - `CLS_HOOKED`: Legacy support using cls-hooked
  - `ASYNC_LOCAL_STORAGE`: Uses Node.js AsyncLocalStorage (Node.js >= 16)
  - `NESTJS_CLS`: Uses nestjs-cls for transaction context management
