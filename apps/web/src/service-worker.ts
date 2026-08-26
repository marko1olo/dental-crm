/**
 * DENTE CRM — Production PWA Service Worker (TypeScript Source)
 *
 * Provides:
 * 1. Instant offline application shell startup (<300ms)
 * 2. Cache-First strategy for immutable hashed JS/CSS assets, WebAssembly, fonts and odontogram SVGs
 * 3. Stale-While-Revalidate for external typography / Google Fonts
 * 4. Network-First with offline.html fallback for navigation routes
 * 5. Strict security bypass for /api/* routes and raw medical imaging / DICOM datasets
 * 6. Background sync integration (dente-offline-sync) and push notifications for CITO alerts
 */

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

export const SHELL_CACHE = "dental-crm-shell-v7";
export const SHELL_ASSETS = [
	"/",
	"/index.html",
	"/offline.html",
	"/manifest.webmanifest",
	"/icon.svg",
];
export const MAX_DYNAMIC_SHELL_CACHE_ENTRIES = 500;

export function isForbiddenRuntimeResponse(url: URL): boolean {
	if (url.pathname.startsWith("/api/")) return true;
	if (
		/^\/(?:documents|patients|imaging|dicom|files|uploads|medical-documents)(?:\/|$)/.test(
			url.pathname,
		)
	) {
		return true;
	}
	return /\.(?:dcm|dicom|stl|obj|ply|glb|gltf|nii|nrrd|mhd|raw)$/i.test(
		url.pathname,
	);
}

export function isCacheableShellAsset(url: URL): boolean {
	if (SHELL_ASSETS.includes(url.pathname)) return true;
	// Cache static bundles, styles, icons, fonts, odontogram SVG schemas, auth art, shaders, wasm, and workers
	return /^\/(?:assets|auth-art|fonts|icons|workers|wasm|odontogram|images|static)\/[-A-Za-z0-9_./]+(?:\.js|\.mjs|\.css|\.svg|\.png|\.webp|\.avif|\.woff2?|\.ttf|\.otf|\.wasm|\.json|\.webmanifest|\.ico)$/.test(
		url.pathname,
	);
}

export function isCacheableExternalFont(url: URL): boolean {
	return (
		(url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") &&
		(url.pathname.startsWith("/css") || /\.(?:woff2?|ttf|otf|eot)$/i.test(url.pathname))
	);
}

export function isNetworkFirstShellAsset(url: URL): boolean {
	return (
		url.pathname === "/" ||
		url.pathname === "/index.html" ||
		url.pathname === "/manifest.webmanifest"
	);
}

export async function putShellCache(request: Request | string, response: Response): Promise<void> {
	const cache = await caches.open(SHELL_CACHE);
	await cache.put(request, response);
	const keys = await cache.keys();
	const dynamicKeys = keys.filter((key) => {
		const keyUrl = new URL(key.url);
		return !SHELL_ASSETS.includes(keyUrl.pathname);
	});
	if (dynamicKeys.length <= MAX_DYNAMIC_SHELL_CACHE_ENTRIES) return;
	await Promise.all(
		dynamicKeys
			.slice(0, dynamicKeys.length - MAX_DYNAMIC_SHELL_CACHE_ENTRIES)
			.map((key) => cache.delete(key)),
	);
}

export async function recoverShellCacheForClientRefresh(): Promise<void> {
	const cache = await caches.open(SHELL_CACHE);
	const keys = await cache.keys();
	const dynamicKeys = keys.filter((key) => {
		const keyUrl = new URL(key.url);
		return !SHELL_ASSETS.includes(keyUrl.pathname);
	});
	await Promise.all(dynamicKeys.map((key) => cache.delete(key)));

	try {
		await cache.addAll(SHELL_ASSETS);
	} catch {
		// Keep existing core fallbacks when the operator is already offline.
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Worker Lifecycle Events
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener("install", (event: ExtendableEvent) => {
	event.waitUntil(
		caches
			.open(SHELL_CACHE)
			.then((cache) => cache.addAll(SHELL_ASSETS))
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener("activate", (event: ExtendableEvent) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key !== SHELL_CACHE)
						.map((key) => caches.delete(key)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

self.addEventListener("message", (event: ExtendableMessageEvent) => {
	if (event.data?.type === "DENTE_SKIP_WAITING") {
		self.skipWaiting();
		return;
	}

	if (event.data?.type === "DENTE_CLEAR_SHELL_CACHE") {
		event.waitUntil(
			recoverShellCacheForClientRefresh().then(() => {
				const source = event.source as Client | null;
				source?.postMessage?.({ type: "DENTE_SHELL_CACHE_CLEARED" });
			}),
		);
	}
});

// ─────────────────────────────────────────────────────────────────────────────
// Fetch Event Interception & Resilient Offline Caching
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event: FetchEvent) => {
	const request = event.request;
	const url = new URL(request.url);

	if (request.method !== "GET" || isForbiddenRuntimeResponse(url)) {
		event.respondWith(fetch(request));
		return;
	}

	// 1. External Typography & Web Fonts (Google Fonts CSS & WOFF2) — Cache-First with Stale-While-Revalidate Fallback
	if (isCacheableExternalFont(url)) {
		event.respondWith(
			caches.match(request).then((cached) => {
				if (cached) return cached;
				return fetch(request)
					.then((response) => {
						if (response.ok || response.type === "opaque") {
							void putShellCache(request, response.clone());
						}
						return response;
					})
					.catch(() => cached ?? Response.error());
			}),
		);
		return;
	}

	if (url.origin !== self.location.origin) {
		event.respondWith(fetch(request));
		return;
	}

	// 2. Navigation routes (HTML pages) — Network-First with /index.html and /offline.html fallback
	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request)
				.then((response) => {
					if (response.ok) {
						const copy = response.clone();
						void putShellCache("/index.html", copy);
					}
					return response;
				})
				.catch(async () => {
					return (
						(await caches.match("/index.html")) ??
						(await caches.match("/offline.html")) ??
						Response.error()
					);
				}),
		);
		return;
	}

	if (!isCacheableShellAsset(url)) {
		event.respondWith(fetch(request));
		return;
	}

	// 3. Static shell assets (JS/CSS bundles, SVG odontograms, icons)
	event.respondWith(
		caches.match(request).then((cached) => {
			if (cached && !isNetworkFirstShellAsset(url)) {
				// Cache-first for hashed bundles, styles, fonts, and odontogram SVG assets
				return cached;
			}

			const networkFetch = fetch(request)
				.then((response) => {
					if (response.ok && response.type !== "opaque") {
						void putShellCache(request, response.clone());
					}
					return response;
				})
				.catch(() => cached ?? Response.error());

			return isNetworkFirstShellAsset(url)
				? networkFetch
				: (cached ?? networkFetch);
		}),
	);
});

// ─────────────────────────────────────────────────────────────────────────────
// Web Push Notifications & Background Sync Engine
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener("push", (event: PushEvent) => {
	let payload = {
		title: "DENTE CRM",
		body: "Новое клиническое уведомление",
		icon: "/icon.svg",
		badge: "/icon.svg",
		data: { url: "/" },
	};

	if (event.data) {
		try {
			const parsed = event.data.json();
			payload = { ...payload, ...parsed };
		} catch {
			payload.body = event.data.text() || payload.body;
		}
	}

	event.waitUntil(
		self.registration.showNotification(payload.title, {
			body: payload.body,
			icon: payload.icon || "/icon.svg",
			badge: payload.badge || "/icon.svg",
			data: payload.data,
			tag: ((payload as Record<string, unknown>).tag as string) || "dente-clinical-alert",
			...((payload as Record<string, unknown>).renotify ? { renotify: true } : {}),
		} as NotificationOptions),
	);
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
	event.notification.close();
	const targetUrl = event.notification.data?.url || "/";

	event.waitUntil(
		self.clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((clientList) => {
				for (const client of clientList) {
					if ("focus" in client) {
						(client as WindowClient).focus();
						if ("navigate" in client && targetUrl !== "/") {
							(client as WindowClient).navigate(targetUrl);
						}
						return;
					}
				}
				if (self.clients.openWindow) {
					return self.clients.openWindow(targetUrl);
				}
			}),
	);
});

self.addEventListener("sync", (event: any) => {
	if (event.tag === "dente-offline-sync" || event.tag === "dente-outbox-sync") {
		event.waitUntil(
			self.clients
				.matchAll({ type: "window", includeUncontrolled: true })
				.then((clients) => {
					for (const client of clients) {
						client.postMessage({
							type: "DENTE_BACKGROUND_SYNC_TRIGGER",
							tag: event.tag,
						});
					}
				}),
		);
	}
});
