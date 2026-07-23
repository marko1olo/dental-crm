import { getRenderingEngine } from '@cornerstonejs/core';
export default function slabThicknessSyncCallback(_synchronizerInstance, sourceViewport, targetViewport) {
    const renderingEngine = getRenderingEngine(targetViewport.renderingEngineId);
    if (!renderingEngine) {
        throw new Error(`No RenderingEngine for Id: ${targetViewport.renderingEngineId}`);
    }
    const tViewport = renderingEngine.getViewport(targetViewport.viewportId);
    const sViewport = renderingEngine.getViewport(sourceViewport.viewportId);
    const slabThickness = sViewport.getSlabThickness?.();
    if (!slabThickness) {
        return;
    }
    tViewport.setSlabThickness?.(slabThickness);
    tViewport.render();
}
