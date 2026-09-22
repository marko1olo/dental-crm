/**
 * @dental/web/native — Universal Cross-Platform Native Bridges Barrel Export.
 */

export * from "./desktopBridge.js";
export * from "./mobileBridge.js";
export * from "./hardwareDispatcher.js";
export * from "./runtimeRouter.js";
export { isDesktopApp, isMobileApp, isPwaApp, isWebApp } from "./desktopBridge.js";
