import vtkAnnotatedCubeActor from '@kitware/vtk.js/Rendering/Core/AnnotatedCubeActor';
import { BaseTool } from './base';
declare enum OverlayMarkerType {
    ANNOTATED_CUBE = 1,
    AXES = 2,
    CUSTOM = 3
}
type FaceProperty = {
    text?: string;
    faceColor?: string;
    fontColor?: string;
    faceRotation?: number;
};
type AnnotatedCubeConfig = {
    faceProperties: {
        xPlus: FaceProperty;
        xMinus: FaceProperty;
        yPlus: FaceProperty;
        yMinus: FaceProperty;
        zPlus: FaceProperty;
        zMinus: FaceProperty;
    };
    defaultStyle: {
        fontStyle?: string;
        fontFamily?: string;
        fontColor?: string;
        fontSizeScale?: (res: number) => number;
        faceColor?: string;
        edgeThickness?: number;
        edgeColor?: string;
        resolution?: number;
    };
};
type OverlayConfiguration = {
    [OverlayMarkerType.ANNOTATED_CUBE]: AnnotatedCubeConfig;
    [OverlayMarkerType.AXES]: Record<string, never>;
    [OverlayMarkerType.CUSTOM]: {
        polyDataURL: string;
    };
};
declare class OrientationMarkerTool extends BaseTool {
    static toolName: any;
    static CUBE: number;
    static AXIS: number;
    static VTPFILE: number;
    orientationMarkers: any;
    updatingOrientationMarker: any;
    polyDataURL: any;
    _resizeObservers: Map<any, any>;
    static OVERLAY_MARKER_TYPES: typeof OverlayMarkerType;
    constructor(toolProps?: {}, defaultToolProps?: {
        configuration: {
            orientationWidget: {
                enabled: boolean;
                viewportCorner: import("@kitware/vtk.js/Interaction/Widgets/OrientationMarkerWidget/Constants").Corners;
                viewportSize: number;
                minPixelSize: number;
                maxPixelSize: number;
            };
            overlayMarkerType: OverlayMarkerType;
            overlayConfiguration: OverlayConfiguration;
        };
    });
    onSetToolEnabled: () => void;
    onSetToolActive: () => void;
    onSetToolDisabled: () => void;
    _getViewportsInfo: () => any[];
    resize: (viewportId: any) => void;
    _unsubscribeToViewportNewVolumeSet(): void;
    _subscribeToViewportEvents(): void;
    private cleanUpData;
    private initViewports;
    addAxisActorInViewport(viewport: any): Promise<void>;
    private createCustomActor;
    private createAnnotationCube;
    createAnnotatedCubeActor(): Promise<vtkAnnotatedCubeActor>;
}
export default OrientationMarkerTool;
