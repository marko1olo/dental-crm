import type { Types } from '@cornerstonejs/core';
export default function normalizeViewportPlane(viewport: Types.IViewport, boundsIJK: Types.BoundsIJK): {
    toIJK: any;
    boundsIJKPrime: any;
    fromIJK: any;
    error: string;
} | {
    boundsIJKPrime: any;
    toIJK: (ijkPrime: any) => any;
    fromIJK: (ijk: any) => any;
    type: string;
    error?: undefined;
} | {
    boundsIJKPrime: any;
    toIJK: ([j, k, i]: [any, any, any]) => any[];
    fromIJK: ([i, j, k]: [any, any, any]) => any[];
    type: string;
    error?: undefined;
};
