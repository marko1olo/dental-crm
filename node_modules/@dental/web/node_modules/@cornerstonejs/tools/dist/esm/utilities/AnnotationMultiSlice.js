import { triggerEvent, eventTarget } from '@cornerstonejs/core';
import Events from '../enums/Events';
import { ChangeTypes } from '../enums';
export default class AnnotationMultiSlice {
    static setStartRange(viewport, annotation, startRange = viewport.getCurrentImageIdIndex()) {
        this.setRange(viewport, annotation, startRange);
    }
    static setEndRange(viewport, annotation, endRange = viewport.getCurrentImageIdIndex()) {
        this.setRange(viewport, annotation, undefined, endRange);
    }
    static setRange(viewport, annotation, startRange, endRange) {
        const { metadata } = annotation;
        if (startRange === undefined) {
            startRange = metadata.sliceIndex < endRange ? metadata.sliceIndex : 0;
            if (endRange === undefined) {
                endRange = viewport.getNumberOfSlices() - 1;
            }
        }
        const rangeEndSliceIndex = viewport.getSliceIndexForImage(metadata.multiSliceReference);
        if (endRange === undefined) {
            endRange =
                rangeEndSliceIndex >= startRange
                    ? rangeEndSliceIndex
                    : viewport.getNumberOfSlices() - 1;
        }
        endRange = Math.max(startRange, endRange);
        metadata.sliceIndex = Math.min(startRange, endRange);
        metadata.referencedImageId = viewport.getCurrentImageId(metadata.sliceIndex);
        metadata.referencedImageURI = undefined;
        if (endRange === metadata.sliceIndex) {
            metadata.multiSliceReference = undefined;
        }
        else if (endRange !== metadata.multiSliceReference?.sliceIndex) {
            metadata.multiSliceReference = {
                referencedImageId: viewport.getCurrentImageId(endRange),
                sliceIndex: endRange,
            };
        }
        const eventDetail = {
            viewportId: viewport.id,
            renderingEngineId: viewport.renderingEngineId,
            changeType: ChangeTypes.MetadataReferenceModified,
            annotation,
        };
        triggerEvent(eventTarget, Events.ANNOTATION_MODIFIED, eventDetail);
        this.setViewportFrameRange(viewport, metadata);
    }
    static setSingle(viewport, annotation, current = viewport.getCurrentImageIdIndex()) {
        this.setRange(viewport, annotation, current, current);
    }
    static getFrameRange(annotation) {
        const { metadata } = annotation;
        const { sliceIndex, multiSliceReference } = metadata;
        const rangeEndSliceIndex = multiSliceReference?.sliceIndex;
        return rangeEndSliceIndex
            ? [sliceIndex + 1, rangeEndSliceIndex + 1]
            : sliceIndex + 1;
    }
    static getFrameRangeStr(annotation) {
        const range = this.getFrameRange(annotation);
        return Array.isArray(range) ? `${range[0]}-${range[1]}` : String(range);
    }
    static setViewportFrameRange(viewport, specifier) {
        if (viewport.setFrameRange && specifier.multiSliceReference?.sliceIndex) {
            viewport.setFrameRange(specifier.sliceIndex + 1, specifier.multiSliceReference.sliceIndex + 1);
        }
    }
}
