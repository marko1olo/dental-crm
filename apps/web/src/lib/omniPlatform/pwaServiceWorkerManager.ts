/**
 * DENTE CRM — PWA Service Worker & Offline Cache Manager (Layer 1)
 *
 * Handles PWA service worker lifecycle, offline asset caching, and cache invalidation.
 */

/**
 * Checks whether Service Worker is supported in the current browser runtime.
 */
export function isServiceWorkerSupported(): boolean {
	return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

/**
 * Checks if a Service Worker is currently registered and active for offline caching.
 */
export async function isServiceWorkerActive(): Promise<boolean> {
	if (!isServiceWorkerSupported()) return false;
	try {
		const reg = await navigator.serviceWorker.getRegistration();
		return Boolean(reg?.active);
	} catch {
		return false;
	}
}

/**
 * Registers PWA service worker for offline cache survivability.
 */
export async function registerPwaServiceWorker(swUrl = "/sw.js"): Promise<boolean> {
	if (!isServiceWorkerSupported()) return false;
	try {
		const reg = await navigator.serviceWorker.register(swUrl, { scope: "/" });
		return Boolean(reg);
	} catch {
		return false;
	}
}

/**
 * Triggers a check for an updated Service Worker in PWA mode.
 * Returns true if an update is waiting to activate.
 */
export async function checkForPwaUpdate(): Promise<boolean> {
	if (!isServiceWorkerSupported()) return false;
	try {
		const reg = await navigator.serviceWorker.getRegistration();
		if (!reg) return false;
		await reg.update();
		return Boolean(reg.waiting);
	} catch {
		return false;
	}
}

/**
 * Caches essential static assets into CacheStorage for offline PWA operation.
 */
export async function cacheOfflineAssets(urls: string[] = ["/", "/index.html"]): Promise<boolean> {
	if (typeof window === "undefined" || !("caches" in window)) return false;
	try {
		const cache = await caches.open("dente-pwa-static-v1");
		await cache.addAll(urls);
		return true;
	} catch {
		return false;
	}
}

/**
 * Clears all ServiceWorker and PWA caches on application reset or version migration.
 */
export async function clearPwaCaches(): Promise<boolean> {
	if (typeof window === "undefined" || !("caches" in window)) return false;
	try {
		const keys = await caches.keys();
		await Promise.all(keys.map((k) => caches.delete(k)));
		return true;
	} catch {
		return false;
	}
}
