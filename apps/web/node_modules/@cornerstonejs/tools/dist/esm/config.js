import { eventTarget, triggerEvent } from '@cornerstonejs/core';
import Events from './enums/Events';
let config = {};
export function getConfig() {
    return config;
}
export function setConfig(newConfig) {
    config = newConfig;
}
export function getAddOns() {
    return config.addons;
}
let polysegInitialized = false;
export function getPolySeg() {
    if (!config.addons?.polySeg) {
        console.warn('PolySeg add-on not configured. This will prevent automatic conversion between segmentation representations (labelmap, contour, surface). To enable these features, install @cornerstonejs/polymorphic-segmentation and register it during initialization: cornerstoneTools.init({ addons: { polySeg } }).');
        return null;
    }
    const polyseg = config.addons.polySeg;
    if (!polysegInitialized) {
        polyseg.init();
        polysegInitialized = true;
    }
    return polyseg;
}
