import { getRenderingEngine, getEnabledElement, eventTarget, Enums, getEnabledElementByViewportId, } from '@cornerstonejs/core';
class Synchronizer {
    constructor(synchronizerId, eventName, eventHandler, options) {
        this._viewportOptions = {};
        this._onEvent = (evt) => {
            if (this._ignoreFiredEvents === true) {
                return;
            }
            if (!this._targetViewports.length) {
                return;
            }
            const enabledElement = this._eventSource === 'element'
                ? getEnabledElement(evt.currentTarget)
                : getEnabledElementByViewportId(evt.detail?.viewportId);
            if (!enabledElement) {
                return;
            }
            const { renderingEngineId, viewportId } = enabledElement;
            if (!this._sourceViewports.find((s) => s.viewportId === viewportId)) {
                return;
            }
            this.fireEvent({
                renderingEngineId,
                viewportId,
            }, evt);
        };
        this._enabled = true;
        this._eventName = eventName;
        this._eventHandler = eventHandler;
        this._ignoreFiredEvents = false;
        this._sourceViewports = [];
        this._targetViewports = [];
        this._options = options || {};
        this._eventSource = this._options.eventSource || 'element';
        this._auxiliaryEvents = this._options.auxiliaryEvents || [];
        this.id = synchronizerId;
    }
    isDisabled() {
        return !this._enabled || !this._hasSourceElements();
    }
    setOptions(viewportId, options = {}) {
        this._viewportOptions[viewportId] = options;
    }
    setEnabled(enabled) {
        this._enabled = enabled;
    }
    getOptions(viewportId) {
        return this._viewportOptions[viewportId];
    }
    add(viewportInfo) {
        this.addTarget(viewportInfo);
        this.addSource(viewportInfo);
    }
    addSource(viewportInfo) {
        if (_containsViewport(this._sourceViewports, viewportInfo)) {
            return;
        }
        const { renderingEngineId, viewportId } = viewportInfo;
        const viewport = getRenderingEngine(renderingEngineId).getViewport(viewportId);
        if (!viewport) {
            console.warn(`Synchronizer.addSource: No viewport for ${renderingEngineId} ${viewportId}`);
            return;
        }
        const eventSource = this._eventSource === 'element' ? viewport.element : eventTarget;
        eventSource.addEventListener(this._eventName, this._onEvent.bind(this));
        this._auxiliaryEvents.forEach(({ name, source = 'element' }) => {
            const target = source === 'element' ? viewport.element : eventTarget;
            target.addEventListener(name, this._onEvent.bind(this));
        });
        this._updateDisableHandlers();
        this._sourceViewports.push(viewportInfo);
    }
    addTarget(viewportInfo) {
        if (_containsViewport(this._targetViewports, viewportInfo)) {
            return;
        }
        this._targetViewports.push(viewportInfo);
        this._updateDisableHandlers();
    }
    getSourceViewports() {
        return this._sourceViewports;
    }
    getTargetViewports() {
        return this._targetViewports;
    }
    destroy() {
        this._sourceViewports.forEach((s) => this.removeSource(s));
        this._targetViewports.forEach((t) => this.removeTarget(t));
    }
    remove(viewportInfo) {
        this.removeTarget(viewportInfo);
        this.removeSource(viewportInfo);
    }
    removeSource(viewportInfo) {
        const index = _getViewportIndex(this._sourceViewports, viewportInfo);
        if (index === -1) {
            return;
        }
        const eventSource = this._eventSource === 'element'
            ? this.getViewportElement(viewportInfo)
            : eventTarget;
        this._sourceViewports.splice(index, 1);
        eventSource.removeEventListener(this._eventName, this._eventHandler);
        this._auxiliaryEvents.forEach(({ name, source }) => {
            const target = source === 'element'
                ? this.getViewportElement(viewportInfo)
                : eventTarget;
            target.removeEventListener(name, this._eventHandler);
        });
        this._updateDisableHandlers();
    }
    removeTarget(viewportInfo) {
        const index = _getViewportIndex(this._targetViewports, viewportInfo);
        if (index === -1) {
            return;
        }
        this._targetViewports.splice(index, 1);
        this._updateDisableHandlers();
    }
    hasSourceViewport(renderingEngineId, viewportId) {
        return _containsViewport(this._sourceViewports, {
            renderingEngineId,
            viewportId,
        });
    }
    hasTargetViewport(renderingEngineId, viewportId) {
        return _containsViewport(this._targetViewports, {
            renderingEngineId,
            viewportId,
        });
    }
    fireEvent(sourceViewport, sourceEvent) {
        if (this.isDisabled() || this._ignoreFiredEvents) {
            return;
        }
        this._ignoreFiredEvents = true;
        const promises = [];
        try {
            for (let i = 0; i < this._targetViewports.length; i++) {
                const targetViewport = this._targetViewports[i];
                const targetIsSource = sourceViewport.viewportId === targetViewport.viewportId;
                if (targetIsSource) {
                    continue;
                }
                const result = this._eventHandler(this, sourceViewport, targetViewport, sourceEvent, this._options);
                if (result instanceof Promise) {
                    promises.push(result);
                }
            }
        }
        catch (ex) {
            console.warn(`Synchronizer, for: ${this._eventName}`, ex);
        }
        finally {
            if (promises.length) {
                Promise.allSettled(promises).then(() => {
                    this._ignoreFiredEvents = false;
                });
            }
            else {
                this._ignoreFiredEvents = false;
            }
        }
    }
    _hasSourceElements() {
        return this._sourceViewports.length !== 0;
    }
    _updateDisableHandlers() {
        const viewports = _getUniqueViewports(this._sourceViewports, this._targetViewports);
        const _remove = this.remove.bind(this);
        const disableHandler = (elementDisabledEvent) => {
            _remove(elementDisabledEvent.detail.element);
        };
        viewports.forEach((vp) => {
            const eventSource = this.getEventSource(vp);
            if (!eventSource) {
                return;
            }
            eventSource.removeEventListener(Enums.Events.ELEMENT_DISABLED, disableHandler);
            eventSource.addEventListener(Enums.Events.ELEMENT_DISABLED, disableHandler);
        });
    }
    getEventSource(viewportInfo) {
        return this._eventSource === 'element'
            ? this.getViewportElement(viewportInfo)
            : eventTarget;
    }
    getViewportElement(viewportInfo) {
        const { renderingEngineId, viewportId } = viewportInfo;
        const renderingEngine = getRenderingEngine(renderingEngineId);
        if (!renderingEngine) {
            return null;
        }
        const viewport = renderingEngine.getViewport(viewportId);
        if (!viewport) {
            return null;
        }
        return viewport.element;
    }
}
function _getUniqueViewports(vp1, vp2) {
    const unique = [];
    const vps = vp1.concat(vp2);
    for (let i = 0; i < vps.length; i++) {
        const vp = vps[i];
        if (!unique.some((u) => vp.renderingEngineId === u.renderingEngineId &&
            vp.viewportId === u.viewportId)) {
            unique.push(vp);
        }
    }
    return unique;
}
function _getViewportIndex(arr, vp) {
    return arr.findIndex((ar) => vp.renderingEngineId === ar.renderingEngineId &&
        vp.viewportId === ar.viewportId);
}
function _containsViewport(arr, vp) {
    return arr.some((ar) => ar.renderingEngineId === vp.renderingEngineId &&
        ar.viewportId === vp.viewportId);
}
export default Synchronizer;
