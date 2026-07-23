declare const _default: {
    determineSegmentIndex: {
        onInteractionStart: (operationData: import("../BrushStrategy").InitializedOperationData) => void;
    };
    dynamicThreshold: {
        initialize: (operationData: import("../BrushStrategy").InitializedOperationData) => void;
        onInteractionStart: (operationData: import("../BrushStrategy").InitializedOperationData) => void;
        computeInnerCircleRadius: (operationData: import("../BrushStrategy").InitializedOperationData) => void;
    };
    erase: {
        initialize: (operationData: import("../BrushStrategy").InitializedOperationData) => void;
    };
    islandRemoval: {
        onInteractionEnd: (operationData: import("../BrushStrategy").InitializedOperationData) => void;
    };
    preview: {
        preview: (operationData: import("../BrushStrategy").InitializedOperationData) => any;
        initialize: (operationData: import("../BrushStrategy").InitializedOperationData) => void;
        acceptPreview: (operationData: import("../BrushStrategy").InitializedOperationData) => void;
        rejectPreview: (operationData: import("../BrushStrategy").InitializedOperationData) => void;
    };
    regionFill: {
        fill: (operationData: import("../BrushStrategy").InitializedOperationData) => void;
    };
    setValue: {
        setValue: (operationData: import("../BrushStrategy").InitializedOperationData, { value, index }: {
            value: any;
            index: any;
        }) => void;
    };
    threshold: {
        createIsInThreshold: (operationData: import("../BrushStrategy").InitializedOperationData) => (index: any) => boolean;
    };
    labelmapStatistics: {
        getStatistics: (enabledElement: any, operationData: import("../BrushStrategy").InitializedOperationData, options?: {
            indices?: number | number[];
        }) => void;
    };
    ensureSegmentationVolumeFor3DManipulation: {
        ensureSegmentationVolumeFor3DManipulation: (data: any) => void;
    };
    ensureImageVolumeFor3DManipulation: {
        ensureImageVolumeFor3DManipulation: (data: any) => void;
    };
    circularCursor: {
        calculateCursorGeometry: (enabledElement: any, operationData: import("../BrushStrategy").InitializedOperationData) => void;
        renderCursor: (enabledElement: any, operationData: import("../BrushStrategy").InitializedOperationData, svgDrawingHelper: import("../../../../types").SVGDrawingHelper) => void;
    };
};
export default _default;
