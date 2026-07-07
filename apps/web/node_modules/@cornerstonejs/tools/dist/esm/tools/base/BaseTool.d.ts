import { utilities as csUtils } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
import ToolModes from '../../enums/ToolModes';
import type StrategyCallbacks from '../../enums/StrategyCallbacks';
import type { InteractionTypes, ToolProps, PublicToolProps, ToolConfiguration } from '../../types';
declare abstract class BaseTool {
    static toolName: any;
    static activeCursorTool: any;
    supportedInteractionTypes: InteractionTypes[];
    configuration: Record<string, any>;
    get configurationTyped(): ToolConfiguration;
    toolGroupId: string;
    mode: ToolModes;
    isPrimary: boolean;
    protected memo: csUtils.HistoryMemo.Memo;
    static defaults: {
        configuration: {
            strategies: {};
            defaultStrategy: any;
            activeStrategy: any;
            strategyOptions: {};
        };
    };
    constructor(toolProps: PublicToolProps, defaultToolProps: ToolProps);
    static mergeDefaultProps(defaultProps?: {}, additionalProps?: any): any;
    static isSpecifiedTargetId(desiredVolumeId: string): (_viewport: any, { targetId }: {
        targetId: any;
    }) => any;
    get toolName(): string;
    getToolName(): string;
    applyActiveStrategy(enabledElement: Types.IEnabledElement, operationData: unknown): any;
    applyActiveStrategyCallback(enabledElement: Types.IEnabledElement, operationData: unknown, callbackType: StrategyCallbacks | string, ...extraArgs: any[]): any;
    setConfiguration(newConfiguration: Record<string, any>): void;
    setActiveStrategy(strategyName: string): void;
    protected getTargetImageData(targetId: string): Types.IImageData | Types.CPUIImageData;
    protected getTargetId(viewport: Types.IViewport, data?: unknown & {
        cachedStats?: Record<string, unknown>;
    }): string | undefined;
    undo(): void;
    redo(): void;
    static createZoomPanMemo(viewport: any): {
        restoreMemo: () => void;
    };
    doneEditMemo(): void;
    static startGroupRecording(): void;
    static endGroupRecording(): void;
    static calculateLengthInIndex(calibrate: any, indexPoints: any, closed?: boolean): number;
    static isInsideVolume(dimensions: any, indexPoints: any): boolean;
}
export default BaseTool;
