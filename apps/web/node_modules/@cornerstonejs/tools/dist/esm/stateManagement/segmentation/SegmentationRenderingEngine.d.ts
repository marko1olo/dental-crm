declare class SegmentationRenderingEngine {
    private _needsRender;
    private _pendingRenderQueue;
    private _animationFrameSet;
    private _animationFrameHandle;
    hasBeenDestroyed: boolean;
    renderSegmentationsForViewport(viewportId?: string): void;
    renderSegmentation(segmentationId: string): void;
    _getAllViewports: () => import("@cornerstonejs/core").Viewport[];
    _getViewportIdsForSegmentation(segmentationId?: string): string[];
    private _throwIfDestroyed;
    private _setViewportsToBeRenderedNextFrame;
    private _render;
    private _renderFlaggedSegmentations;
    _triggerRender(viewportId?: string): void;
    _addPlanarFreeHandToolIfAbsent(viewport: any): void;
}
declare function triggerSegmentationRender(viewportId?: string): void;
declare function triggerSegmentationRenderBySegmentationId(segmentationId?: string): void;
declare const segmentationRenderingEngine: SegmentationRenderingEngine;
export { triggerSegmentationRender, triggerSegmentationRenderBySegmentationId, segmentationRenderingEngine, };
