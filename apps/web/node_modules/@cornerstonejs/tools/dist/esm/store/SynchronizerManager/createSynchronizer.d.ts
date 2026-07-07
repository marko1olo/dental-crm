import Synchronizer, { type SynchronizerOptions } from './Synchronizer';
import type { ISynchronizerEventHandler } from '../../types';
declare function createSynchronizer(synchronizerId: string, eventName: string, eventHandler: ISynchronizerEventHandler, options?: SynchronizerOptions): Synchronizer;
export default createSynchronizer;
