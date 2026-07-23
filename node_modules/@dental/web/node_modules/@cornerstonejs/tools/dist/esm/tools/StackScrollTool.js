import { getEnabledElementByIds, getEnabledElement, VolumeViewport, BaseVolumeViewport, utilities, } from '@cornerstonejs/core';
import { BaseTool } from './base';
class StackScrollTool extends BaseTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            invert: false,
            debounceIfNotLoaded: true,
            loop: false,
        },
    }) {
        super(toolProps, defaultToolProps);
        this.deltaY = 1;
    }
    mouseWheelCallback(evt) {
        this._scroll(evt);
    }
    mouseDragCallback(evt) {
        this._dragCallback(evt);
    }
    touchDragCallback(evt) {
        this._dragCallback(evt);
    }
    _dragCallback(evt) {
        this._scrollDrag(evt);
    }
    _scrollDrag(evt) {
        const { deltaPoints, viewportId, renderingEngineId } = evt.detail;
        const { viewport } = getEnabledElementByIds(viewportId, renderingEngineId);
        const { debounceIfNotLoaded, invert, loop } = this.configuration;
        const deltaPointY = deltaPoints.canvas[1];
        let volumeId;
        if (viewport instanceof VolumeViewport) {
            volumeId = viewport.getVolumeId();
        }
        const pixelsPerImage = this._getPixelPerImage(viewport);
        const deltaY = deltaPointY + this.deltaY;
        if (!pixelsPerImage) {
            return;
        }
        if (Math.abs(deltaY) >= pixelsPerImage) {
            const imageIdIndexOffset = Math.round(deltaY / pixelsPerImage);
            utilities.scroll(viewport, {
                delta: invert ? -imageIdIndexOffset : imageIdIndexOffset,
                volumeId,
                debounceLoading: debounceIfNotLoaded,
                loop: loop,
            });
            this.deltaY = deltaY % pixelsPerImage;
        }
        else {
            this.deltaY = deltaY;
        }
    }
    _scroll(evt) {
        const { wheel, element } = evt.detail;
        const { direction } = wheel;
        const { invert } = this.configuration;
        const { viewport } = getEnabledElement(element);
        const delta = direction * (invert ? -1 : 1);
        utilities.scroll(viewport, {
            delta,
            debounceLoading: this.configuration.debounceIfNotLoaded,
            loop: this.configuration.loop,
            volumeId: viewport instanceof BaseVolumeViewport
                ? viewport.getVolumeId()
                : undefined,
            scrollSlabs: this.configuration.scrollSlabs,
        });
    }
    _getPixelPerImage(viewport) {
        const { element } = viewport;
        const numberOfSlices = viewport.getNumberOfSlices();
        return Math.max(2, element.offsetHeight / Math.max(numberOfSlices, 8));
    }
}
StackScrollTool.toolName = 'StackScroll';
export default StackScrollTool;
