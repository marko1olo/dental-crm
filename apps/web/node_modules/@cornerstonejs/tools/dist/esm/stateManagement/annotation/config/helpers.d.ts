import type { StyleSpecifier } from '../../../types/AnnotationStyle';
import type { ToolModes, AnnotationStyleStates } from '../../../enums';
declare function getStyleProperty(property: string, styleSpecifier: StyleSpecifier, state?: AnnotationStyleStates, mode?: ToolModes): string;
export { getStyleProperty };
