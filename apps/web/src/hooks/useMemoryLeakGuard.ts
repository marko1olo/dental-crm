/**
 * apps/web/src/hooks/useMemoryLeakGuard.ts
 *
 * DENTE Dental CRM — Memory Leak Guard & Lifecycle Resource Cleanup.
 * Compliance: Mandates 8e, 8k, 8n, 8d (Wave 252-Perf2 / Low-RAM Anti-Swap Invariant).
 *
 * Purpose:
 * Guarantee deterministic cleanup of:
 * - Timers (`setTimeout`, `setInterval`)
 * - Animation frames (`requestAnimationFrame`)
 * - DOM & Window event listeners (`addEventListener`)
 * - Network fetches & async streams (`AbortController`)
 * - Observers (`IntersectionObserver`, `ResizeObserver`, `MutationObserver`)
 * - Custom teardown disposers (WebSocket, EventSource, subscriptions)
 *
 * Prevents memory leaks, closure leaks, and background execution in unmounted/detached components.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
	DEFAULT_DOM_CHUNK_STEP,
	DEFAULT_DOM_PAGE_SIZE,
	type DomListSliceResult,
	sliceDomList,
} from "../utils/domVirtualizationHelper";

export type MemoryLeakGuardDisposer = () => void;

export interface MemoryLeakGuardOptions {
	readonly debugName?: string;
}

interface TrackedListener {
	readonly target: EventTarget;
	readonly type: string;
	readonly listener: EventListenerOrEventListenerObject;
	readonly options?: boolean | AddEventListenerOptions | undefined;
}

export interface MemoryLeakGuardController {
	readonly isMounted: () => boolean;
	readonly safeSetTimeout: (
		callback: () => void,
		ms: number,
	) => ReturnType<typeof setTimeout>;
	readonly safeClearTimeout: (id: ReturnType<typeof setTimeout>) => void;
	readonly safeSetInterval: (
		callback: () => void,
		ms: number,
	) => ReturnType<typeof setInterval>;
	readonly safeClearInterval: (id: ReturnType<typeof setInterval>) => void;
	readonly safeRequestAnimationFrame: (
		callback: FrameRequestCallback,
	) => number;
	readonly safeCancelAnimationFrame: (id: number) => void;
	readonly safeAddEventListener: {
		<K extends keyof WindowEventMap>(
			target: Window,
			type: K,
			listener: (ev: WindowEventMap[K]) => void,
			options?: boolean | AddEventListenerOptions,
		): MemoryLeakGuardDisposer;
		<K extends keyof DocumentEventMap>(
			target: Document,
			type: K,
			listener: (ev: DocumentEventMap[K]) => void,
			options?: boolean | AddEventListenerOptions,
		): MemoryLeakGuardDisposer;
		<K extends keyof HTMLElementEventMap, E extends HTMLElement>(
			target: E,
			type: K,
			listener: (ev: HTMLElementEventMap[K]) => void,
			options?: boolean | AddEventListenerOptions,
		): MemoryLeakGuardDisposer;
		(
			target: EventTarget,
			type: string,
			listener: EventListenerOrEventListenerObject,
			options?: boolean | AddEventListenerOptions,
		): MemoryLeakGuardDisposer;
	};
	readonly createAbortController: () => AbortController;
	readonly getAbortSignal: () => AbortSignal;
	readonly registerDisposer: (
		disposer: MemoryLeakGuardDisposer,
	) => MemoryLeakGuardDisposer;
	readonly registerObserver: <T extends { disconnect: () => void }>(
		observer: T,
	) => T;
	readonly disposeAll: () => void;
}

/**
 * Universal memory leak guard hook.
 * Automatically tracks and disposes all registered resources when the component unmounts.
 */
export function useMemoryLeakGuard(
	options?: MemoryLeakGuardOptions,
): MemoryLeakGuardController {
	const _debugName = options?.debugName;
	const isMountedRef = useRef<boolean>(true);
	const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
	const intervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set());
	const animationFramesRef = useRef<Set<number>>(new Set());
	const listenersRef = useRef<Set<TrackedListener>>(new Set());
	const abortControllersRef = useRef<Set<AbortController>>(new Set());
	const lifecycleAbortControllerRef = useRef<AbortController | null>(null);
	const disposersRef = useRef<Set<MemoryLeakGuardDisposer>>(new Set());
	const observersRef = useRef<Set<{ disconnect: () => void }>>(new Set());

	const isMounted = useCallback(() => isMountedRef.current, []);

	const safeClearTimeout = useCallback((id: ReturnType<typeof setTimeout>) => {
		clearTimeout(id);
		timeoutsRef.current.delete(id);
	}, []);

	const safeSetTimeout = useCallback(
		(callback: () => void, ms: number): ReturnType<typeof setTimeout> => {
			const timerId = setTimeout(() => {
				timeoutsRef.current.delete(timerId);
				if (isMountedRef.current) {
					callback();
				}
			}, ms);
			timeoutsRef.current.add(timerId);
			return timerId;
		},
		[],
	);

	const safeClearInterval = useCallback(
		(id: ReturnType<typeof setInterval>) => {
			clearInterval(id);
			intervalsRef.current.delete(id);
		},
		[],
	);

	const safeSetInterval = useCallback(
		(callback: () => void, ms: number): ReturnType<typeof setInterval> => {
			const intervalId = setInterval(() => {
				if (isMountedRef.current) {
					callback();
				} else {
					clearInterval(intervalId);
					intervalsRef.current.delete(intervalId);
				}
			}, ms);
			intervalsRef.current.add(intervalId);
			return intervalId;
		},
		[],
	);

	const safeCancelAnimationFrame = useCallback((id: number) => {
		if (typeof cancelAnimationFrame !== "undefined") {
			cancelAnimationFrame(id);
		}
		animationFramesRef.current.delete(id);
	}, []);

	const safeRequestAnimationFrame = useCallback(
		(callback: FrameRequestCallback): number => {
			if (typeof requestAnimationFrame === "undefined") {
				return 0;
			}
			const rafId = requestAnimationFrame((time) => {
				animationFramesRef.current.delete(rafId);
				if (isMountedRef.current) {
					callback(time);
				}
			});
			animationFramesRef.current.add(rafId);
			return rafId;
		},
		[],
	);

	const safeAddEventListener = useCallback(
		(
			target: EventTarget,
			type: string,
			listener: EventListenerOrEventListenerObject,
			listenerOptions?: boolean | AddEventListenerOptions,
		): MemoryLeakGuardDisposer => {
			const tracked: TrackedListener = {
				target,
				type,
				listener,
				options: listenerOptions,
			};

			target.addEventListener(type, listener, listenerOptions);
			listenersRef.current.add(tracked);

			const remove = () => {
				try {
					target.removeEventListener(type, listener, listenerOptions);
				} catch {
					// Ignore errors during removal
				}
				listenersRef.current.delete(tracked);
			};

			return remove;
		},
		[],
	) as MemoryLeakGuardController["safeAddEventListener"];

	const createAbortController = useCallback((): AbortController => {
		const controller = new AbortController();
		abortControllersRef.current.add(controller);
		return controller;
	}, []);

	const getAbortSignal = useCallback((): AbortSignal => {
		if (
			!lifecycleAbortControllerRef.current ||
			lifecycleAbortControllerRef.current.signal.aborted
		) {
			lifecycleAbortControllerRef.current = new AbortController();
			abortControllersRef.current.add(lifecycleAbortControllerRef.current);
		}
		return lifecycleAbortControllerRef.current.signal;
	}, []);

	const registerDisposer = useCallback(
		(disposer: MemoryLeakGuardDisposer): MemoryLeakGuardDisposer => {
			disposersRef.current.add(disposer);
			return () => {
				disposersRef.current.delete(disposer);
			};
		},
		[],
	);

	const registerObserver = useCallback(
		<T extends { disconnect: () => void }>(observer: T): T => {
			observersRef.current.add(observer);
			return observer;
		},
		[],
	);

	const disposeAll = useCallback(() => {
		// 1. Clear timers
		for (const tid of timeoutsRef.current) {
			clearTimeout(tid);
		}
		timeoutsRef.current.clear();

		for (const iid of intervalsRef.current) {
			clearInterval(iid);
		}
		intervalsRef.current.clear();

		// 2. Clear animation frames
		if (typeof cancelAnimationFrame !== "undefined") {
			for (const rafId of animationFramesRef.current) {
				cancelAnimationFrame(rafId);
			}
		}
		animationFramesRef.current.clear();

		// 3. Remove event listeners
		for (const item of listenersRef.current) {
			try {
				item.target.removeEventListener(item.type, item.listener, item.options);
			} catch {
				// Ignore
			}
		}
		listenersRef.current.clear();

		// 4. Abort all in-flight network requests and abort controllers
		for (const controller of abortControllersRef.current) {
			try {
				if (!controller.signal.aborted) {
					controller.abort("Component unmounted (useMemoryLeakGuard)");
				}
			} catch {
				// Ignore
			}
		}
		abortControllersRef.current.clear();
		lifecycleAbortControllerRef.current = null;

		// 5. Disconnect observers
		for (const observer of observersRef.current) {
			try {
				observer.disconnect();
			} catch {
				// Ignore
			}
		}
		observersRef.current.clear();

		// 6. Execute custom teardown disposers
		for (const disposer of disposersRef.current) {
			try {
				disposer();
			} catch {
				// Ignore
			}
		}
		disposersRef.current.clear();
	}, []);

	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
			disposeAll();
		};
	}, [disposeAll]);

	return {
		isMounted,
		safeSetTimeout,
		safeClearTimeout,
		safeSetInterval,
		safeClearInterval,
		safeRequestAnimationFrame,
		safeCancelAnimationFrame,
		safeAddEventListener,
		createAbortController,
		getAbortSignal,
		registerDisposer,
		registerObserver,
		disposeAll,
	};
}

export interface UseDomListPaginationOptions {
	readonly initialLimit?: number | undefined;
	readonly step?: number | undefined;
}

export interface UseDomListPaginationReturn<T> extends DomListSliceResult<T> {
	readonly limit: number;
	readonly loadMore: (count?: number) => void;
	readonly loadAll: () => void;
	readonly resetLimit: () => void;
	readonly setLimit: (limit: number) => void;
}

/**
 * Hook to paginate long lists for DOM virtualization and memory safety.
 */
export function useDomListPagination<T>(
	items: readonly T[],
	options?: UseDomListPaginationOptions,
): UseDomListPaginationReturn<T> {
	const initialLimit = options?.initialLimit ?? DEFAULT_DOM_PAGE_SIZE;
	const step = options?.step ?? DEFAULT_DOM_CHUNK_STEP;
	const [limit, setLimit] = useState<number>(initialLimit);

	const slice = sliceDomList(items, limit, 0);

	const loadMore = useCallback(
		(count?: number) => {
			const increment = count ?? step;
			setLimit((prev) => Math.min(items.length, prev + increment));
		},
		[items.length, step],
	);

	const loadAll = useCallback(() => {
		setLimit(items.length);
	}, [items.length]);

	const resetLimit = useCallback(() => {
		setLimit(initialLimit);
	}, [initialLimit]);

	return {
		...slice,
		limit,
		loadMore,
		loadAll,
		resetLimit,
		setLimit,
	};
}

/**
 * Standalone safe timeout hook.
 */
export function useSafeTimeout(): {
	setSafeTimeout: (
		callback: () => void,
		ms: number,
	) => ReturnType<typeof setTimeout>;
	clearSafeTimeout: (id: ReturnType<typeof setTimeout>) => void;
} {
	const guard = useMemoryLeakGuard();
	return {
		setSafeTimeout: guard.safeSetTimeout,
		clearSafeTimeout: guard.safeClearTimeout,
	};
}

/**
 * Standalone safe interval hook.
 */
export function useSafeInterval(): {
	setSafeInterval: (
		callback: () => void,
		ms: number,
	) => ReturnType<typeof setInterval>;
	clearSafeInterval: (id: ReturnType<typeof setInterval>) => void;
} {
	const guard = useMemoryLeakGuard();
	return {
		setSafeInterval: guard.safeSetInterval,
		clearSafeInterval: guard.safeClearInterval,
	};
}
