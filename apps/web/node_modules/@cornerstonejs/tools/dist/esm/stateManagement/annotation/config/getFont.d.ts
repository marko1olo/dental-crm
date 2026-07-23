import type { ToolModes, AnnotationStyleStates } from '../../../enums';
import type { StyleSpecifier } from '../../../types/AnnotationStyle';
declare function getFont(styleSpecifier: StyleSpecifier, state?: AnnotationStyleStates, mode?: ToolModes): string;
export default getFont;
