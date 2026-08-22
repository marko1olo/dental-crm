import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
	deleteOfflineDraft,
	generateMutationUuid,
	loadOfflineDraft,
	nowIsoWithMs,
	resetOfflineDbConnection,
	saveOfflineDraft,
} from "../utils/offlineMutationQueue";

// Locate public manifest and service worker
const candidatePaths: readonly string[] = [
	path.resolve(process.cwd(), "public/manifest.webmanifest"),
	path.resolve(process.cwd(), "apps/web/public/manifest.webmanifest"),
];
let manifestPath = "public/manifest.webmanifest";
for (const p of candidatePaths) {
	if (typeof p === "string" && fs.existsSync(p)) {
		manifestPath = p;
		break;
	}
}

const swCandidatePaths: readonly string[] = [
	path.resolve(process.cwd(), "public/sw.js"),
	path.resolve(process.cwd(), "apps/web/public/sw.js"),
];
let swPath = "public/sw.js";
for (const p of swCandidatePaths) {
	if (typeof p === "string" && fs.existsSync(p)) {
		swPath = p;
		break;
	}
}

test("PWA Manifest & Offline Mutation Outbox Verification Suite", async (t) => {
	await t.test("PWA Web App Manifest satisfies standalone installability criteria", () => {
		assert.ok(fs.existsSync(manifestPath), `manifest.webmanifest must exist at ${manifestPath}`);

		const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
		assert.equal(manifest.display, "standalone");
		assert.equal(manifest.name, "DENTE Dental CRM");
		assert.equal(manifest.short_name, "DENTE");
		assert.ok(manifest.start_url);
		assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 1);
		assert.ok(Array.isArray(manifest.shortcuts) && manifest.shortcuts.length >= 3);

		const shiftShortcut = manifest.shortcuts.find((s: { url: string }) => s.url.includes("shift"));
		assert.ok(shiftShortcut, "Form 043/u shift shortcut must be defined");
	});

	await t.test("Service worker script contains shell caching and bypass for DICOM streaming", () => {
		assert.ok(fs.existsSync(swPath), `sw.js must exist at ${swPath}`);

		const swCode = fs.readFileSync(swPath, "utf8");
		assert.ok(swCode.includes("SHELL_CACHE"));
		assert.ok(swCode.includes("isForbiddenRuntimeResponse"));
		assert.ok(swCode.includes("dicom"));
		assert.ok(swCode.includes("/api/"));
	});

	await t.test("Offline mutation queue generates valid RFC4122 UUID v4 and ISO ms timestamps", () => {
		const uuid = generateMutationUuid();
		const timestamp = nowIsoWithMs();

		assert.match(
			uuid,
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			"Generated UUID must be valid UUIDv4",
		);
		assert.ok(timestamp.includes("T") && timestamp.includes("Z"));
	});

	await t.test("Offline draft save and load workflow preserves 100% text integrity", async () => {
		const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");
		const localStorageMap = new Map<string, string>();
		const mockLocalStorage = {
			getItem: (key: string) => localStorageMap.get(key) ?? null,
			setItem: (key: string, val: string) => localStorageMap.set(key, String(val)),
			removeItem: (key: string) => localStorageMap.delete(key),
			clear: () => localStorageMap.clear(),
			get length() {
				return localStorageMap.size;
			},
			key: (i: number) => Array.from(localStorageMap.keys())[i] ?? null,
		};

		Object.defineProperty(globalThis, "window", {
			value: {
				localStorage: mockLocalStorage,
				location: { hostname: "clinic.local" },
			},
			configurable: true,
			writable: true,
		});

		try {
			resetOfflineDbConnection();
			const draftKey = `test_043_soap_${Date.now()}`;
			const soapData = {
				complaints: "Острая ноющая боль в области 4.6 зуба, усиливающаяся от холодного и горячего",
				anamnesis: "Боли появились 2 дня назад. Ранее зуб лечен по поводу кариеса",
				objective: "Зуб 4.6: глубокая кариозная полость на жевательно-медиальной поверхности. Зондирование дна резко болезненно",
				diagnosis: "К04.01 Пульпит острый очаговый",
				treatmentProtocol: "Анестезия инфильтрационная Ubistesin 1.7ml. Препарирование, экстирпация пульпы, медикаментозная обработка NaOCl 3%",
			};

			const saved = await saveOfflineDraft(
				draftKey,
				"DIARY_043_DRAFT",
				"patient-101",
				soapData,
				"org-1",
			);

			assert.equal(saved.draftKey, draftKey);
			assert.equal(saved.entityType, "DIARY_043_DRAFT");
			assert.deepEqual(saved.data, soapData);

			const loaded = await loadOfflineDraft<typeof soapData>(draftKey);
			assert.ok(loaded);
			assert.equal(loaded?.data.complaints, soapData.complaints);
			assert.equal(loaded?.data.diagnosis, soapData.diagnosis);
			assert.equal(loaded?.data.treatmentProtocol, soapData.treatmentProtocol);

			await deleteOfflineDraft(draftKey);
		} finally {
			resetOfflineDbConnection();
			if (originalWindowDesc) {
				Object.defineProperty(globalThis, "window", originalWindowDesc);
			} else {
				delete (globalThis as any).window;
			}
		}
	});
});
