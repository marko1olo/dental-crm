/**
 * directoryWatcher.ts — Layer 2: Кроссплатформенное определение путей томографов,
 * рекурсивный поиск исследований и мониторинг горячих папок (fs.watch) с debouncing.
 */

import { existsSync, statSync, readdirSync, watch, type FSWatcher } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { DEBOUNCE_FILE_STABILIZE_MS, JUNK_VIEWER_PATH_REGEX } from "./types.js";

/**
 * Получение путей сканирования на macOS (системные папки, OsiriX, Horos, внешние тома /Volumes)
 */
export function getMacWatchPaths(homedir?: string): string[] {
	const rawHome = homedir || os.homedir();
	const home = rawHome.replace(/\\/g, "/");
	const paths: string[] = [
		path.posix.join(home, "Downloads"),
		path.posix.join(home, "Desktop"),
		path.posix.join(home, "Documents"),
		path.posix.join(home, "Documents", "OsiriX Data"),
		path.posix.join(home, "Library", "Application Support", "OsiriX"),
		path.posix.join(home, "Library", "Application Support", "Horos"),
		"/Library/Application Support/OsiriX",
		"/Library/Application Support/Horos",
	];

	// Внешние тома macOS: /Volumes/*/DICOM и /Volumes/*/CT_Export
	const volumesRoot = "/Volumes";
	try {
		if (existsSync(volumesRoot) && statSync(volumesRoot).isDirectory()) {
			const entries = readdirSync(volumesRoot, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.isDirectory()) {
					paths.push(path.posix.join(volumesRoot, entry.name, "DICOM"));
					paths.push(path.posix.join(volumesRoot, entry.name, "CT_Export"));
				}
			}
		}
	} catch {
		// игнорируем ошибку обхода /Volumes
	}

	return paths;
}

/**
 * Получение путей сканирования на Windows
 */
export function getWindowsWatchPaths(homedir?: string): string[] {
	const home = homedir || os.homedir();
	return [
		path.join(home, "Downloads"),
		path.join(home, "Desktop"),
		path.join(home, "Documents"),
		"C:\\EzDent-i\\Data",
		"C:\\EzDent-i\\Export",
		"C:\\Ez3D-i\\Export",
		"C:\\Romexis\\Studies",
		"C:\\Romexis\\Export",
		"C:\\Planmeca",
		"C:\\Sidexis\\Export",
		"C:\\KaVo\\Export",
		"C:\\CT_Export",
		"D:\\DICOM",
		"D:\\CT_Export",
		"D:\\Export",
	];
}

/**
 * Получение стандартных путей сканирования на рабочих станциях клиники (с поддержкой macOS, Windows и Linux)
 */
export function getDefaultWatchPaths(platformOverride?: string, homedirOverride?: string): string[] {
	const envPaths = process.env.DENTAL_DICOM_CRAWLER_PATHS
		? process.env.DENTAL_DICOM_CRAWLER_PATHS.split(/[;|]/).map((p) => p.trim()).filter(Boolean)
		: [];

	const currentPlatform = platformOverride ?? os.platform();
	const home = homedirOverride ?? os.homedir();

	let candidates: string[] = [];
	if (currentPlatform === "darwin") {
		candidates = [...envPaths, ...getMacWatchPaths(home)];
	} else if (currentPlatform === "win32") {
		candidates = [...envPaths, ...getWindowsWatchPaths(home)];
	} else {
		// Linux & others
		candidates = [
			...envPaths,
			path.join(home, "Downloads"),
			path.join(home, "Desktop"),
			path.join(home, "Documents"),
			path.join(home, ".local", "share", "dentedental", "dicom"),
		];
	}

	const existing = candidates.filter((p) => {
		try {
			return existsSync(p) && statSync(p).isDirectory();
		} catch {
			return false;
		}
	});

	return Array.from(new Set(existing.map((p) => path.resolve(p))));
}

/**
 * Получение горячих папок для real-time fs.watch (с поддержкой macOS и Windows)
 */
export function getDefaultHotFolders(platformOverride?: string, homedirOverride?: string): string[] {
	const currentPlatform = platformOverride ?? os.platform();
	const home = homedirOverride ?? os.homedir();

	let candidates: string[] = [];
	if (currentPlatform === "darwin") {
		candidates = [
			path.join(home, "Downloads"),
			path.join(home, "Desktop"),
			path.join(home, "Documents", "OsiriX Data"),
		];
		const volumesRoot = "/Volumes";
		try {
			if (existsSync(volumesRoot) && statSync(volumesRoot).isDirectory()) {
				const entries = readdirSync(volumesRoot, { withFileTypes: true });
				for (const entry of entries) {
					if (entry.isDirectory()) {
						candidates.push(path.join(volumesRoot, entry.name, "DICOM"));
						candidates.push(path.join(volumesRoot, entry.name, "CT_Export"));
					}
				}
			}
		} catch {
			// игнорируем
		}
	} else if (currentPlatform === "win32") {
		candidates = [
			path.join(home, "Downloads"),
			path.join(home, "Desktop"),
			"C:\\EzDent-i\\Export",
			"C:\\Romexis\\Export",
			"D:\\CT_Export",
		];
	} else {
		candidates = [
			path.join(home, "Downloads"),
			path.join(home, "Desktop"),
		];
	}

	return candidates.filter((p) => {
		try {
			return existsSync(p) && statSync(p).isDirectory();
		} catch {
			return false;
		}
	});
}

/**
 * Рекурсивный поиск архивов .zip и папок в директории
 */
export async function findArchivesAndFolders(
	currentPath: string,
	maxDepth: number,
	currentDepth = 0,
): Promise<{ archives: string[]; folders: string[] }> {
	if (currentDepth > maxDepth) return { archives: [], folders: [] };

	const archives: string[] = [];
	const folders: string[] = [];

	let entries;
	try {
		entries = await readdir(currentPath, { withFileTypes: true });
	} catch {
		return { archives, folders };
	}

	let hasDicomInCurrent = false;

	for (const entry of entries) {
		if (entry.isFile()) {
			const ext = path.extname(entry.name).toLowerCase();
			if (ext === ".zip") {
				archives.push(path.join(currentPath, entry.name));
			} else if (
				ext === ".dcm" ||
				ext === ".dicom" ||
				ext === ".ima" ||
				/^DICOMDIR$/i.test(entry.name) ||
				/^(?:CT|IMG|SERIES|SLICE)[0-9_.-]/i.test(entry.name)
			) {
				hasDicomInCurrent = true;
			}
		} else if (entry.isDirectory()) {
			// Пропускаем служебные каталоги и сторонние просмотрщики
			const dirLower = entry.name.toLowerCase();
			if (
				dirLower === "node_modules" ||
				dirLower === ".git" ||
				dirLower === "dist" ||
				dirLower === "build" ||
				dirLower === "temp" ||
				dirLower === "tmp" ||
				JUNK_VIEWER_PATH_REGEX.test(entry.name)
			) {
				continue;
			}
			const sub = path.join(currentPath, entry.name);
			const subRes = await findArchivesAndFolders(sub, maxDepth, currentDepth + 1);
			archives.push(...subRes.archives);
			folders.push(...subRes.folders);
			await new Promise((r) => setImmediate(r));
		}
	}

	if (hasDicomInCurrent) {
		folders.push(currentPath);
	}

	return { archives, folders };
}

export type HotFileHandler = (targetPath: string) => Promise<void>;

/**
 * Контроллер для наблюдения за каталогами (fs.watch) с защитой от множественных событий
 */
export class HotFolderWatchController {
	private watchers: FSWatcher[] = [];

	public setupWatchers(
		folders: string[],
		onFileEvent: HotFileHandler,
		onError?: (errMessage: string) => void,
	): void {
		this.closeWatchers();

		for (const hotDir of folders) {
			if (!existsSync(hotDir)) continue;
			try {
				const watcher = watch(hotDir, { recursive: false }, (_eventType, filename) => {
					if (!filename) return;
					const fullPath = path.join(hotDir, filename.toString());
					this.scheduleFileDebounce(fullPath, onFileEvent);
				});
				this.watchers.push(watcher);
			} catch (err) {
				if (onError) {
					onError(`Не удалось подключить fs.watch к ${hotDir}: ${String(err)}`);
				}
			}
		}
	}

	public closeWatchers(): void {
		for (const w of this.watchers) {
			try {
				w.close();
			} catch {
				// игнорируем
			}
		}
		this.watchers = [];
	}

	private scheduleFileDebounce(targetPath: string, handler: HotFileHandler): void {
		setTimeout(async () => {
			try {
				if (!existsSync(targetPath)) return;
				const st = await stat(targetPath);
				// Проверяем стабилизацию файла (завершение записи)
				if (Date.now() - st.mtimeMs < DEBOUNCE_FILE_STABILIZE_MS) {
					return;
				}
				await handler(targetPath);
			} catch {
				// игнорируем временные сбои доступа
			}
		}, DEBOUNCE_FILE_STABILIZE_MS);
	}
}
