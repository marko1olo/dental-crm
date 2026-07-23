import { Enums } from '@cornerstonejs/core';
import { ToolModes } from '../enums';
import getToolsWithModesForMouseEvent from './shared/getToolsWithModesForMouseEvent';
const { Active, Passive, Enabled } = ToolModes;
const onCameraReset = function (evt) {
    const enabledTools = getToolsWithModesForMouseEvent(evt, [
        Active,
        Passive,
        Enabled,
    ]);
    enabledTools.forEach((tool) => {
        if (tool.onResetCamera) {
            tool.onResetCamera(evt);
        }
    });
};
const enable = function (element) {
    element.addEventListener(Enums.Events.CAMERA_RESET, onCameraReset);
};
const disable = function (element) {
    element.removeEventListener(Enums.Events.CAMERA_RESET, onCameraReset);
};
export default {
    enable,
    disable,
};
