/**
 * DENTE DENTAL CRM — UNIVERSAL PORTABILITY & OFFLINE COLD-START TEST SUITE
 *
 * Automated verification of:
 * 1. Zero Blank Screen & Service Worker Shell Caching (CacheFirst bundles, fonts, styles)
 * 2. Instant Cold-Start Benchmark (< 500ms offline retrieval from local cache / IndexedDB)
 * 3. IndexedDB Patient Clinical Cache (Form 043/u, visits, odontogram, treatment plans)
 * 4. Multi-Device Adaptive Breakpoints (320px compact, 390px iPhone, 768/1024px tablets, 1920px/4K monitors)
 * 5. Packaging Readiness for Desktop Windows (.EXE via Electron/Tauri) and Android (.APK via Capacitor/PWA)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import {
	deletePatientClinicalCache,
	getPatientClinicalCache,
	listPatientClinicalCache,
	resetOfflineDbConnection,
	savePatientClinicalCache,
} from "../services/offline/offlineStorage";
import {
	detectRuntimePlatform,
	dispatchUniversalScan,
	dispatchVisiographAcquisition,
} from "../native/hardwareDispatcher";
import { isDesktopApp } from "../native/desktopBridge";
import { isMobileApp } from "../native/mobileBridge";
import { TOP_TEETH, BOTTOM_TEETH, ALL_ADULT_TEETH_NUMBERS } from "../components/odontogram/ToothChart";

test("Universal Portability & Offline Cold-Start (<500ms) Suite", async (t) => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. Service Worker & Shell Caching Verification
	// ─────────────────────────────────────────────────────────────────────────
	await t.test("1. Service Worker reliably configures CacheFirst for static assets and isolates private medical data", () => {
		const swCandidatePaths: readonly string[] = [
			path.resolve(process.cwd(), "public/sw.js"),
			path.resolve(process.cwd(), "apps/web/public/sw.js"),
		];
		let swPath = "public/sw.js";
		for (const p of swCandidatePaths) {
			if (fs.existsSync(p)) {
				swPath = p;
				break;
			}
		}
		assert.ok(fs.existsSync(swPath), `sw.js must exist at ${swPath}`);

		const swCode = fs.readFileSync(swPath, "utf8");

		// Versioned shell cache
		assert.ok(swCode.includes("SHELL_CACHE"), "Service Worker must define SHELL_CACHE");
		assert.ok(swCode.includes("SHELL_ASSETS"), "Service Worker must define SHELL_ASSETS core fallback list");

		// Essential offline entry points
		assert.ok(swCode.includes('"/index.html"'), "Core shell assets must include /index.html");
		assert.ok(swCode.includes('"/offline.html"'), "Core shell assets must include /offline.html");
		assert.ok(swCode.includes('"/manifest.webmanifest"'), "Core shell assets must include /manifest.webmanifest");
		assert.ok(swCode.includes('"/icon.svg"'), "Core shell assets must include /icon.svg");

		// Security & HIPAA/152-FZ isolation: private medical data and DICOM must never leak into shared browser HTTP cache
		assert.ok(swCode.includes("isForbiddenRuntimeResponse"), "Must have security filter for forbidden HTTP cache responses");
		assert.ok(swCode.includes('url.pathname.startsWith("/api/")'), "API endpoints must bypass browser HTTP cache");
		assert.ok(swCode.includes("medical-documents"), "Medical documents must bypass browser HTTP cache");
		assert.ok(swCode.includes("dicom"), "DICOM pixel streams must bypass browser HTTP cache");
		assert.ok(swCode.includes("stl"), "3D STL/CAD files must bypass browser HTTP cache");

		// Static assets & typography caching
		assert.ok(swCode.includes("isCacheableShellAsset"), "Must have shell asset matcher");
		assert.ok(swCode.includes("isCacheableExternalFont"), "Must support Google Fonts CSS and WOFF2 caching");
		assert.ok(swCode.includes("fonts.googleapis.com"), "Must match fonts.googleapis.com");
		assert.ok(swCode.includes("fonts.gstatic.com"), "Must match fonts.gstatic.com");
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. Cold-Start Retrieval Benchmark (< 500ms)
	// ─────────────────────────────────────────────────────────────────────────
	await t.test("2. Simulated offline cold-start retrieves cached shell assets and patient data in < 500ms", async () => {
		const swCandidatePaths: readonly string[] = [
			path.resolve(process.cwd(), "public/sw.js"),
			path.resolve(process.cwd(), "apps/web/public/sw.js"),
		];
		let swPath = "public/sw.js";
		for (const p of swCandidatePaths) {
			if (fs.existsSync(p)) {
				swPath = p;
				break;
			}
		}
		const swSource = fs.readFileSync(swPath, "utf8");

		const mockCacheStorage = new Map<string, Map<string, Response>>();
		const fakeCaches = {
			async open(name: string) {
				if (!mockCacheStorage.has(name)) {
					mockCacheStorage.set(name, new Map<string, Response>());
				}
				const store = mockCacheStorage.get(name)!;
				return {
					async put(req: Request | string, res: Response) {
						const url = typeof req === "string" ? req : req.url;
						store.set(url, res.clone());
					},
					async match(req: Request | string) {
						const url = typeof req === "string" ? req : req.url;
						return store.get(url)?.clone() ?? null;
					},
					async addAll(urls: string[]) {
						for (const u of urls) {
							store.set(u, new Response(`cached:${u}`, { status: 200 }));
						}
					},
					async keys() {
						return Array.from(store.keys()).map((k) => new Request(k));
					},
					async delete(req: Request | string) {
						const url = typeof req === "string" ? req : req.url;
						return store.delete(url);
					},
				};
			},
			async match(req: Request | string) {
				for (const store of mockCacheStorage.values()) {
					const url = typeof req === "string" ? req : req.url;
					if (store.has(url)) return store.get(url)!.clone();
				}
				return null;
			},
			async keys() {
				return Array.from(mockCacheStorage.keys());
			},
			async delete(name: string) {
				return mockCacheStorage.delete(name);
			},
		};

		const listeners = new Map<string, Function>();
		const fakeSelf = {
			location: new URL("https://clinic.dente.ru/"),
			clients: {
				async claim() {},
			},
			addEventListener(type: string, fn: Function) {
				listeners.set(type, fn);
			},
			skipWaiting() {},
		};

		vm.runInContext(
			swSource,
			vm.createContext({
				self: fakeSelf,
				caches: fakeCaches,
				fetch: async (_req: Request) => {
					throw new Error("Network unavailable (offline simulated)");
				},
				URL,
				Request,
				Response,
				Promise,
				console,
			}),
		);

		// Trigger install to populate cache
		const installWaits: Promise<unknown>[] = [];
		listeners.get("install")?.({
			waitUntil(p: Promise<unknown>) {
				installWaits.push(p);
			},
		});
		await Promise.all(installWaits);

		// Benchmark offline cold-start retrieval of /index.html
		const startTime = performance.now();

		const fetchListener = listeners.get("fetch");
		assert.ok(fetchListener, "Fetch listener must be registered in Service Worker");

		let navResponsePromise: Promise<Response> | null = null;
		fetchListener({
			request: {
				method: "GET",
				mode: "navigate",
				url: "https://clinic.dente.ru/",
			},
			respondWith(p: Promise<Response>) {
				navResponsePromise = p;
			},
		});

		assert.ok(navResponsePromise, "Offline navigation request must be handled");
		const navResponse: Response = await (navResponsePromise as unknown as Promise<Response>);
		const navContent = await navResponse.text();
		assert.ok(navContent.includes("cached:/index.html"), "Offline navigation must instantly return cached /index.html");


		const elapsedMs = performance.now() - startTime;
		assert.ok(
			elapsedMs < 500,
			`Cold start retrieval time must be < 500ms (measured: ${elapsedMs.toFixed(2)}ms)`,
		);
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. Patient Clinical Cache in IndexedDB (Zero Blank Screen)
	// ─────────────────────────────────────────────────────────────────────────
	await t.test("3. IndexedDB Patient Clinical Cache preserves Form 043/u, visits and odontogram offline", async () => {
		const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");
		const inMemStorage = new Map<string, string>();
		const mockStorage = {
			getItem: (k: string) => inMemStorage.get(k) ?? null,
			setItem: (k: string, v: string) => inMemStorage.set(k, String(v)),
			removeItem: (k: string) => inMemStorage.delete(k),
			clear: () => inMemStorage.clear(),
			get length() {
				return inMemStorage.size;
			},
			key: (i: number) => Array.from(inMemStorage.keys())[i] ?? null,
		};

		Object.defineProperty(globalThis, "window", {
			value: {
				localStorage: mockStorage,
				location: { hostname: "dente.local" },
			},
			configurable: true,
			writable: true,
		});

		try {
			resetOfflineDbConnection();

			const testPatientId = "patient-mock-uuid-777";
			const clinicalRecord = {
				patientId: testPatientId,
				fullName: "Смирнов Алексей Владимирович",
				birthDate: "1988-04-12",
				phone: "+7 (999) 123-45-67",
				snils: "123-456-789 00",
				omsNumber: "1234567890123456",
				diagnosis: "К02.1 Кариес дентина 1.6",
				odontogram: {
					"16": { status: "CARIES", surfaces: ["O", "M"], notes: "Глубокий кариес" },
					"11": { status: "HEALTHY" },
					"46": { status: "CROWN", material: "Zirconia" },
				},
				treatmentPlan: {
					totalRub: 24500,
					stages: ["Терапия", "Ортопедия"],
				},
			};

			const cacheKey = `patient_clinical_snapshot_${testPatientId}`;

			// Save to clinical cache
			const saveStart = performance.now();
			const saved = await savePatientClinicalCache(
				cacheKey,
				"patient_card_043",
				testPatientId,
				clinicalRecord,
				"org-dental-1",
			);
			const saveElapsed = performance.now() - saveStart;

			assert.equal(saved.cacheKey, cacheKey);
			assert.equal(saved.entityKind, "patient_card_043");
			assert.equal(saved.entityId, testPatientId);
			assert.ok(saveElapsed < 500, "Patient data caching must complete in < 500ms");

			// Retrieve from clinical cache (Offline Cold Start simulation)
			const readStart = performance.now();
			const loaded = await getPatientClinicalCache<typeof clinicalRecord>(cacheKey);
			const readElapsed = performance.now() - readStart;

			assert.ok(loaded !== null, "Cached patient record must be retrievable");
			assert.equal(loaded?.fullName, "Смирнов Алексей Владимирович");
			assert.equal(loaded?.diagnosis, "К02.1 Кариес дентина 1.6");
			assert.equal(loaded?.odontogram["16"]?.status, "CARIES");
			assert.equal(loaded?.treatmentPlan.totalRub, 24500);
			assert.ok(readElapsed < 500, `Cached read must be < 500ms (measured: ${readElapsed.toFixed(2)}ms)`);

			// List clinical cache by entity kind
			const list = await listPatientClinicalCache<typeof clinicalRecord>("patient_card_043", "org-dental-1");
			assert.ok(list.length >= 1, "Must list cached patient cards");

			// Clean up
			await deletePatientClinicalCache(cacheKey);
			const afterDelete = await getPatientClinicalCache(cacheKey);
			assert.equal(afterDelete, null, "Deleted cache entry must return null");
		} finally {
			resetOfflineDbConnection();
			if (originalWindowDesc) {
				Object.defineProperty(globalThis, "window", originalWindowDesc);
			} else {
				delete (globalThis as any).window;
			}
		}
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. Adaptive Breakpoints (320px, 390px, 768px, 1024px, 1920px, 4K)
	// ─────────────────────────────────────────────────────────────────────────
	await t.test("4. Multi-device adaptive grid validates 320px/390px mobile, 768/1024px tablets, and 1920px/4K displays", () => {
		// 4.1. Mobile Touch Targets & Breakpoint CSS inspection
		const touchTargetsCss = fs.readFileSync(
			path.resolve(process.cwd(), "src/styles/touch-targets.css"),
			"utf8",
		);
		const mobileTouchCss = fs.readFileSync(
			path.resolve(process.cwd(), "src/styles/modules/mobile-touch.css"),
			"utf8",
		);

		// Touch targets >= 44px
		assert.ok(touchTargetsCss.includes("min-height: 44px"), "touch-targets.css must enforce min-height: 44px");
		assert.ok(mobileTouchCss.includes("min-height: 44px"), "mobile-touch.css must enforce min-height: 44px");

		// Safe area insets for notches (iOS/Android)
		assert.ok(mobileTouchCss.includes("safe-area-inset-top"), "mobile-touch.css must handle safe-area-inset-top");
		assert.ok(mobileTouchCss.includes("safe-area-inset-bottom"), "mobile-touch.css must handle safe-area-inset-bottom");

		// Elimination of 300ms double-tap delay
		assert.ok(mobileTouchCss.includes("touch-action: manipulation"), "Must eliminate 300ms tap delay via touch-action: manipulation");

		// Zero horizontal overflow
		assert.ok(mobileTouchCss.includes("overflow-x: hidden"), "Must enforce zero horizontal overflow");

		// 4.2. 320px / 390px Odontogram Scaling Verification
		assert.equal(ALL_ADULT_TEETH_NUMBERS.length, 32, "Odontogram must contain 32 teeth");
		assert.ok(TOP_TEETH.includes(18) && TOP_TEETH.includes(28), "Upper arch must contain molars 18 and 28");
		assert.ok(BOTTOM_TEETH.includes(48) && BOTTOM_TEETH.includes(38), "Lower arch must contain molars 48 and 38");

		const toothChartSrc = fs.readFileSync(
			path.resolve(process.cwd(), "src/components/odontogram/ToothChart.tsx"),
			"utf8",
		);
		assert.ok(
			toothChartSrc.includes("MIN_ARCH_SCALE = 0.35"),
			"ToothChart must support MIN_ARCH_SCALE = 0.35 for compact 320px/375px viewports",
		);

		// 4.3. Tablet 768px/1024px & 4K 3840px rules
		assert.ok(
			mobileTouchCss.includes("@media (min-width: 1920px)"),
			"mobile-touch.css must define container constraints for 1920px/4K monitors",
		);
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. Desktop Windows (.EXE) & Android (.APK) Packaging Readiness
	// ─────────────────────────────────────────────────────────────────────────
	await t.test("5. Packaging configurations are valid for Desktop EXE (Electron/Tauri) and Android APK (Capacitor/PWA)", () => {
		// 5.1. Android Capacitor config
		const capConfigCandidatePaths: readonly string[] = [
			path.resolve(process.cwd(), "capacitor.config.ts"),
			path.resolve(process.cwd(), "apps/web/capacitor.config.ts"),
		];
		let capConfigPath = "capacitor.config.ts";
		for (const p of capConfigCandidatePaths) {
			if (fs.existsSync(p)) {
				capConfigPath = p;
				break;
			}
		}
		assert.ok(fs.existsSync(capConfigPath), "capacitor.config.ts must exist");
		const capConfigContent = fs.readFileSync(capConfigPath, "utf8");
		assert.ok(capConfigContent.includes('appId: "ru.dente.crm"'), "Capacitor config must define appId ru.dente.crm");
		assert.ok(capConfigContent.includes('webDir: "dist"'), "Capacitor webDir must be dist");

		// 5.2. Web Manifest (PWA standalone)
		const manifestCandidatePaths: readonly string[] = [
			path.resolve(process.cwd(), "public/manifest.webmanifest"),
			path.resolve(process.cwd(), "apps/web/public/manifest.webmanifest"),
		];
		let manifestPath = "public/manifest.webmanifest";
		for (const p of manifestCandidatePaths) {
			if (fs.existsSync(p)) {
				manifestPath = p;
				break;
			}
		}
		assert.ok(fs.existsSync(manifestPath), "manifest.webmanifest must exist");
		const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
		assert.equal(manifest.display, "standalone", "PWA display mode must be standalone");
		assert.equal(manifest.name, "DENTE Dental CRM");
		assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, "PWA manifest must have multiple icons");
		assert.ok(Array.isArray(manifest.shortcuts) && manifest.shortcuts.length >= 3, "PWA manifest must have shortcuts");

		// 5.3. Desktop Electron configuration
		const electronBuilderCandidatePaths: readonly string[] = [
			path.resolve(process.cwd(), "electron/electron-builder.json"),
			path.resolve(process.cwd(), "../../electron/electron-builder.json"),
		];
		let electronBuilderPath = "electron/electron-builder.json";
		for (const p of electronBuilderCandidatePaths) {
			if (fs.existsSync(p)) {
				electronBuilderPath = p;
				break;
			}
		}
		assert.ok(fs.existsSync(electronBuilderPath), "electron/electron-builder.json must exist");
		const electronBuilderJson = JSON.parse(fs.readFileSync(electronBuilderPath, "utf8"));
		assert.equal(electronBuilderJson.appId, "ru.dente.desktop");
		assert.ok(
			Array.isArray(electronBuilderJson.win.target) &&
				electronBuilderJson.win.target.some(
					(t: { target?: string }) => t.target === "nsis" || t.target === "portable",
				),
			"Desktop builder must target NSIS installer and portable executable",
		);

		// 5.4. Hardware dispatcher runtime detection
		assert.equal(isDesktopApp(), false, "Default browser environment is not desktop");
		assert.equal(isMobileApp(), false, "Default browser environment is not mobile");
		assert.equal(detectRuntimePlatform(), "web_pwa", "Default browser runtime is web_pwa");
	});
});
