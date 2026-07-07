import { utilities } from '@cornerstonejs/core';
import normalizeViewportPlane from '../normalizeViewportPlane';
const { RLEVoxelMap, VoxelManager } = utilities;
const MAX_IMAGE_SIZE = 65535;
export var SegmentationEnum;
(function (SegmentationEnum) {
    SegmentationEnum[SegmentationEnum["SEGMENT"] = -1] = "SEGMENT";
    SegmentationEnum[SegmentationEnum["ISLAND"] = -2] = "ISLAND";
    SegmentationEnum[SegmentationEnum["INTERIOR"] = -3] = "INTERIOR";
    SegmentationEnum[SegmentationEnum["EXTERIOR"] = -4] = "EXTERIOR";
    SegmentationEnum[SegmentationEnum["INTERIOR_SMALL"] = -5] = "INTERIOR_SMALL";
    SegmentationEnum[SegmentationEnum["INTERIOR_TEST"] = -6] = "INTERIOR_TEST";
})(SegmentationEnum || (SegmentationEnum = {}));
export default class IslandRemoval {
    constructor(options) {
        this.fillInternalEdge = false;
        this.maxInternalRemove = 128;
        this.maxInternalRemove =
            options?.maxInternalRemove ?? this.maxInternalRemove;
        this.fillInternalEdge = options?.fillInternalEdge ?? this.fillInternalEdge;
    }
    initialize(viewport, segmentationVoxels, options) {
        const hasSource = !!segmentationVoxels.sourceVoxelManager;
        const segmentationVoxelManager = hasSource
            ? segmentationVoxels.sourceVoxelManager
            : segmentationVoxels;
        const previewVoxelManager = hasSource
            ? segmentationVoxels
            : VoxelManager.createRLEHistoryVoxelManager(segmentationVoxelManager);
        const { segmentIndex = 1, previewSegmentIndex = 1 } = options;
        const clickedPoints = options.points || segmentationVoxelManager.getPoints();
        if (!clickedPoints?.length) {
            return;
        }
        const boundsIJK = segmentationVoxelManager
            .getBoundsIJK()
            .map((bound, i) => [
            Math.min(bound[0], ...clickedPoints.map((point) => point[i])),
            Math.max(bound[1], ...clickedPoints.map((point) => point[i])),
        ]);
        if (boundsIJK.find((it) => it[0] < 0 || it[1] > MAX_IMAGE_SIZE)) {
            return;
        }
        const { toIJK, fromIJK, boundsIJKPrime, error } = normalizeViewportPlane(viewport, boundsIJK);
        if (error) {
            console.warn('Not performing island removal for planes not orthogonal to acquisition plane', error);
            return;
        }
        const [width, height, depth] = fromIJK(segmentationVoxelManager.dimensions);
        const segmentSet = new RLEVoxelMap(width, height, depth);
        const getter = (i, j, k) => {
            const index = segmentationVoxelManager.toIndex(toIJK([i, j, k]));
            const oldVal = segmentationVoxelManager.getAtIndex(index);
            if (oldVal === previewSegmentIndex || oldVal === segmentIndex) {
                return SegmentationEnum.SEGMENT;
            }
        };
        segmentSet.fillFrom(getter, boundsIJKPrime);
        segmentSet.normalizer = { toIJK, fromIJK, boundsIJKPrime };
        this.segmentSet = segmentSet;
        this.previewVoxelManager = previewVoxelManager;
        this.segmentIndex = segmentIndex;
        this.previewSegmentIndex = previewSegmentIndex ?? segmentIndex;
        this.selectedPoints = clickedPoints;
        return true;
    }
    floodFillSegmentIsland() {
        const { selectedPoints: clickedPoints, segmentSet } = this;
        let floodedCount = 0;
        const { fromIJK } = segmentSet.normalizer;
        clickedPoints.forEach((clickedPoint) => {
            const ijkPrime = fromIJK(clickedPoint);
            const index = segmentSet.toIndex(ijkPrime);
            const [iPrime, jPrime, kPrime] = ijkPrime;
            if (segmentSet.get(index) === SegmentationEnum.SEGMENT) {
                floodedCount += segmentSet.floodFill(iPrime, jPrime, kPrime, SegmentationEnum.ISLAND);
            }
        });
        return floodedCount;
    }
    removeExternalIslands() {
        const { previewVoxelManager, segmentSet } = this;
        const { toIJK } = segmentSet.normalizer;
        const callback = (index, rle) => {
            const [, jPrime, kPrime] = segmentSet.toIJK(index);
            if (rle.value !== SegmentationEnum.ISLAND) {
                for (let iPrime = rle.start; iPrime < rle.end; iPrime++) {
                    const clearPoint = toIJK([iPrime, jPrime, kPrime]);
                    const v = previewVoxelManager.getAtIJKPoint(clearPoint);
                    previewVoxelManager.setAtIJKPoint(clearPoint, v === undefined ? 0 : null);
                }
            }
        };
        segmentSet.forEach(callback, { rowModified: true });
    }
    removeInternalIslands() {
        const { segmentSet, previewVoxelManager, previewSegmentIndex } = this;
        const { height, normalizer, width } = segmentSet;
        const { toIJK } = normalizer;
        segmentSet.forEachRow((baseIndex, row) => {
            let lastRle;
            for (const rle of [...row]) {
                if (rle.value !== SegmentationEnum.ISLAND) {
                    continue;
                }
                if (!lastRle) {
                    if (this.fillInternalEdge && rle.start > 0) {
                        for (let iPrime = 0; iPrime < rle.start; iPrime++) {
                            segmentSet.set(baseIndex + iPrime, SegmentationEnum.INTERIOR);
                        }
                    }
                    lastRle = rle;
                    continue;
                }
                for (let iPrime = lastRle.end; iPrime < rle.start; iPrime++) {
                    segmentSet.set(baseIndex + iPrime, SegmentationEnum.INTERIOR);
                }
                lastRle = rle;
            }
            if (this.fillInternalEdge && lastRle?.end < width) {
                for (let iPrime = lastRle.end; iPrime < width; iPrime++) {
                    segmentSet.set(baseIndex + iPrime, SegmentationEnum.INTERIOR);
                }
            }
        });
        segmentSet.forEach((baseIndex, rle) => {
            if (rle.value !== SegmentationEnum.INTERIOR) {
                return;
            }
            const [, jPrime, kPrime] = segmentSet.toIJK(baseIndex);
            const rowPrev = jPrime > 0 ? segmentSet.getRun(jPrime - 1, kPrime) : null;
            const rowNext = jPrime + 1 < height ? segmentSet.getRun(jPrime + 1, kPrime) : null;
            const isLast = jPrime === height - 1;
            const isFirst = jPrime === 0;
            const prevCovers = IslandRemoval.covers(rle, rowPrev) ||
                (isFirst && this.fillInternalEdge);
            const nextCovers = IslandRemoval.covers(rle, rowNext) || (isLast && this.fillInternalEdge);
            if (rle.end - rle.start > 2 && (!prevCovers || !nextCovers)) {
                segmentSet.floodFill(rle.start, jPrime, kPrime, SegmentationEnum.EXTERIOR, { singlePlane: true });
            }
        });
        segmentSet.forEach((baseIndex, rle) => {
            if (rle.value !== SegmentationEnum.INTERIOR) {
                return;
            }
            const [, jPrime, kPrime] = segmentSet.toIJK(baseIndex);
            const size = segmentSet.floodFill(rle.start, jPrime, kPrime, SegmentationEnum.INTERIOR_TEST);
            const isBig = size > this.maxInternalRemove;
            const newType = isBig
                ? SegmentationEnum.EXTERIOR
                : SegmentationEnum.INTERIOR_SMALL;
            segmentSet.floodFill(rle.start, jPrime, kPrime, newType);
        });
        segmentSet.forEach((baseIndex, rle) => {
            if (rle.value !== SegmentationEnum.INTERIOR_SMALL) {
                return;
            }
            for (let iPrime = rle.start; iPrime < rle.end; iPrime++) {
                const clearPoint = toIJK(segmentSet.toIJK(baseIndex + iPrime));
                previewVoxelManager.setAtIJKPoint(clearPoint, previewSegmentIndex);
            }
        });
        return previewVoxelManager.getArrayOfModifiedSlices();
    }
    static covers(rle, row) {
        if (!row) {
            return false;
        }
        let { start } = rle;
        const { end } = rle;
        for (const rowRle of row) {
            if (start >= rowRle.start && start < rowRle.end) {
                start = rowRle.end;
                if (start >= end) {
                    return true;
                }
            }
        }
        return false;
    }
}
