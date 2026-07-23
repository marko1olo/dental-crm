import { getRenderingEngines } from '@cornerstonejs/core';
import { triggerAnnotationRenderForViewportIds } from '../../utilities/triggerAnnotationRenderForViewportIds';
function annotationSelectionListener(evt) {
    const deselectedAnnotation = evt.detail.removed;
    if (!deselectedAnnotation.length) {
        return;
    }
    const renderingEngines = getRenderingEngines();
    renderingEngines.forEach((renderingEngine) => {
        const viewports = renderingEngine.getViewports();
        const viewportIds = viewports.map((vp) => vp.id);
        triggerAnnotationRenderForViewportIds(viewportIds);
    });
}
export default annotationSelectionListener;
