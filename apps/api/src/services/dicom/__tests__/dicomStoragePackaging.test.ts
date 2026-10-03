/**
 * dicomStoragePackaging.test.ts — Исчерпывающий Red Team тест кроссплатформенного системного
 * хранения КТ (Windows & macOS), упаковки 1 мультифрейма vs 400 срезов, именования и ярлыков DENTE.
 */

import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { mkdtemp, rm, writeFile, mkdir, readdir, readFile, stat } from "node:fs/promises";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import {
	resolveSystemDicomStorageDir,
	normalizeStoragePath,
	sanitizePathSegment,
	formatDicomModalityRussian,
	formatDicomDateIso,
	formatPatientNameForFolder,
	extractShortStudyUid,
	buildStudyStorageFolderName,
	generateWindowsUrlShortcut,
	generateMacWeblocShortcut,
	generateMacCommandShortcut,
	buildStudyManifest,
	formatStudyManifestJson,
} from "@dental/shared";
import {
	DicomStoragePackagingService,
	dicomStoragePackagingService,
} from "../DicomStoragePackagingService.js";
import { DicomCrawlerDaemon } from "../DicomCrawlerDaemon.js";

/**
 * Создание валидного синтетического DICOM-среза
 */
function createSyntheticSliceBuffer(
	studyUid: string,
	instanceNumber: number,
	patientName = "Zakharov^Ivan",
): Buffer {
	const elements: Buffer[] = [];
	const sopUid = `${studyUid}.${instanceNumber}`;

	function addElement(group: number, element: number, vr: string, val: string) {
		const valBuf = Buffer.from(val, "utf8");
		const padded = valBuf.length % 2 === 1 ? Buffer.concat([valBuf, Buffer.from("\0")]) : valBuf;
		const hdr = Buffer.alloc(8);
		hdr.writeUInt16LE(group, 0);
		hdr.writeUInt16LE(element, 2);
		hdr.write(vr, 4, 2, "ascii");
		hdr.writeUInt16LE(padded.length, 6);
		elements.push(hdr, padded);
	}

	addElement(0x0002, 0x0002, "UI", "1.2.840.10008.5.1.4.1.1.2");
	addElement(0x0002, 0x0003, "UI", sopUid);
	addElement(0x0008, 0x0016, "UI", "1.2.840.10008.5.1.4.1.1.2");
	addElement(0x0008, 0x0018, "UI", sopUid);
	addElement(0x0008, 0x0020, "DA", "20261003");
	addElement(0x0008, 0x0060, "CS", "CT");
	addElement(0x0010, 0x0010, "PN", patientName);
	addElement(0x0020, 0x000d, "UI", studyUid);
	addElement(0x0020, 0x0013, "IS", String(instanceNumber));

	const preamble = Buffer.alloc(128, 0);
	const magic = Buffer.from("DICM", "ascii");
	return Buffer.concat([preamble, magic, ...elements]);
}

describe("Red Team Inquisition: Cross-Platform System Storage & DICOM Packaging (Windows & macOS)", () => {
	let tempRootDir: string;
	let packagingService: DicomStoragePackagingService;

	before(async () => {
		tempRootDir = await mkdtemp(path.join(os.tmpdir(), "dicom_pkg_test_"));
		packagingService = new DicomStoragePackagingService();
	});

	after(async () => {
		try {
			await rm(tempRootDir, { recursive: true, force: true });
		} catch {
			// ignore cleanup errors
		}
	});

	// ─── 1. КРОССПЛАТФОРМЕННЫЕ СИСТЕМНЫЕ ПАПКИ ХРАНЕНИЯ ─────────────────────────
	describe("1. Cross-Platform System Storage Resolution (Windows, macOS, Linux)", () => {
		it("Windows: при наличии прав разрешает %PROGRAMDATA%\\DenteDental\\DICOM", () => {
			const res = resolveSystemDicomStorageDir({
				platform: "win32",
				env: { ProgramData: "C:\\ProgramData", LOCALAPPDATA: "C:\\Users\\Doc\\AppData\\Local" },
				isWritable: (dir) => dir.startsWith("C:\\ProgramData"),
			});

			assert.equal(res.source, "windows_programdata");
			assert.equal(res.storageDir, "C:\\ProgramData\\DenteDental\\DICOM");
			assert.equal(res.isSystemPath, true);
		});

		it("Windows: при отсутствии прав на ProgramData мягко фоллбэчится на %LOCALAPPDATA%", () => {
			const res = resolveSystemDicomStorageDir({
				platform: "win32",
				env: { ProgramData: "C:\\ProgramData", LOCALAPPDATA: "C:\\Users\\Doc\\AppData\\Local" },
				isWritable: (dir) => !dir.startsWith("C:\\ProgramData"),
			});

			assert.equal(res.source, "windows_localappdata");
			assert.equal(res.storageDir, "C:\\Users\\Doc\\AppData\\Local\\DenteDental\\DICOM");
			assert.equal(res.isSystemPath, true);
		});

		it("macOS (darwin): разрешает ~/Library/Application Support/DenteDental/DICOM", () => {
			const res = resolveSystemDicomStorageDir({
				platform: "darwin",
				homedir: "/Users/doctor",
				isWritable: () => true,
			});

			assert.equal(res.source, "macos_user_library");
			assert.equal(res.storageDir, "/Users/doctor/Library/Application Support/DenteDental/DICOM");
			assert.equal(res.isSystemPath, true);
		});

		it("macOS (darwin): при отсутствии прав на user-папку фоллбэчится на системную /Library", () => {
			const res = resolveSystemDicomStorageDir({
				platform: "darwin",
				homedir: "/Users/doctor",
				isWritable: (dir) => dir.startsWith("/Library"),
			});

			assert.equal(res.source, "macos_system_library");
			assert.equal(res.storageDir, "/Library/Application Support/DenteDental/DICOM");
			assert.equal(res.isSystemPath, true);
		});

		it("Linux: разрешает ~/.local/share/dentedental/dicom ($XDG_DATA_HOME)", () => {
			const res = resolveSystemDicomStorageDir({
				platform: "linux",
				homedir: "/home/doctor",
				env: { XDG_DATA_HOME: "/home/doctor/.local/share" },
				isWritable: () => true,
			});

			assert.equal(res.source, "linux_xdg");
			assert.equal(res.storageDir, "/home/doctor/.local/share/dentedental/dicom");
			assert.equal(res.isSystemPath, true);
		});

		it("DENTAL_DICOM_STORAGE_DIR имеет абсолютный приоритет над системными дефолтами", () => {
			const res = resolveSystemDicomStorageDir({
				platform: "darwin",
				env: { DENTAL_DICOM_STORAGE_DIR: "/mnt/nas/clinic_pacs/dicom" },
			});

			assert.equal(res.source, "env");
			assert.equal(res.storageDir, "/mnt/nas/clinic_pacs/dicom");
			assert.equal(res.isSystemPath, true);
		});

		it("normalizeStoragePath корректно нормализует слеши под платформу", () => {
			assert.equal(normalizeStoragePath("C:/ProgramData/DenteDental/DICOM", "win32"), "C:\\ProgramData\\DenteDental\\DICOM");
			assert.equal(normalizeStoragePath("/Users/doctor/Library\\Application Support", "darwin"), "/Users/doctor/Library/Application Support");
		});
	});

	// ─── 2. ПУТИ СКАНИРОВАНИЯ И ГОРЯЧИЕ ПАПКИ НА MACOS ───────────────────────────
	describe("2. macOS Watch Paths & External Volumes (/Volumes, OsiriX, Horos)", () => {
		const crawler = new DicomCrawlerDaemon();

		it("getMacWatchPaths формирует исчерпывающий список папок macOS", () => {
			const macPaths = crawler.getMacWatchPaths("/Users/radiologist");

			assert.ok(macPaths.includes("/Users/radiologist/Downloads"));
			assert.ok(macPaths.includes("/Users/radiologist/Desktop"));
			assert.ok(macPaths.includes("/Users/radiologist/Documents"));
			assert.ok(macPaths.includes("/Users/radiologist/Documents/OsiriX Data"), "Папка OsiriX Data обязана быть в путях");
			assert.ok(macPaths.includes("/Users/radiologist/Library/Application Support/OsiriX"));
			assert.ok(macPaths.includes("/Users/radiologist/Library/Application Support/Horos"));
			assert.ok(macPaths.includes("/Library/Application Support/OsiriX"));
			assert.ok(macPaths.includes("/Library/Application Support/Horos"));

			// Проверка отсутствия Windows обратных слэшей в путях macOS
			for (const p of macPaths) {
				assert.equal(p.includes("\\"), false, `Путь macOS не должен содержать обратных слэшей: ${p}`);
			}
		});

		it("getDefaultHotFolders на macOS включает Downloads, Desktop и OsiriX Data", () => {
			const hot = crawler.getDefaultHotFolders("darwin", "/Users/radiologist");
			// На Windows-хосте папки /Users/radiologist физически не существуют, поэтому проверяем getMacWatchPaths
			const macAll = crawler.getMacWatchPaths("/Users/radiologist");
			assert.ok(macAll.some((p) => p.includes("OsiriX Data")));
		});
	});

	// ─── 3. ИМЕНОВАНИЕ ПАПОК, КИРИЛЛИЦА И САНИТАЙЗИНГ ────────────────────────────
	describe("3. Folder Naming, Cyrillic Transliteration & Sanitization", () => {
		it("формирует красивое имя папки: [Дата]_[ФИО]_[Модальность]_[Срезы]_[Короткий_UID]", () => {
			const folderName = buildStudyStorageFolderName({
				studyDate: "20261003",
				patientName: "Захаров^Иван",
				modality: "CT",
				sliceCount: 312,
				studyInstanceUid: "1.2.840.113619.2.55.1.a1b2c3d4",
			});

			assert.equal(
				folderName,
				"2026-10-03_Захаров_Иван_КЛКТ_312ср_a1b2c3d4",
				"Имя папки обязано строго соответствовать пользовательскому стандарту",
			);
		});

		it("санитайзит запрещенные символы файловых систем (/ \\ : * ? \" < > |) без потери кириллицы", () => {
			const dirtyName = "Иванов:Иван/Алексеевич*<?|>";
			const clean = sanitizePathSegment(dirtyName);

			assert.equal(clean.includes(":"), false);
			assert.equal(clean.includes("/"), false);
			assert.equal(clean.includes("\\"), false);
			assert.equal(clean.includes("*"), false);
			assert.equal(clean.includes("?"), false);
			assert.equal(clean.includes("<"), false);
			assert.equal(clean.includes(">"), false);
			assert.equal(clean.includes("|"), false);
			assert.ok(clean.includes("Иванов"), "Кириллица обязана быть сохранена");
			assert.ok(clean.includes("Иван"), "Кириллица обязана быть сохранена");
		});

		it("formatDicomModalityRussian правильно конвертирует модальности в терминологию врачей РФ", () => {
			assert.equal(formatDicomModalityRussian("CT"), "КЛКТ");
			assert.equal(formatDicomModalityRussian("CBCT"), "КЛКТ");
			assert.equal(formatDicomModalityRussian("DX"), "РВГ");
			assert.equal(formatDicomModalityRussian("intraoral"), "РВГ");
			assert.equal(formatDicomModalityRussian("PX"), "ОПТГ");
			assert.equal(formatDicomModalityRussian("panoramic"), "ОПТГ");
			assert.equal(formatDicomModalityRussian("CEPH"), "ТРГ");
			assert.equal(formatDicomModalityRussian("", 400), "КЛКТ", "Серия из 400 срезов считается КЛКТ");
		});

		it("formatDicomDateIso поддерживает YYYYMMDD, YYYY-MM-DD и Date", () => {
			assert.equal(formatDicomDateIso("20261003"), "2026-10-03");
			assert.equal(formatDicomDateIso("2026-10-03T14:30:00Z"), "2026-10-03");
			assert.equal(formatDicomDateIso("2026-10-03"), "2026-10-03");
		});

		it("extractShortStudyUid извлекает последние 8 символов UID", () => {
			const uid = "1.2.840.113619.2.55.1.778899aabbcc";
			const shortUid = extractShortStudyUid(uid);
			assert.equal(shortUid, "99aabbcc");
			assert.equal(shortUid.length, 8);
		});
	});

	// ─── 4. ЯРЛЫКИ ПРЯМОГО ОТКРЫТИЯ В НАШЕЙ ПРОГРАММЕ (1-CLICK LAUNCHERS) ────────
	describe("4. 1-Click Desktop Launchers (Windows .url, macOS .webloc, .command)", () => {
		const studyUid = "1.2.840.113619.2.55.1.99001122";

		it("generateWindowsUrlShortcut создает валидный Windows Internet Shortcut", () => {
			const content = generateWindowsUrlShortcut({
				studyInstanceUid: studyUid,
				baseUrl: "http://127.0.0.1:5173",
			});

			assert.ok(content.startsWith("[InternetShortcut]"));
			assert.ok(content.includes(`URL=http://127.0.0.1:5173/?studyId=${studyUid}&cbct=1#radiology`));
			assert.ok(content.includes("IconFile="));
			assert.ok(content.includes("Comment=Открыть исследование в DENTE Dental CRM"));
			assert.ok(content.includes(`DenteProtocolUrl=dente://radiology/study/${studyUid}`));
		});

		it("generateMacWeblocShortcut создает валидный XML Plist для macOS Finder", () => {
			const content = generateMacWeblocShortcut({
				studyInstanceUid: studyUid,
				baseUrl: "http://127.0.0.1:5173",
			});

			assert.ok(content.includes('<?xml version="1.0" encoding="UTF-8"?>'));
			assert.ok(content.includes('<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"'));
			assert.ok(content.includes("<plist version=\"1.0\">"));
			assert.ok(content.includes("<key>URL</key>"));
			assert.ok(content.includes(`http://127.0.0.1:5173/?studyId=${studyUid}&amp;cbct=1#radiology`), "Символ & обязан быть заэкранирован как &amp; в XML");
		});

		it("generateMacCommandShortcut создает исполняемый bash-скрипт запуска", () => {
			const content = generateMacCommandShortcut({
				studyInstanceUid: studyUid,
				baseUrl: "http://127.0.0.1:5173",
			});

			assert.ok(content.startsWith("#!/usr/bin/env bash"));
			assert.ok(content.includes(`open "http://127.0.0.1:5173/?studyId=${studyUid}&cbct=1#radiology"`));
		});
	});

	// ─── 5. МАНИФЕСТ ИССЛЕДОВАНИЯ STUDY_MANIFEST.JSON ───────────────────────────
	describe("5. Study Manifest (study_manifest.json)", () => {
		it("buildStudyManifest формирует полную медицинскую и файловую структуру", () => {
			const manifest = buildStudyManifest({
				studyInstanceUid: "1.2.840.113619.2.55.1.3344",
				seriesInstanceUid: "1.2.840.113619.2.55.1.3344.1",
				patientFullName: "Смирнова Елена",
				patientChartNumber: "CARD-12345",
				patientBirthDate: "1985-04-12",
				studyDate: "20261003",
				modality: "CT",
				sliceCount: 400,
				packageLayout: "series_slices",
				dimensions: "512x512",
				voxelSpacing: "0.2mm",
				kvp: 90,
				ma: 8,
				exposureTimeMs: 14000,
				doseAreaProductDap: "450 mGy*cm2",
				effectiveDoseMsv: 0.045,
				manufacturer: "Vatech",
				manufacturerModelName: "PaX-i3D Smart",
			});

			assert.equal(manifest.version, "1.0");
			assert.equal(manifest.patientFullName, "Смирнова Елена");
			assert.equal(manifest.modalityRussian, "КЛКТ");
			assert.equal(manifest.sliceCount, 400);
			assert.equal(manifest.packageLayout, "series_slices");
			assert.equal(manifest.radiationDose.kvp, 90);
			assert.equal(manifest.radiationDose.effectiveDoseMsv, 0.045);
			assert.equal(manifest.hardware.manufacturer, "Vatech");
			assert.equal(manifest.files.primaryFileOrDirectory, "slices/");
			assert.equal(manifest.launchers.windowsShortcut, "Открыть в DENTE.url");
			assert.equal(manifest.launchers.macShortcut, "Открыть в DENTE.webloc");

			const jsonStr = formatStudyManifestJson(manifest);
			assert.doesNotThrow(() => JSON.parse(jsonStr));
		});
	});

	// ─── 6. УПАКОВКА 1 МУЛЬТИФРЕЙМОВОГО ФАЙЛА DICOM (СЛУЧАЙ 1) ───────────────────
	describe("6. Case 1: Packaging Single Multi-Frame DICOM File (volume_multiframe.dcm)", () => {
		it("упаковывает 1 большой мультифреймовый DICOM в красивую папку с ярлыками и volume_multiframe.dcm", async () => {
			const studyUid = "1.2.840.113619.2.55.1.single_mf_100";
			const multiFrameBuffer = createSyntheticSliceBuffer(studyUid, 1, "Kuznetsov^Sergey");

			const result = await packagingService.packageStudy({
				studyInstanceUid: studyUid,
				patientFullName: "Кузнецов Сергей",
				studyDate: "20261003",
				modality: "CT",
				isMultiFrame: true,
				multiFrameBuffer,
				dimensions: "640x640",
				voxelSpacing: "0.15mm",
				sliceThickness: 0.15,
				kvp: 85,
				ma: 7,
				customStorageRootDir: tempRootDir,
			});

			// 1. Проверка структуры результата
			assert.equal(result.layout, "single_multiframe");
			assert.equal(result.slicesCount, 1);
			assert.ok(result.folderName.startsWith("2026-10-03_Кузнецов_Сергей_КЛКТ_1ср_"));
			assert.ok(existsSync(result.studyFolder));

			// 2. Проверка volume_multiframe.dcm
			const volumePath = path.join(result.studyFolder, "volume_multiframe.dcm");
			assert.ok(existsSync(volumePath), "volume_multiframe.dcm обязан существовать на диске");
			const volumeStat = await stat(volumePath);
			assert.equal(volumeStat.size, multiFrameBuffer.length);

			// 3. Проверка ярлыков прямого запуска
			assert.ok(existsSync(path.join(result.studyFolder, "Открыть в DENTE.url")), "Ярлык Windows .url обязан существовать");
			assert.ok(existsSync(path.join(result.studyFolder, "Открыть в DENTE.webloc")), "Ярлык macOS .webloc обязан существовать");
			assert.ok(existsSync(path.join(result.studyFolder, "Открыть_в_DENTE.command")), "Скрипт macOS .command обязан существовать");

			// 4. Проверка манифеста
			const manifestPath = path.join(result.studyFolder, "study_manifest.json");
			assert.ok(existsSync(manifestPath), "study_manifest.json обязан существовать");
			const manifestRaw = await readFile(manifestPath, "utf8");
			const manifest = JSON.parse(manifestRaw);
			assert.equal(manifest.patientFullName, "Кузнецов Сергей");
			assert.equal(manifest.packageLayout, "single_multiframe");
			assert.equal(manifest.files.primaryFileOrDirectory, "volume_multiframe.dcm");
		});
	});

	// ─── 7. УПАКОВКА 400 МЕЛКИХ СРЕЗОВ В slices/ (СЛУЧАЙ 2) ──────────────────────
	describe("7. Case 2: Packaging 400 Slices into slices/ Subfolder (slice_0001.dcm ... slice_0400.dcm)", () => {
		it("упаковывает 400 мелких срезов в slices/ с DICOMDIR, ярлыками и манифестом", async () => {
			const studyUid = "1.2.840.113619.2.55.1.slices_400_test";
			const TOTAL_SLICES = 400;

			// Генерируем 400 синтетических срезов
			const sliceBuffers: Array<{ buffer: Buffer; instanceNumber: number }> = [];
			for (let i = 1; i <= TOTAL_SLICES; i++) {
				sliceBuffers.push({
					buffer: createSyntheticSliceBuffer(studyUid, i, "Zakharov^Ivan"),
					instanceNumber: i,
				});
			}

			const dicomdirBuf = createSyntheticSliceBuffer(studyUid, 0, "Zakharov^Ivan");

			const result = await packagingService.packageStudy({
				studyInstanceUid: studyUid,
				patientFullName: "Захаров Иван",
				studyDate: "20261003",
				modality: "CT",
				sliceBuffers,
				dicomdirBuffer: dicomdirBuf,
				dimensions: "512x512",
				voxelSpacing: "0.2mm",
				sliceThickness: 0.2,
				kvp: 95,
				ma: 10,
				customStorageRootDir: tempRootDir,
			});

			// 1. Проверка структуры результата
			assert.equal(result.layout, "series_slices");
			assert.equal(result.slicesCount, 400);
			assert.ok(result.folderName.startsWith("2026-10-03_Захаров_Иван_КЛКТ_400ср_"));
			assert.ok(existsSync(result.studyFolder));

			// 2. Проверка подпапки slices/
			const slicesDir = path.join(result.studyFolder, "slices");
			assert.ok(existsSync(slicesDir), "Подпапка slices/ обязана существовать");
			const sliceFiles = readdirSync(slicesDir);
			assert.equal(sliceFiles.length, 400, "В подпапке slices/ должно быть ровно 400 файлов");

			// Проверка первого и последнего среза
			assert.ok(sliceFiles.includes("slice_0001.dcm"), "slice_0001.dcm обязан присутствовать");
			assert.ok(sliceFiles.includes("slice_0400.dcm"), "slice_0400.dcm обязан присутствовать");

			// 3. Проверка DICOMDIR в корне папки
			const dicomdirPath = path.join(result.studyFolder, "DICOMDIR");
			assert.ok(existsSync(dicomdirPath), "DICOMDIR обязан быть в корне папки исследования");

			// 4. Проверка ярлыков прямого запуска
			assert.ok(existsSync(path.join(result.studyFolder, "Открыть в DENTE.url")), "Ярлык Windows .url обязан присутствовать");
			assert.ok(existsSync(path.join(result.studyFolder, "Открыть в DENTE.webloc")), "Ярлык macOS .webloc обязан присутствовать");
			assert.ok(existsSync(path.join(result.studyFolder, "Открыть_в_DENTE.command")), "Скрипт macOS .command обязан присутствовать");

			// 5. Проверка манифеста
			const manifestPath = path.join(result.studyFolder, "study_manifest.json");
			assert.ok(existsSync(manifestPath), "study_manifest.json обязан существовать");
			const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
			assert.equal(manifest.patientFullName, "Захаров Иван");
			assert.equal(manifest.sliceCount, 400);
			assert.equal(manifest.packageLayout, "series_slices");
			assert.equal(manifest.files.primaryFileOrDirectory, "slices/");
		});
	});
});
