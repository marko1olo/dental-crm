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
import { parseCephMeasurementsArray } from "../useOrthodonticsStudioHydration";
import {
	calculateSnaginaIndex,
	calculateBoltonIndex,
	calculateTonnIndex,
	calculatePontIndex,
	ORTHODONTIC_BOM_LINKS,
} from "@dental/shared";
import { APPLIANCES_CATALOG } from "../orthodonticsCatalogData";
import { DEFAULT_IPR_CONTACTS } from "../AlignerCaseTracker";

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

	// DEF-ORTHO-FE-01: Корректная распаковка study.analysis.measurements в углы ТРГ
	it("DEF-ORTHO-FE-01: parseCephMeasurementsArray корректно распаковывает массив measurements по m.id без затирания пустым ключом", () => {
		const sampleMeasurements = [
			{ id: "SNA", value: 82.5 },
			{ id: "SNB", value: 80.0 },
			{ id: "ANB", value: 2.5 },
			{ id: "1-NA-Angle", value: 22.0 },
			{ id: "1-NB-Angle", value: 25.0 },
			{ id: "FMA", value: 25.5 },
			{ id: "Wits", value: 1.2 },
			{ id: "", value: 99.9 },
			{ id: undefined, value: 50 },
			{ id: "Invalid", value: null },
		];

		const parsed = parseCephMeasurementsArray(sampleMeasurements);
		assert.equal(parsed.sna, 82.5);
		assert.equal(parsed.snb, 80.0);
		assert.equal(parsed.anb, 2.5);
		assert.equal(parsed.u1_na, 22.0);
		assert.equal(parsed.l1_nb, 25.0);
		assert.equal(parsed.fma, 25.5);
		assert.equal(parsed.wits, 1.2);
		// Гарантия, что под пустым ключом "" ничего не сохранено
		assert.equal(parsed[""], undefined);
	});

	// DEF-ORTHO-SEV1-05: Индекс Снагиной (Snagina index)
	it("DEF-ORTHO-SEV1-05: calculateSnaginaIndex вычисляет отношение 4 резцов к апикальному базису (ВЧ 61.4%, НЧ 63.8%)", () => {
		// Норма ВЧ: 31.0 мм резцы, 50.5 мм апикальный базис -> (31 / 50.5) * 100 = 61.4%
		const normUpper = calculateSnaginaIndex(31.0, 50.5, "maxilla");
		assert.equal(normUpper.ratioPercent, 61.4);
		assert.equal(normUpper.normPercent, 61.4);
		assert.equal(normUpper.discrepancyType, "normal");
		assert.ok(normUpper.interpretation.includes("норма"));

		// Сужение апикального базиса ВЧ: 34.0 мм резцы, 48.0 мм базис -> (34 / 48) * 100 = 70.8% > 61.4%
		const narrowUpper = calculateSnaginaIndex(34.0, 48.0, "maxilla");
		assert.equal(narrowUpper.ratioPercent, 70.8);
		assert.equal(narrowUpper.discrepancyType, "narrowed_base");
		assert.ok(narrowUpper.interpretation.includes("Сужение апикального базиса"));

		// Расширение апикального базиса НЧ: 22.0 мм резцы, 40.0 мм базис -> (22 / 40) * 100 = 55.0% < 63.8%
		const wideLower = calculateSnaginaIndex(22.0, 40.0, "mandible");
		assert.equal(wideLower.ratioPercent, 55.0);
		assert.equal(wideLower.normPercent, 63.8);
		assert.equal(wideLower.discrepancyType, "widened_base");
		assert.ok(wideLower.interpretation.includes("Расширение апикального базиса"));
	});

	// DEF-ORTHO-SEV1-06: Биометрические индексы (Болтон, Тонн, Пон)
	it("DEF-ORTHO-SEV1-06: Биометрические индексы Болтона, Тонна и Пона соответствуют ортодонтическим нормативам", () => {
		// Индекс Тонна: 31.0 мм / 23.3 мм = 1.33 (норма постоянного прикуса)
		const tonn = calculateTonnIndex(31.0, 23.3, false);
		assert.equal(tonn.ratio, 1.33);
		assert.equal(tonn.discrepancyType, "normal");

		// Индекс Болтона: переднее 36.3 мм / 47.0 мм = 77.2% (норма)
		const bolton = calculateBoltonIndex(47.0, 36.3, 85.0, 77.6);
		assert.equal(bolton.anteriorRatioPercent, 77.2);
		assert.equal(bolton.overallRatioPercent, 91.3);

		// Индекс Пона: SI = 31.0 -> премоляры 38.8 мм, моляры 48.4 мм
		const pont = calculatePontIndex(31.0, 38.8, 48.4);
		assert.equal(pont.calculatedPremolarWidthMm, 38.8);
		assert.equal(pont.calculatedMolarWidthMm, 48.4);
		assert.equal(pont.premolars.status, "normal");
		assert.equal(pont.molars.status, "normal");
	});

	// DEF-ORTHO-SEV1-07: Клиническая карта IPR контактов
	it("DEF-ORTHO-SEV1-07: IPR-сепарация содержит клиническую карту контактов (11-21, 12-11) с толщиной до 0.5 мм и кодом A16.07.025.001", () => {
		assert.ok(DEFAULT_IPR_CONTACTS.length >= 10, "Должно быть не менее 10 межзубных контактов ВЧ и НЧ");
		assert.ok(DEFAULT_IPR_CONTACTS.some((c) => c.contact === "11-21"));
		assert.ok(DEFAULT_IPR_CONTACTS.some((c) => c.contact === "12-11"));
		assert.ok(DEFAULT_IPR_CONTACTS.some((c) => c.contact === "41-31"));
		for (const contact of DEFAULT_IPR_CONTACTS) {
			assert.ok(contact.thicknessMm <= 0.5, "Толщина сепарации не должна превышать 0.5 мм");
			assert.equal(contact.code804n, "A16.07.025.001", "Код услуги IPR обязан быть A16.07.025.001");
		}
	});

	// DEF-ORTHO-SEV2-01: Очистка коммерческих брендов
	it("DEF-ORTHO-SEV2-01: Техкарты BOM и каталог аппаратуры очищены от промо-брендов (Ormco, Bio-Ray, FlexiLigner)", () => {
		for (const bom of ORTHODONTIC_BOM_LINKS) {
			assert.ok(!bom.itemName.includes("Ormco"), `BOM item ${bom.id} не должен содержать промо-бренд Ormco`);
			assert.ok(!bom.itemName.includes("Bio-Ray"), `BOM item ${bom.id} не должен содержать промо-бренд Bio-Ray`);
		}
		const flexiligner = APPLIANCES_CATALOG.find((a) => a.id === "flexiligner");
		assert.ok(!flexiligner?.name.includes("FlexiLigner"), "Каталог элайнеров не должен содержать коммерческий бренд FlexiLigner");
	});
});
