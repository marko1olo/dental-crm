import type { Annotation } from './AnnotationTypes';
import type { InteractionEventType } from './EventTypes';
import type { SetToolBindingsType } from './ISetToolModeOptions';
type ToolAction = {
    method: string | ((evt: InteractionEventType, annotation: Annotation) => void);
    bindings: SetToolBindingsType[];
};
export type { ToolAction as default };
