import assert from "node:assert";
import type { TestContext } from "node:test";
import { test } from "node:test";
import Fastify from "fastify";
import {
	cleanDicomName,
	compareFioTokens,
	evaluateBirthDateScore,
	levenshteinDistance,
	matchSingleWord,
	normalizeBirthDate,
	stringSimilarity,
	tokenizeName,
	transliterateEnToRu,
	transliterateRuToEn,
	calculateMatchScore,
} from "./imaging/patientFioBindingEngine.js";
import { registerStudiesRoutes } from "./imaging/studiesRoutes.js";
import { signToken } from "../utils/cryptoHelper.js";
import { authTokenSecret } from "../security/authSecret.js";
import { STAFF_TOKEN_HEADER } from "../security/identity.js";
import { db } from "../db/client.js";
import * as schema from "../db/schema.js";

process.env.NODE_ENV = "test";
process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
delete process.env.DENTE_CLINICAL_ADMIN_SECRET;

const ORG_ID = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
const PATIENT_ID = "55555555-5555-5555-5555-555555555555";
const STUDY_ID = "99999999-9999-9999-9999-999999999999";

function createAuthHeader(): Record<string, string> {
	const token = signToken(
		{
			userId: "11111111-1111-1111-1111-111111111111",
			organizationId: ORG_ID,
			role: "doctor",
		},
		authTokenSecret(),
	);
	return {
		[STAFF_TOKEN_HEADER]: token,
		authorization: `Bearer ${token}`,
	};
}

// ─── 1. ТЕСТЫ НОРМАЛИЗАЦИИ И ТРАНСЛИТЕРАЦИИ ФИО ────────────────────────────────

test("cleanDicomName: корректно очищает спецсимволы DICOM, префиксы и суффиксы", () => {
	assert.strictEqual(
		cleanDicomName("Zakharov^Ivan^Petrovich"),
		"Zakharov Ivan Petrovich",
	);
	assert.strictEqual(
		cleanDicomName("Dr. Amirova E.A. (CT)"),
		"Amirova E A",
	);
	assert.strictEqual(
		cleanDicomName("MR. Ivanov^Ivan"),
		"Ivanov Ivan",
	);
	assert.strictEqual(cleanDicomName(null), "");
	assert.strictEqual(cleanDicomName(""), "");
});

test("transliterateRuToEn & transliterateEnToRu: ГОСТ 7.79 / ICAO транслит", () => {
	const ru = "Захаров Иван";
	const en = transliterateRuToEn(ru);
	assert.strictEqual(en, "zakharov ivan");

	const enBack = transliterateEnToRu("Zakharov");
	assert.ok(enBack.includes("захаров"));

	assert.strictEqual(transliterateRuToEn("Амирова"), "amirova");
	assert.strictEqual(transliterateRuToEn("Щербаков"), "shcherbakov");
});

test("levenshteinDistance & stringSimilarity: метрика расстояния", () => {
	assert.strictEqual(levenshteinDistance("test", "test"), 0);
	assert.strictEqual(levenshteinDistance("test", "tent"), 1);
	assert.strictEqual(stringSimilarity("test", "test"), 1.0);
	assert.ok(stringSimilarity("zakharov", "zaharov") >= 0.85);
});

test("matchSingleWord: перекрестное сопоставление слов с транслитом", () => {
	// Точное совпадение с транслитом
	assert.ok(matchSingleWord("zakharov", "захаров") >= 0.95);
	assert.ok(matchSingleWord("amirova", "амирова") >= 0.95);
	assert.ok(matchSingleWord("ivan", "иван") >= 0.95);

	// Несовпадающие слова
	assert.ok(matchSingleWord("ivan", "петр") < 0.5);
});

test("compareFioTokens: независимость от порядка слов и учет инициалов", () => {
	// Порядок: Фамилия Имя vs Имя Фамилия
	const scoreReverse = compareFioTokens("Zakharov^Ivan", "Иван Захаров");
	assert.ok(scoreReverse >= 90, `Ожидался скор >= 90, получено: ${scoreReverse}`);

	// Совпадение с отчеством
	const scoreFull = compareFioTokens(
		"Zakharov^Ivan^Petrovich",
		"Захаров Иван Петрович",
	);
	assert.ok(scoreFull >= 95, `Ожидался скор >= 95, получено: ${scoreFull}`);

	// Фамилия и инициал
	const scoreInitials = compareFioTokens("Zakharov I.", "Захаров Иван");
	assert.ok(scoreInitials >= 85, `Ожидался скор >= 85, получено: ${scoreInitials}`);

	// Одиночная фамилия
	const scoreSurnameOnly = compareFioTokens("Amirova", "Амирова Елена Дмитриевна");
	assert.ok(
		scoreSurnameOnly >= 60 && scoreSurnameOnly <= 80,
		`Ожидался скор 60..80, получено: ${scoreSurnameOnly}`,
	);

	// Совершенно чужие люди
	const scoreDiff = compareFioTokens("Sidorov", "Захаров Иван");
	assert.ok(scoreDiff < 50, `Ожидался скор < 50, получено: ${scoreDiff}`);
});

// ─── 2. ТЕСТЫ ДАТЫ РОЖДЕНИЯ ────────────────────────────────────────────────────

test("normalizeBirthDate: распознает форматы YYYYMMDD, YYYY-MM-DD и DD.MM.YYYY", () => {
	const d1 = normalizeBirthDate("19850412");
	assert.strictEqual(d1.fullIso, "1985-04-12");
	assert.strictEqual(d1.year, 1985);

	const d2 = normalizeBirthDate("12.04.1985");
	assert.strictEqual(d2.fullIso, "1985-04-12");
	assert.strictEqual(d2.year, 1985);

	const d3 = normalizeBirthDate("1985-04-12");
	assert.strictEqual(d3.year, 1985);

	const dNull = normalizeBirthDate(null);
	assert.strictEqual(dNull.year, null);
});

test("evaluateBirthDateScore: начисляет бонус при совпадении и штрафует при конфликте", () => {
	// Точное совпадение
	const exact = evaluateBirthDateScore("19850412", "1985-04-12");
	assert.strictEqual(exact.bonus, 30);
	assert.strictEqual(exact.conflict, false);

	// Совпадение года
	const yearOnly = evaluateBirthDateScore("19850101", "1985-12-31");
	assert.strictEqual(yearOnly.bonus, 15);
	assert.strictEqual(yearOnly.conflict, false);

	// Конфликт (разные годы)
	const conflict = evaluateBirthDateScore("19850412", "1960-05-15");
	assert.strictEqual(conflict.bonus, -40);
	assert.strictEqual(conflict.conflict, true);
});

// ─── 3. ИТОГОВЫЙ СКОРИНГ ПРИВЯЗКИ ──────────────────────────────────────────────

test("calculateMatchScore: скоринг и статусы (auto_bound, pending_review, unassigned)", () => {
	// 1. auto_bound: точное имя + совпадение даты рождения
	const matchAuto = calculateMatchScore(
		{
			dicomPatientName: "Zakharov^Ivan",
			dicomBirthDate: "19850412",
		},
		{
			id: PATIENT_ID,
			fullName: "Захаров Иван",
			birthDate: "1985-04-12",
		},
	);
	assert.strictEqual(matchAuto.status, "auto_bound");
	assert.ok(matchAuto.confidence >= 90);

	// 2. pending_review: частичное совпадение (только фамилия Amirova)
	const matchReview = calculateMatchScore(
		{
			dicomPatientName: "Amirova",
		},
		{
			id: PATIENT_ID,
			fullName: "Амирова Елена Дмитриевна",
			birthDate: "1990-01-01",
		},
	);
	assert.strictEqual(matchReview.status, "pending_review");
	assert.ok(matchReview.confidence >= 60 && matchReview.confidence < 90);

	// 3. unassigned: конфликт года рождения блокирует автопривязку
	const matchConflict = calculateMatchScore(
		{
			dicomPatientName: "Zakharov^Ivan",
			dicomBirthDate: "19850412",
		},
		{
			id: PATIENT_ID,
			fullName: "Захаров Иван",
			birthDate: "1950-01-01", // Дедушка с тем же именем
		},
	);
	assert.strictEqual(matchConflict.status, "unassigned");
	assert.ok(matchConflict.confidence <= 50);

	// 4. auto_bound: совпадение по UUID PatientID
	const matchPid = calculateMatchScore(
		{
			dicomPatientId: PATIENT_ID,
			dicomPatientName: "Random Name",
		},
		{
			id: PATIENT_ID,
			fullName: "Иванов Иван",
		},
	);
	assert.strictEqual(matchPid.status, "auto_bound");
	assert.strictEqual(matchPid.confidence, 100);
});

// ─── 4. РОУТ ТЕСТЫ FASTIFY ──────────────────────────────────────────────────────

const mockStudyDbRow = {
	id: STUDY_ID,
	organizationId: ORG_ID,
	patientId: PATIENT_ID,
	visitId: null,
	doctorId: null,
	kind: "cbct" as const,
	title: "Исследование КЛКТ",
	toothCode: null,
	region: null,
	capturedAt: new Date("2026-03-01T10:00:00.000Z"),
	sourceKind: "dicomweb" as const,
	sourceName: "STOW-RS",
	status: "available" as const,
	storagePath: "/data/imaging/test.dcm",
	fileSizeBytes: 102400,
	modality: "CT",
	seriesDescription: "Jaw 3D",
	studyDate: "2026-03-01",
	sliceCount: 200,
	dimensions: "512x512x200",
	voxelSpacing: "0.2x0.2x0.2",
	studyInstanceUid: "1.2.840.113619.2.55.1",
	seriesInstanceUid: "1.2.840.113619.2.55.1.1",
	bindingStatus: "auto_bound" as const,
	bindingConfidence: 95,
	dicomPatientName: "Zakharov Ivan",
	dicomPatientId: PATIENT_ID,
	dicomBirthDate: "1985-04-12",
	aiSummary: "Автопривязано к пациенту: Захаров Иван",
	createdAt: new Date("2026-03-01T10:00:00.000Z"),
	updatedAt: new Date("2026-03-01T10:00:00.000Z"),
};

test("GET /api/imaging/studies: фильтрация по modality, bindingStatus и поиск", async (t: TestContext) => {
	const app = Fastify();
	await registerStudiesRoutes(app);

	t.mock.method(db, "select", () => {
		const chain: any = {
			from: () => chain,
			leftJoin: () => chain,
			innerJoin: () => chain,
			where: () => chain,
			orderBy: () => chain,
			limit: () => chain,
			offset: () => chain,
			then: (
				onfulfilled?: ((val: unknown) => unknown) | null,
				onrejected?: ((err: unknown) => unknown) | null,
			) =>
				Promise.resolve([
					{
						study: mockStudyDbRow,
						patientFullName: "Захаров Иван",
					},
				]).then(onfulfilled, onrejected),
		};
		return chain;
	});

	const res = await app.inject({
		method: "GET",
		url: "/api/imaging/studies?modality=CT&bindingStatus=auto_bound&search=Захаров",
		headers: createAuthHeader(),
	});

	assert.strictEqual(res.statusCode, 200);
	const data = res.json();
	assert.ok(Array.isArray(data));
	assert.strictEqual(data.length, 1);
	assert.strictEqual(data[0].id, STUDY_ID);
	assert.strictEqual(data[0].bindingStatus, "auto_bound");
	assert.strictEqual(data[0].modality, "CT");
	assert.strictEqual(data[0].patientFullName, "Захаров Иван");
});

test("POST /api/imaging/studies/:id/bind-patient: ручная привязка врачом", async (t: TestContext) => {
	const app = Fastify();
	await registerStudiesRoutes(app);

	t.mock.method(db, "select", () => {
		const chain: any = {
			from: () => chain,
			where: () => chain,
			limit: () => chain,
			then: (
				onfulfilled?: ((val: unknown) => unknown) | null,
				onrejected?: ((err: unknown) => unknown) | null,
			) =>
				Promise.resolve([
					{
						id: PATIENT_ID,
						fullName: "Захаров Иван",
					},
				]).then(onfulfilled, onrejected),
		};
		return chain;
	});

	t.mock.method(db, "update", () => {
		const chain: any = {
			set: () => chain,
			where: () => chain,
			returning: () => chain,
			then: (
				onfulfilled?: ((val: unknown) => unknown) | null,
				onrejected?: ((err: unknown) => unknown) | null,
			) =>
				Promise.resolve([
					{
						...mockStudyDbRow,
						patientId: PATIENT_ID,
						bindingStatus: "manual_bound",
						bindingConfidence: 100,
						aiSummary: "Вручную привязано врачом к пациенту: Захаров Иван",
					},
				]).then(onfulfilled, onrejected),
		};
		return chain;
	});

	const res = await app.inject({
		method: "POST",
		url: `/api/imaging/studies/${STUDY_ID}/bind-patient`,
		headers: createAuthHeader(),
		payload: {
			patientId: PATIENT_ID,
		},
	});

	assert.strictEqual(res.statusCode, 200);
	const data = res.json();
	assert.strictEqual(data.bindingStatus, "manual_bound");
	assert.strictEqual(data.bindingConfidence, 100);
	assert.strictEqual(data.patientId, PATIENT_ID);
	assert.strictEqual(data.patientFullName, "Захаров Иван");
});

test("POST /api/imaging/studies/:id/unbind-patient: отвязка исследования", async (t: TestContext) => {
	const app = Fastify();
	await registerStudiesRoutes(app);

	t.mock.method(db, "update", () => {
		const chain: any = {
			set: () => chain,
			where: () => chain,
			returning: () => chain,
			then: (
				onfulfilled?: ((val: unknown) => unknown) | null,
				onrejected?: ((err: unknown) => unknown) | null,
			) =>
				Promise.resolve([
					{
						...mockStudyDbRow,
						patientId: null,
						bindingStatus: "unassigned",
						bindingConfidence: 0,
						aiSummary: "Исследование отвязано от пациента врачом",
					},
				]).then(onfulfilled, onrejected),
		};
		return chain;
	});

	const res = await app.inject({
		method: "POST",
		url: `/api/imaging/studies/${STUDY_ID}/unbind-patient`,
		headers: createAuthHeader(),
	});

	assert.strictEqual(res.statusCode, 200);
	const data = res.json();
	assert.strictEqual(data.bindingStatus, "unassigned");
	assert.strictEqual(data.bindingConfidence, 0);
	assert.strictEqual(data.patientId, null);
	assert.strictEqual(data.patientFullName, null);
});

test("POST /api/imaging/studies/auto-bind-scan: пакетный запуск автопривязки", async (t: TestContext) => {
	const app = Fastify();
	await registerStudiesRoutes(app);

	t.mock.method(db, "select", () => {
		let currentTable: unknown = null;
		const chain: any = {
			from: (source: unknown) => {
				currentTable = source;
				return chain;
			},
			leftJoin: () => chain,
			innerJoin: () => chain,
			where: () => chain,
			orderBy: () => chain,
			limit: () => chain,
			offset: () => chain,
			then: (
				onfulfilled?: ((val: unknown) => unknown) | null,
				onrejected?: ((err: unknown) => unknown) | null,
			) => {
				if (currentTable === schema.imagingStudies) {
					return Promise.resolve([
						{
							id: STUDY_ID,
							patientId: null,
							dicomPatientName: "Zakharov^Ivan",
							dicomPatientId: null,
							dicomBirthDate: "19850412",
							bindingStatus: "unassigned",
						},
					]).then(onfulfilled, onrejected);
				}
				if (currentTable === schema.patients) {
					return Promise.resolve([
						{
							id: PATIENT_ID,
							fullName: "Захаров Иван",
							birthDate: "1985-04-12",
							mergedIntoPatientId: null,
						},
					]).then(onfulfilled, onrejected);
				}
				return Promise.resolve([]).then(onfulfilled, onrejected);
			},
		};
		return chain;
	});

	t.mock.method(db, "update", () => {
		const chain: any = {
			set: () => chain,
			where: () => chain,
			returning: () => chain,
			then: (
				onfulfilled?: ((val: unknown) => unknown) | null,
				onrejected?: ((err: unknown) => unknown) | null,
			) => Promise.resolve([]).then(onfulfilled, onrejected),
		};
		return chain;
	});

	const res = await app.inject({
		method: "POST",
		url: "/api/imaging/studies/auto-bind-scan",
		headers: createAuthHeader(),
	});

	assert.strictEqual(res.statusCode, 200);
	const data = res.json();
	assert.strictEqual(data.scanned, 1);
	assert.strictEqual(data.autoBound, 1);
	assert.strictEqual(data.pendingReview, 0);
	assert.strictEqual(data.unassigned, 0);
	assert.strictEqual(data.results.length, 1);
	assert.strictEqual(data.results[0].studyId, STUDY_ID);
	assert.strictEqual(data.results[0].patientId, PATIENT_ID);
	assert.strictEqual(data.results[0].patientFullName, "Захаров Иван");
	assert.strictEqual(data.results[0].status, "auto_bound");
	assert.ok(data.results[0].confidence >= 90);
});
