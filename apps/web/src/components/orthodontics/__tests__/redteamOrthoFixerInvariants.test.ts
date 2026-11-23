import { describe, it, expect, beforeEach, afterEach } from "vitest";
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
} from "../cephalometricPersistence";
import {
	cacheActiveCephStudy,
	getActiveCephStudy,
	clearActiveCephStudy,
	getCephSessionStorageKey,
} from "../cephStudioSyncChannel";
import { detectOptimalCephBackend } from "../cephAiInferenceService";

describe("Домен 45: Ред Тим инварианты ортодонтии и цефалометрии (DEF-ORTHO-SEV1-01 - SEV4-01)", () => {
	const originalWindow = (globalThis as unknown as { window?: unknown }).window;

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

		(globalThis as unknown as { window: unknown }).window = mockWindow;
		(globalThis as unknown as { localStorage: unknown }).localStorage = mockWindow.localStorage;
		(globalThis as unknown as { sessionStorage: unknown }).sessionStorage = mockWindow.sessionStorage;
	});

	afterEach(() => {
		(globalThis as unknown as { window?: unknown }).window = originalWindow;
		delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
		delete (globalThis as unknown as { sessionStorage?: unknown }).sessionStorage;
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
		expect(op).not.toBeNull();
		if (!op) return;

		// Направляющий вектор должен идти вперед (x возрастает к резцам)
		expect(op.p1.x).toBe(300);
		expect(op.p2.x).toBe(500);
		expect(op.forwardUnit.x).toBeGreaterThan(0);
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
		expect(wits).toBeDefined();
		expect(wits?.status).not.toBe("unmeasured");
		// Смещение AO - BO = 480 - 470 = 10 px * 0.1 = +1.0 мм (Скелетный класс I)
		expect(wits?.value).toBe(1.0);
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
		expect(cantOp).toBeDefined();
		expect(cantOp?.value).toBeGreaterThan(0);
		// Норма 9.3° ± 3.8° (5.5°..13.1°)
		expect(cantOp?.normMin).toBe(5.5);
		expect(cantOp?.normMax).toBe(13.1);
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
		expect(p1Study).not.toBeNull();
		expect(p1Study?.patientId).toBe(patient1);
		expect(p1Study?.landmarks?.S?.x).toBe(100);

		// Проверяем, что Пациент 2 НЕ видит данных Пациента 1
		const p2Study = loadLatestCephalometricStudy(patient2);
		expect(p2Study).toBeNull();

		// Очистка черновика пациента 1 удаляет только его ключ
		clearPatientCephalometricStudy(patient1);
		expect(loadLatestCephalometricStudy(patient1)).toBeNull();
	});

	it("DEF-ORTHO-SEV1-04: cephStudioSyncChannel изолирует sessionStorage по patientId", () => {
		const patient1 = "patient-uuid-alpha";
		const patient2 = "patient-uuid-beta";

		cacheActiveCephStudy({ patientId: patient1, title: "Alpha Study" }, patient1);

		const activeAlpha = getActiveCephStudy<{ title: string }>(patient1);
		expect(activeAlpha?.title).toBe("Alpha Study");

		const activeBeta = getActiveCephStudy<{ title: string }>(patient2);
		expect(activeBeta).toBeNull();

		clearActiveCephStudy(patient1);
		expect(getActiveCephStudy(patient1)).toBeNull();
	});

	// DEF-ORTHO-SEV4-01: Маркировка пресета
	it("DEF-ORTHO-SEV4-01: detectOptimalCephBackend честно маркирует пресет как Анатомический усредненный шаблон (Норма)", () => {
		const backend = detectOptimalCephBackend();
		expect(backend.backend).toBe("template_norm");
		expect(backend.label).toContain("Анатомический усредненный шаблон (Норма)");
		expect(backend.badge).toBe("Анатомический шаблон (Норма)");
	});
});
