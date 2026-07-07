import type { Panel } from './types';
export declare class StatsPanel implements Panel {
    dom: HTMLCanvasElement;
    private context;
    private minValue;
    private maxValue;
    private readonly name;
    private readonly foregroundColor;
    private readonly backgroundColor;
    private readonly devicePixelRatio;
    private readonly dimensions;
    constructor(name: string, foregroundColor: string, backgroundColor: string);
    update(value: number, maxValue: number): void;
    private calculateDimensions;
    private createCanvas;
    private initializeContext;
    private drawInitialPanel;
    private updateMinMax;
    private clearTextArea;
    private drawText;
    private formatText;
    private scrollGraph;
    private drawNewValue;
}
