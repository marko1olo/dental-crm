import { AnnotationTool } from './base';
import type { Types } from '@cornerstonejs/core';
import type { EventTypes, ToolHandle, PublicToolProps, ToolProps, SVGDrawingHelper, Annotation } from '../types';
import type { AdvancedMagnifyAnnotation } from '../types/ToolSpecificAnnotationTypes';
export type AutoPanCallbackData = {
    points: {
        currentPosition: {
            canvas: Types.Point2;
            world: Types.Point3;
        };
        newPosition: {
            canvas: Types.Point2;
            world: Types.Point3;
        };
    };
    delta: {
        canvas: Types.Point2;
        world: Types.Point3;
    };
};
export type AutoPanCallback = (data: AutoPanCallbackData) => void;
declare enum AdvancedMagnifyToolActions {
    ShowZoomFactorsList = "showZoomFactorsList"
}
export type MagnifyViewportInfo = {
    magnifyViewportId?: string;
    sourceEnabledElement: Types.IEnabledElement;
    position: Types.Point2;
    radius: number;
    zoomFactor: number;
    autoPan: {
        enabled: boolean;
        padding: number;
        callback: AutoPanCallback;
    };
};
interface MagnifyViewportManager {
    createViewport(annotation: AdvancedMagnifyAnnotation, viewportInfo: MagnifyViewportInfo): AdvancedMagnifyViewport;
    getViewport(magnifyViewportId: string): AdvancedMagnifyViewport;
    destroyViewport(magnifyViewportId: string): void;
    dispose(): void;
}
declare class AdvancedMagnifyTool extends AnnotationTool {
    static toolName: any;
    static Actions: typeof AdvancedMagnifyToolActions;
    magnifyViewportManager: MagnifyViewportManager;
    editData: {
        annotation: Annotation;
        viewportIdsToRender: Array<string>;
        handleIndex?: number;
        newAnnotation?: boolean;
        hasMoved?: boolean;
    } | null;
    isDrawing: boolean;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    addNewAnnotation: (evt: EventTypes.InteractionEventType) => AdvancedMagnifyAnnotation;
    onSetToolDisabled: () => void;
    isPointNearTool: (element: HTMLDivElement, annotation: AdvancedMagnifyAnnotation, canvasCoords: Types.Point2, proximity: number) => boolean;
    toolSelectedCallback: (evt: EventTypes.InteractionEventType, annotation: AdvancedMagnifyAnnotation) => void;
    handleSelectedCallback: (evt: EventTypes.InteractionEventType, annotation: AdvancedMagnifyAnnotation, handle: ToolHandle) => void;
    _endCallback: (evt: EventTypes.InteractionEventType) => void;
    _dragDrawCallback: (evt: EventTypes.InteractionEventType) => void;
    _dragModifyCallback: (evt: EventTypes.InteractionEventType) => void;
    _dragHandle: (evt: EventTypes.InteractionEventType) => void;
    cancel: (element: HTMLDivElement) => string;
    _activateModify: (element: any) => void;
    _deactivateModify: (element: any) => void;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
    showZoomFactorsList(evt: EventTypes.InteractionEventType, annotation: AdvancedMagnifyAnnotation): void;
    private _getZoomFactorsListDropdown;
    private _getWorldHandlePoints;
    private _getCanvasCircleData;
    private _getWorldDeltaFromCanvasDelta;
    private _applyWorldDelta;
    private _getCanvasHandlePoints;
}
declare class AdvancedMagnifyViewport {
    private _viewportId;
    private _sourceEnabledElement;
    private _enabledElement;
    private _sourceToolGroup;
    private _magnifyToolGroup;
    private _isViewportReady;
    private _radius;
    private _resized;
    private _resizeViewportAsync;
    private _canAutoPan;
    private _autoPan;
    position: Types.Point2;
    zoomFactor: number;
    visible: boolean;
    constructor({ magnifyViewportId, sourceEnabledElement, radius, position, zoomFactor, autoPan, }: {
        magnifyViewportId?: string;
        sourceEnabledElement: Types.IEnabledElement;
        radius?: number;
        position?: Types.Point2;
        zoomFactor: number;
        autoPan: {
            enabled: boolean;
            padding: number;
            callback: AutoPanCallback;
        };
    });
    get sourceEnabledElement(): Types.IEnabledElement;
    get viewportId(): string;
    get radius(): number;
    set radius(radius: number);
    update(): void;
    dispose(): void;
    private _handleToolModeChanged;
    private _inheritBorderRadius;
    private _createViewportNode;
    private _convertZoomFactorToParallelScale;
    private _isStackViewport;
    private _isVolumeViewport;
    private _cloneToolGroups;
    private _cloneStack;
    private _cloneVolumes;
    private _cloneViewport;
    private _cancelMouseEventCallback;
    private _browserMouseUpCallback;
    private _browserMouseDownCallback;
    private _mouseDragCallback;
    private _addBrowserEventListeners;
    private _removeBrowserEventListeners;
    private _addEventListeners;
    private _removeEventListeners;
    private _initialize;
    private _syncViewportsCameras;
    private _syncStackViewports;
    private _syncViewports;
    private _resizeViewport;
}
export { AdvancedMagnifyTool as default };
