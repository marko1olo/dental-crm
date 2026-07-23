declare function setAnnotationVisibility(annotationUID: string, visible?: boolean): void;
declare function showAllAnnotations(): void;
declare function isAnnotationVisible(annotationUID: string): boolean | undefined;
declare function checkAndSetAnnotationVisibility(annotationUID: string): boolean;
export { setAnnotationVisibility, showAllAnnotations, isAnnotationVisible, checkAndSetAnnotationVisibility, };
