import type { Types } from '@cornerstonejs/core';
import { vec3 } from 'gl-matrix';
import type { PublicToolProps, ToolProps, EventTypes, SVGDrawingHelper, Annotation } from '../../types';
import type { CircleROIStartEndThresholdAnnotation, ROICachedStats } from '../../types/ToolSpecificAnnotationTypes';
import CircleROITool from '../annotation/CircleROITool';
declare class CircleROIStartEndThresholdTool extends CircleROITool {
    static toolName: any;
    _throttledCalculateCachedStats: Function;
    editData: {
        annotation: Annotation;
        viewportIdsToRender: Array<string>;
        handleIndex?: number;
        newAnnotation?: boolean;
        hasMoved?: boolean;
    } | null;
    isDrawing: boolean;
    isHandleOutsideImage: boolean;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    addNewAnnotation: (evt: EventTypes.InteractionEventType) => {
        highlighted: boolean;
        invalidated: boolean;
        metadata: {
            toolName: string;
            viewPlaneNormal: Types.Point3;
            viewUp: Types.Point3;
            FrameOfReferenceUID: string;
            referencedImageId: any;
            volumeId: any;
            spacingInNormal: number;
            enabledElement: Types.IEnabledElement;
        };
        data: {
            label: string;
            startCoordinate: number;
            endCoordinate: number;
            handles: {
                textBox: {
                    hasMoved: boolean;
                    worldPosition: Types.Point3;
                    worldBoundingBox: {
                        topLeft: Types.Point3;
                        topRight: Types.Point3;
                        bottomLeft: Types.Point3;
                        bottomRight: Types.Point3;
                    };
                };
                points: any;
                activeHandleIndex: any;
            };
            cachedStats: {
                pointsInVolume: any[];
                projectionPoints: any[];
                statistics: ROICachedStats;
            };
            labelmapUID: any;
        };
    };
    _endCallback: (evt: EventTypes.InteractionEventType) => void;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
    _computeProjectionPoints(annotation: CircleROIStartEndThresholdAnnotation, imageVolume: Types.IImageVolume): void;
    _computePointsInsideVolume(annotation: any, imageVolume: any, targetId: any, enabledElement: any): void;
    _calculateCachedStatsTool(annotation: any, enabledElement: any): any;
    _getStartCoordinate(worldPos: Types.Point3, spacingInNormal: number, viewPlaneNormal: Types.Point3): number | undefined;
    _getEndCoordinate(worldPos: Types.Point3, spacingInNormal: number, viewPlaneNormal: Types.Point3): number | undefined;
    _getIndexOfCoordinatesForViewplaneNormal(viewPlaneNormal: Types.Point3): number;
    _getCoordinateForViewplaneNormal(pos: vec3 | number, viewPlaneNormal: Types.Point3): number | undefined;
}
export default CircleROIStartEndThresholdTool;
