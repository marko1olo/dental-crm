import type { Types } from '@cornerstonejs/core';
import { BaseTool } from './base';
import type { EventTypes, PublicToolProps, ToolProps, SVGDrawingHelper } from '../types';
import type { ISculptToolShape } from '../types/ISculptToolShape';
export type Contour = {
    annotationUID: string;
    points: Array<Types.Point3>;
};
export type SculptData = {
    mousePoint: Types.Point3;
    mouseCanvasPoint: Types.Point2;
    points: Array<Types.Point3>;
    maxSpacing: number;
    element: HTMLDivElement;
    contours: Contour[];
};
export type SculptIntersect = {
    annotationUID: string;
    isEnter: boolean;
    index: number;
    relIndex?: number;
    point: Types.Point3;
    angle: number;
};
export type ContourSelection = Array<SculptIntersect>;
declare class SculptorTool extends BaseTool {
    static toolName: string;
    registeredShapes: Map<any, any>;
    private isActive;
    private selectedShape;
    private commonData;
    private sculptData?;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    registerShapes<T extends ISculptToolShape>(shapeName: string, shapeClass: new () => T): void;
    preMouseDownCallback: (evt: EventTypes.InteractionEventType) => boolean;
    mouseMoveCallback: (evt: EventTypes.InteractionEventType) => void;
    protected sculpt(eventData: any, points: Array<Types.Point3>): void;
    intersect(viewport: Types.IViewport, cursorShape: any): SculptIntersect[];
    interpolatePoints(viewport: any, enter: any, exit: any, existing: any, newPoints: any): void;
    getContourSelections(intersections: any, pointLength: any): ContourSelection[];
    findMergeable(contours: any, testIntersection: any, currentIndex: any): any;
    findNext(intersections: any, lastAngle: any, isEnter?: boolean): any;
    protected interpolatePointsWithinMaxSpacing(i: number, points: Array<Types.Point3>, indicesToInsertAfter: Array<number>, maxSpacing: number): void;
    private updateCursor;
    protected getToolInstance(element: HTMLDivElement): any;
    private filterSculptableAnnotationsForElement;
    private configureToolSize;
    private selectFreehandTool;
    private getClosestFreehandToolOnElement;
    private endCallback;
    private dragCallback;
    protected activateModify(element: HTMLDivElement): void;
    protected deactivateModify(element: HTMLDivElement): void;
    setToolShape(toolShape: string): void;
    renderAnnotation(enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper): void;
}
export declare const contourIndex: (i: number, length: number) => number;
export default SculptorTool;
