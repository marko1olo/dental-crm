import getActiveToolForTouchEvent from '../shared/getActiveToolForTouchEvent';
import { state } from '../../store/state';
export default function touchDrag(evt) {
    if (state.isInteractingWithTool) {
        return;
    }
    const activeTool = getActiveToolForTouchEvent(evt);
    const noFoundToolOrDoesNotHaveTouchDragCallback = !activeTool || typeof activeTool.touchDragCallback !== 'function';
    if (noFoundToolOrDoesNotHaveTouchDragCallback) {
        return;
    }
    activeTool.touchDragCallback(evt);
}
