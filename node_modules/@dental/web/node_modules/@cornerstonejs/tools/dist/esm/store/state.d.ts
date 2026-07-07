import type { IToolGroup, IToolClassReference } from '../types';
import type Synchronizer from './SynchronizerManager/Synchronizer';
interface ICornerstoneTools3dState {
    isInteractingWithTool: boolean;
    isMultiPartToolActive: boolean;
    tools: Record<string, {
        toolClass: IToolClassReference;
    }>;
    toolGroups: Array<IToolGroup>;
    synchronizers: Array<Synchronizer>;
    svgNodeCache: Record<string, unknown>;
    enabledElements: Array<unknown>;
    handleRadius: number;
}
declare let state: ICornerstoneTools3dState;
declare function resetCornerstoneToolsState(): void;
export type { ICornerstoneTools3dState };
export { resetCornerstoneToolsState, state, state as default };
