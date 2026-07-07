import type { Calculator } from '../utilities/math/basic';
type SharedToolProp = {
    supportedInteractionTypes?: Array<string>;
    configuration?: ToolConfiguration;
};
export type ToolConfiguration = Record<string, any> & {
    statsCalculator?: Calculator;
};
export type ToolProps = SharedToolProp;
export type PublicToolProps = SharedToolProp & {
    name?: string;
};
export {};
