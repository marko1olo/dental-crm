import { state } from '../../store/state';
import getActiveToolForMouseEvent from '../shared/getActiveToolForMouseEvent';
import { setAnnotationSelected } from '../../stateManagement/annotation/annotationSelection';
export default function mouseDownActivate(evt) {
    if (state.isInteractingWithTool) {
        return;
    }
    const activeTool = getActiveToolForMouseEvent(evt);
    if (!activeTool) {
        return;
    }
    if (state.isMultiPartToolActive) {
        return;
    }
    if (activeTool.addNewAnnotation) {
        try {
            const annotation = activeTool.addNewAnnotation(evt, 'mouse');
            setAnnotationSelected(annotation.annotationUID);
        }
        catch (error) {
            console.warn('Error adding new annotation, viewport not ready:', error);
        }
    }
}
