import type AnnotationGroupSelector from './AnnotationGroupSelector';
import type { Annotation, Annotations, GroupSpecificAnnotations } from './AnnotationTypes';
interface IAnnotationManager {
    getGroupKey: (annotationGroupSelector: AnnotationGroupSelector) => string;
    addAnnotation: (annotation: Annotation, groupKey: string) => void;
    getAnnotations: (groupKey: string, toolName?: string) => GroupSpecificAnnotations | Annotations;
    getAnnotation: (annotationUID: string) => Annotation;
    removeAnnotation: (annotationUID: string) => void;
    removeAnnotations: (groupKey: string) => void;
    removeAllAnnotations: () => void;
    getNumberOfAnnotations: (groupKey: string, toolName?: string) => number;
    getNumberOfAllAnnotations: () => number;
}
export type { IAnnotationManager as default };
