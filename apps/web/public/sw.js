const SHELL_CACHE = "dental-crm-shell-v4";
const SHELL_ASSETS = [
	"/",
	"/index.html",
	"/offline.html",
	"/manifest.webmanifest",
	"/icon.svg",
];
const MAX_DYNAMIC_SHELL_CACHE_ENTRIES = 80;

function isForbiddenRuntimeResponse(url) {
	if (url.pathname.startsWith("/api/")) return true;
	if (
		/^\/(?:documents|patients|imaging|dicom|files|uploads|medical-documents)(?:\/|$)/.test(
			url.pathname,
		)
	)
		return true;
	return /\.(?:dcm|dicom|stl|obj|ply|glb|gltf|nii|nrrd|mhd|raw)$/i.test(
		url.pathname,
	);
}

function isCacheableShellAsset(url) {
	if (SHELL_ASSETS.includes(url.pathname)) return true;
	return /^\/assets\/[-A-Za-z0-9_./]+(?:\.js|\.css|\.svg|\.png|\.webp|\.woff2?)$/.test(url.pathname);
}

function isNetworkFirstShellAsset(url) {
	return (
		/\.(?:js|css)$/i.test(url.pathname) ||
		url.pathname === "/" ||
		url.pathname === "/index.html"
	);
}

async function putShellCache(request, response) {
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

async function recoverShellCacheForClientRefresh() {
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

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(SHELL_CACHE)
			.then((cache) => cache.addAll(SHELL_ASSETS))
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener("activate", (event) => {
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

self.addEventListener("message", (event) => {
	if (event.data?.type === "DENTE_SKIP_WAITING") {
		self.skipWaiting();
		return;
	}

	if (event.data?.type === "DENTE_CLEAR_SHELL_CACHE") {
		event.waitUntil(
			recoverShellCacheForClientRefresh().then(() => {
				event.source?.postMessage?.({ type: "DENTE_SHELL_CACHE_CLEARED" });
			}),
		);
	}
});

self.addEventListener("fetch", (event) => {
	const request = event.request;
	const url = new URL(request.url);

	if (
		request.method !== "GET" ||
		url.origin !== self.location.origin ||
		isForbiddenRuntimeResponse(url)
	) {
		event.respondWith(fetch(request));
		return;
	}

	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request)
				.then((response) => {
					if (response.ok) {
						const copy = response.clone();
						putShellCache("/index.html", copy);
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

	event.respondWith(
		caches.match(request).then((cached) => {
			const networkFetch = fetch(request)
				.then((response) => {
					if (response.ok && response.type !== "opaque") {
						putShellCache(request, response.clone());
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

self.addEventListener("push", (event) => {
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
			tag: payload.tag || "dente-clinical-alert",
			renotify: Boolean(payload.renotify),
		}),
	);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const targetUrl = event.notification.data?.url || "/";

	event.waitUntil(
		self.clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((clientList) => {
				for (const client of clientList) {
					if ("focus" in client) {
						client.focus();
						if ("navigate" in client && targetUrl !== "/") {
							client.navigate(targetUrl);
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

self.addEventListener("sync", (event) => {
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

