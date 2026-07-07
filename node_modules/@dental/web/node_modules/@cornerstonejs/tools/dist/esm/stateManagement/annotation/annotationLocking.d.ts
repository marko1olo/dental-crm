declare function setAnnotationLocked(annotationUID: string, locked?: boolean): void;
declare function unlockAllAnnotations(): void;
declare function getAnnotationsLocked(): Array<string>;
declare function isAnnotationLocked(annotationUID: string): boolean;
declare function getAnnotationsLockedCount(): number;
declare function checkAndSetAnnotationLocked(annotationUID: string): boolean;
export { setAnnotationLocked, getAnnotationsLocked, getAnnotationsLockedCount, unlockAllAnnotations, isAnnotationLocked, checkAndSetAnnotationLocked, };
