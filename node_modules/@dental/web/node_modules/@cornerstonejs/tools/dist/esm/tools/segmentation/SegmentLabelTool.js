import { getEnabledElement } from '@cornerstonejs/core';
import { config as segmentationConfig } from '../../stateManagement/segmentation';
import { BaseTool } from '../base';
import { triggerSegmentationModified } from '../../stateManagement/segmentation/triggerSegmentationEvents';
import triggerAnnotationRenderForViewportIds from '../../utilities/triggerAnnotationRenderForViewportIds';
import { getActiveSegmentation } from '../../stateManagement/segmentation/activeSegmentation';
import { getSegmentIndexAtWorldPoint } from '../../utilities/segmentation';
import { state } from '../../store/state';
import { drawTextBox as drawTextBoxSvg } from '../../drawingSvg';
class SegmentLabelTool extends BaseTool {
    constructor(toolProps = {
        data: {
            handles: {
                textBox: {
                    worldPosition: [0, 0, 0],
                    worldBoundingBox: {
                        topLeft: [0, 0, 0],
                        topRight: [0, 0, 0],
                        bottomLeft: [0, 0, 0],
                        bottomRight: [0, 0, 0],
                    },
                },
            },
        },
    }, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            hoverTimeout: 100,
            searchRadius: 6,
            color: null,
            background: null,
        },
    }) {
        super(toolProps, defaultToolProps);
        this.mouseMoveCallback = (evt) => {
            if (this.hoverTimer) {
                clearTimeout(this.hoverTimer);
            }
            this.hoverTimer = setTimeout(() => {
                this._setHoveredSegment(evt);
                this.hoverTimer = null;
            }, this.configuration.hoverTimeout);
            return true;
        };
        this.onSetToolEnabled = () => {
            this.onSetToolActive();
        };
        this.onSetToolActive = () => {
            this.hoverTimer = null;
        };
        this.onSetToolDisabled = () => {
            this.hoverTimer = null;
        };
        this.data = toolProps.data ?? {
            handles: {
                textBox: {
                    worldPosition: [0, 0, 0],
                    worldBoundingBox: {
                        topLeft: [0, 0, 0],
                        topRight: [0, 0, 0],
                        bottomLeft: [0, 0, 0],
                        bottomRight: [0, 0, 0],
                    },
                },
            },
        };
        this.hoverTimer = null;
    }
    _setHoveredSegment(evt = {}) {
        if (state.isInteractingWithTool) {
            return;
        }
        const { element, currentPoints } = evt.detail;
        const worldPoint = currentPoints.world;
        const enabledElement = getEnabledElement(element);
        if (!enabledElement) {
            return;
        }
        const { viewport } = enabledElement;
        const activeSegmentation = getActiveSegmentation(viewport.id);
        if (!activeSegmentation) {
            return;
        }
        this._setHoveredSegmentForType(activeSegmentation, worldPoint, viewport);
    }
    _setHoveredSegmentForType(activeSegmentation, worldPoint, viewport) {
        const imageDataInfo = viewport.getImageData();
        if (!imageDataInfo) {
            return;
        }
        const { segmentationId } = activeSegmentation;
        const hoveredSegmentIndex = getSegmentIndexAtWorldPoint(segmentationId, worldPoint, {
            viewport,
        });
        const segment = activeSegmentation.segments[hoveredSegmentIndex];
        const color = this.configuration.color ??
            segmentationConfig.color.getSegmentIndexColor(viewport.id, segmentationId, hoveredSegmentIndex);
        const label = segment?.label;
        const canvasCoordinates = viewport.worldToCanvas(worldPoint);
        this._editData = {
            hoveredSegmentIndex,
            hoveredSegmentLabel: label,
            canvasCoordinates,
            color,
        };
        if (!hoveredSegmentIndex || hoveredSegmentIndex === 0) {
            return;
        }
        const renderingEngine = viewport.getRenderingEngine();
        const viewportIds = renderingEngine.getViewports().map((v) => v.id);
        triggerSegmentationModified(segmentationId);
        triggerAnnotationRenderForViewportIds(viewportIds);
    }
    renderAnnotation(enabledElement, svgDrawingHelper) {
        if (!this._editData) {
            return;
        }
        const { viewport } = enabledElement;
        const { hoveredSegmentIndex, hoveredSegmentLabel, canvasCoordinates, color, } = this._editData;
        if (!hoveredSegmentIndex) {
            return;
        }
        const offset = -15;
        const textBoxPosition = [
            canvasCoordinates[0] + offset,
            canvasCoordinates[1] + offset,
        ];
        const boundingBox = drawTextBoxSvg(svgDrawingHelper, 'segmentSelectLabelAnnotation', 'segmentSelectLabelTextBox', [hoveredSegmentLabel ?? '(unnamed segment)'], textBoxPosition, {
            color: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`,
            background: this.configuration.background ?? undefined,
        });
        const left = canvasCoordinates[0];
        const top = canvasCoordinates[1];
        const { width, height } = boundingBox;
        this.data.handles.textBox.worldBoundingBox = {
            topLeft: viewport.canvasToWorld([left, top]),
            topRight: viewport.canvasToWorld([left + width, top]),
            bottomLeft: viewport.canvasToWorld([left, top + height]),
            bottomRight: viewport.canvasToWorld([left + width, top + height]),
        };
    }
}
SegmentLabelTool.toolName = 'SegmentLabelTool';
export default SegmentLabelTool;
