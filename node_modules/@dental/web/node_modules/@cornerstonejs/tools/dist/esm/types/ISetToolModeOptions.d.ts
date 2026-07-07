import type { ToolModes, MouseBindings, KeyboardBindings } from '../enums';
type ToolBindingMouseType = (typeof MouseBindings)[keyof typeof MouseBindings];
type ToolBindingKeyboardType = (typeof KeyboardBindings)[keyof typeof KeyboardBindings];
type IToolBinding = {
    mouseButton?: ToolBindingMouseType;
    modifierKey?: ToolBindingKeyboardType;
    numTouchPoints?: number;
};
type SetToolBindingsType = {
    bindings: IToolBinding[];
};
type ToolOptionsType = {
    bindings: IToolBinding[];
    mode: ToolModes;
};
export type { IToolBinding, SetToolBindingsType, ToolOptionsType };
