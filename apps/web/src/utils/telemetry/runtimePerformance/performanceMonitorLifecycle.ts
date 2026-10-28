/**
 * DENTE CRM — Performance Monitor Lifecycle & Event Observers
 */

export interface LifecycleContext {
	onVisibilityChange: (visible: boolean) => void;
	onLongTask: (durationMs: number, startTime: number) => void;
	enableLongTasks: boolean;
}

export interface LifecycleObservers {
	visibilityListener: (() => void) | null;
	performanceObserver: PerformanceObserver | null;
}

export function attachLifecycleObservers(ctx: LifecycleContext): LifecycleObservers {
	let visibilityListener: (() => void) | null = null;
	let performanceObserver: PerformanceObserver | null = null;

	if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
		visibilityListener = () => ctx.onVisibilityChange(document.visibilityState !== "hidden");
		document.addEventListener("visibilitychange", visibilityListener);
	}

	if (ctx.enableLongTasks && typeof PerformanceObserver !== "undefined") {
		try {
			if (PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
				performanceObserver = new PerformanceObserver((list) => {
					for (const entry of list.getEntries()) ctx.onLongTask(entry.duration, entry.startTime);
				});
				performanceObserver.observe({ entryTypes: ["longtask"] });
			}
		} catch {
			performanceObserver = null;
		}
	}

	return { visibilityListener, performanceObserver };
}

export function detachLifecycleObservers(obs: LifecycleObservers): void {
	if (obs.visibilityListener && typeof document !== "undefined") {
		document.removeEventListener("visibilitychange", obs.visibilityListener);
	}
	if (obs.performanceObserver) {
		try { obs.performanceObserver.disconnect(); } catch {}
	}
}
