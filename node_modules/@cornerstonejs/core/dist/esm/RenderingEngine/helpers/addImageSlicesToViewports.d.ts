import type { IStackInput, IRenderingEngine } from '../../types';
declare function addImageSlicesToViewports(renderingEngine: IRenderingEngine, stackInputs: IStackInput[], viewportIds: string[]): Promise<void>;
export default addImageSlicesToViewports;
