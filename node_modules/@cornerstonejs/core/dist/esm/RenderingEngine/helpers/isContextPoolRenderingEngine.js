import { getConfiguration } from '../../init';
import { RenderingEngineModeEnum } from '../../enums';
export function isContextPoolRenderingEngine() {
    const config = getConfiguration();
    return (config?.rendering?.renderingEngineMode ===
        RenderingEngineModeEnum.ContextPool);
}
