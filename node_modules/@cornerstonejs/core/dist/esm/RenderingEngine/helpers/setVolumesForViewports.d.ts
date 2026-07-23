import type { IVolumeInput, IRenderingEngine } from '../../types';
declare function setVolumesForViewports(renderingEngine: IRenderingEngine, volumeInputs: IVolumeInput[], viewportIds: string[], immediateRender?: boolean, suppressEvents?: boolean): Promise<void>;
export default setVolumesForViewports;
