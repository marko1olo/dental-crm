/**
 * DENTE Dental CRM — Honest TWAIN / WIA / HotFolder Scanner Bridge
 *
 * Scans real Windows TWAIN data sources (`C:\Windows\twain_32\*.ds`),
 * queries WIA (`WIA.DeviceManager`), validates configured HotFolders,
 * and streams detected radiograph files without hardcoded phantom sensors.
 */

const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { createDesktopLogger } = require("./desktopLogger.cjs");
const {
	detectHardwareVendorFromPath,
	detectInstalledDentalHardware,
	getAnatomicalDentalPreviewDataUri,
	parseHotFolderFilenameMetadata,
} = require("./dentalHardwareCatalog.cjs");

const execFileAsync = promisify(execFile);
const logger = createDesktopLogger("TwainWiaScannerBridge");

const activeWatchers = new Map();
const MAX_ACTIVE_WATCHERS = 32;
const MAX_HANDLED_FILES_PER_WATCHER = 256;
const MAX_HOTFOLDER_READ_BYTES = 16 * 1024 * 1024;

async function scanTwainDataSources(twainDirs = ["C:\\Windows\\twain_32", "C:\\Windows\\twain_64"]) {
	const sources = [];
	const dirs = Array.isArray(twainDirs) ? twainDirs : [twainDirs];

	async function walk(dirPath, depth) {
		if (depth > 2) return;
		let entries;
		try {
			entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
		} catch (err) {
			const code = err && typeof err === "object" ? err.code : undefined;
			if (code !== "ENOENT") {
				logger.warn("Unable to read TWAIN directory", { dirPath, error: err instanceof Error ? err.message : String(err) });
			}
			return;
		}

		for (const entry of entries) {
			const fullPath = path.join(dirPath, entry.name);
			if (entry.isDirectory()) {
				await walk(fullPath, depth + 1);
			} else if (entry.isFile() && entry.name.toLowerCase().endsWith(".ds")) {
				const baseName = path.basename(entry.name, ".ds");
				const vendor = detectHardwareVendorFromPath(fullPath);
				sources.push({
					id: `twain-ds-${baseName.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}`,
					name: `${baseName} (TWAIN .ds)`,
					type: /cam/i.test(baseName) ? "camera" : /wia/i.test(baseName) ? "scanner" : "sensor",
					source: "twain_ds",
					vendor,
					driverPath: fullPath,
					connected: true,
				});
			}
		}
	}

	for (const dir of dirs) {
		if (typeof dir === "string" && dir.trim()) {
			await walk(dir.trim(), 0);
		}
	}

	return sources;
}

async function queryWiaDevices(options = {}) {
	if (typeof options.wiaQueryFn === "function") {
		return await options.wiaQueryFn();
	}
	if (process.platform !== "win32" || options.skipWia === true) {
		return [];
	}

	const psCommand = [
		"$mgr = New-Object -ComObject WIA.DeviceManager;",
		"$items = @();",
		"foreach ($d in $mgr.DeviceInfos) {",
		"  $name = $d.Properties['Name'].Value;",
		"  $items += [PSCustomObject]@{ DeviceID = $d.DeviceID; Name = $name; Type = [int]$d.Type };",
		"}",
		"$items | ConvertTo-Json -Compress",
	].join(" ");

	try {
		const { stdout } = await execFileAsync(
			"powershell.exe",
			["-NoProfile", "-NonInteractive", "-Command", psCommand],
			{ encoding: "utf8", timeout: Number(options.wiaTimeoutMs || 2000), windowsHide: true },
		);
		const trimmed = stdout.trim();
		if (!trimmed) return [];
		const parsed = JSON.parse(trimmed);
		const list = Array.isArray(parsed) ? parsed : [parsed];
		return list
			.filter((d) => d && (d.Name || d.DeviceID))
			.map((d) => {
				const name = String(d.Name || d.DeviceID);
				const deviceType = d.Type === 3 ? "camera" : "scanner";
				return {
					id: `wia-${String(d.DeviceID || name).toLowerCase().replace(/[^a-z0-9_-]/g, "-")}`,
					name: `${name} (WIA)`,
					type: deviceType,
					source: "wia",
					vendor: detectHardwareVendorFromPath(name),
					deviceId: String(d.DeviceID || ""),
					connected: true,
				};
			});
	} catch (err) {
		logger.warn("Windows WIA device query failed or timed out", {
			error: err instanceof Error ? err.message : String(err),
		});
		return [];
	}
}

async function validateHotFolderPath(folderPath) {
	if (!folderPath || typeof folderPath !== "string" || !folderPath.trim()) {
		return { valid: false, exists: false, writable: false, error: "Путь HotFolder не указан" };
	}
	const resolved = path.resolve(folderPath.trim());
	try {
		const stat = await fs.promises.stat(resolved);
		if (!stat.isDirectory()) {
			return { valid: false, exists: true, writable: false, path: resolved, error: "Указанный путь не является папкой" };
		}
		await fs.promises.access(resolved, fs.constants.R_OK);
		let writable = false;
		try {
			await fs.promises.access(resolved, fs.constants.W_OK);
			writable = true;
		} catch (writeErr) {
			logger.debug("HotFolder is read-only", { path: resolved, error: writeErr instanceof Error ? writeErr.message : String(writeErr) });
		}
		return {
			valid: true,
			exists: true,
			writable,
			path: resolved,
			vendor: detectHardwareVendorFromPath(resolved),
		};
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return { valid: false, exists: false, writable: false, path: resolved, error: `Папка недоступна: ${msg}` };
	}
}

async function getTwainDevices(options = {}) {
	const [twainSources, wiaDevices] = await Promise.all([
		scanTwainDataSources(options.twainDirs),
		queryWiaDevices(options),
	]);

	const devices = [...twainSources, ...wiaDevices];
	const configuredHotFolders = Array.isArray(options.hotFolders) ? options.hotFolders : [];

	for (const folder of configuredHotFolders) {
		const check = await validateHotFolderPath(folder);
		const vendor = check.vendor || detectHardwareVendorFromPath(String(folder));
		devices.push({
			id: `hotfolder-${vendor}-${Buffer.from(String(folder)).toString("hex").slice(0, 8)}`,
			name: `HotFolder (${path.basename(String(folder)) || folder})`,
			type: "sensor",
			source: "hot_folder",
			vendor,
			folderPath: check.path || String(folder),
			connected: check.valid,
			...(check.error ? { error: check.error } : {}),
		});
	}

	if (options.includeInstalledPresets !== false) {
		const installed = detectInstalledDentalHardware();
		for (const hw of installed) {
			devices.push({
				id: `installed-${hw.vendor}-${hw.presetId}`,
				name: hw.name,
				type: hw.family === "photo_protocol" ? "camera" : hw.family === "document_scanner" ? "scanner" : "sensor",
				source: "installed_software",
				vendor: hw.vendor,
				folderPath: hw.detectedPath,
				connected: true,
			});
		}
	}

	return devices;
}

async function acquireTwainImage(deviceId, options = {}) {
	const vendorKey = deviceId ? String(deviceId).replace(/^twain-/, "").split("-")[0] : "scans";
	const candidateFolders = [];
	if (Array.isArray(options.hotFolders)) {
		candidateFolders.push(...options.hotFolders);
	}
	candidateFolders.push(path.join("C:\\DenteHotFolder", vendorKey));

	for (const hotFolder of candidateFolders) {
		const validation = await validateHotFolderPath(hotFolder);
		if (!validation.valid) continue;

		try {
			const files = (await fs.promises.readdir(validation.path))
				.filter((f) => /\.(dcm|dicom|tif|tiff|png|jpg|jpeg)$/i.test(f));
			if (files.length > 0) {
				const latestFile = path.join(validation.path, files[files.length - 1]);
				const stat = await fs.promises.stat(latestFile);
				if (stat.size > MAX_HOTFOLDER_READ_BYTES) {
					return {
						success: false,
						status: "file_too_large",
						error: `Файл снимка превышает лимит прямого буфера (${stat.size} байт). Используйте потоковую загрузку.`,
						deviceId,
					};
				}
				const fileBuf = await fs.promises.readFile(latestFile);
				const ext = path.extname(latestFile).toLowerCase();
				const mime = ext === ".dcm" || ext === ".dicom" ? "application/dicom" : `image/${ext.replace(".", "")}`;
				return {
					success: true,
					filePath: latestFile,
					dataBase64: `data:${mime};base64,${fileBuf.toString("base64")}`,
					deviceId,
					vendor: detectHardwareVendorFromPath(deviceId || latestFile),
				};
			}
		} catch (err) {
			return {
				success: false,
				status: "acquisition_error",
				error: `Ошибка чтения HotFolder: ${err instanceof Error ? err.message : String(err)}`,
				deviceId,
			};
		}
	}

	return {
		success: false,
		status: "hardware_offline",
		error: `Визиограф '${deviceId || "default"}' не передал снимок. Проверьте подключение датчика или папку HotFolder.`,
		deviceId,
		vendor: detectHardwareVendorFromPath(deviceId || ""),
	};
}

function setupDicomFolderWatch(folderPath, callbackId, getMainWindow) {
	if (!folderPath || typeof folderPath !== "string") {
		return { success: false, error: "Не указана папка для мониторинга" };
	}
	if (!fs.existsSync(folderPath)) {
		try {
			fs.mkdirSync(folderPath, { recursive: true });
		} catch (err) {
			return { success: false, error: `Не удалось создать папку: ${err instanceof Error ? err.message : String(err)}` };
		}
	}

	if (activeWatchers.has(folderPath)) {
		return { success: true };
	}
	if (activeWatchers.size >= MAX_ACTIVE_WATCHERS) {
		const oldestKey = activeWatchers.keys().next().value;
		if (oldestKey) unwatchDicomFolder(oldestKey);
	}

	try {
		const handledFiles = new Map();
		const watcher = fs.watch(folderPath, (_eventType, fileName) => {
			if (!fileName) return;
			const ext = path.extname(fileName).toLowerCase();
			const isSupportedFile = [
				".dcm", ".dicom", ".ima", ".stl", ".ply", ".obj",
				".pdf", ".tif", ".tiff", ".jpg", ".jpeg", ".png", ".bmp", ".webp",
			].includes(ext);
			if (!isSupportedFile) return;

			const fullPath = path.join(folderPath, fileName);
			const now = Date.now();
			const prevHandled = handledFiles.get(fullPath);
			if (prevHandled && now - prevHandled < 5000) return;

			const debounceTimer = setTimeout(async () => {
				try {
					if (!fs.existsSync(fullPath)) return;
					const stats = await fs.promises.stat(fullPath);
					if (stats.size === 0) return;

					if (handledFiles.size >= MAX_HANDLED_FILES_PER_WATCHER) {
						const oldest = handledFiles.keys().next().value;
						if (oldest) handledFiles.delete(oldest);
					}
					handledFiles.set(fullPath, Date.now());

					const meta = parseHotFolderFilenameMetadata(fileName, fullPath);
					const { toothCode, patientId, vendor, modality, fileCategory, photoProtocolSlot } = meta;
					let thumbnailDataUri = null;
					const isStandardImage = [".jpg", ".jpeg", ".png", ".bmp", ".webp"].includes(ext);

					if (isStandardImage && stats.size <= 4 * 1024 * 1024) {
						const imgBuf = await fs.promises.readFile(fullPath);
						const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : `image/${ext.slice(1)}`;
						thumbnailDataUri = `data:${mime};base64,${imgBuf.toString("base64")}`;
					} else if ((ext === ".dcm" || ext === ".dicom" || ext === ".ima") && stats.size <= 4 * 1024 * 1024) {
						const dcmBuf = await fs.promises.readFile(fullPath);
						thumbnailDataUri = `data:application/dicom;base64,${dcmBuf.toString("base64")}`;
					} else if (fileCategory === "dicom" || modality === "IO") {
						thumbnailDataUri = getAnatomicalDentalPreviewDataUri(toothCode || "16");
					}

					const mainWindow = typeof getMainWindow === "function" ? getMainWindow() : null;
					if (mainWindow && !mainWindow.isDestroyed()) {
						const basePayload = {
							callbackId,
							filePath: fullPath,
							fileName,
							fileSize: stats.size,
							toothCode,
							patientId,
							vendor,
							modality,
							detectedAt: new Date().toISOString(),
							thumbnailDataUri,
							hasRawData: Boolean(thumbnailDataUri),
						};
						mainWindow.webContents.send("dente:dicom-file-detected", basePayload);
						mainWindow.webContents.send("dente:hardware-file-detected", {
							...basePayload,
							fileCategory,
							photoProtocolSlot,
						});
					}
				} catch (err) {
					logger.debug("Transient read/lock skip during hot-folder event", {
						fullPath,
						error: err instanceof Error ? err.message : String(err),
					});
				}
			}, 300);
			if (typeof debounceTimer.unref === "function") debounceTimer.unref();
		});

		activeWatchers.set(folderPath, watcher);
		return { success: true };
	} catch (err) {
		return { success: false, error: `Ошибка мониторинга папки: ${err instanceof Error ? err.message : String(err)}` };
	}
}

function unwatchDicomFolder(folderPath) {
	const watcher = activeWatchers.get(folderPath);
	if (watcher) {
		try {
			watcher.close();
		} catch (err) {
			logger.warn("Error closing directory watcher", { folderPath, error: err instanceof Error ? err.message : String(err) });
		}
		activeWatchers.delete(folderPath);
	}
	return { success: true };
}

function closeAllWatchers() {
	for (const [folderPath, watcher] of activeWatchers.entries()) {
		try {
			watcher.close();
		} catch (err) {
			logger.warn("Error closing directory watcher on shutdown", {
				folderPath,
				error: err instanceof Error ? err.message : String(err),
			});
		}
	}
	activeWatchers.clear();
}

function setupAutoHardwareWatchers(_win, getMainWindow) {
	const detected = detectInstalledDentalHardware();
	const attached = [];
	for (const hw of detected) {
		if (hw.protocol === "watch_folder" || hw.protocol === "slida") {
			const res = setupDicomFolderWatch(hw.detectedPath, `auto-watch-${hw.vendor}`, getMainWindow);
			if (res.success) {
				attached.push(hw);
				logger.info(`Auto-attached watch-folder for ${hw.name}`, { path: hw.detectedPath });
			}
		}
	}
	return attached;
}

module.exports = {
	scanTwainDataSources,
	queryWiaDevices,
	validateHotFolderPath,
	getTwainDevices,
	acquireTwainImage,
	setupDicomFolderWatch,
	unwatchDicomFolder,
	closeAllWatchers,
	setupAutoHardwareWatchers,
};
