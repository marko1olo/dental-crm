/**
 * useModuleCleanup.ts
 * Enterprise-grade lifecycle hook for WebGL context teardown, Canvas buffer release,
 * autosave timer cancellation, and Recharts stream disposal.
 *
 * Usage: call useModuleCleanup('imaging') inside any heavy module component.
 * On unmount, all registered resources for that module are destroyed.
 */
import { useEffect, useRef } from "react";

type CleanupFn = () => void;

// Global registry: moduleKey → list of cleanup functions
const moduleCleanupRegistry = new Map<string, CleanupFn[]>();

/**
 * Register a cleanup function for a given module key.
 * All registered fns will be called when the module unmounts.
 */
export function registerModuleCleanup(moduleKey: string, fn: CleanupFn): void {
  const existing = moduleCleanupRegistry.get(moduleKey) ?? [];
  existing.push(fn);
  moduleCleanupRegistry.set(moduleKey, existing);
}

/**
 * Destroy all registered cleanup functions for a module key.
 * Clears the registry entry after execution.
 */
export function flushModuleCleanup(moduleKey: string): void {
  const fns = moduleCleanupRegistry.get(moduleKey) ?? [];
  for (const fn of fns) {
    try {
      fn();
    } catch (err) {
      console.warn(`[ModuleCleanup] Error in cleanup for module "${moduleKey}":`, err);
    }
  }
  moduleCleanupRegistry.delete(moduleKey);
}

/**
 * Primary React hook. Call inside a module's root component.
 * Returns a `register` function to add cleanup callbacks inline.
 *
 * @example
 *   const { register } = useModuleCleanup('imaging');
 *   register(() => cornerstone.cache.purgeCache());
 *   register(() => clearInterval(autosaveTimerRef.current));
 */
export function useModuleCleanup(moduleKey: string): {
  register: (fn: CleanupFn) => void;
} {
  const keyRef = useRef(moduleKey);

  const register = (fn: CleanupFn): void => {
    registerModuleCleanup(keyRef.current, fn);
  };

  useEffect(() => {
    return () => {
      flushModuleCleanup(keyRef.current);

      // Attempt to trigger GC hint via large allocation + release (V8-specific, best-effort)
      // This does NOT guarantee GC but signals intent to the runtime.
      if (typeof window !== "undefined" && "gc" in window) {
        try {
          (window as Window & { gc?: () => void }).gc?.();
        } catch {
          // gc() is not always available — ignore silently
        }
      }
    };
  }, []);

  return { register };
}

/**
 * Utility: safely destroy a Cornerstone3D rendering engine by ID.
 * Cleans up WebGL context, GPU buffers, and DICOM cache.
 */
export function destroyCornerstoneEngine(engineId: string): void {
  try {
    if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).__CORNERSTONE_RENDER_ENGINES__) {
      const enginesMap = (window as unknown as Record<string, Record<string, { destroy?: () => void }> | undefined>).__CORNERSTONE_RENDER_ENGINES__;
      if (!enginesMap) return;
      const engine = enginesMap[engineId];
      if (engine?.destroy) {
        engine.destroy();
        console.info(`[ModuleCleanup] Cornerstone engine "${engineId}" destroyed.`);
      }
    }
  } catch (err) {
    console.warn(`[ModuleCleanup] Failed to destroy Cornerstone engine "${engineId}":`, err);
  }
}

/**
 * Utility: release an HTML Canvas element's GPU memory.
 * Resizing to 0x0 forces the browser to release the backing GPU texture.
 */
export function releaseCanvasBuffer(canvas: HTMLCanvasElement | null): void {
  if (!canvas) return;
  canvas.width = 0;
  canvas.height = 0;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.clearRect(0, 0, 0, 0);
}
