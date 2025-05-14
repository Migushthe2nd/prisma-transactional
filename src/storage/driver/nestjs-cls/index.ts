import { ClsService } from 'nestjs-cls';
import { StorageKey, StorageValue, StorageDriver } from '../interface';

export class NestjsClsDriver implements StorageDriver {
  constructor(private readonly cls: ClsService) {}

  get active() {
    return true; // nestjs-cls always maintains an active context
  }

  public get<T>(key: StorageKey): T {
    return this.cls.get(key) as T;
  }

  public set(key: StorageKey, value: StorageValue): void {
    this.cls.set(key, value);
  }

  public async run<T>(cb: () => Promise<T>): Promise<T> {
    return this.cls.runWith({}, cb);
  }
}