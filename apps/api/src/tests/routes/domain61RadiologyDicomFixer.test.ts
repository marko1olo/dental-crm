import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { withTenantCtx } from "../../db/rls.js";
import { createTenantTestApp, closeAllTenantTestApps } from "../support/tenantTestApp.js";
import { fixtureUuid, withFixtureTenant } from "../support/fixtureOrganizations.js";
import { registerStudiesRoutes } from "../../routes/imaging/studiesRoutes.js";
import { registerPacsRoutes } from "../../routes/imaging/pacsRoutes.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { expandDicomArchiveManifestLines } from "../../routes/imaging/dicomZipReader.js";
import { readFilePrefixAsync, hasDicomMagicAsync } from "../../routes/imaging/dicomParsing.js";

function createSyntheticDicomFile(): Buffer {
	const preamble = Buffer.alloc(128, 0);
	const magic = Buffer.from("DICM", "latin1");

	// (0010,0010) PatientName: VR=PN, Len=18, Value="PETROV^IVAN^IVAN"
	const tagGroup = Buffer.from([0x10, 0x00]);
	const tagElement = Buffer.from([0x10, 0x00]);
	const vr = Buffer.from("PN", "latin1");
	const len = Buffer.from([0x12, 0x00]);
	const val = Buffer.from("PETROV^IVAN^IVAN  ", "latin1");

	// (0010,0020) PatientID: VR=LO, Len=10, Value="PAT-777888"
	const idGroup = Buffer.from([0x10, 0x00]);
	const idElem = Buffer.from([0x20, 0x00]);
	const idVr = Buffer.from("LO", "latin1");
	const idLen = Buffer.from([0x0a, 0x00]);
	const idVal = Buffer.from("PAT-777888", "latin1");

	// PixelData (7FE0,0010): VR=OW, 2 reserved, Len=4
	const pixGroup = Buffer.from([0xe0, 0x7f]);
	const pixElem = Buffer.from([0x10, 0x00]);
	const pixVr = Buffer.from("OW", "latin1");
	const pixReserved = Buffer.from([0x00, 0x00]);
	const pixLen = Buffer.from([0x04, 0x00, 0x00, 0x00]);
	const pixData = Buffer.from([0xaa, 0xbb, 0xcc, 0xdd]);

	return Buffer.concat([
		preamble,
		magic,
		tagGroup, tagElement, vr, len, val,
		idGroup, idElem, idVr, idLen, idVal,
		pixGroup, pixElem, pixVr, pixReserved, pixLen, pixData,
	]);
}

describe("Domain 61: Radiology DICOM Anonymization, Path Traversal & Async I/O Fixer Suite", () => {
	const orgId = fixtureUuid("domain61FixerSuite", 1);
	const patientId = fixtureUuid("domain61FixerSuite", 2);
	const doctorId = fixtureUuid("domain61FixerSuite", 3);
	const studyId = randomUUID();
	const secret = authTokenSecret();

	const chiefDoctorToken = signToken(
		{ role: "chief_doctor", organizationId: orgId, userId: doctorId },
		secret,
	);
	const clinicToken = signToken({ organizationId: orgId }, secret);

	const authHeaders = {
		"x-organization-id": orgId,
		"x-dente-staff-token": chiefDoctorToken,
		"x-dente-clinic-token": clinicToken,
	};

	let tempDicomPath: string;
	let relativeStoragePath: string;

	before(async () => {
		const uploadsDir = path.resolve(process.cwd(), "uploads", "pacs", orgId);
		await fsp.mkdir(uploadsDir, { recursive: true });
		tempDicomPath = path.join(uploadsDir, `test_study_${studyId}.dcm`);
		relativeStoragePath = `uploads/pacs/${orgId}/test_study_${studyId}.dcm`;
		await fsp.writeFile(tempDicomPath, createSyntheticDicomFile());

		await withFixtureTenant(orgId, async () => {
			await db.delete(schema.xrayScans).where(eq(schema.xrayScans.organizationId, orgId));
			await db.delete(schema.imagingStudies).where(eq(schema.imagingStudies.organizationId, orgId));
			await db.delete(schema.patients).where(eq(schema.patients.organizationId, orgId));
			await db.delete(schema.users).where(eq(schema.users.organizationId, orgId));
			await db.delete(schema.organizations).where(eq(schema.organizations.id, orgId));

			await db.insert(schema.organizations).values({
				id: orgId,
				name: "Клиника Домена 61 Радиология",
			}).onConflictDoNothing();

			await db.insert(schema.patients).values({
				id: patientId,
				organizationId: orgId,
				fullName: "Петров Иван Иванович",
				phone: "+79998887766",
			}).onConflictDoNothing();

			await db.insert(schema.users).values({
				id: doctorId,
				organizationId: orgId,
				role: "chief_doctor",
				fullName: "Д-р Рентгенолог 61",
				login: "chief_rad_61",
				passwordHash: "hash",
			}).onConflictDoNothing();

			await db.insert(schema.imagingStudies).values({
				id: studyId,
				organizationId: orgId,
				patientId,
				kind: "periapical",
				title: "Прицельный снимок зуба 46",
				toothCode: "46",
				status: "available",
				capturedAt: new Date(),
				sourceKind: "manual_upload",
				sourceName: "RVG Sensor 61",
				storagePath: relativeStoragePath,
			});
		});
	});

	after(async () => {
		await closeAllTenantTestApps();
		if (fs.existsSync(tempDicomPath)) {
			await fsp.unlink(tempDicomPath).catch(() => {});
		}
		await withFixtureTenant(orgId, async () => {
			await db.delete(schema.imagingStudies).where(eq(schema.imagingStudies.organizationId, orgId));
			await db.delete(schema.patients).where(eq(schema.patients.organizationId, orgId));
			await db.delete(schema.users).where(eq(schema.users.organizationId, orgId));
			await db.delete(schema.organizations).where(eq(schema.organizations.id, orgId));
		});
	});

	describe("1. SEV-1: Реальная анонимизация DICOM по 152-ФЗ / 323-ФЗ ст. 13", () => {
		it("GET /api/imaging/studies/:id/file?anonymize=true физически вычищает ПДн из DICOM-стрима", async () => {
			const app = createTenantTestApp();
			await registerStudiesRoutes(app);

			const resAnon = await app.inject({
				method: "GET",
				url: `/api/imaging/studies/${studyId}/file?anonymize=true&download=true`,
				headers: authHeaders,
			});

			assert.strictEqual(resAnon.statusCode, 200);
			assert.strictEqual(resAnon.headers["content-type"], "application/dicom");
			const anonBuffer = resAnon.rawPayload;

			const anonStr = anonBuffer.toString("latin1");
			assert.ok(!anonStr.includes("PETROV^IVAN"), "ФИО пациента должно быть удалено");
			assert.ok(!anonStr.includes("PAT-777888"), "Сырой ID пациента должен быть заменен");
			assert.ok(anonStr.includes("ANONYMIZED^PATIENT"), "ФИО заменено на канонический ANONYMIZED^PATIENT");
			assert.ok(anonStr.includes("ANON-"), "ID заменен на анонимный префикс ANON-");
		});

		it("GET /api/imaging/studies/:id/file без anonymize отдаёт оригинальный файл снимка", async () => {
			const app = createTenantTestApp();
			await registerStudiesRoutes(app);

			const resRaw = await app.inject({
				method: "GET",
				url: `/api/imaging/studies/${studyId}/file?raw=true`,
				headers: authHeaders,
			});

			assert.strictEqual(resRaw.statusCode, 200);
			const rawStr = resRaw.rawPayload.toString("latin1");
			assert.ok(rawStr.includes("PETROV^IVAN"), "В штатном режиме снимок отдается без искажений");
			assert.ok(rawStr.includes("PAT-777888"), "Оригинальный ID пациента сохранен");
		});
	});

	describe("2. SEV-2: Защита от Path Traversal при запуске внешнего просмотрщика и распаковке ZIP", () => {
		it("POST /api/imaging/launch-external-viewer блокирует опасный studyPath с HTTP 403", async () => {
			const app = createTenantTestApp();
			await registerPacsRoutes(app);

			const res = await app.inject({
				method: "POST",
				url: "/api/imaging/launch-external-viewer",
				headers: authHeaders,
				payload: {
					viewerId: "vatech-ez3d-i",
					exePath: "C:\\Program Files\\Vatech\\Ez3D-i\\Ez3D-i.exe",
					studyPath: "../../../windows/system32/cmd.exe",
				},
			});

			// Либо 400 (не найден локально / не .exe), либо 403 (выход за пределы хранилища)
			assert.ok(res.statusCode === 403 || res.statusCode === 200 && res.json().success === false);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.success, false);
		});

		it("expandDicomArchiveManifestLines с orgId блокирует архивы вне каталога организации", async () => {
			const dangerousLines = ["patient1;cbct;11;2026.01.01;../../../windows/secret.zip;zip_archive"];
			const result = await expandDicomArchiveManifestLines(dangerousLines, orgId);

			assert.strictEqual(result.lines.length, 1);
			assert.ok(result.notes.some((n) => n.includes("заблокирован политикой безопасности")));
		});
	});

	describe("3. SEV-2.3: Асинхронный неблокирующий I/O при чтении DICOM-хэдеров", () => {
		it("readFilePrefixAsync и hasDicomMagicAsync читают файлы асинхронно без блокировки Event Loop", async () => {
			const isMagic = await hasDicomMagicAsync(tempDicomPath);
			assert.strictEqual(isMagic, true, "hasDicomMagicAsync должен подтвердить DICM magic bytes");

			const prefix = await readFilePrefixAsync(tempDicomPath, 256);
			assert.ok(prefix.length >= 132, "readFilePrefixAsync возвращает заголовок снимка");
			assert.strictEqual(prefix.toString("latin1", 128, 132), "DICM");
		});
	});
});
