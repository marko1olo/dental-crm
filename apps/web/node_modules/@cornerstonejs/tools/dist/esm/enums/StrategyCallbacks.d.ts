declare enum StrategyCallbacks {
    CalculateCursorGeometry = "calculateCursorGeometry",
    RenderCursor = "renderCursor",
    OnInteractionStart = "onInteractionStart",
    OnInteractionEnd = "onInteractionEnd",
    Preview = "preview",
    RejectPreview = "rejectPreview",
    AcceptPreview = "acceptPreview",
    Fill = "fill",
    Interpolate = "interpolate",
    StrategyFunction = "strategyFunction",
    CreateIsInThreshold = "createIsInThreshold",
    Initialize = "initialize",
    INTERNAL_setValue = "setValue",
    AddPreview = "addPreview",
    ComputeInnerCircleRadius = "computeInnerCircleRadius",
    GetStatistics = "getStatistics",
    EnsureImageVolumeFor3DManipulation = "ensureImageVolumeFor3DManipulation",
    EnsureSegmentationVolumeFor3DManipulation = "ensureSegmentationVolumeFor3DManipulation"
}
export default StrategyCallbacks;
