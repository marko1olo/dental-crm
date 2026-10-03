/**
 * dicomCrawlerDaemon.test.ts — Инструментальная Red Team Инквизиция автономного
 * демона поиска КТ, Zero-Viewer фильтрации и дедупликации архивов.
 *
 * ПРОВЕРКИ И ИНВАРИАНТЫ:
 * 1. Валидация Part 10 (магические 4 байта 'DICM' на 128-м байте) и сигнатур ZIP.
 * 2. Тотальная фильтрация встроенных вьюеров и мусора (Zero-Viewer Bleed):
 *    - Запрет на распаковку Viewer.exe, setup.msi, autorun.inf, Launch.bat, VACAL.dll, manual.pdf.
 *    - В целевой кэш попадают ИСКЛЮЧИТЕЛЬНО срезы .dcm и DICOMDIR.
 *    - Счетчики totalJunkFilesSkipped и totalJunkBytesFiltered фиксируют мусор.
 * 3. Инспекция ZIP без распаковки (Central Directory & Offset 128 Magic):
 *    - Определение КТ не по размеру файла, а по заголовкам срезов внутри архива.
 *    - Мгновенная отбраковка не-DICOM архивов (бэкапы, фото, документы).
 * 4. Исключение дубликатов (Deduplication Law):
 *    - Архив и распакованная папка с одинаковым StudyInstanceUID дают ровно 1 запись.
 *    - Проверка в обоих направлениях (Папка -> Архив и Архив -> Папка).
 *    - Проверка базы данных PostgreSQL 18: ZERO DUPLICATES в schema.imagingStudies.
 * 5. Автоматическая распаковка новых КТ архивов в кэш без мусора.
 * 6. Сквозное сканирование scanNow и сбор телеметрии.
 */

import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import zlib from "node:zlib";
import { DicomCrawlerDaemon } from "../DicomCrawlerDaemon.js";
import {
	hasDicomPart10Magic,
	isZipArchiveMagic,
	buildStudyFingerprint,
} from "@dental/shared";
import { db } from "../../../db/client.js";
import * as schema from "../../../db/schema.js";
import { eq, like } from "drizzle-orm";

/**
 * Создание валидного бинарного буфера среза DICOM Part 10 с явным Meta-заголовком (Group 0002)
 * и тегами пациента/исследования.
 */
function createSyntheticDicomSlice(
	studyUid = "1.2.840.113619.2.55.1.100",
	patientName = "Sidorov^Ivan",
	modality = "CT",
	sopInstanceUid?: string,
): Buffer {
	const elements: Buffer[] = [];
	const sopUid = sopInstanceUid ?? `${studyUid}.${Date.now()}.${Math.floor(Math.random() * 10000)}`;

	function addElement(group: number, element: number, vr: string, valueStr: string) {
		const valBuf = Buffer.from(valueStr, "utf8");
		const paddedVal = valBuf.length % 2 === 1 ? Buffer.concat([valBuf, Buffer.from("\0")]) : valBuf;
		const hdr = Buffer.alloc(8);
		hdr.writeUInt16LE(group, 0);
		hdr.writeUInt16LE(element, 2);
		hdr.write(vr, 4, 2, "ascii");
		hdr.writeUInt16LE(paddedVal.length, 6);
		elements.push(hdr, paddedVal);
	}

	// 1. File Meta Information (Group 0002) — строго по стандарту DICOM Part 10
	addElement(0x0002, 0x0002, "UI", "1.2.840.10008.5.1.4.1.1.2"); // Media Storage SOP Class UID (CT)
	addElement(0x0002, 0x0003, "UI", sopUid); // Media Storage SOP Instance UID
	addElement(0x0002, 0x0010, "UI", "1.2.840.10008.1.2.1"); // Transfer Syntax UID (Explicit VR Little Endian)

	// 2. Study & Patient Dataset
	addElement(0x0008, 0x0016, "UI", "1.2.840.10008.5.1.4.1.1.2"); // SOP Class UID
	addElement(0x0008, 0x0018, "UI", sopUid); // SOP Instance UID
	addElement(0x0008, 0x0020, "DA", "20260915"); // Study Date
	addElement(0x0008, 0x0060, "CS", modality); // Modality
	addElement(0x0010, 0x0010, "PN", patientName); // Patient's Name
	addElement(0x0010, 0x0020, "LO", "PAT-998877"); // Patient ID
	addElement(0x0010, 0x0030, "DA", "19800520"); // Patient's Birth Date
	addElement(0x0020, 0x000d, "UI", studyUid); // Study Instance UID
	addElement(0x0020, 0x000e, "UI", `${studyUid}.series1`); // Series Instance UID

	// 128 байт Preamble + 4 байта сигнатура 'DICM'
	const preamble = Buffer.alloc(128, 0);
	const magic = Buffer.from("DICM", "ascii");
	return Buffer.concat([preamble, magic, ...elements]);
}

/**
 * Создание валидного в памяти ZIP-архива без внешних сторонних библиотек
 */
function createSyntheticZipBuffer(entries: { name: string; content: Buffer }[]): Buffer {
	const localHeaders: Buffer[] = [];
	const centralHeaders: Buffer[] = [];
	let offset = 0;

	for (const entry of entries) {
		const nameBuf = Buffer.from(entry.name, "utf8");
		const compData = zlib.deflateRawSync(entry.content);

		const localHdr = Buffer.alloc(30);
		localHdr.writeUInt32LE(0x04034b50, 0); // signature
		localHdr.writeUInt16LE(20, 4); // version needed
		localHdr.writeUInt16LE(0, 6); // flags
		localHdr.writeUInt16LE(8, 8); // compression: deflate
		localHdr.writeUInt16LE(0, 10); // time
		localHdr.writeUInt16LE(0, 12); // date
		localHdr.writeUInt32LE(0, 14); // crc32
		localHdr.writeUInt32LE(compData.length, 18); // comp size
		localHdr.writeUInt32LE(entry.content.length, 22); // uncomp size
		localHdr.writeUInt16LE(nameBuf.length, 26); // name len
		localHdr.writeUInt16LE(0, 28); // extra len
		localHeaders.push(localHdr, nameBuf, compData);

		const cdHdr = Buffer.alloc(46);
		cdHdr.writeUInt32LE(0x02014b50, 0); // signature
		cdHdr.writeUInt16LE(20, 4);
		cdHdr.writeUInt16LE(20, 6);
		cdHdr.writeUInt16LE(0, 8);
		cdHdr.writeUInt16LE(8, 10);
		cdHdr.writeUInt16LE(0, 12);
		cdHdr.writeUInt16LE(0, 14);
		cdHdr.writeUInt32LE(0, 16);
		cdHdr.writeUInt32LE(compData.length, 20);
		cdHdr.writeUInt32LE(entry.content.length, 24);
		cdHdr.writeUInt16LE(nameBuf.length, 28);
		cdHdr.writeUInt16LE(0, 30);
		cdHdr.writeUInt16LE(0, 32);
		cdHdr.writeUInt16LE(0, 34);
		cdHdr.writeUInt16LE(0, 36);
		cdHdr.writeUInt32LE(0, 38);
		cdHdr.writeUInt32LE(offset, 42); // local header offset
		centralHeaders.push(cdHdr, nameBuf);

		offset += 30 + nameBuf.length + compData.length;
	}

	const cdOffset = offset;
	const cdBuf = Buffer.concat(centralHeaders);
	const eocd = Buffer.alloc(22);
	eocd.writeUInt32LE(0x06054b50, 0);
	eocd.writeUInt16LE(0, 4);
	eocd.writeUInt16LE(0, 6);
	eocd.writeUInt16LE(entries.length, 8);
	eocd.writeUInt16LE(entries.length, 10);
	eocd.writeUInt32LE(cdBuf.length, 12);
	eocd.writeUInt32LE(cdOffset, 16);
	eocd.writeUInt16LE(0, 20);

	return Buffer.concat([...localHeaders, cdBuf, eocd]);
}

describe("Red Team Inquisition: DicomCrawlerDaemon (Zero-Viewer Purge, Inspection & Dedup)", () => {
	let tempDir: string;
	let cacheDir: string;
	let crawler: DicomCrawlerDaemon;
	let testOrgId: string;

	before(async () => {
		tempDir = await mkdtemp(path.join(os.tmpdir(), "dicom_crawler_inquisition_"));
		cacheDir = path.join(tempDir, "cache");
		await mkdir(cacheDir, { recursive: true });

		const [existingOrg] = await db
			.select({ id: schema.organizations.id })
			.from(schema.organizations)
			.limit(1);

		if (existingOrg) {
			testOrgId = existingOrg.id;
		} else {
			const [created] = await db
				.insert(schema.organizations)
				.values({ name: "Тестовая Клиника КТ Инспектора" })
				.returning({ id: schema.organizations.id });
			testOrgId = created!.id;
		}

		crawler = new DicomCrawlerDaemon({
			enabled: false,
			watchPaths: [tempDir],
			cacheDir,
			autoUnpack: true,
			defaultOrganizationId: testOrgId,
		});
	});

	after(async () => {
		try {
			await db
				.delete(schema.imagingStudies)
				.where(like(schema.imagingStudies.studyInstanceUid, "1.2.840.113619.2.55.1.%"));
		} catch {
			// игнорируем
		}
		try {
			await rm(tempDir, { recursive: true, force: true });
		} catch {
			// игнорируем
		}
	});

	// ─── РАЗДЕЛ 1: СИГНАТУРЫ И БАЗОВАЯ ВАЛИДАЦИЯ PART 10 ──────────────────────
	describe("1. DICOM Part 10 Magic & Archive Signatures", () => {
		it("hasDicomPart10Magic и isZipArchiveMagic безошибочно валидируют сигнатуры", () => {
			const dicomBuf = createSyntheticDicomSlice();
			assert.equal(hasDicomPart10Magic(dicomBuf), true, "Срез обязан содержать сигнатуру DICM на 128 байте");

			const zipBuf = createSyntheticZipBuffer([{ name: "test.txt", content: Buffer.from("data") }]);
			assert.equal(isZipArchiveMagic(zipBuf), true, "ZIP архив обязан иметь сигнатуру 0x50 0x4B");

			// Ложные срабатывания (False Positives)
			assert.equal(hasDicomPart10Magic(Buffer.from("Random text string without dicom preamble")), false);
			assert.equal(hasDicomPart10Magic(Buffer.alloc(131, 0)), false, "Буфер < 132 байт не должен приниматься");
			assert.equal(hasDicomPart10Magic(Buffer.alloc(132, 0)), false, "Буфер с нулями без 'DICM' не должен приниматься");

			const falseMagic = Buffer.alloc(132, 0);
			falseMagic[128] = 0x44; // 'D'
			falseMagic[129] = 0x49; // 'I'
			falseMagic[130] = 0x43; // 'C'
			falseMagic[131] = 0x58; // 'X' вместо 'M'
			assert.equal(hasDicomPart10Magic(falseMagic), false, "Несовпадение символа в сигнатуре отбраковывается");
		});

		it("buildStudyFingerprint детерминирован и выдает одинаковый отпечаток", () => {
			const fp1 = buildStudyFingerprint({
				studyInstanceUid: "1.2.3.4.5",
				patientName: "Иванов Иван",
				studyDate: "2026-09-15",
				sliceCount: 150,
			});
			const fp2 = buildStudyFingerprint({
				studyInstanceUid: "1.2.3.4.5",
				patientName: "иванов иван",
				studyDate: "2026-09-15",
				sliceCount: 150,
			});
			assert.equal(fp1, fp2, "Отпечаток обязан быть детерминированным и нечувствительным к регистру ФИО");
		});
	});

	// ─── РАЗДЕЛ 2: ТОТАЛЬНАЯ ФИЛЬТРАЦИЯ МУСОРА И ВСТРОЕННЫХ ВЬЮЕРОВ (ZERO-VIEWER BLEED) ──
	describe("2. Zero-Viewer Bleed & Total Junk Purge (Пользовательский приказ 1:1)", () => {
		it("отфильтровывает 100% встроенных ридеров и мусора (Viewer.exe, setup.msi, autorun.inf, Launch.bat, VACAL.dll, manual.pdf)", async () => {
			const studyUid = "1.2.840.113619.2.55.1.77700";
			const slice1 = createSyntheticDicomSlice(studyUid, "Ivanova^Elena", "CT", `${studyUid}.slice1`);
			const slice2 = createSyntheticDicomSlice(studyUid, "Ivanova^Elena", "CT", `${studyUid}.slice2`);
			const dicomdir = createSyntheticDicomSlice(studyUid, "Ivanova^Elena", "CT", `${studyUid}.dicomdir`);

			// Архив набит типичным сторонним софтом томографов других клиник:
			// Ez3D-i/Viewer.exe, Romexis/setup.msi, autorun.inf, Launch.bat, System/VACAL.dll, manual.pdf
			const junkZipBuffer = createSyntheticZipBuffer([
				{ name: "DICOM/CT_0001.dcm", content: slice1 },
				{ name: "DICOM/CT_0002.dcm", content: slice2 },
				{ name: "DICOMDIR", content: dicomdir },
				{ name: "Ez3D-i/Viewer.exe", content: Buffer.alloc(4096, 0x4d) },
				{ name: "Romexis/setup.msi", content: Buffer.alloc(2048, 0xd0) },
				{ name: "autorun.inf", content: Buffer.from("[autorun]\nopen=Viewer.exe") },
				{ name: "Launch.bat", content: Buffer.from("@echo off\nstart Ez3D-i/Viewer.exe") },
				{ name: "System/VACAL.dll", content: Buffer.alloc(8192, 0x5a) },
				{ name: "manual.pdf", content: Buffer.from("%PDF-1.5 Instruction manual for viewer...") },
			]);

			const zipPath = path.join(tempDir, "Tomograph_With_Junk_Viewers.zip");
			await writeFile(zipPath, junkZipBuffer);

			const targetUnpackDir = path.join(tempDir, "unpacked_zero_viewer");
			const initialSkipped = crawler.getStatus().totalJunkFilesSkipped;
			const initialBytes = crawler.getStatus().totalJunkBytesFiltered;

			const extracted = await crawler.unpackZipArchive(zipPath, targetUnpackDir);

			// 1. Возвращенный список файлов содержит ИСКЛЮЧИТЕЛЬНО валидные срезы и DICOMDIR
			assert.equal(extracted.length, 3, "Должно быть распаковано ровно 3 DICOM-файла (2 среза + DICOMDIR)");
			const baseNames = extracted.map((f) => path.basename(f));
			assert.ok(baseNames.includes("CT_0001.dcm"), "CT_0001.dcm обязан быть извлечен");
			assert.ok(baseNames.includes("CT_0002.dcm"), "CT_0002.dcm обязан быть извлечен");
			assert.ok(baseNames.includes("DICOMDIR"), "DICOMDIR обязан быть извлечен");

			// 2. Проверка файлов на диске: ни один исполняемый или мусорный файл НЕ должен проникнуть!
			const filesOnDisk = readdirSync(targetUnpackDir);
			assert.equal(filesOnDisk.includes("Viewer.exe"), false, "Viewer.exe КАТЕГОРИЧЕСКИ НЕ ДОЛЖЕН БЫТЬ НА ДИСКЕ!");
			assert.equal(filesOnDisk.includes("setup.msi"), false, "setup.msi КАТЕГОРИЧЕСКИ НЕ ДОЛЖЕН БЫТЬ НА ДИСКЕ!");
			assert.equal(filesOnDisk.includes("autorun.inf"), false, "autorun.inf КАТЕГОРИЧЕСКИ НЕ ДОЛЖЕН БЫТЬ НА ДИСКЕ!");
			assert.equal(filesOnDisk.includes("Launch.bat"), false, "Launch.bat КАТЕГОРИЧЕСКИ НЕ ДОЛЖЕН БЫТЬ НА ДИСКЕ!");
			assert.equal(filesOnDisk.includes("VACAL.dll"), false, "VACAL.dll КАТЕГОРИЧЕСКИ НЕ ДОЛЖЕН БЫТЬ НА ДИСКЕ!");
			assert.equal(filesOnDisk.includes("manual.pdf"), false, "manual.pdf КАТЕГОРИЧЕСКИ НЕ ДОЛЖЕН БЫТЬ НА ДИСКЕ!");

			// 3. Счетчики пропущенного мусора
			const currentStatus = crawler.getStatus();
			const skippedDelta = currentStatus.totalJunkFilesSkipped - initialSkipped;
			const bytesDelta = currentStatus.totalJunkBytesFiltered - initialBytes;

			assert.ok(skippedDelta >= 6, `Счетчик мусора должен учесть все 6 файлов (пропущено: ${skippedDelta})`);
			assert.ok(bytesDelta > 0, `Счетчик байт мусора должен быть > 0 (отфильтровано: ${bytesDelta} байт)`);
		});
	});

	// ─── РАЗДЕЛ 3: ИНСПЕКЦИЯ АРХИВОВ БЕЗ РАСПАКОВКИ (CENTRAL DIRECTORY & OFFSET 128) ───
	describe("3. Fast Archive Inspection without Unpacking", () => {
		it("inspectZipForDicom читает оглавление и 128-й байт первого среза без распаковки гигабайтов", async () => {
			const studyUid = "1.2.840.113619.2.55.1.99911";
			const patientName = "Petrov^Petr";
			const slice = createSyntheticDicomSlice(studyUid, patientName, "CT");

			const zipBuffer = createSyntheticZipBuffer([
				{ name: "DICOM/CT_0001.dcm", content: slice },
				{ name: "DICOM/CT_0002.dcm", content: slice },
				{ name: "Viewer/Ez3D-i.exe", content: Buffer.alloc(2048, 0x90) },
				{ name: "Romexis/setup.msi", content: Buffer.alloc(1024, 0x00) },
			]);

			const zipPath = path.join(tempDir, "Inspection_Fast_Test.zip");
			await writeFile(zipPath, zipBuffer);

			const inspection = await crawler.inspectZipForDicom(zipPath);

			assert.equal(inspection.isDicomArchive, true, "Архив с DICM должен быть подтвержден как КТ");
			assert.equal(inspection.studyInstanceUid, studyUid, "StudyInstanceUID совпадает");
			assert.equal(inspection.patientName, "Petrov Petr", "ФИО пациента распарсено");
			assert.equal(inspection.sliceCount, 2, "Счетчик срезов должен игнорировать .exe и .msi");
			assert.equal(inspection.dicomFileNames.length, 2);
			assert.ok(inspection.dicomFileNames.every((n) => n.endsWith(".dcm")), "В dicomFileNames только .dcm");
		});

		it("отбраковывает псевдо-архивы и не-DICOM архивы (бэкапы, фото, документы) мгновенно", async () => {
			const fakeZipBuffer = createSyntheticZipBuffer([
				{ name: "backup/photo.jpg", content: Buffer.alloc(2048, 0xff) },
				{ name: "docs/report.docx", content: Buffer.alloc(4096, 0x50) },
				{ name: "software/setup.exe", content: Buffer.alloc(1024, 0x4d) },
			]);

			const fakeZipPath = path.join(tempDir, "Non_Dicom_Backup.zip");
			await writeFile(fakeZipPath, fakeZipBuffer);

			const inspection = await crawler.inspectZipForDicom(fakeZipPath);
			assert.equal(inspection.isDicomArchive, false, "Не-DICOM архив обязан быть отклонен");
			assert.equal(inspection.sliceCount, 0, "Срезы должны быть 0");
		});

		it("мгновенно возвращает false для поврежденных файлов и файлов < 132 байт", async () => {
			const tinyPath = path.join(tempDir, "tiny.zip");
			await writeFile(tinyPath, Buffer.from("PK tiny"));
			const resTiny = await crawler.inspectZipForDicom(tinyPath);
			assert.equal(resTiny.isDicomArchive, false);

			const nonExistentPath = path.join(tempDir, "missing_file_xyz.zip");
			const resMissing = await crawler.inspectZipForDicom(nonExistentPath);
			assert.equal(resMissing.isDicomArchive, false);
		});
	});

	// ─── РАЗДЕЛ 4: ЗАКОН ДЕДУПЛИКАЦИИ (DEDUPLICATION LAW) ────────────────────────
	describe("4. Deduplication Law (Архив vs Распакованная папка — ровно 1 запись)", () => {
		it("Сценарий А: Сначала папка, затем архив -> регистрируется ровно 1 запись, дубликаты исключены", async () => {
			const sharedStudyUid = "1.2.840.113619.2.55.1.55501";
			const slice = createSyntheticDicomSlice(sharedStudyUid, "Kuznetsov^Sergey", "CT");

			// 1. Создаем распакованную папку
			const folderPath = path.join(tempDir, "Kuznetsov_Folder_First");
			await mkdir(folderPath, { recursive: true });
			await writeFile(path.join(folderPath, "CT_0001.dcm"), slice);

			// 2. Создаем архив с тем же исследованием
			const zipBuffer = createSyntheticZipBuffer([
				{ name: "CT_0001.dcm", content: slice },
			]);
			const archivePath = path.join(tempDir, "Kuznetsov_Archive_Second.zip");
			await writeFile(archivePath, zipBuffer);

			// Шаг 1: Обрабатываем распакованную папку
			const folderResult = await crawler.processFolderCandidate(folderPath, testOrgId);
			assert.ok(folderResult, "Папка должна быть зарегистрирована");
			assert.equal(folderResult?.studyInstanceUid, sharedStudyUid);
			assert.equal(folderResult?.status, "registered");

			// Шаг 2: Обрабатываем архив с тем же UID
			const archiveResult = await crawler.processArchiveCandidate(archivePath, testOrgId);
			assert.ok(archiveResult, "Архив должен быть обработан");
			assert.equal(archiveResult?.studyInstanceUid, sharedStudyUid);
			assert.equal(archiveResult?.status, "duplicate_resolved", "Статус должен быть duplicate_resolved");
			assert.equal(archiveResult?.archivePath, archivePath, "Архив связан с записью");
			assert.equal(archiveResult?.unpackedFolderPath, folderPath, "Папка связана с записью");

			// Шаг 3: Проверяем базу данных PostgreSQL — ровно 1 строка!
			const dbRecords = await db
				.select()
				.from(schema.imagingStudies)
				.where(eq(schema.imagingStudies.studyInstanceUid, sharedStudyUid));

			assert.equal(dbRecords.length, 1, "В базе данных ОБЯЗАНА быть ровно 1 запись исследования без дубликатов!");
		});

		it("Сценарий Б: Сначала архив, затем распакованная папка -> дубликаты исключены", async () => {
			const sharedStudyUid = "1.2.840.113619.2.55.1.55502";
			const slice = createSyntheticDicomSlice(sharedStudyUid, "Smirnov^Aleksey", "CT");

			const zipBuffer = createSyntheticZipBuffer([
				{ name: "CT_0001.dcm", content: slice },
			]);
			const archivePath = path.join(tempDir, "Smirnov_Archive_First.zip");
			await writeFile(archivePath, zipBuffer);

			const folderPath = path.join(tempDir, "Smirnov_Folder_Second");
			await mkdir(folderPath, { recursive: true });
			await writeFile(path.join(folderPath, "CT_0001.dcm"), slice);

			// Шаг 1: Обрабатываем архив
			const archiveResult = await crawler.processArchiveCandidate(archivePath, testOrgId);
			assert.ok(archiveResult, "Архив должен быть успешно обработан и распакован");
			assert.equal(archiveResult?.studyInstanceUid, sharedStudyUid);

			// Шаг 2: Обрабатываем появившуюся позже папку
			const folderResult = await crawler.processFolderCandidate(folderPath, testOrgId);
			assert.ok(folderResult, "Папка должна быть обработана");
			assert.equal(folderResult?.studyInstanceUid, sharedStudyUid);
			assert.equal(folderResult?.status, "duplicate_resolved", "Статус папки должен стать duplicate_resolved");

			// Шаг 3: Проверяем БД — ровно 1 строка!
			const dbRecords = await db
				.select()
				.from(schema.imagingStudies)
				.where(eq(schema.imagingStudies.studyInstanceUid, sharedStudyUid));

			assert.equal(dbRecords.length, 1, "В базе данных ОБЯЗАНА быть ровно 1 запись исследования!");
		});
	});

	// ─── РАЗДЕЛ 5: АВТОМАТИЧЕСКАЯ РАСПАКОВКА В КЭШ ─────────────────────────────
	describe("5. Automatic Unpacking to Protected Cache (.data/dicom_cache/)", () => {
		it("Новый найденный КТ-архив распаковывается в cache/<StudyInstanceUID>/ (только чистые .dcm)", async () => {
			const studyUid = "1.2.840.113619.2.55.1.88888";
			const slice1 = createSyntheticDicomSlice(studyUid, "Morozov^Dmitriy", "CT", `${studyUid}.1`);
			const slice2 = createSyntheticDicomSlice(studyUid, "Morozov^Dmitriy", "CT", `${studyUid}.2`);

			const zipBuffer = createSyntheticZipBuffer([
				{ name: "CT_0001.dcm", content: slice1 },
				{ name: "CT_0002.dcm", content: slice2 },
				{ name: "Ez3D-i/Viewer.exe", content: Buffer.alloc(1024, 0x4d) },
				{ name: "autorun.inf", content: Buffer.from("[autorun]") },
			]);

			const archivePath = path.join(tempDir, "Morozov_New_CT.zip");
			await writeFile(archivePath, zipBuffer);

			const study = await crawler.processArchiveCandidate(archivePath, testOrgId);

			assert.ok(study, "Исследование должно быть зарегистрировано");
			assert.equal(study?.status, "unpacked", "Статус исследования должен быть 'unpacked'");
			assert.ok(study?.unpackedFolderPath, "unpackedFolderPath обязан быть заполнен");

			// Проверяем файлы в кэше
			assert.ok(existsSync(study.unpackedFolderPath!), "Каталог кэша обязан существовать");
			const cachedFiles = readdirSync(study.unpackedFolderPath!);
			assert.ok(cachedFiles.includes("CT_0001.dcm"), "Срез CT_0001.dcm должен быть в кэше");
			assert.ok(cachedFiles.includes("CT_0002.dcm"), "Срез CT_0002.dcm должен быть в кэше");

			// Проверяем полное отсутствие мусора
			assert.equal(cachedFiles.includes("Viewer.exe"), false, "Viewer.exe не должен попасть в кэш!");
			assert.equal(cachedFiles.includes("autorun.inf"), false, "autorun.inf не должен попасть в кэш!");
		});
	});

	// ─── РАЗДЕЛ 6: СКВОЗНОЕ СКАНИРОВАНИЕ scanNow И ТЕЛЕМЕТРИЯ ───────────────────
	describe("6. Full Directory Scan & Operational Telemetry", () => {
		it("scanNow обходит директорию, формирует отчет и собирает телеметрию", async () => {
			const report = await crawler.scanNow([tempDir]);

			assert.ok(report.scannedDirectoriesCount >= 1, "Должен быть просканирован минимум 1 каталог");
			assert.ok(report.durationMs >= 0, "Длительность сканирования должна быть измерена");
			assert.ok(Array.isArray(report.studies), "Отчет обязан содержать массив найденных исследований");

			const status = crawler.getStatus();
			assert.equal(status.isScanning, false, "После сканирования флаг isScanning обязан быть false");
			assert.ok(status.lastScanAt !== null, "lastScanAt обязан быть зафиксирован");
			assert.ok(status.totalStudiesFound > 0, "totalStudiesFound > 0");
		});

		it("updateConfig обновляет параметры демона на лету", () => {
			const updated = crawler.updateConfig({
				pollIntervalMinutes: 30,
				autoUnpack: false,
			});
			assert.equal(updated.autoUnpack, false);

			// Возвращаем autoUnpack для стабильности окружения
			crawler.updateConfig({ autoUnpack: true, pollIntervalMinutes: 15 });
		});
	});
});
