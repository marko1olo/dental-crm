import triggerAnnotationRenderForViewportIds from '../../utilities/triggerAnnotationRenderForViewportIds';
function annotationModifiedListener(evt) {
    const { viewportId } = evt.detail;
    triggerAnnotationRenderForViewportIds([viewportId]);
}
export default annotationModifiedListener;
