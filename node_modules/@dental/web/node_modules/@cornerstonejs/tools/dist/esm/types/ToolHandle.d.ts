import type { Types } from '@cornerstonejs/core';
type AnnotationHandle = Types.Point3;
type TextBoxHandle = {
    hasMoved: boolean;
    worldBoundingBox: {
        bottomLeft: Types.Point3;
        bottomRight: Types.Point3;
        topLeft: Types.Point3;
        topRight: Types.Point3;
    };
    worldPosition: Types.Point3;
};
type ToolHandle = AnnotationHandle | TextBoxHandle;
export type { AnnotationHandle, TextBoxHandle };
export type { ToolHandle as default };
