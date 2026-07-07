import type BaseTool from '../tools/base/BaseTool';
export interface ToolConfiguration {
    strategies: any;
    defaultStrategy?: string;
    activeStrategy?: string;
    strategyOptions: any;
    isPreferredTargetId?: (viewport: any, targetInfo: {
        imageId: string;
        cachedStat: any;
    }) => boolean;
}
export type IBaseTool = BaseTool;
