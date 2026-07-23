import { utilities } from '@cornerstonejs/core';
import { addAnnotation, removeAnnotation } from '../../stateManagement';
import { removeContourSegmentationAnnotation } from './removeContourSegmentationAnnotation';
import { addContourSegmentationAnnotation } from './addContourSegmentationAnnotation';
import { triggerAnnotationModified } from '../../stateManagement/annotation/helpers/state';
const DEFAULT_CONTOUR_SEG_TOOL_NAME = 'PlanarFreehandContourSegmentationTool';
export default function convertContourSegmentationAnnotation(annotation) {
    const { polyline } = annotation.data?.contour || {};
    if (!polyline || polyline.length < 3) {
        console.warn('Skipping creation of new annotation due to invalid polyline:', polyline);
        return;
    }
    removeAnnotation(annotation.annotationUID);
    removeContourSegmentationAnnotation(annotation);
    const startPointWorld = polyline[0];
    const endPointWorld = polyline[polyline.length - 1];
    const newAnnotation = {
        metadata: {
            ...annotation.metadata,
            toolName: DEFAULT_CONTOUR_SEG_TOOL_NAME,
            originalToolName: annotation.metadata.originalToolName || annotation.metadata.toolName,
        },
        data: {
            cachedStats: {},
            handles: {
                points: [startPointWorld, endPointWorld],
                textBox: annotation.data.handles.textBox
                    ? { ...annotation.data.handles.textBox }
                    : undefined,
            },
            contour: {
                ...annotation.data.contour,
            },
            spline: annotation.data.spline,
            segmentation: {
                ...annotation.data.segmentation,
            },
        },
        annotationUID: utilities.uuidv4(),
        highlighted: true,
        invalidated: true,
        isLocked: false,
        isVisible: undefined,
        interpolationUID: annotation.interpolationUID,
        interpolationCompleted: annotation.interpolationCompleted,
    };
    addAnnotation(newAnnotation, annotation.metadata.FrameOfReferenceUID);
    addContourSegmentationAnnotation(newAnnotation);
    triggerAnnotationModified(newAnnotation);
    return newAnnotation;
}
