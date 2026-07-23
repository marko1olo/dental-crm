import { type Types } from '@cornerstonejs/core';
export declare const EPSILON = 1e-7;
export declare function vec2CrossZ(a: Types.Point2, b: Types.Point2): number;
export declare function pointsAreEqual(p1: Types.Point2, p2: Types.Point2): boolean;
export declare function robustSegmentIntersection(p1: Types.Point2, p2: Types.Point2, q1: Types.Point2, q2: Types.Point2): Types.Point2 | null;
export declare enum PolylineNodeType {
    Vertex = 0,
    Intersection = 1
}
export declare enum IntersectionDirection {
    Entering = 0,
    Exiting = 1,
    Unknown = 2
}
export interface AugmentedPolyNode {
    id: string;
    coordinates: Types.Point2;
    type: PolylineNodeType;
    originalPolyIndex: 0 | 1;
    originalVertexIndex?: number;
    next: AugmentedPolyNode;
    prev: AugmentedPolyNode;
    isIntersection: boolean;
    partnerNode?: AugmentedPolyNode;
    intersectionDir?: IntersectionDirection;
    intersectionInfo?: IntersectionInfo;
    alpha?: number;
    processedInPath?: boolean;
    visited: boolean;
}
export type IntersectionInfo = {
    coord: Types.Point2;
    seg1Idx: number;
    seg2Idx: number;
    alpha1: number;
    alpha2: number;
};
