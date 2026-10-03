/**
 * DicomStoragePackagingService.ts — Сервис системного хранения, упаковки КТ (1 мультифрейм vs 400 срезов),
 * генерации ярлыков прямого запуска DENTE и манифестов.
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
	buildStudyStorageFolderName,
	buildStudyManifest,
	formatStudyManifestJson,
	generateWindowsUrlShortcut,
	generateMacWeblocShortcut,
	generateMacCommandShortcut,
	resolveSystemDicomStorageDir,
	type DicomStudyManifest,
	type DicomStorageResolutionResult,
} from "@dental/shared";

export interface PackageDicomStudyOptions {
	studyInstanceUid: string;
	seriesInstanceUid?: string | null | undefined;
	sopInstanceUid?: string | null | undefined;
	patientFullName?: string | null | undefined;
	patientChartNumber?: string | null | undefined;
	patientBirthDate?: string | null | undefined;
	studyDate?: string | null | undefined;
	studyTime?: string | null | undefined;
	modality?: string | null | undefined;
	modalityKind?: string | null | undefined;
	// Мультифрейм vs Срезы
	isMultiFrame?: boolean | undefined;
	multiFrameBuffer?: Buffer | undefined;
	multiFrameFilePath?: string | undefined;
	sliceBuffers?: Array<{ buffer: Buffer; fileName?: string | undefined; instanceNumber?: number | undefined }> | undefined;
	sliceFilePaths?: string[] | undefined;
	dicomdirBuffer?: Buffer | undefined;
	dicomdirFilePath?: string | undefined;
	// Геометрия и доза
	dimensions?: string | null | undefined;
	voxelSpacing?: string | null | undefined;
	sliceThickness?: number | null | undefined;
	kvp?: number | null | undefined;
	ma?: number | null | undefined;
	exposureTimeMs?: number | null | undefined;
	doseAreaProductDap?: string | null | undefined;
	effectiveDoseMsv?: number | null | undefined;
	manufacturer?: string | null | undefined;
	manufacturerModelName?: string | null | undefined;
	// Целевой каталог (если переопределен)
	customStorageRootDir?: string | undefined;
	baseUrl?: string | undefined;
}

export interface PackagedStudyResult {
	studyFolder: string;
	folderName: string;
	layout: "single_multiframe" | "series_slices";
	slicesCount: number;
	manifestPath: string;
	windowsShortcutPath: string;
	macWeblocPath: string;
	macCommandPath: string;
	primaryDataPath: string;
	dicomdirPath?: string | undefined;
	totalSizeBytes: number;
	manifest: DicomStudyManifest;
}

export class DicomStoragePackagingService {
	private cachedStorageDir: string | null = null;

	/**
	 * Проверка доступности каталога для записи
	 */
	public testDirectoryWritable(dirPath: string): boolean {
		try {
			if (!fs.existsSync(dirPath)) {
				fs.mkdirSync(dirPath, { recursive: true });
			}
			const testFile = path.join(dirPath, `.write_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.tmp`);
			fs.writeFileSync(testFile, "test", "utf8");
			fs.unlinkSync(testFile);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Определение системного каталога хранения DICOM
	 */
	public getSystemStorageDir(): string {
		if (this.cachedStorageDir && fs.existsSync(this.cachedStorageDir)) {
			return this.cachedStorageDir;
		}

		const resolution: DicomStorageResolutionResult = resolveSystemDicomStorageDir({
			isWritable: (p) => this.testDirectoryWritable(p),
			fallbackDir: path.resolve(process.cwd(), ".data", "dicom_cache"),
		});

		try {
			if (!fs.existsSync(resolution.storageDir)) {
				fs.mkdirSync(resolution.storageDir, { recursive: true });
			}
			this.cachedStorageDir = resolution.storageDir;
			return resolution.storageDir;
		} catch {
			// Аварийный локальный фоллбэк
			const fallback = path.resolve(process.cwd(), ".data", "dicom_cache");
			if (!fs.existsSync(fallback)) {
				fs.mkdirSync(fallback, { recursive: true });
			}
			this.cachedStorageDir = fallback;
			return fallback;
		}
	}

	/**
	 * Упаковка исследования КТ в стандартизированную структуру:
	 * [Дата]_[ФИО_Пациента]_[Модальность]_[ЧислоСрезов]_[Короткий_UID]/
	 *   - volume_multiframe.dcm (Случай 1: 1 мультифреймовый файл)
	 *   ИЛИ
	 *   - slices/ (Случай 2: 400 срезов)
	 *       slice_0001.dcm ... slice_0400.dcm
	 *   - DICOMDIR (если присутствует)
	 *   - study_manifest.json
	 *   - Открыть в DENTE.url (Windows)
	 *   - Открыть в DENTE.webloc (macOS)
	 *   - Открыть_в_DENTE.command (macOS)
	 */
	public async packageStudy(options: PackageDicomStudyOptions): Promise<PackagedStudyResult> {
		if (!options.studyInstanceUid) {
			throw new Error("Не передан обязательный studyInstanceUid для упаковки исследования.");
		}

		const storageRoot = options.customStorageRootDir || this.getSystemStorageDir();

		// 1. Вычисляем количество срезов и режим упаковки
		let sliceCount = 1;
		let layout: "single_multiframe" | "series_slices" = "single_multiframe";

		if (options.sliceBuffers && options.sliceBuffers.length > 0) {
			sliceCount = options.sliceBuffers.length;
			layout = sliceCount > 1 || options.isMultiFrame === false ? "series_slices" : "single_multiframe";
		} else if (options.sliceFilePaths && options.sliceFilePaths.length > 0) {
			sliceCount = options.sliceFilePaths.length;
			layout = sliceCount > 1 || options.isMultiFrame === false ? "series_slices" : "single_multiframe";
		} else if (options.isMultiFrame || options.multiFrameBuffer || options.multiFrameFilePath) {
			layout = "single_multiframe";
			sliceCount = 1;
		}

		// 2. Генерируем красивое имя папки исследования
		const folderName = buildStudyStorageFolderName({
			studyDate: options.studyDate,
			patientName: options.patientFullName,
			modality: options.modality,
			sliceCount,
			studyInstanceUid: options.studyInstanceUid,
		});

		const studyFolder = path.join(storageRoot, folderName);
		await fsp.mkdir(studyFolder, { recursive: true });

		let totalSizeBytes = 0;
		let primaryDataPath = "";

		// 3. СЛУЧАЙ 1: Мультифреймовый одиночный файл DICOM (volume_multiframe.dcm)
		if (layout === "single_multiframe") {
			const targetVolumePath = path.join(studyFolder, "volume_multiframe.dcm");
			primaryDataPath = targetVolumePath;

			if (options.multiFrameBuffer) {
				await fsp.writeFile(targetVolumePath, options.multiFrameBuffer);
				totalSizeBytes += options.multiFrameBuffer.length;
			} else if (options.multiFrameFilePath && fs.existsSync(options.multiFrameFilePath)) {
				await fsp.copyFile(options.multiFrameFilePath, targetVolumePath);
				const st = await fsp.stat(targetVolumePath);
				totalSizeBytes += st.size;
			} else if (options.sliceBuffers && options.sliceBuffers.length === 1) {
				const buf = options.sliceBuffers[0]!.buffer;
				await fsp.writeFile(targetVolumePath, buf);
				totalSizeBytes += buf.length;
			} else if (options.sliceFilePaths && options.sliceFilePaths.length === 1) {
				await fsp.copyFile(options.sliceFilePaths[0]!, targetVolumePath);
				const st = await fsp.stat(targetVolumePath);
				totalSizeBytes += st.size;
			}
		}

		// 4. СЛУЧАЙ 2: 400 срезов в подпапке slices/
		if (layout === "series_slices") {
			const slicesFolder = path.join(studyFolder, "slices");
			await fsp.mkdir(slicesFolder, { recursive: true });
			primaryDataPath = slicesFolder;

			if (options.sliceBuffers && options.sliceBuffers.length > 0) {
				// Сортируем буферы по instanceNumber при наличии
				const sorted = [...options.sliceBuffers].sort(
					(a, b) => (a.instanceNumber ?? 0) - (b.instanceNumber ?? 0),
				);

				for (let i = 0; i < sorted.length; i++) {
					const item = sorted[i]!;
					const pad = String(i + 1).padStart(4, "0");
					const sliceFileName = `slice_${pad}.dcm`;
					const slicePath = path.join(slicesFolder, sliceFileName);
					await fsp.writeFile(slicePath, item.buffer);
					totalSizeBytes += item.buffer.length;

					if (i % 25 === 0) {
						await new Promise((r) => setImmediate(r));
					}
				}
			} else if (options.sliceFilePaths && options.sliceFilePaths.length > 0) {
				for (let i = 0; i < options.sliceFilePaths.length; i++) {
					const srcPath = options.sliceFilePaths[i]!;
					if (!fs.existsSync(srcPath)) continue;
					const pad = String(i + 1).padStart(4, "0");
					const sliceFileName = `slice_${pad}.dcm`;
					const slicePath = path.join(slicesFolder, sliceFileName);
					await fsp.copyFile(srcPath, slicePath);
					const st = await fsp.stat(slicePath);
					totalSizeBytes += st.size;

					if (i % 25 === 0) {
						await new Promise((r) => setImmediate(r));
					}
				}
			}
		}

		// 5. Сохранение DICOMDIR (если предоставлен)
		let dicomdirPath: string | undefined;
		if (options.dicomdirBuffer) {
			dicomdirPath = path.join(studyFolder, "DICOMDIR");
			await fsp.writeFile(dicomdirPath, options.dicomdirBuffer);
			totalSizeBytes += options.dicomdirBuffer.length;
		} else if (options.dicomdirFilePath && fs.existsSync(options.dicomdirFilePath)) {
			dicomdirPath = path.join(studyFolder, "DICOMDIR");
			await fsp.copyFile(options.dicomdirFilePath, dicomdirPath);
			const st = await fsp.stat(dicomdirPath);
			totalSizeBytes += st.size;
		}

		// 6. Генерация ярлыков быстрого запуска (1-Click Desktop Launchers)
		const shortcutOpts = {
			studyInstanceUid: options.studyInstanceUid,
			baseUrl: options.baseUrl,
		};

		// 6.1. Windows Internet Shortcut (.url)
		const winShortcutContent = generateWindowsUrlShortcut(shortcutOpts);
		const windowsShortcutPath = path.join(studyFolder, "Открыть в DENTE.url");
		await fsp.writeFile(windowsShortcutPath, winShortcutContent, "utf8");

		// 6.2. macOS WebLoc (.webloc)
		const macWeblocContent = generateMacWeblocShortcut(shortcutOpts);
		const macWeblocPath = path.join(studyFolder, "Открыть в DENTE.webloc");
		await fsp.writeFile(macWeblocPath, macWeblocContent, "utf8");

		// 6.3. macOS Command script (.command)
		const macCommandContent = generateMacCommandShortcut(shortcutOpts);
		const macCommandPath = path.join(studyFolder, "Открыть_в_DENTE.command");
		await fsp.writeFile(macCommandPath, macCommandContent, "utf8");

		// Даем права на исполнение на POSIX системах
		if (os.platform() !== "win32") {
			try {
				await fsp.chmod(macCommandPath, 0o755);
			} catch {
				// игнорируем ошибку chmod
			}
		}

		// 7. Формирование и сохранение study_manifest.json
		const manifest = buildStudyManifest({
			studyInstanceUid: options.studyInstanceUid,
			seriesInstanceUid: options.seriesInstanceUid,
			sopInstanceUid: options.sopInstanceUid,
			patientFullName: options.patientFullName,
			patientChartNumber: options.patientChartNumber,
			patientBirthDate: options.patientBirthDate,
			studyDate: options.studyDate,
			studyTime: options.studyTime,
			modality: options.modality,
			modalityKind: options.modalityKind,
			sliceCount,
			packageLayout: layout,
			dimensions: options.dimensions,
			voxelSpacing: options.voxelSpacing,
			sliceThickness: options.sliceThickness,
			kvp: options.kvp,
			ma: options.ma,
			exposureTimeMs: options.exposureTimeMs,
			doseAreaProductDap: options.doseAreaProductDap,
			effectiveDoseMsv: options.effectiveDoseMsv,
			manufacturer: options.manufacturer,
			manufacturerModelName: options.manufacturerModelName,
			fileSizeBytes: totalSizeBytes,
			baseUrl: options.baseUrl,
		});

		const manifestJson = formatStudyManifestJson(manifest);
		const manifestPath = path.join(studyFolder, "study_manifest.json");
		await fsp.writeFile(manifestPath, manifestJson, "utf8");

		return {
			studyFolder,
			folderName,
			layout,
			slicesCount: sliceCount,
			manifestPath,
			windowsShortcutPath,
			macWeblocPath,
			macCommandPath,
			primaryDataPath,
			dicomdirPath,
			totalSizeBytes,
			manifest,
		};
	}
}

export const dicomStoragePackagingService = new DicomStoragePackagingService();
