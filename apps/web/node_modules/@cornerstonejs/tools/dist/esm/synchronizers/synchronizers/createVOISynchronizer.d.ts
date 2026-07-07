import type Synchronizer from '../../store/SynchronizerManager/Synchronizer';
type VOISynchronizerOptions = {
    syncInvertState: boolean;
    syncColormap: boolean;
};
export default function createVOISynchronizer(synchronizerName: string, options: VOISynchronizerOptions): Synchronizer;
export {};
