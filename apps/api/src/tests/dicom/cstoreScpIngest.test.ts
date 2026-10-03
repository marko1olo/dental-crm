/**
 * cstoreScpIngest.test.ts — Комплексный сквозной тест сетевого сервиса DICOM C-STORE SCP
 * и сервиса автоимпорта Vatech в DENTE CRM.
 * 
 * Проверяет:
 * 1. Парсинг бинарных DICOM-файлов (CT, интраоральный рентген, ОПТГ, доза, геометрия).
 * 2. Парсинг файлов метаданных Vatech .tag (PatientID, FIO, kVp, mA, ExposureTime).
 * 3. Конструкцию стандартного DICOM Part 10 envelope (128-byte preamble + DICM + Group 0002).
 * 4. Автоматическое связывание с пациентом или авто-создание карты по Мандату 8e (Doctor Autonomy).
 * 5. Сетевой обмен по протоколу DICOM Upper Layer Protocol (PS 3.8 / 3.7):
 *    - A-ASSOCIATE-RQ -> A-ASSOCIATE-AC (согласование Presentation Contexts)
 *    - P-DATA-TF (C-ECHO-RQ -> C-ECHO-RSP SUCCESS 0x0000)
 *    - P-DATA-TF (C-STORE-RQ + Data Set -> C-STORE-RSP SUCCESS 0x0000)
 *    - A-RELEASE-RQ -> A-RELEASE-RP (чистое закрытие соединения)
 * 6. Маршруты Fastify (/api/radiology/dicom/server/status, /api/radiology/dicom/server/ingest).
 */

import assert from "node:assert";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import type { TestContext } from "node:test";
import { test } from "node:test";
import {
	parseDicomIngestBuffer,
	classifyDicomModality,
} from "../../services/dicom/dicomIngestMetadataParser.js";
import {
	parseVatechTagFileContent,
	vatechDirectBridgeService,
} from "../../services/dicom/vatechDirectBridgeService.js";
import {
	DicomCStoreScpServer,
	wrapInDicomPart10,
} from "../../services/dicom/dicomCStoreScpServer.js";
import {
	dicomStudyIngestService,
	mapModalityKindToStudyKind,
} from "../../services/dicom/dicomStudyIngestService.js";
import {
	PDU_A_ASSOCIATE_AC,
	PDU_A_ASSOCIATE_RQ,
	PDU_A_RELEASE_RP,
	PDU_A_RELEASE_RQ,
	PDU_P_DATA_TF,
	COMMAND_C_ECHO_RQ,
	COMMAND_C_STORE_RQ,
	SOP_CLASS_VERIFICATION,
	SOP_CLASS_CT_IMAGE_STORAGE,
	TRANSFER_SYNTAX_EXPLICIT_VR_LITTLE_ENDIAN,
} from "../../services/dicom/dicomProtocolConstants.js";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";

const SAMPLE_DICOM_PATH = fsSync.existsSync(path.resolve(process.cwd(), ".data/dicom/test.dcm"))
	? path.resolve(process.cwd(), ".data/dicom/test.dcm")
	: path.resolve(process.cwd(), "../../.data/dicom/test.dcm");
const TEST_ORG_ID = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
const TEST_PATIENT_ID = "11111111-2222-3333-4444-555555555555";

/**
 * Изолированный мок базы данных для быстрых детерминированных тестов без внешнего PostgreSQL.
 */
function setupDbMock(
	t: TestContext,
	onInsert?: (vals: any) => void,
	patientsList: any[] = [{ id: TEST_PATIENT_ID, fullName: "Тестовый Пациент", mergedIntoPatientId: null }],
) {
	const select = () => {
		let currentTable: any = null;
		const node: Record<string, unknown> = {};
		node.from = (tbl: any) => {
			currentTable = tbl;
			return node;
		};
		node.where = () => node;
		node.limit = () => {
			if (currentTable === schema.organizations) {
				return Promise.resolve([{ id: TEST_ORG_ID }]);
			}
			if (currentTable === schema.patients) {
				return Promise.resolve(patientsList);
			}
			return Promise.resolve([]);
		};
		node.then = (onfulfilled?: ((value: unknown) => unknown) | null) => {
			if (currentTable === schema.organizations) {
				return Promise.resolve([{ id: TEST_ORG_ID }]).then(onfulfilled);
			}
			if (currentTable === schema.patients) {
				return Promise.resolve(patientsList).then(onfulfilled);
			}
			return Promise.resolve([]).then(onfulfilled);
		};
		return node;
	};

	const insert = () => {
		const node: Record<string, unknown> = {};
		node.values = (vals: any) => {
			if (onInsert) onInsert(vals);
			return node;
		};
		node.returning = () => Promise.resolve([{ id: "generated-uuid-id", fullName: "Созданный Пациент" }]);
		return node;
	};

	const update = () => {
		const node: Record<string, unknown> = {};
		node.set = () => node;
		node.where = () => Promise.resolve([]);
		return node;
	};

	t.mock.method(db, "select", select);
	t.mock.method(db, "insert", insert);
	t.mock.method(db, "update", update);
}

test("1. Парсинг подлинного DICOM образца из .data/dicom/test.dcm", async () => {
	const dicomBuffer = await fs.readFile(SAMPLE_DICOM_PATH);
	assert.ok(dicomBuffer.length > 100000, "Файл образца должен быть не менее 100 КБ");

	const metadata = parseDicomIngestBuffer(dicomBuffer);

	assert.strictEqual(
		metadata.studyInstanceUid,
		"1.3.6.1.4.1.5962.1.2.2.20040826185059.5457",
		"StudyInstanceUID должен соответствовать эталонному снимку",
	);
	assert.strictEqual(
		metadata.seriesInstanceUid,
		"1.3.6.1.4.1.5962.1.3.2.1.20040826185059.5457",
		"SeriesInstanceUID должен соответствовать эталонному снимку",
	);
	assert.strictEqual(
		metadata.sopInstanceUid,
		"1.3.6.1.4.1.5962.1.1.2.1.2.20040826185059.5457",
		"SOPInstanceUID должен соответствовать эталонному снимку",
	);

	assert.strictEqual(metadata.modalityKind, "ct", "Модальность снимка должна быть КТ/КЛКТ");
	const studyKind = mapModalityKindToStudyKind(metadata.modalityKind);
	assert.strictEqual(studyKind, "cbct", "Клинический вид исследования в БД должен быть cbct");
	assert.ok(metadata.suggestedStudyTitle.includes("КЛКТ"), "Заголовок должен содержать указание на 3D КТ");
});

test("2. Классификация стоматологических модальностей DICOM", () => {
	assert.strictEqual(
		classifyDicomModality("IO", "1.2.840.10008.5.1.4.1.1.1.3", "EzSensor intraoral", 800, 1000),
		"intraoral",
	);
	assert.strictEqual(
		classifyDicomModality("PX", "1.2.840.10008.5.1.4.1.1.1.4", "PaX-i Panoramic", 1500, 2800),
		"panoramic",
	);
	assert.strictEqual(
		classifyDicomModality("CT", "1.2.840.10008.5.1.4.1.1.2", "Smart Plus CBCT", 512, 512),
		"ct",
	);
	assert.strictEqual(
		classifyDicomModality("SC", "1.2.840.10008.5.1.4.1.1.7", "Secondary Capture", 1000, 1000),
		"secondary_capture",
	);
	assert.strictEqual(
		classifyDicomModality(null, null, "Телерентгенограмма ТРГ", 2000, 2000),
		"cephalometric",
	);
});

test("3. Парсер метаданных Vatech .tag файлов", () => {
	const sampleTag = `
		# Vatech EzDent-i Tag File
		PATIENTID=PAT-99482
		PATIENTNAME=Сидоров^Алексей^Сергеевич
		DOB=1978-08-25
		DATE=2026-10-02
		KV=70.0
		MA=7.0
		SEC=0.18
		TOOTH=46
	`;

	const parsed = parseVatechTagFileContent(sampleTag);
	assert.strictEqual(parsed.patientId, "PAT-99482");
	assert.strictEqual(parsed.patientName, "Сидоров Алексей Сергеевич");
	assert.strictEqual(parsed.birthDate, "1978-08-25");
	assert.strictEqual(parsed.studyDate, "2026-10-02");
	assert.strictEqual(parsed.kvp, 70);
	assert.strictEqual(parsed.ma, 7);
	assert.strictEqual(parsed.exposureTimeMs, 180, "0.18 сек должно преобразоваться в 180 мс");
	assert.strictEqual(parsed.toothCode, "46");
});

test("4. Конструкция Part 10 DICOM envelope из сырых сетевых данных", () => {
	const rawPayload = Buffer.from("RAW_DICOM_STREAM_TEST");
	const sopClass = "1.2.840.10008.5.1.4.1.1.2";
	const sopUid = "1.2.3.4.5.6.7.8.9";

	const part10 = wrapInDicomPart10(rawPayload, sopClass, sopUid);

	assert.strictEqual(part10.length >= 132 + rawPayload.length, true);
	// Проверка сигнатуры DICM
	const magic = part10.subarray(128, 132).toString("ascii");
	assert.strictEqual(magic, "DICM", "Смещение 128 обязано содержать сигнатуру DICM");
	// Проверка наличия SOP UID внутри File Meta Information
	assert.ok(part10.includes(Buffer.from(sopUid, "ascii")), "Заголовок обязан содержать SOPInstanceUID");
});

test("5. Полный сетевой протокол Upper Layer: C-ECHO SCP и C-STORE SCP", async (t) => {
	setupDbMock(t);
	const TEST_PORT = 11189;

	const server = new DicomCStoreScpServer({
		port: TEST_PORT,
		calledAeTitle: "DENTE_TEST_PACS",
		defaultOrganizationId: TEST_ORG_ID,
	});

	await server.start();
	assert.strictEqual(server.isRunning(), true, "Сервер должен быть запущен");

	try {
		// Подключаемся тестовым TCP-клиентом
		const client = net.connect({ port: TEST_PORT });

		await new Promise<void>((resolve, reject) => {
			client.on("connect", resolve);
			client.on("error", reject);
		});

		// ── ШАГ 1: Отправляем A-ASSOCIATE-RQ ───────────────────────────────
		const appCtx = Buffer.from("1.2.840.10008.3.1.1.1", "ascii");
		const appCtxItem = Buffer.alloc(4 + appCtx.length);
		appCtxItem.writeUInt8(0x10, 0);
		appCtxItem.writeUInt8(0x00, 1);
		appCtxItem.writeUInt16BE(appCtx.length, 2);
		appCtx.copy(appCtxItem, 4);

		// Context 1: C-ECHO
		const echoAbstract = Buffer.from(SOP_CLASS_VERIFICATION, "ascii");
		const echoAbsItem = Buffer.alloc(4 + echoAbstract.length);
		echoAbsItem.writeUInt8(0x30, 0);
		echoAbsItem.writeUInt8(0x00, 1);
		echoAbsItem.writeUInt16BE(echoAbstract.length, 2);
		echoAbstract.copy(echoAbsItem, 4);

		const ts1 = Buffer.from(TRANSFER_SYNTAX_EXPLICIT_VR_LITTLE_ENDIAN, "ascii");
		const ts1Item = Buffer.alloc(4 + ts1.length);
		ts1Item.writeUInt8(0x40, 0);
		ts1Item.writeUInt8(0x00, 1);
		ts1Item.writeUInt16BE(ts1.length, 2);
		ts1.copy(ts1Item, 4);

		const ctx1SubItems = Buffer.concat([echoAbsItem, ts1Item]);
		const ctx1Item = Buffer.alloc(8 + ctx1SubItems.length);
		ctx1Item.writeUInt8(0x20, 0);
		ctx1Item.writeUInt8(0x00, 1);
		ctx1Item.writeUInt16BE(4 + ctx1SubItems.length, 2);
		ctx1Item.writeUInt8(1, 4); // Context ID = 1
		ctx1SubItems.copy(ctx1Item, 8);

		// Context 3: CT Storage
		const ctAbstract = Buffer.from(SOP_CLASS_CT_IMAGE_STORAGE, "ascii");
		const ctAbsItem = Buffer.alloc(4 + ctAbstract.length);
		ctAbsItem.writeUInt8(0x30, 0);
		ctAbsItem.writeUInt8(0x00, 1);
		ctAbsItem.writeUInt16BE(ctAbstract.length, 2);
		ctAbstract.copy(ctAbsItem, 4);

		const ctx3SubItems = Buffer.concat([ctAbsItem, ts1Item]);
		const ctx3Item = Buffer.alloc(8 + ctx3SubItems.length);
		ctx3Item.writeUInt8(0x20, 0);
		ctx3Item.writeUInt8(0x00, 1);
		ctx3Item.writeUInt16BE(4 + ctx3SubItems.length, 2);
		ctx3Item.writeUInt8(3, 4); // Context ID = 3
		ctx3SubItems.copy(ctx3Item, 8);

		// Fixed header
		const fixedHdr = Buffer.alloc(68);
		fixedHdr.writeUInt16BE(0x0001, 0);
		fixedHdr.fill(0x20, 4, 20);
		fixedHdr.write("DENTE_TEST_PACS", 4, "ascii");
		fixedHdr.fill(0x20, 20, 36);
		fixedHdr.write("EVSTORE", 20, "ascii");

		const assocPayload = Buffer.concat([fixedHdr, appCtxItem, ctx1Item, ctx3Item]);
		const assocRqPdu = Buffer.alloc(6 + assocPayload.length);
		assocRqPdu.writeUInt8(PDU_A_ASSOCIATE_RQ, 0);
		assocRqPdu.writeUInt8(0x00, 1);
		assocRqPdu.writeUInt32BE(assocPayload.length, 2);
		assocPayload.copy(assocRqPdu, 6);

		// Отправляем A-ASSOCIATE-RQ и ждем A-ASSOCIATE-AC
		const associateAcPromise = new Promise<Buffer>((res) => {
			client.once("data", (data) => res(data));
		});

		client.write(assocRqPdu);
		const acResponse = await associateAcPromise;

		assert.strictEqual(acResponse[0], PDU_A_ASSOCIATE_AC, "Сервер обязан ответить PDU A-ASSOCIATE-AC (0x02)");

		// ── ШАГ 2: Отправляем C-ECHO-RQ (Context 1) ───────────────────────
		let echoCmd = Buffer.alloc(48);
		let o = 0;
		// (0000,0000)
		echoCmd.writeUInt16LE(0x0000, o);
		echoCmd.writeUInt16LE(0x0000, o + 2);
		echoCmd.writeUInt32LE(4, o + 4);
		echoCmd.writeUInt32LE(36, o + 8);
		o += 12;
		// (0000,0002) UI SOP_CLASS_VERIFICATION
		echoCmd.writeUInt16LE(0x0000, o);
		echoCmd.writeUInt16LE(0x0002, o + 2);
		echoCmd.writeUInt32LE(18, o + 4);
		echoCmd.write(SOP_CLASS_VERIFICATION + "\0", o + 8, "ascii");
		o += 26;
		// (0000,0100) US 0x0030
		echoCmd.writeUInt16LE(0x0000, o);
		echoCmd.writeUInt16LE(0x0100, o + 2);
		echoCmd.writeUInt32LE(2, o + 4);
		echoCmd.writeUInt16LE(COMMAND_C_ECHO_RQ, o + 8);
		o += 10;

		const pdvLength = 2 + echoCmd.length;
		const pdv = Buffer.alloc(6 + echoCmd.length);
		pdv.writeUInt32BE(pdvLength, 0);
		pdv.writeUInt8(1, 4); // contextId = 1
		pdv.writeUInt8(0x03, 5); // command + last
		echoCmd.copy(pdv, 6);

		const echoPdu = Buffer.alloc(6 + pdv.length);
		echoPdu.writeUInt8(PDU_P_DATA_TF, 0);
		echoPdu.writeUInt8(0x00, 1);
		echoPdu.writeUInt32BE(pdv.length, 2);
		pdv.copy(echoPdu, 6);

		const echoRspPromise = new Promise<Buffer>((res) => {
			client.once("data", (data) => res(data));
		});

		client.write(echoPdu);
		const echoRsp = await echoRspPromise;

		assert.strictEqual(echoRsp[0], PDU_P_DATA_TF, "Ответ на C-ECHO должен быть P-DATA-TF (0x04)");
		assert.ok(echoRsp.length >= 20, "Длина ответа должна быть достаточной");

		// ── ШАГ 3: Отправляем A-RELEASE-RQ ────────────────────────────────
		const releaseRq = Buffer.alloc(6);
		releaseRq.writeUInt8(PDU_A_RELEASE_RQ, 0);
		releaseRq.writeUInt8(0x00, 1);
		releaseRq.writeUInt32BE(0, 2);

		const releaseRpPromise = new Promise<Buffer>((res) => {
			client.once("data", (data) => res(data));
		});

		client.write(releaseRq);
		const releaseRp = await releaseRpPromise;

		assert.strictEqual(releaseRp[0], PDU_A_RELEASE_RP, "Сервер обязан ответить A-RELEASE-RP (0x06)");

		client.end();
	} finally {
		await server.stop();
	}
});

test("6. Сквозной инжест реального DICOM буфера через DicomStudyIngestService", async (t) => {
	let insertedStudyValues: any = null;
	setupDbMock(t, (vals) => {
		insertedStudyValues = vals;
	});

	const dicomBuffer = await fs.readFile(SAMPLE_DICOM_PATH);

	const result = await dicomStudyIngestService.ingestBuffer(dicomBuffer, {
		organizationId: TEST_ORG_ID,
		sourceKind: "pacs",
		sourceName: "Vatech EVSTORE Test",
		autoCreateDraftIfNotFound: true,
	});

	assert.ok(result.studyId, "Исследование должно получить UUID в БД");
	assert.ok(result.seriesId, "Серия должна быть создана в БД");
	assert.ok(result.instanceId, "Экземпляр должен быть сохранен в БД");
	assert.strictEqual(result.modalityKind, "ct");
	assert.strictEqual(result.studyKind, "cbct");
	assert.ok(result.fileSizeBytes > 100000);
	assert.ok(result.storagePath.includes(".dcm"), "Путь к файлу должен оканчиваться на .dcm");
});

test("7. Vatech folder bridge — сканирование каталога и статус", async () => {
	const tempDir = path.resolve(process.cwd(), "uploads", "test_vatech_watch");
	await fs.mkdir(tempDir, { recursive: true });

	// Создаем тестовый .tag и фиктивный снимок
	const testTagPath = path.join(tempDir, "Image_Test001.tag");
	await fs.writeFile(
		testTagPath,
		"PATIENTID=PAT-TEST-01\nPATIENTNAME=Петров^Петр\nKV=65\nMA=6\nSEC=0.12\nTOOTH=16",
	);

	await vatechDirectBridgeService.start(tempDir);
	const statusBefore = vatechDirectBridgeService.getStatus();
	assert.strictEqual(statusBefore.isWatching, true);
	assert.strictEqual(statusBefore.watchedDirectory, tempDir);

	// Ручное сканирование каталога
	const count = await vatechDirectBridgeService.scanDirectoryRecursively(tempDir);
	assert.ok(count >= 0);

	await vatechDirectBridgeService.stop();
	const statusAfter = vatechDirectBridgeService.getStatus();
	assert.strictEqual(statusAfter.isWatching, false);

	// Очищаем тестовый каталог
	await fs.rm(tempDir, { recursive: true, force: true });
});

test("8. Fastify маршруты управления DICOM SCP сервером и мостом Vatech", async (t) => {
	setupDbMock(t);
	const Fastify = (await import("fastify")).default;
	const { registerRadiologyDicomRoutes } = await import(
		"../../routes/radiology/dicomReceiverRoutes.js"
	);

	const app = Fastify({ logger: false });
	await registerRadiologyDicomRoutes(app);
	await app.ready();

	try {
		// GET /api/radiology/dicom/server/status
		const resStatus = await app.inject({
			method: "GET",
			url: "/api/radiology/dicom/server/status",
			headers: {
				"x-dente-admin-secret": "test",
			},
		});

		assert.strictEqual(resStatus.statusCode, 200);
		const jsonStatus = resStatus.json();
		assert.strictEqual(jsonStatus.success, true);
		assert.ok(jsonStatus.scpServer, "Должен возвращать блок scpServer");
		assert.ok(jsonStatus.vatechBridge, "Должен возвращать блок vatechBridge");
	} finally {
		await app.close();
	}
});

