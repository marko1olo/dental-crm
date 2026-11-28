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

export const SHELL_CACHE = "dental-crm-shell-v8";
export const SHELL_ASSETS = [
	"/",
	"/index.html",
	"/offline.html",
	"/manifest.webmanifest",
	"/manifest.json",
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

/**
 * ИСКЛЮЧЕНИЕ КЭШИРОВАНИЯ БИТЫХ СКРИПТОВ И ЧАНКОВ.
 * В SPA-приложениях (Vite) при сбоях сети или 404 сервер может отдавать index.html (text/html).
 * Если Service Worker сохранит HTML-страницу как JS-модуль, приложение намертво падает
 * с "SyntaxError: Unexpected token '<'". Этот фильтр защищает кэш от повреждения.
 */
export function isValidShellResponse(
	request: Request | string,
	response: Response,
): boolean {
	if (!response.ok || response.type === "opaque") return false;
	if (response.status < 200 || response.status >= 300) return false;

	const urlStr = typeof request === "string" ? request : request.url;
	let pathname = "";
	try {
		pathname = new URL(
			urlStr,
			typeof self !== "undefined" && self.location ? self.location.origin : "http://localhost",
		).pathname;
	} catch (err: unknown) {
		console.warn("[ServiceWorker] Invalid URL for shell cache check:", urlStr, err);
		pathname = urlStr;
	}

	const contentType = (response.headers.get("content-type") || "").toLowerCase();

	// 1. Script integrity: never cache HTML fallback as JavaScript or Module chunk
	if (/\.(?:js|mjs)$/i.test(pathname)) {
		if (contentType.includes("text/html")) return false;
	}

	// 2. Style integrity: never cache HTML fallback as CSS
	if (/\.css$/i.test(pathname)) {
		if (contentType.includes("text/html")) return false;
	}

	// 3. WebAssembly integrity: wasm must never be text/html
	if (/\.wasm$/i.test(pathname)) {
		if (contentType.includes("text/html")) return false;
	}

	// 4. JSON metadata & manifests: must not be an HTML error page
	if (/\.(?:json|webmanifest)$/i.test(pathname)) {
		if (contentType.includes("text/html")) return false;
	}

	return true;
}

export function isCacheableShellAsset(url: URL): boolean {
	if (SHELL_ASSETS.includes(url.pathname)) return true;
	if (isForbiddenRuntimeResponse(url)) return false;
	// 1. Explicit static directories (bundles, styles, icons, fonts, odontogram SVG schemas, auth art, shaders, wasm, workers, media, locales)
	if (
		/^\/(?:assets|auth-art|fonts|icons|workers|wasm|odontogram|images|static|media|locales)\/[-A-Za-z0-9_./]+(?:\.js|\.mjs|\.css|\.svg|\.png|\.webp|\.avif|\.woff2?|\.ttf|\.otf|\.wasm|\.json|\.webmanifest|\.ico|\.map)$/i.test(
			url.pathname,
		)
	) {
		return true;
	}
	// 2. Any local origin request with static asset extensions (excluding forbidden API/DICOM/documents)
	return /\.(?:js|mjs|css|svg|png|jpg|jpeg|webp|avif|woff2?|ttf|otf|wasm|json|webmanifest|ico|map)$/i.test(
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
	if (!isValidShellResponse(request, response)) {
		return;
	}
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
	} catch (err: unknown) {
		// Keep existing core fallbacks when the operator is already offline.
		console.warn("[ServiceWorker] Shell cache refresh offline fallback:", err);
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Worker Lifecycle Events
const swScope: ServiceWorkerGlobalScope | null =
	typeof self !== "undefined" ? self : null;

if (swScope) {
	swScope.addEventListener("install", (event: ExtendableEvent) => {
		event.waitUntil(
			caches
				.open(SHELL_CACHE)
				.then((cache) => cache.addAll(SHELL_ASSETS))
				.then(() => swScope.skipWaiting()),
		);
	});

	swScope.addEventListener("activate", (event: ExtendableEvent) => {
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
				.then(() => swScope.clients.claim()),
		);
	});

	swScope.addEventListener("message", (event: ExtendableMessageEvent) => {
		if (event.data?.type === "DENTE_SKIP_WAITING") {
			swScope.skipWaiting();
			return;
		}

		if (event.data?.type === "DENTE_CLEAR_SHELL_CACHE") {
			event.waitUntil(
				recoverShellCacheForClientRefresh().then(() => {
					const source = event.source;
					if (source && "postMessage" in source && typeof source.postMessage === "function") {
						source.postMessage({ type: "DENTE_SHELL_CACHE_CLEARED" });
					}
				}),
			);
		}
	});

	swScope.addEventListener("fetch", (event: FetchEvent) => {
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
			if (cached) {
				if (!isValidShellResponse(request, cached)) {
					// Purge corrupted cached script/asset immediately (e.g. stale HTML fallback)
					void caches.open(SHELL_CACHE).then((cache) => cache.delete(request));
				} else if (!isNetworkFirstShellAsset(url)) {
					// Cache-first for verified hashed bundles, styles, fonts, and odontogram SVG assets
					return cached;
				}
			}

			const networkFetch = fetch(request)
				.then((response) => {
					if (isValidShellResponse(request, response)) {
						void putShellCache(request, response.clone());
					}
					return response;
				})
				.catch(() => (cached && isValidShellResponse(request, cached) ? cached : Response.error()));

			return isNetworkFirstShellAsset(url)
				? networkFetch
				: (cached && isValidShellResponse(request, cached) ? cached : networkFetch);
		}),
	);
});

// ─────────────────────────────────────────────────────────────────────────────
// Web Push Notifications & Background Sync Engine
// ─────────────────────────────────────────────────────────────────────────────

interface SyncEvent extends ExtendableEvent {
	readonly tag: string;
	readonly lastChance?: boolean;
}

interface PushNotificationPayload {
	title: string;
	body: string;
	icon: string;
	badge: string;
	data: { url: string };
	tag?: string | undefined;
	renotify?: boolean | undefined;
}

interface ExtendedNotificationOptions extends NotificationOptions {
	renotify?: boolean | undefined;
}

	swScope.addEventListener("push", (event: PushEvent) => {
		let payload: PushNotificationPayload = {
			title: "DENTE CRM",
			body: "Новое клиническое уведомление",
			icon: "/icon.svg",
			badge: "/icon.svg",
			data: { url: "/" },
		};

		if (event.data) {
			try {
				const parsed: unknown = event.data.json();
				if (typeof parsed === "object" && parsed !== null) {
					const rawTitle = Reflect.get(parsed, "title");
					const rawBody = Reflect.get(parsed, "body");
					const rawIcon = Reflect.get(parsed, "icon");
					const rawBadge = Reflect.get(parsed, "badge");
					const rawTag = Reflect.get(parsed, "tag");
					const rawRenotify = Reflect.get(parsed, "renotify");
					const rawData = Reflect.get(parsed, "data");
					const rawDataUrl =
						typeof rawData === "object" && rawData !== null ? Reflect.get(rawData, "url") : undefined;

					payload = {
						title: typeof rawTitle === "string" ? rawTitle : payload.title,
						body: typeof rawBody === "string" ? rawBody : payload.body,
						icon: typeof rawIcon === "string" ? rawIcon : payload.icon,
						badge: typeof rawBadge === "string" ? rawBadge : payload.badge,
						data: { url: typeof rawDataUrl === "string" ? rawDataUrl : payload.data.url },
						tag: typeof rawTag === "string" ? rawTag : undefined,
						renotify: typeof rawRenotify === "boolean" ? rawRenotify : undefined,
					};
				}
			} catch (parseErr: unknown) {
				console.warn("[ServiceWorker] Push JSON parse fallback to text:", parseErr);
				payload.body = event.data.text() || payload.body;
			}
		}

		const notificationOptions: ExtendedNotificationOptions = {
			body: payload.body,
			icon: payload.icon || "/icon.svg",
			badge: payload.badge || "/icon.svg",
			data: payload.data,
			tag: payload.tag || "dente-clinical-alert",
			...(payload.renotify ? { renotify: true } : {}),
		};

		event.waitUntil(swScope.registration.showNotification(payload.title, notificationOptions));
	});

	swScope.addEventListener("notificationclick", (event: NotificationEvent) => {
		event.notification.close();
		const targetUrl = event.notification.data?.url || "/";

		event.waitUntil(
			swScope.clients
				.matchAll({ type: "window", includeUncontrolled: true })
				.then((clientList) => {
					for (const client of clientList) {
						if ("focus" in client && typeof client.focus === "function") {
							client.focus();
							if ("navigate" in client && typeof client.navigate === "function" && targetUrl !== "/") {
								client.navigate(targetUrl);
							}
							return;
						}
					}
					if (swScope.clients.openWindow) {
						return swScope.clients.openWindow(targetUrl);
					}
				}),
		);
	});

	swScope.addEventListener("sync", (event: Event) => {
		const rawTag: unknown = Reflect.get(event, "tag");
		const syncTag = typeof rawTag === "string" ? rawTag : "";
		if (
			syncTag === "dente-offline-sync" ||
			syncTag === "dente-outbox-sync" ||
			syncTag === "dente-patient-booking-sync"
		) {
			const syncEvent: SyncEvent = event as SyncEvent;
			syncEvent.waitUntil(
				swScope.clients
					.matchAll({ type: "window", includeUncontrolled: true })
					.then((clients) => {
						for (const client of clients) {
							client.postMessage({
								type: "DENTE_BACKGROUND_SYNC_TRIGGER",
								tag: syncTag,
							});
						}
					}),
			);
		}
	});
}
