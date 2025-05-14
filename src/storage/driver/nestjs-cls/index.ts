import { ClsService } from 'nestjs-cls';
import { StorageKey, StorageValue, StorageDriver } from '../interface';

export class NestJsClsDriver implements StorageDriver {
  private clsService: ClsService;

  constructor(clsService: ClsService) {
    this.clsService = clsService;
  }

  get active() {
    return this.clsService.isActive();
  }

  public get<T>(key: StorageKey): T {
    return this.clsService.get(key) as T;
  }

  public set(key: StorageKey, value: StorageValue): void {
    this.clsService.set(key, value);
  }

  public async run<T>(cb: () => Promise<T>): Promise<T> {
    if (this.clsService.isActive()) {
      // If already in a CLS context, just run the callback
      return cb();
    }
    
    // Otherwise, create a new CLS context
    return this.clsService.run(cb);
  }
}