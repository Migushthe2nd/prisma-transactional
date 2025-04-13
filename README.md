
# Prisma Transactional
[![npm version](http://img.shields.io/npm/v/prisma-transactional.svg?style=flat)](https://npmjs.org/package/prisma-transactional "View this project on npm")

A `Transactional` decorator and utility library for [Prisma](https://www.prisma.io/) that provides transaction management with propagation control and hooks using [ALS](https://nodejs.org/api/async_context.html#class-asynclocalstorage) or [cls-hooked](https://www.npmjs.com/package/cls-hooked). Adapted from [Aliheym/typeorm-transactional](https://github.com/Aliheym/typeorm-transactional) for [Prisma](https://www.prisma.io/).

## Installation

```shell
## npm
npm install --save prisma-transactional

## Needed dependencies
npm install --save @prisma/client
```

Or using yarn:

```shell
yarn add prisma-transactional

## Needed dependencies
yarn add @prisma/client
```

## Initialization

Initialize the transactional context before starting your application:

```typescript
import { initializeTransactionalContext, StorageDriver } from 'prisma-transactional';

initializeTransactionalContext({ storageDriver: StorageDriver.CLS_HOOKED });
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

const bootstrap = async () => {
  initializeTransactionalContext({ storageDriver: StorageDriver.CLS_HOOKED });
  const app = await NestFactory.create(AppModule);
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
