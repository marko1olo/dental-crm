import getDefaultContourConfig from '../../tools/displayTools/Contour/contourConfig';
import getDefaultLabelmapConfig from '../../tools/displayTools/Labelmap/labelmapConfig';
import * as Enums from '../../enums';
import { utilities } from '@cornerstonejs/core';
class SegmentationStyle {
    constructor() {
        this.config = {
            global: {},
            segmentations: {},
            viewportsStyle: {},
        };
    }
    setStyle(specifier, styles, merge = true) {
        const { viewportId, segmentationId, type, segmentIndex } = specifier;
        const currentStyles = this.getStyle(specifier);
        const mergedStyles = merge ? { ...currentStyles, ...styles } : styles;
        let updatedStyles;
        if (!viewportId && !segmentationId) {
            updatedStyles = mergedStyles;
        }
        else if (merge) {
            updatedStyles = this.copyActiveToInactiveIfNotProvided(mergedStyles, type);
        }
        else {
            updatedStyles = mergedStyles;
        }
        if (!type) {
            throw new Error('Type is required to set a style');
        }
        if (viewportId) {
            if (!this.config.viewportsStyle[viewportId]) {
                this.config.viewportsStyle[viewportId] = {
                    renderInactiveSegmentations: false,
                    representations: {},
                };
            }
            const representations = this.config.viewportsStyle[viewportId].representations;
            if (segmentationId) {
                if (!representations[segmentationId]) {
                    representations[segmentationId] = {};
                }
                if (!representations[segmentationId][type]) {
                    representations[segmentationId][type] = {};
                }
                const repConfig = representations[segmentationId][type];
                if (segmentIndex !== undefined) {
                    if (!repConfig.perSegment) {
                        repConfig.perSegment = {};
                    }
                    repConfig.perSegment[segmentIndex] = updatedStyles;
                }
                else {
                    repConfig.allSegments = updatedStyles;
                }
            }
            else {
                const ALL_SEGMENTATIONS_KEY = '__allSegmentations__';
                if (!representations[ALL_SEGMENTATIONS_KEY]) {
                    representations[ALL_SEGMENTATIONS_KEY] = {};
                }
                if (!representations[ALL_SEGMENTATIONS_KEY][type]) {
                    representations[ALL_SEGMENTATIONS_KEY][type] = {};
                }
                representations[ALL_SEGMENTATIONS_KEY][type].allSegments =
                    updatedStyles;
            }
        }
        else if (segmentationId) {
            if (!this.config.segmentations[segmentationId]) {
                this.config.segmentations[segmentationId] = {};
            }
            if (!this.config.segmentations[segmentationId][type]) {
                this.config.segmentations[segmentationId][type] = {};
            }
            const segConfig = this.config.segmentations[segmentationId][type];
            if (segmentIndex !== undefined) {
                if (!segConfig.perSegment) {
                    segConfig.perSegment = {};
                }
                segConfig.perSegment[segmentIndex] = updatedStyles;
            }
            else {
                segConfig.allSegments = updatedStyles;
            }
        }
        else {
            this.config.global[type] = updatedStyles;
        }
    }
    copyActiveToInactiveIfNotProvided(styles, type) {
        const processedStyles = { ...styles };
        if (type === Enums.SegmentationRepresentations.Labelmap) {
            const labelmapStyles = processedStyles;
            labelmapStyles.renderOutlineInactive ??= labelmapStyles.renderOutline;
            labelmapStyles.outlineWidthInactive ??= labelmapStyles.outlineWidth;
            labelmapStyles.renderFillInactive ??= labelmapStyles.renderFill;
            labelmapStyles.fillAlphaInactive ??= labelmapStyles.fillAlpha;
            labelmapStyles.outlineOpacityInactive ??= labelmapStyles.outlineOpacity;
        }
        else if (type === Enums.SegmentationRepresentations.Contour) {
            const contourStyles = processedStyles;
            contourStyles.outlineWidthInactive ??= contourStyles.outlineWidth;
            contourStyles.outlineOpacityInactive ??= contourStyles.outlineOpacity;
            contourStyles.outlineDashInactive ??= contourStyles.outlineDash;
            contourStyles.renderOutlineInactive ??= contourStyles.renderOutline;
            contourStyles.renderFillInactive ??= contourStyles.renderFill;
            contourStyles.fillAlphaInactive ??= contourStyles.fillAlpha;
        }
        return processedStyles;
    }
    getStyle(specifier) {
        const { viewportId, segmentationId, type, segmentIndex } = specifier;
        let combinedStyle = this.getDefaultStyle(type);
        let renderInactiveSegmentations = false;
        if (this.config.global[type]) {
            combinedStyle = {
                ...combinedStyle,
                ...this.config.global[type],
            };
        }
        if (this.config.segmentations[segmentationId]?.[type]) {
            combinedStyle = {
                ...combinedStyle,
                ...this.config.segmentations[segmentationId][type].allSegments,
            };
            if (segmentIndex !== undefined &&
                this.config.segmentations[segmentationId][type].perSegment?.[segmentIndex]) {
                combinedStyle = {
                    ...combinedStyle,
                    ...this.config.segmentations[segmentationId][type].perSegment[segmentIndex],
                };
            }
        }
        if (viewportId && this.config.viewportsStyle[viewportId]) {
            renderInactiveSegmentations =
                this.config.viewportsStyle[viewportId].renderInactiveSegmentations;
            const allSegmentationsKey = '__allSegmentations__';
            if (this.config.viewportsStyle[viewportId].representations[allSegmentationsKey]?.[type]) {
                combinedStyle = {
                    ...combinedStyle,
                    ...this.config.viewportsStyle[viewportId].representations[allSegmentationsKey][type].allSegments,
                };
            }
            if (segmentationId &&
                this.config.viewportsStyle[viewportId].representations[segmentationId]?.[type]) {
                combinedStyle = {
                    ...combinedStyle,
                    ...this.config.viewportsStyle[viewportId].representations[segmentationId][type].allSegments,
                };
                if (segmentIndex !== undefined &&
                    this.config.viewportsStyle[viewportId].representations[segmentationId][type].perSegment?.[segmentIndex]) {
                    combinedStyle = {
                        ...combinedStyle,
                        ...this.config.viewportsStyle[viewportId].representations[segmentationId][type].perSegment[segmentIndex],
                    };
                }
            }
        }
        return combinedStyle;
    }
    getRenderInactiveSegmentations(viewportId) {
        return this.config.viewportsStyle[viewportId]?.renderInactiveSegmentations;
    }
    setRenderInactiveSegmentations(viewportId, renderInactiveSegmentations) {
        if (!this.config.viewportsStyle[viewportId]) {
            this.config.viewportsStyle[viewportId] = {
                renderInactiveSegmentations: false,
                representations: {},
            };
        }
        this.config.viewportsStyle[viewportId].renderInactiveSegmentations =
            renderInactiveSegmentations;
    }
    getDefaultStyle(type) {
        switch (type) {
            case Enums.SegmentationRepresentations.Labelmap:
                return getDefaultLabelmapConfig();
            case Enums.SegmentationRepresentations.Contour:
                return getDefaultContourConfig();
            case Enums.SegmentationRepresentations.Surface:
                return {};
            default:
                throw new Error(`Unknown representation type: ${type}`);
        }
    }
    clearSegmentationStyle(segmentationId) {
        if (this.config.segmentations[segmentationId]) {
            delete this.config.segmentations[segmentationId];
        }
    }
    clearAllSegmentationStyles() {
        this.config.segmentations = {};
    }
    clearViewportStyle(viewportId) {
        if (this.config.viewportsStyle[viewportId]) {
            delete this.config.viewportsStyle[viewportId];
        }
    }
    clearAllViewportStyles() {
        for (const viewportId in this.config.viewportsStyle) {
            const viewportStyle = this.config.viewportsStyle[viewportId];
            const renderInactiveSegmentations = viewportStyle.renderInactiveSegmentations;
            this.config.viewportsStyle[viewportId] = {
                renderInactiveSegmentations,
                representations: {},
            };
        }
    }
    resetToGlobalStyle() {
        this.clearAllSegmentationStyles();
        this.clearAllViewportStyles();
    }
    hasCustomStyle(specifier) {
        const { type } = specifier;
        const style = this.getStyle(specifier);
        const defaultStyle = this.getDefaultStyle(type);
        return !utilities.deepEqual(style, defaultStyle);
    }
}
const segmentationStyle = new SegmentationStyle();
export { segmentationStyle };
