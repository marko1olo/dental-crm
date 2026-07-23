import { state } from '../../store/state';
import { ToolModes } from '../../enums';
import { setAnnotationSelected, isAnnotationSelected, } from '../../stateManagement/annotation/annotationSelection';
import { isAnnotationLocked } from '../../stateManagement/annotation/annotationLocking';
import { isAnnotationVisible } from '../../stateManagement/annotation/annotationVisibility';
import filterToolsWithMoveableHandles from '../../store/filterToolsWithMoveableHandles';
import filterToolsWithAnnotationsForElement from '../../store/filterToolsWithAnnotationsForElement';
import filterMoveableAnnotationTools from '../../store/filterMoveableAnnotationTools';
import getActiveToolForMouseEvent from '../shared/getActiveToolForMouseEvent';
import getToolsWithModesForMouseEvent from '../shared/getToolsWithModesForMouseEvent';
import mouseDownAnnotationAction from './mouseDownAnnotationAction';
const { Active, Passive } = ToolModes;
export default function mouseDown(evt) {
    if (state.isInteractingWithTool) {
        return;
    }
    const activeTool = getActiveToolForMouseEvent(evt);
    if (activeTool && typeof activeTool.preMouseDownCallback === 'function') {
        const consumedEvent = activeTool.preMouseDownCallback(evt);
        if (consumedEvent) {
            return;
        }
    }
    const allActiveTools = getToolsWithModesForMouseEvent(evt, [Active]);
    const allPassiveTools = getToolsWithModesForMouseEvent(evt, [Passive]);
    const applicableTools = [
        ...(allActiveTools || []),
        ...(allPassiveTools || []),
    ];
    const actionExecuted = mouseDownAnnotationAction(evt);
    if (actionExecuted) {
        return;
    }
    const eventDetail = evt.detail;
    const { element } = eventDetail;
    const annotationToolsWithAnnotations = filterToolsWithAnnotationsForElement(element, applicableTools);
    const canvasCoords = eventDetail.currentPoints.canvas;
    const annotationToolsWithMoveableHandles = filterToolsWithMoveableHandles(element, annotationToolsWithAnnotations, canvasCoords, 'mouse');
    const isMultiSelect = !!evt.detail.event.shiftKey;
    if (annotationToolsWithMoveableHandles.length > 0) {
        const { tool, annotation, handle } = getAnnotationForSelection(annotationToolsWithMoveableHandles);
        toggleAnnotationSelection(annotation.annotationUID, isMultiSelect);
        tool.handleSelectedCallback(evt, annotation, handle, 'Mouse');
        return;
    }
    const moveableAnnotationTools = filterMoveableAnnotationTools(element, annotationToolsWithAnnotations, canvasCoords, 'mouse');
    if (moveableAnnotationTools.length > 0) {
        const { tool, annotation } = getAnnotationForSelection(moveableAnnotationTools);
        toggleAnnotationSelection(annotation.annotationUID, isMultiSelect);
        tool.toolSelectedCallback(evt, annotation, 'Mouse', canvasCoords);
        return;
    }
    if (activeTool && typeof activeTool.postMouseDownCallback === 'function') {
        const consumedEvent = activeTool.postMouseDownCallback(evt);
        if (consumedEvent) {
            return;
        }
    }
}
function getAnnotationForSelection(toolsWithMovableHandles) {
    if (toolsWithMovableHandles.length > 1) {
        const unlockAndVisibleAnnotation = toolsWithMovableHandles.find((item) => {
            const isUnlocked = !isAnnotationLocked(item.annotation.annotationUID);
            const isVisible = isAnnotationVisible(item.annotation.annotationUID);
            return isUnlocked && isVisible;
        });
        if (unlockAndVisibleAnnotation) {
            return unlockAndVisibleAnnotation;
        }
    }
    return toolsWithMovableHandles[0];
}
function toggleAnnotationSelection(annotationUID, isMultiSelect = false) {
    if (isMultiSelect) {
        if (isAnnotationSelected(annotationUID)) {
            setAnnotationSelected(annotationUID, false);
        }
        else {
            const preserveSelected = true;
            setAnnotationSelected(annotationUID, true, preserveSelected);
        }
    }
    else {
        const preserveSelected = false;
        setAnnotationSelected(annotationUID, true, preserveSelected);
    }
}
