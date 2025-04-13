import { EventEmitter } from 'events';
import { StorageDriver as StorageDriverEnum } from '../enums/storage-driver';
import { StorageDriver } from '../storage/driver/interface';
import { storage } from '../storage';

interface TransactionalOptions {
  maxHookHandlers: number;
  storageDriver: StorageDriverEnum;
}

interface TransactionalData {
  options: TransactionalOptions;
}

const data: TransactionalData = {
  options: {
    maxHookHandlers: 10,
    storageDriver: StorageDriverEnum.CLS_HOOKED,
  },
};

export const getTransactionalContext = () => storage.get();

const setTransactionalOptions = (options?: Partial<TransactionalOptions>) => {
  data.options = { ...data.options, ...(options || {}) };
};

export const getTransactionalOptions = () => data.options;

export const initializeTransactionalContext = (options?: Partial<TransactionalOptions>) => {
  setTransactionalOptions(options);
  const { storageDriver } = getTransactionalOptions();
  return storage.create(storageDriver);
};

export const getHookInContext = (context: StorageDriver | undefined) =>
  context?.get('@prisma/hook') as EventEmitter | null;

export const setHookInContext = (context: StorageDriver, emitter: EventEmitter | null) =>
  context.set('@prisma/hook', emitter);
