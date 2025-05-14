import { StorageDriver as StorageDriverEnum } from '../enums/storage-driver';
import { AsyncLocalStorageDriver } from './driver/async-local-storage';
import type { StorageDriver } from './driver/interface';
import { ClsHookedDriver } from './driver/cls-hooked';
import { NestJsClsDriver } from './driver/nestjs-cls';
import { ClsService } from 'nestjs-cls';

interface StorageDriverConstructor {
  new (...args: any[]): StorageDriver;
}

export class Storage {
  private driver: StorageDriver;
  private clsService: ClsService | undefined;

  public create(storageDriverEnum?: StorageDriverEnum, clsService?: ClsService) {
    if (this.driver) {
      // We probably should not allow calling this function when driver is already defined
      return this.driver;
    }

    this.clsService = clsService;
    const DriverConstructor = this.getDriverConstructor(storageDriverEnum);
    
    if (storageDriverEnum === StorageDriverEnum.NESTJS_CLS) {
      if (!clsService) {
        throw new Error('ClsService instance is required when using NESTJS_CLS storage driver');
      }
      this.driver = new DriverConstructor(clsService);
    } else {
      this.driver = new DriverConstructor();
    }

    return this.driver;
  }

  public get() {
    if (!this.driver) {
      throw new Error(
        'No storage driver defined in your app ... please call initializeTransactionalContext() before application start.',
      );
    }

    return this.driver;
  }

  private getDriverConstructor(storageDriverEnum?: StorageDriverEnum): StorageDriverConstructor {
    switch (storageDriverEnum) {
      case StorageDriverEnum.ASYNC_LOCAL_STORAGE:
        return AsyncLocalStorageDriver;
      case StorageDriverEnum.CLS_HOOKED:
        return ClsHookedDriver;
      case StorageDriverEnum.NESTJS_CLS:
        return NestJsClsDriver;
      case StorageDriverEnum.AUTO:
      default:
        return this.getBestSupportedDriverConstructor();
    }
  }

  private getBestSupportedDriverConstructor(): StorageDriverConstructor {
    if (process && process.versions && process.versions.node && Storage.compareVersionsIsOrNewer(process.versions.node, '16.0.0')) {
      return AsyncLocalStorageDriver;
    }
    return ClsHookedDriver;
  }

  private static compareVersionsIsOrNewer(version1: string, version2: string): boolean {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1 = v1Parts[i] || 0;
      const v2 = v2Parts[i] || 0;
      if (v1 > v2) return true;
      if (v1 < v2) return false;
    }
    return true;
  }
}
