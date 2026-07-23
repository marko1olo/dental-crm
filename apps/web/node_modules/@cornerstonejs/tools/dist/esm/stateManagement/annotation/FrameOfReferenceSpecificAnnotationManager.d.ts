import type { Annotation, Annotations, AnnotationState, GroupSpecificAnnotations } from '../../types/AnnotationTypes';
import type { AnnotationGroupSelector, IAnnotationManager } from '../../types';
import type { Types } from '@cornerstonejs/core';
declare class FrameOfReferenceSpecificAnnotationManager implements IAnnotationManager {
    private annotations;
    readonly uid: string;
    private preprocessingFn;
    constructor(uid?: string);
    getGroupKey: (annotationGroupSelector: AnnotationGroupSelector) => string;
    _imageVolumeModifiedHandler: (evt: Types.EventTypes.ImageVolumeModifiedEvent) => void;
    getFramesOfReference: () => Array<string>;
    getAnnotations: (groupKey: string, toolName?: string) => GroupSpecificAnnotations | Annotations;
    getAnnotation: (annotationUID: string) => Annotation | undefined;
    getNumberOfAnnotations: (groupKey: string, toolName?: string) => number;
    addAnnotation: (annotation: Annotation, groupKey?: string) => void;
    removeAnnotation: (annotationUID: string) => void;
    removeAnnotations: (groupKey: string, toolName?: string) => Annotations;
    saveAnnotations: (groupKey?: string, toolName?: string) => AnnotationState | GroupSpecificAnnotations | Annotations;
    restoreAnnotations: (state: AnnotationState | GroupSpecificAnnotations | Annotations, groupKey?: string, toolName?: string) => void;
    getAllAnnotations: () => Annotations;
    getNumberOfAllAnnotations: () => number;
    removeAllAnnotations: () => Annotations;
    setPreprocessingFn(preprocessingFn: (annotation: Annotation) => Annotation): void;
}
declare const defaultFrameOfReferenceSpecificAnnotationManager: FrameOfReferenceSpecificAnnotationManager;
export { defaultFrameOfReferenceSpecificAnnotationManager };
export default FrameOfReferenceSpecificAnnotationManager;
