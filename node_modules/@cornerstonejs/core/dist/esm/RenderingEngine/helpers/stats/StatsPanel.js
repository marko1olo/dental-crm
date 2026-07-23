import { PANEL_CONFIG } from './constants';
export class StatsPanel {
    constructor(name, foregroundColor, backgroundColor) {
        this.minValue = Infinity;
        this.maxValue = 0;
        this.name = name;
        this.foregroundColor = foregroundColor;
        this.backgroundColor = backgroundColor;
        this.devicePixelRatio = Math.round(window.devicePixelRatio || 1);
        this.dimensions = this.calculateDimensions();
        this.dom = this.createCanvas();
        this.context = this.initializeContext();
        this.drawInitialPanel();
    }
    update(value, maxValue) {
        this.updateMinMax(value);
        this.clearTextArea();
        this.drawText(value);
        this.scrollGraph();
        this.drawNewValue(value, maxValue);
    }
    calculateDimensions() {
        const pr = this.devicePixelRatio;
        return {
            width: PANEL_CONFIG.WIDTH * pr,
            height: PANEL_CONFIG.HEIGHT * pr,
            textX: PANEL_CONFIG.TEXT_PADDING * pr,
            textY: PANEL_CONFIG.TEXT_Y_OFFSET * pr,
            graphX: PANEL_CONFIG.TEXT_PADDING * pr,
            graphY: PANEL_CONFIG.GRAPH_Y_OFFSET * pr,
            graphWidth: PANEL_CONFIG.GRAPH_WIDTH * pr,
            graphHeight: PANEL_CONFIG.GRAPH_HEIGHT * pr,
        };
    }
    createCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = this.dimensions.width;
        canvas.height = this.dimensions.height;
        canvas.style.cssText = `width:${PANEL_CONFIG.WIDTH}px;height:${PANEL_CONFIG.HEIGHT}px`;
        return canvas;
    }
    initializeContext() {
        const ctx = this.dom.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context');
        }
        ctx.font = `bold ${PANEL_CONFIG.FONT_SIZE * this.devicePixelRatio}px ${PANEL_CONFIG.FONT_FAMILY}`;
        ctx.textBaseline = 'top';
        return ctx;
    }
    drawInitialPanel() {
        const { width, height, textX, textY, graphX, graphY, graphWidth, graphHeight, } = this.dimensions;
        this.context.fillStyle = this.backgroundColor;
        this.context.fillRect(0, 0, width, height);
        this.context.fillStyle = this.foregroundColor;
        this.context.fillText(this.name, textX, textY);
        this.context.fillRect(graphX, graphY, graphWidth, graphHeight);
        this.context.fillStyle = this.backgroundColor;
        this.context.globalAlpha = PANEL_CONFIG.GRAPH_ALPHA;
        this.context.fillRect(graphX, graphY, graphWidth, graphHeight);
        this.context.globalAlpha = 1;
    }
    updateMinMax(value) {
        this.minValue = Math.min(this.minValue, value);
        this.maxValue = Math.max(this.maxValue, value);
    }
    clearTextArea() {
        const { width, graphY } = this.dimensions;
        this.context.fillStyle = this.backgroundColor;
        this.context.fillRect(0, 0, width, graphY);
    }
    drawText(value) {
        const { textX, textY } = this.dimensions;
        const text = this.formatText(value);
        this.context.fillStyle = this.foregroundColor;
        this.context.fillText(text, textX, textY);
    }
    formatText(value) {
        const roundedValue = Math.round(value);
        const roundedMin = Math.round(this.minValue);
        const roundedMax = Math.round(this.maxValue);
        return `${roundedValue} ${this.name} (${roundedMin}-${roundedMax})`;
    }
    scrollGraph() {
        const { graphX, graphY, graphWidth, graphHeight } = this.dimensions;
        const pr = this.devicePixelRatio;
        this.context.drawImage(this.dom, graphX + pr, graphY, graphWidth - pr, graphHeight, graphX, graphY, graphWidth - pr, graphHeight);
    }
    drawNewValue(value, maxValue) {
        const { graphX, graphY, graphWidth, graphHeight } = this.dimensions;
        const pr = this.devicePixelRatio;
        const x = graphX + graphWidth - pr;
        this.context.fillStyle = this.foregroundColor;
        this.context.fillRect(x, graphY, pr, graphHeight);
        const normalizedHeight = Math.round((1 - value / maxValue) * graphHeight);
        this.context.fillStyle = this.backgroundColor;
        this.context.globalAlpha = PANEL_CONFIG.GRAPH_ALPHA;
        this.context.fillRect(x, graphY, pr, normalizedHeight);
        this.context.globalAlpha = 1;
    }
}
