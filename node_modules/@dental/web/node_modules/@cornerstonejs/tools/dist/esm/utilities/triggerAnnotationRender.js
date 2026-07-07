import { annotationRenderingEngine } from '../stateManagement/annotation/AnnotationRenderingEngine';
function triggerAnnotationRender(element) {
    annotationRenderingEngine.renderViewport(element);
}
export default triggerAnnotationRender;
