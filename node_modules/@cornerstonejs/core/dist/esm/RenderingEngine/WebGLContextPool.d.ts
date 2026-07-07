import type { VtkOffscreenMultiRenderWindow } from '../types';
declare class WebGLContextPool {
    private contexts;
    private offScreenCanvasContainers;
    private viewportToContext;
    private viewportSizes;
    private contextMaxSizes;
    constructor(count: number);
    getContextByIndex(index: number): {
        context: VtkOffscreenMultiRenderWindow;
        container: HTMLDivElement;
    } | null;
    assignViewportToContext(viewportId: string, contextIndex: number): void;
    getContextIndexForViewport(viewportId: string): number | undefined;
    getAllContexts(): VtkOffscreenMultiRenderWindow[];
    getContextCount(): number;
    updateViewportSize(viewportId: string, width: number, height: number): boolean;
    getMaxSizeForContext(contextIndex: number): {
        width: number;
        height: number;
    };
    private calculateMaxSizeForContext;
    removeViewport(viewportId: string): void;
    destroy(): void;
}
export default WebGLContextPool;
