import { vtkOffscreenMultiRenderWindow } from './vtkClasses';
class WebGLContextPool {
    constructor(count) {
        this.contexts = [];
        this.offScreenCanvasContainers = [];
        this.viewportToContext = new Map();
        this.viewportSizes = new Map();
        this.contextMaxSizes = new Map();
        for (let i = 0; i < count; i++) {
            const offscreenMultiRenderWindow = vtkOffscreenMultiRenderWindow.newInstance();
            const container = document.createElement('div');
            offscreenMultiRenderWindow.setContainer(container);
            this.contexts.push(offscreenMultiRenderWindow);
            this.offScreenCanvasContainers.push(container);
        }
    }
    getContextByIndex(index) {
        if (index >= 0 && index < this.contexts.length) {
            return {
                context: this.contexts[index],
                container: this.offScreenCanvasContainers[index],
            };
        }
        return null;
    }
    assignViewportToContext(viewportId, contextIndex) {
        this.viewportToContext.set(viewportId, contextIndex);
    }
    getContextIndexForViewport(viewportId) {
        return this.viewportToContext.get(viewportId);
    }
    getAllContexts() {
        return this.contexts;
    }
    getContextCount() {
        return this.contexts.length;
    }
    updateViewportSize(viewportId, width, height) {
        const contextIndex = this.viewportToContext.get(viewportId);
        if (contextIndex === undefined) {
            return false;
        }
        this.viewportSizes.set(viewportId, { width, height });
        const previousMax = this.contextMaxSizes.get(contextIndex);
        const newMax = this.calculateMaxSizeForContext(contextIndex);
        this.contextMaxSizes.set(contextIndex, newMax);
        return (!previousMax ||
            previousMax.width !== newMax.width ||
            previousMax.height !== newMax.height);
    }
    getMaxSizeForContext(contextIndex) {
        return this.contextMaxSizes.get(contextIndex);
    }
    calculateMaxSizeForContext(contextIndex) {
        let maxWidth = 0;
        let maxHeight = 0;
        this.viewportToContext.forEach((assignedContext, viewportId) => {
            if (assignedContext === contextIndex) {
                const size = this.viewportSizes.get(viewportId);
                if (size) {
                    maxWidth = Math.max(maxWidth, size.width);
                    maxHeight = Math.max(maxHeight, size.height);
                }
            }
        });
        return {
            width: maxWidth,
            height: maxHeight,
        };
    }
    removeViewport(viewportId) {
        const contextIndex = this.viewportToContext.get(viewportId);
        this.viewportToContext.delete(viewportId);
        this.viewportSizes.delete(viewportId);
        if (contextIndex !== undefined) {
            const newMax = this.calculateMaxSizeForContext(contextIndex);
            this.contextMaxSizes.set(contextIndex, newMax);
        }
    }
    destroy() {
        this.contexts.forEach((context) => {
            context.delete();
        });
        this.contexts = [];
        this.offScreenCanvasContainers = [];
        this.viewportToContext.clear();
        this.viewportSizes.clear();
        this.contextMaxSizes.clear();
    }
}
export default WebGLContextPool;
