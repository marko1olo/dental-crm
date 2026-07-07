import type { Types } from '@cornerstonejs/core';
import { ChangeTypes } from '../../enums';
import type { Annotation, EventTypes, ToolHandle, PublicToolProps, ToolProps, AnnotationRenderContext } from '../../types';
import type { ContourAnnotation, SplineROIAnnotation } from '../../types/ToolSpecificAnnotationTypes';
import ContourSegmentationBaseTool from '../base/ContourSegmentationBaseTool';
declare enum SplineTypesEnum {
    Cardinal = "CARDINAL",
    Linear = "LINEAR",
    CatmullRom = "CATMULLROM",
    BSpline = "BSPLINE"
}
declare enum SplineToolActions {
    AddControlPoint = "addControlPoint",
    DeleteControlPoint = "deleteControlPoint"
}
declare class SplineROITool extends ContourSegmentationBaseTool {
    static toolName: string;
    protected splineToolNames: string[];
    static SplineTypes: typeof SplineTypesEnum;
    static Actions: typeof SplineToolActions;
    private annotationCompletedBinded;
    _throttledCalculateCachedStats: Function;
    editData: {
        annotation: SplineROIAnnotation;
        viewportIdsToRender: Array<string>;
        handleIndex?: number;
        movingTextBox?: boolean;
        newAnnotation?: boolean;
        hasMoved?: boolean;
        lastCanvasPoint?: Types.Point2;
        contourHoleProcessingEnabled?: boolean;
    } | null;
    isDrawing: boolean;
    isHandleOutsideImage: boolean;
    fireChangeOnUpdate: {
        annotationUID: string;
        changeType: ChangeTypes;
        contourHoleProcessingEnabled: boolean;
    };
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    protected annotationCompleted(evt: any): void;
    protected initializeListeners(): void;
    protected removeListeners(): void;
    onSetToolEnabled(): void;
    onSetToolActive(): void;
    onSetToolDisabled(): void;
    addNewAnnotation(evt: EventTypes.InteractionEventType): SplineROIAnnotation;
    isPointNearTool: (element: HTMLDivElement, annotation: SplineROIAnnotation, canvasCoords: Types.Point2, proximity: number) => boolean;
    toolSelectedCallback: (evt: EventTypes.InteractionEventType, annotation: SplineROIAnnotation) => void;
    handleSelectedCallback: (evt: EventTypes.InteractionEventType, annotation: SplineROIAnnotation, handle: ToolHandle) => void;
    _endCallback: (evt: EventTypes.InteractionEventType) => void;
    private _keyDownCallback;
    private _mouseMoveCallback;
    private _mouseDownCallback;
    private _dragCallback;
    cancel(element: HTMLDivElement): string;
    triggerAnnotationCompleted: (annotation: SplineROIAnnotation, contourHoleProcessingEnabled: boolean) => void;
    triggerAnnotationModified: (annotation: SplineROIAnnotation, enabledElement: Types.IEnabledElement, changeType?: ChangeTypes) => void;
    triggerChangeEvent: (annotation: SplineROIAnnotation, enabledElement: Types.IEnabledElement, changeType: ChangeTypes, contourHoleProcessingEnabled: any) => void;
    private _activateModify;
    private _deactivateModify;
    private _activateDraw;
    private _deactivateDraw;
    protected isContourSegmentationTool(): boolean;
    protected renderAnnotationInstance(renderContext: AnnotationRenderContext): boolean;
    protected createInterpolatedSplineControl(annotation: any): void;
    isSplineAnnotation(annotation: ContourAnnotation): boolean;
    createSplineObjectFromType(annotation: ContourAnnotation, splineType: string): void;
    protected createAnnotation(evt: EventTypes.InteractionEventType): ContourAnnotation;
    private _renderStats;
    addControlPointCallback: (evt: EventTypes.InteractionEventType, annotation: SplineROIAnnotation) => void;
    private _deleteControlPointByIndex;
    deleteControlPointCallback: (evt: EventTypes.InteractionEventType, annotation: SplineROIAnnotation) => void;
    _isSplineROIAnnotation(annotation: Annotation): annotation is SplineROIAnnotation;
    private _getSplineConfig;
    private _updateSplineInstance;
    private _calculateCachedStats;
    static hydrate: (viewportId: string, points: Types.Point3[], options?: {
        annotationUID?: string;
        splineType?: SplineTypesEnum;
        toolInstance?: SplineROITool;
        referencedImageId?: string;
        viewplaneNormal?: Types.Point3;
        viewUp?: Types.Point3;
    }) => SplineROIAnnotation;
}
export default SplineROITool;
