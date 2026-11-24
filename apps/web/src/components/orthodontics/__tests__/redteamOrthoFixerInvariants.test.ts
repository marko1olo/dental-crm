import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
	resolveOcclusalPlane,
	calculateCephalometrics,
	DEFAULT_CEPH_LANDMARKS_PRESET,
	type LandmarkMap,
} from "../cephalometric";
import {
	getCephStorageKey,
	loadLatestCephalometricStudy,
	saveCephalometricAnalysisToEmr,
	clearPatientCephalometricStudy,
	saveCephalometricAnalysisToApi,
	fetchPatientCephalometricStudyFromApi,
} from "../cephalometricPersistence";
import {
	cacheActiveCephStudy,
	getActiveCephStudy,
	clearActiveCephStudy,
	getCephSessionStorageKey,
} from "../cephStudioSyncChannel";
import { detectOptimalCephBackend } from "../cephAiInferenceService";

describe("Домен 45: Ред Тим инварианты ортодонтии и цефалометрии (DEF-ORTHO-SEV1-01 - SEV4-01)", () => {
	const originalWindow = (globalThis as { window?: unknown }).window;

	beforeEach(() => {
		const localStore = new Map<string, string>();
		const sessionStore = new Map<string, string>();

		const createStorage = (map: Map<string, string>) => ({
			getItem: (key: string) => map.get(key) ?? null,
			setItem: (key: string, val: string) => {
				map.set(key, val);
			},
			removeItem: (key: string) => {
				map.delete(key);
			},
			clear: () => {
				map.clear();
			},
			get length() {
				return map.size;
			},
			key: (idx: number) => Array.from(map.keys())[idx] ?? null,
		});

		const mockWindow = {
			localStorage: createStorage(localStore),
			sessionStorage: createStorage(sessionStore),
		};

		(globalThis as { window?: unknown }).window = mockWindow;
		(globalThis as { localStorage?: unknown }).localStorage = mockWindow.localStorage;
		(globalThis as { sessionStorage?: unknown }).sessionStorage = mockWindow.sessionStorage;
	});

	afterEach(() => {
		(globalThis as { window?: unknown }).window = originalWindow;
		delete (globalThis as { localStorage?: unknown }).localStorage;
		delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
	});

	// DEF-ORTHO-SEV1-01: Wits appraisal & Occlusal Plane
	it("DEF-ORTHO-SEV1-01: resolveOcclusalPlane строит честную окклюзионную плоскость через Mo и резцы", () => {
		const landmarks: LandmarkMap = {
			...DEFAULT_CEPH_LANDMARKS_PRESET,
			U1t: { x: 500, y: 400 },
			L1t: { x: 500, y: 400 },
			Mo: { x: 300, y: 390 }, // Наклон 10px вверх при движении назад
		};

		const op = resolveOcclusalPlane(landmarks);
		assert.notEqual(op, null);
		if (!op) return;

		// Направляющий вектор должен идти вперед (x возрастает к резцам)
		assert.equal(op.p1.x, 300);
		assert.equal(op.p2.x, 500);
		assert.ok(op.forwardUnit.x > 0);
	});

	it("DEF-ORTHO-SEV1-01: Wits appraisal вычисляет проекции A и B на окклюзионную плоскость, а не фиктивный горизонтальный вектор", () => {
		const landmarks: LandmarkMap = {
			...DEFAULT_CEPH_LANDMARKS_PRESET,
			U1t: { x: 500, y: 400 },
			L1t: { x: 500, y: 400 },
			Mo: { x: 300, y: 400 }, // Горизонтальная OP
			A: { x: 480, y: 350 }, // Проекция A на OP: x = 480
			B: { x: 470, y: 450 }, // Проекция B на OP: x = 470
		};

		const result = calculateCephalometrics(landmarks, 0.1); // scale: 0.1 мм на пиксель
		const wits = result.measurements.find((m) => m.id === "Wits");
		assert.ok(wits !== undefined);
		assert.notEqual(wits?.status, "unmeasured");
		// Смещение AO - BO = 480 - 470 = 10 px * 0.1 = +1.0 мм (Скелетный класс I)
		assert.equal(wits?.value, 1.0);
	});

	// DEF-ORTHO-SEV1-02: Downs Cant of Occlusal Plane
	it("DEF-ORTHO-SEV1-02: Downs Cant of Occlusal Plane вычисляется между Po-Or и окклюзионной плоскостью", () => {
		const landmarks: LandmarkMap = {
			...DEFAULT_CEPH_LANDMARKS_PRESET,
			Po: { x: 200, y: 300 },
			Or: { x: 400, y: 300 }, // Горизонтальная линия FH (0°)
			U1t: { x: 500, y: 400 },
			L1t: { x: 500, y: 400 },
			Mo: { x: 300, y: 380 }, // OP имеет наклон: dy=20, dx=200 -> ~5.7°
		};

		const result = calculateCephalometrics(landmarks, 0.15);
		const cantOp = result.measurements.find((m) => m.id === "Downs-CantOP");
		assert.ok(cantOp !== undefined);
		assert.ok((cantOp?.value ?? 0) > 0);
		// Норма 9.3° ± 3.8° (5.5°..13.1°)
		assert.equal(cantOp?.normMin, 5.5);
		assert.equal(cantOp?.normMax, 13.1);
	});

	// DEF-ORTHO-SEV1-04: Изоляция стейта ТРГ по patientId (Zero-Leak Draft: Mandates 8d/8zq, 8bn)
	it("DEF-ORTHO-SEV1-04: ТРГ исследование изолировано по patientId и не утекает следующему пациенту", () => {
		const patient1 = "patient-uuid-1111";
		const patient2 = "patient-uuid-2222";

		// Сохраняем исследование для Пациента 1
		saveCephalometricAnalysisToEmr({
			id: "ceph-study-1",
			patientId: patient1,
			patientName: "Пациент Первый",
			landmarks: { S: { x: 100, y: 100 } },
		});

		// Проверяем, что Пациент 1 загружает свои данные
		const p1Study = loadLatestCephalometricStudy(patient1);
		assert.notEqual(p1Study, null);
		assert.equal(p1Study?.patientId, patient1);
		assert.equal(p1Study?.landmarks?.S?.x, 100);

		// Проверяем, что Пациент 2 НЕ видит данных Пациента 1
		const p2Study = loadLatestCephalometricStudy(patient2);
		assert.equal(p2Study, null);

		// Очистка черновика пациента 1 удаляет только его ключ
		clearPatientCephalometricStudy(patient1);
		assert.equal(loadLatestCephalometricStudy(patient1), null);
	});

	it("DEF-ORTHO-SEV1-04: cephStudioSyncChannel изолирует sessionStorage по patientId", () => {
		const patient1 = "patient-uuid-alpha";
		const patient2 = "patient-uuid-beta";

		cacheActiveCephStudy({ patientId: patient1, title: "Alpha Study" }, patient1);

		const activeAlpha = getActiveCephStudy<{ title: string }>(patient1);
		assert.equal(activeAlpha?.title, "Alpha Study");

		const activeBeta = getActiveCephStudy<{ title: string }>(patient2);
		assert.equal(activeBeta, null);

		clearActiveCephStudy(patient1);
		assert.equal(getActiveCephStudy(patient1), null);
	});

	// DEF-ORTHO-SEV4-01: Маркировка пресета
	it("DEF-ORTHO-SEV4-01: detectOptimalCephBackend честно маркирует пресет как Анатомический усредненный шаблон (Норма)", () => {
		const backend = detectOptimalCephBackend();
		assert.equal(backend.backend, "template_norm");
		assert.ok(backend.label.includes("Анатомический усредненный шаблон (Норма)"));
		assert.equal(backend.badge, "Анатомический шаблон (Норма)");
	});

	// DEF-ORTHO-PERSIST-01: Защита fetch от ERR_INVALID_URL в Node.js / JSDOM
	it("DEF-ORTHO-PERSIST-01: saveCephalometricAnalysisToApi и fetchPatientCephalometricStudyFromApi безопасно разрешают origin без ERR_INVALID_URL", async () => {
		const interceptedUrls: string[] = [];
		const originalFetch = globalThis.fetch;

		globalThis.fetch = (async (input: RequestInfo | URL) => {
			const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
			interceptedUrls.push(urlStr);
			return new Response(JSON.stringify({ success: true, study: { id: "ceph-mocked" } }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}) as typeof fetch;

		try {
			const saveRes = await saveCephalometricAnalysisToApi({
				id: "study-origin-test",
				patientId: "patient-origin-test",
			});
			assert.notEqual(saveRes, null);
			assert.equal(saveRes?.id, "ceph-mocked");
			assert.ok(interceptedUrls.length > 0);
			assert.match(interceptedUrls[0] ?? "", /^https?:\/\/[^/]+\/api\/orthodontics\/patient-origin-test\/ceph-analysis$/);

			const fetchRes = await fetchPatientCephalometricStudyFromApi("patient-origin-test");
			assert.notEqual(fetchRes, null);
			assert.equal(fetchRes?.id, "ceph-mocked");
			assert.equal(interceptedUrls.length, 2);
			assert.match(interceptedUrls[1] ?? "", /^https?:\/\/[^/]+\/api\/orthodontics\/patient-origin-test\/ceph-analysis$/);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
