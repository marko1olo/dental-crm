import assert from "node:assert";
import { existsSync, promises as fs } from "node:fs";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	imagingInstances,
	imagingStudies,
	organizations,
	patients,
	users,
	xrayScans,
} from "../db/schema.js";
import { LocalPacsStorageService } from "../services/imaging/localPacsStorageService.js";
import { registerStudiesRoutes } from "./imaging/studiesRoutes.js";
import { scanToResponse } from "./xraySchemas.js";
import { signToken } from "../utils/cryptoHelper.js";
import { authTokenSecret } from "../security/authSecret.js";
import {
	fixtureUuid,
	withFixtureTenant,
	purgeFixtureOrganizations,
} from "../tests/support/fixtureOrganizations.js";
import { createTenantTestApp } from "../tests/support/tenantTestApp.js";

// Валидный 1x1 PNG для тестов
const TINY_PNG_BASE64 =
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const TINY_PNG_DATA_URI = `data:image/png;base64,${TINY_PNG_BASE64}`;
const TINY_PNG_BUFFER = Buffer.from(TINY_PNG_BASE64, "base64");

describe("МАНДАТ 8l: Редтим-аудит схемы БД радиологии и PACS", () => {
	it("1.1 Таблица imaging_studies содержит поле doctorId (nullable FK на users) и нужные индексы", () => {
		// Проверка поля doctorId
		assert.ok(imagingStudies.doctorId, "imagingStudies.doctorId должно быть объявлено");
		assert.strictEqual(imagingStudies.doctorId.name, "doctor_id");

		// Проверка колонок для индексов
		assert.ok(imagingStudies.dicomStudyUid, "imagingStudies.dicomStudyUid должно существовать");
		assert.ok(imagingStudies.createdAt, "imagingStudies.createdAt должно существовать");
		assert.ok(imagingStudies.patientId, "imagingStudies.patientId должно существовать");
	});

	it("1.2 Таблица imaging_instances доработана для послойной индексации DICOM срезов", () => {
		assert.ok(imagingInstances.sopInstanceUid, "sopInstanceUid должно быть объявлено");
		assert.strictEqual(imagingInstances.sopInstanceUid.name, "sop_instance_uid");

		assert.ok(imagingInstances.seriesId, "seriesId должно быть объявлено");
		assert.strictEqual(imagingInstances.seriesId.name, "series_id");

		assert.ok(imagingInstances.instanceNumber, "instanceNumber должно быть объявлено");
		assert.strictEqual(imagingInstances.instanceNumber.name, "instance_number");

		assert.ok(imagingInstances.sliceLocation, "sliceLocation должно быть объявлено");
		assert.strictEqual(imagingInstances.sliceLocation.name, "slice_location");

		assert.ok(imagingInstances.storageKey, "storageKey должно быть объявлено");
		assert.strictEqual(imagingInstances.storageKey.name, "storage_key");

		assert.ok(imagingInstances.fileSizeBytes, "fileSizeBytes должно быть объявлено");
		assert.strictEqual(imagingInstances.fileSizeBytes.name, "file_size_bytes");

		assert.ok(imagingInstances.windowCenter, "windowCenter должно быть объявлено");
		assert.strictEqual(imagingInstances.windowCenter.name, "window_center");

		assert.ok(imagingInstances.windowWidth, "windowWidth должно быть объявлено");
		assert.strictEqual(imagingInstances.windowWidth.name, "window_width");

		assert.ok(imagingInstances.rows, "rows должно быть объявлено");
		assert.strictEqual(imagingInstances.rows.name, "rows");

		assert.ok(imagingInstances.cols, "cols должно быть объявлено");
		assert.strictEqual(imagingInstances.cols.name, "cols");

		// Обратная совместимость с существующими полями
		assert.ok(imagingInstances.dicomSopInstanceUid, "dicomSopInstanceUid сохранено");
		assert.ok(imagingInstances.storagePath, "storagePath сохранено");
		assert.ok(imagingInstances.columns, "columns сохранено");
	});

	it("1.3 Таблица xray_scans содержит поля для объектного хранилища без base64", () => {
		assert.ok(xrayScans.storagePath, "storagePath должно существовать");
		assert.ok(xrayScans.fileUrl, "fileUrl должно существовать");
		assert.strictEqual(xrayScans.fileUrl.name, "file_url");
		assert.ok(xrayScans.fileSizeBytes, "fileSizeBytes должно существовать");
		assert.strictEqual(xrayScans.fileSizeBytes.name, "file_size_bytes");
		assert.ok(xrayScans.sha256, "sha256 должно существовать");
		assert.strictEqual(xrayScans.sha256.name, "sha256");
	});
});

const NAMESPACE = "xrayPacsAudit";
const TEST_ORG_ID = fixtureUuid(NAMESPACE, 1);
const TEST_DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const TEST_PATIENT_ID = fixtureUuid(NAMESPACE, 3);
const LEGACY_SCAN_ID = fixtureUuid(NAMESPACE, 4);

describe("МАНДАТ 8l: Ликвидация хранения base64 в PostgreSQL и файловый движок PACS", () => {
	const createdTestFiles: string[] = [];
	let app: ReturnType<typeof createTenantTestApp>;
	let createdScanId: string | null = null;

	const secret = authTokenSecret();
	const clinicToken = signToken({ organizationId: TEST_ORG_ID }, secret);
	const doctorToken = signToken(
		{
			organizationId: TEST_ORG_ID,
			userId: TEST_DOCTOR_ID,
			role: "doctor",
			fullName: "Врач Стоматолог В.С.",
		},
		secret,
	);
	const authHeaders = {
		"x-dente-clinic-token": clinicToken,
		"x-dente-staff-token": doctorToken,
	};

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";

		await purgeFixtureOrganizations([TEST_ORG_ID]);

		await withFixtureTenant(TEST_ORG_ID, async () => {
			await db
				.insert(organizations)
				.values({
					id: TEST_ORG_ID,
					name: "Клиника Рентгенологии Mandate 8l",
				})
				.onConflictDoNothing();

			await db
				.insert(users)
				.values([
					{
						id: TEST_DOCTOR_ID,
						organizationId: TEST_ORG_ID,
						fullName: "Врач Стоматолог В.С.",
						role: "doctor",
					},
				])
				.onConflictDoNothing();

			await db
				.insert(patients)
				.values({
					id: TEST_PATIENT_ID,
					organizationId: TEST_ORG_ID,
					fullName: "Рентгенов Тест Тестович",
					birthDate: "1980-01-01",
					phone: "+79998887766",
					status: "active",
				})
				.onConflictDoNothing();
		});

		app = createTenantTestApp();
		await registerStudiesRoutes(app);
		await app.ready();
	});

	after(async () => {
		for (const file of createdTestFiles) {
			try {
				if (existsSync(file)) {
					await fs.unlink(file);
				}
			} catch {
				// игнорируем ошибку очистки
			}
		}
		await purgeFixtureOrganizations([TEST_ORG_ID]);
		await app?.close();
	});

	it("2.1 LocalPacsStorageService.storeXrayScanFile сохраняет бинарный буфер на диск в изолированный каталог организации", async () => {
		const stored = await LocalPacsStorageService.storeXrayScanFile(
			TEST_ORG_ID,
			"periapical_46.png",
			TINY_PNG_BUFFER,
			"image/png",
		);

		createdTestFiles.push(stored.storagePath);

		assert.ok(existsSync(stored.storagePath), "Файл должен физически существовать на диске");
		assert.strictEqual(stored.fileSizeBytes, TINY_PNG_BUFFER.length);
		assert.ok(stored.storagePath.includes(TEST_ORG_ID), "Путь должен содержать ID организации");
		assert.strictEqual(typeof stored.sha256, "string");
		assert.strictEqual(stored.sha256.length, 64);

		// Проверка целостности содержимого
		const diskContent = await fs.readFile(stored.storagePath);
		assert.deepStrictEqual(diskContent, TINY_PNG_BUFFER);
	});

	it("2.2 POST /api/imaging/studies НЕ сохраняет base64 в PostgreSQL, а пишет storagePath на диск", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/imaging/studies",
			headers: authHeaders,
			payload: {
				patientId: TEST_PATIENT_ID,
				imageBase64: TINY_PNG_DATA_URI,
				title: "tooth_36_xray.png",
				toothCode: "36",
				kind: "periapical",
				sourceKind: "sensor_bridge",
				sourceName: "Визиограф",
			},
		});

		if (response.statusCode !== 201) {
			console.log("POST /api/imaging/studies error:", response.statusCode, response.body);
		}
		assert.strictEqual(response.statusCode, 201);
		const body = JSON.parse(response.body);
		assert.ok(body.id, "Ответ должен содержать ID созданного снимка");
		createdScanId = body.id;

		// КРИТИЧЕСКАЯ ПРОВЕРКА МАНДАТА 8l: В ЖИВОЙ БАЗЕ POSTGRESQL НЕ ДОЛЖЕН ПИСАТЬСЯ BASE64!
		const [savedRow] = await withFixtureTenant(TEST_ORG_ID, async () => {
			return db
				.select()
				.from(xrayScans)
				.where(eq(xrayScans.id, body.id))
				.limit(1);
		});

		assert.ok(savedRow, "Строка снимка обязана существовать в PostgreSQL");
		assert.strictEqual(
			savedRow.imageDataUri,
			null,
			"КРИТИЧЕСКИЙ АУДИТ: imageDataUri в колонке PostgreSQL ОБЯЗАН быть null (ликвидация WAL-блоата)!",
		);
		assert.ok(
			typeof savedRow.storagePath === "string" && savedRow.storagePath.length > 0,
			"storagePath в PostgreSQL должен быть валидной строкой пути к файлу",
		);
		assert.ok(
			existsSync(savedRow.storagePath),
			"Файл снимка обязан физически существовать на диске хранилища PACS",
		);
		createdTestFiles.push(savedRow.storagePath);

		// Клиент получает канонический ImagingStudy с previewUrl / viewerUrl на /api/imaging/studies/:id/file
		assert.strictEqual(body.previewUrl, `/api/imaging/studies/${body.id}/file`);
		assert.strictEqual(body.viewerUrl, `/api/imaging/studies/${body.id}/file`);
		assert.strictEqual(body.storagePath, savedRow.storagePath);
	});

	it("2.3 GET /api/imaging/studies/:id/file отдает бинарный файл напрямую с диска", async () => {
		assert.ok(createdScanId, "Scan ID должен быть создан в тесте 2.2");

		const response = await app.inject({
			method: "GET",
			url: `/api/imaging/studies/${createdScanId}/file`,
			headers: authHeaders,
		});

		assert.strictEqual(response.statusCode, 200);
		assert.strictEqual(response.headers["content-type"], "image/png");
		assert.strictEqual(Number(response.headers["content-length"]), TINY_PNG_BUFFER.length);
		assert.deepStrictEqual(response.rawPayload, TINY_PNG_BUFFER);
	});

	it("2.4 Обратная совместимость: старые записи с imageDataUri в базе отдаются без сбоев", async () => {
		// Сеем legacy-запись (до миграции), где файл на диске отсутствует, но есть imageDataUri в базе
		await withFixtureTenant(TEST_ORG_ID, async () => {
			await db
				.insert(xrayScans)
				.values({
					id: LEGACY_SCAN_ID,
					organizationId: TEST_ORG_ID,
					patientId: TEST_PATIENT_ID,
					imageDataUri: TINY_PNG_DATA_URI, // Legacy base64
					storagePath: null,
					fileUrl: null,
					originalFilename: "legacy_xray.png",
					mimeType: "image/png",
					kind: "periapical",
					toothCode: "11",
					status: "done",
				})
				.onConflictDoNothing();
		});

		// Проверяем /file на обратную совместимость
		const response = await app.inject({
			method: "GET",
			url: `/api/imaging/studies/${LEGACY_SCAN_ID}/file`,
			headers: authHeaders,
		});

		assert.strictEqual(response.statusCode, 200);
		assert.strictEqual(response.headers["content-type"], "image/png");
		assert.deepStrictEqual(response.rawPayload, TINY_PNG_BUFFER);
	});

	it("2.5 GET /api/imaging/studies/:id возвращает previewUrl/storagePath и поток с диска", async () => {
		assert.ok(createdScanId, "Scan ID должен быть создан в тесте 2.2");

		const response = await app.inject({
			method: "GET",
			url: `/api/imaging/studies/${createdScanId}`,
			headers: authHeaders,
		});

		assert.strictEqual(response.statusCode, 200);
		const body = JSON.parse(response.body);

		assert.strictEqual(body.previewUrl, `/api/imaging/studies/${createdScanId}/file`);
		assert.strictEqual(body.viewerUrl, `/api/imaging/studies/${createdScanId}/file`);
		assert.ok(typeof body.storagePath === "string" && body.storagePath.length > 0);

		const fileRes = await app.inject({
			method: "GET",
			url: body.previewUrl,
			headers: authHeaders,
		});
		assert.strictEqual(fileRes.statusCode, 200);
		assert.deepStrictEqual(fileRes.rawPayload, TINY_PNG_BUFFER);
	});

	it("2.6 scanToResponse включает fileUrl (/api/imaging/studies/:id/file) и storagePath", () => {
		const dummyScan = {
			id: "999e4567-e89b-12d3-a456-426614174000",
			organizationId: TEST_ORG_ID,
			patientId: TEST_PATIENT_ID,
			visitId: null,
			imageDataUri: null,
			storagePath: "C:\\pacs\\scan.jpg",
			originalFilename: "scan.jpg",
			mimeType: "image/jpeg",
			kind: "bitewing",
			toothCode: "16",
			status: "done",
			aiReport: null,
			aiSummary: null,
			aiToothStates: null,
			aiModelName: null,
			aiAnalyzedAt: null,
			aiError: null,
			notes: null,
			sha256: null,
			fileSizeBytes: 1024,
			fileUrl: null,
			capturedAt: new Date("2026-05-01T10:00:00Z"),
			createdAt: new Date("2026-05-01T10:00:00Z"),
			updatedAt: new Date("2026-05-01T10:00:00Z"),
		};

		const res = scanToResponse(dummyScan, false);
		assert.strictEqual(res.fileUrl, `/api/imaging/studies/999e4567-e89b-12d3-a456-426614174000/file`);
		assert.strictEqual(res.storagePath, "C:\\pacs\\scan.jpg");
		assert.strictEqual(res.hasImage, true);
	});
});
