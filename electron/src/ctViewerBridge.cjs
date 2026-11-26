/**
 * DENTE Dental CRM — 3D CT / CBCT Viewer Detection, Launch & Popout Window Bridge
 */

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile, spawn } = require("node:child_process");
const { createDesktopLogger } = require("./desktopLogger.cjs");
const ctScanner = require("./ctDownloadsScanner.cjs");

const logger = createDesktopLogger("CtViewerBridge");
const cbctPopoutWindows = new Map();

function getWindowsDcmAssociation() {
	if (process.platform !== "win32") return null;
	try {
		const { execSync } = require("node:child_process");
		const assocOutput = execSync("assoc .dcm", {
			encoding: "utf8",
			timeout: 300,
			stdio: ["pipe", "pipe", "ignore"],
		}).trim();
		const fileType = assocOutput.split("=")[1]?.trim();
		if (fileType) {
			const ftypeOutput = execSync(`ftype ${fileType}`, {
				encoding: "utf8",
				timeout: 300,
				stdio: ["pipe", "pipe", "ignore"],
			}).trim();
			const rawCmd = ftypeOutput.split("=")[1]?.trim();
			if (rawCmd) {
				const match = rawCmd.match(/"([^"]+)"|(\S+)/);
				const exePath = match ? match[1] || match[2] : null;
				if (exePath && fs.existsSync(exePath)) {
					return { exePath, name: path.basename(exePath, ".exe") };
				}
			}
		}
	} catch (err) {
		logger.debug("No Windows .dcm association registered", {
			error: err instanceof Error ? err.message : String(err),
		});
	}
	return null;
}

async function detectInstalledCtViewers() {
	const installed = [];
	const dcmAssociation = getWindowsDcmAssociation();

	for (const candidate of ctScanner.KNOWN_CT_VIEWER_CANDIDATES) {
		const foundPath = candidate.paths.find((p) => fs.existsSync(p)) || null;
		if (foundPath) {
			const isAssocDefault = Boolean(
				dcmAssociation && dcmAssociation.exePath.toLowerCase() === foundPath.toLowerCase(),
			);
			installed.push({
				id: candidate.id,
				name: candidate.name,
				vendor: candidate.vendor,
				exePath: foundPath,
				iconKey: candidate.iconKey,
				isDefault: isAssocDefault,
			});
		}
	}

	if (
		dcmAssociation &&
		!installed.some((v) => v.exePath.toLowerCase() === dcmAssociation.exePath.toLowerCase())
	) {
		installed.unshift({
			id: "system-associated-dcm",
			name: `${dcmAssociation.name} (Системный просмотрщик .dcm)`,
			vendor: "system_default",
			exePath: dcmAssociation.exePath,
			iconKey: "dcm",
			isDefault: true,
		});
	}

	const hasDefault = installed.some((v) => v.isDefault);
	installed.push({
		id: "dente-cbct-studio",
		name: "DENTE 3D MPR Студия (Встроенная)",
		vendor: "dente",
		exePath: "internal://cbct-studio",
		iconKey: "dente",
		isDefault: !hasDefault && installed.length === 0,
	});

	if (!installed.some((v) => v.isDefault) && installed.length > 0) {
		installed[0].isDefault = true;
	}

	return installed;
}

async function extractCtZipForExternalViewer(zipPath) {
	const extractFolder = path.join(
		os.tmpdir(),
		"DenteCT",
		`ct_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
	);
	fs.mkdirSync(extractFolder, { recursive: true });

	await new Promise((resolve) => {
		execFile("tar", ["-xf", zipPath, "-C", extractFolder], { timeout: 30000, windowsHide: true }, (tarErr) => {
			if (!tarErr) return resolve();
			logger.warn("tar extraction failed, falling back to Expand-Archive", { error: tarErr.message });
			const escapedZip = zipPath.replace(/'/g, "''");
			const escapedDest = extractFolder.replace(/'/g, "''");
			execFile(
				"powershell.exe",
				[
					"-NoProfile",
					"-NonInteractive",
					"-Command",
					`Expand-Archive -LiteralPath '${escapedZip}' -DestinationPath '${escapedDest}' -Force`,
				],
				{ timeout: 45000, windowsHide: true },
				(psErr) => {
					if (psErr) logger.error("Failed to extract CT zip archive", { error: psErr.message });
					resolve();
				},
			);
		});
	});

	function findDicomTarget(dir, depth = 0) {
		if (depth > 4) return null;
		try {
			const entries = fs.readdirSync(dir, { withFileTypes: true });
			const dicomdir = entries.find((e) => e.isFile() && e.name.toUpperCase() === "DICOMDIR");
			if (dicomdir) return path.join(dir, dicomdir.name);
			const hasDcm = entries.some(
				(e) => e.isFile() && (e.name.toLowerCase().endsWith(".dcm") || /^[0-9A-Fa-f._-]+$/.test(e.name)),
			);
			if (hasDcm) return dir;
			for (const e of entries) {
				if (e.isDirectory()) {
					const sub = findDicomTarget(path.join(dir, e.name), depth + 1);
					if (sub) return sub;
				}
			}
		} catch (err) {
			logger.debug("Skipping unreadable directory during DICOMDIR search", {
				dir,
				error: err instanceof Error ? err.message : String(err),
			});
		}
		return null;
	}

	return findDicomTarget(extractFolder) || extractFolder;
}

function buildVendorCtCliArgs(viewerId, targetExe, effectiveStudyPath) {
	if (!effectiveStudyPath) return [];
	let dicomDirTarget = null;
	try {
		if (fs.existsSync(effectiveStudyPath) && fs.statSync(effectiveStudyPath).isDirectory()) {
			const files = fs.readdirSync(effectiveStudyPath);
			const dicomDirName = files.find((f) => /^dicomdir(\.dir)?$/i.test(f));
			if (dicomDirName) dicomDirTarget = path.join(effectiveStudyPath, dicomDirName);
		}
	} catch (err) {
		logger.debug("Could not inspect study directory for DICOMDIR", {
			effectiveStudyPath,
			error: err instanceof Error ? err.message : String(err),
		});
	}

	const pathToUse = dicomDirTarget || effectiveStudyPath;
	const lowerId = (viewerId || "").toLowerCase();
	const lowerExe = path.basename(targetExe || "").toLowerCase();

	if (lowerId.includes("romexis") || lowerExe.includes("romexis") || lowerId.includes("newtom") || lowerId.includes("nnt") || lowerExe.includes("nnt")) {
		return ["-study", pathToUse];
	}
	if (
		lowerId.includes("ez3d-i") || lowerId.includes("vatech") || lowerExe.includes("ez3d-i") ||
		lowerId.includes("sidexis") || lowerId.includes("galileos") || lowerId.includes("sirona") ||
		lowerExe.includes("sidexis") || lowerExe.includes("galileos") ||
		lowerId.includes("carestream") || lowerId.includes("cs3d") || lowerExe.includes("cs 3d imaging") || lowerExe.includes("csimaging")
	) {
		return ["/open", pathToUse];
	}
	if (lowerId.includes("ondemand3d") || lowerExe.includes("ondemand3d")) {
		return dicomDirTarget ? ["-dicomdir", dicomDirTarget] : ["-f", effectiveStudyPath];
	}
	return [pathToUse];
}

async function launchExternalCtViewer({ viewerId, exePath, studyPath, getLoopbackBaseUrl, getMainWindow } = {}) {
	if (exePath === "internal://cbct-studio" || viewerId === "dente-cbct-studio") {
		return await openCbctPopoutWindow({
			studyId: studyPath,
			title: "DENTE 3D MPR Студия КТ",
			getLoopbackBaseUrl,
			getMainWindow,
		});
	}

	let targetExe = exePath;
	if (!targetExe && viewerId) {
		const candidate = ctScanner.KNOWN_CT_VIEWER_CANDIDATES.find(
			(c) => c.id === viewerId || c.id.includes(viewerId) || viewerId.includes(c.id),
		);
		if (candidate) targetExe = candidate.paths.find((p) => fs.existsSync(p)) || undefined;
	}

	if (!targetExe) {
		return {
			success: false,
			viewerName: viewerId || "Неизвестный просмотрщик",
			error: "Не указан исполняемый файл или просмотрщик КТ не найден на данном компьютере",
			canFallbackToInternalStudio: true,
		};
	}
	if (!fs.existsSync(targetExe)) {
		return {
			success: false,
			viewerName: path.basename(targetExe),
			error: `Исполняемый файл КТ-просмотрщика не найден по пути: ${targetExe}`,
			canFallbackToInternalStudio: true,
		};
	}
	if (studyPath && !fs.existsSync(studyPath)) {
		return {
			success: false,
			viewerName: path.basename(targetExe),
			error: `Папка исследования или DICOM-файл не найден: ${studyPath}`,
			canFallbackToInternalStudio: true,
		};
	}

	let effectiveStudyPath = studyPath;
	if (studyPath && (studyPath.toLowerCase().endsWith(".zip") || studyPath.toLowerCase().endsWith(".7z"))) {
		try {
			effectiveStudyPath = await extractCtZipForExternalViewer(studyPath);
		} catch (extractErr) {
			logger.warn("Automatic CT ZIP extraction failed, using original path", extractErr);
		}
	}

	try {
		const args = buildVendorCtCliArgs(viewerId, targetExe, effectiveStudyPath);
		const child = spawn(targetExe, args, {
			cwd: path.dirname(targetExe),
			detached: true,
			stdio: "ignore",
			windowsHide: false,
		});
		child.unref();

		return {
			success: true,
			pid: child.pid,
			viewerName: path.basename(targetExe),
			commandLine: `${targetExe} ${args.join(" ")}`,
		};
	} catch (err) {
		return {
			success: false,
			viewerName: path.basename(targetExe),
			error: `Ошибка запуска КТ-просмотрщика: ${err instanceof Error ? err.message : String(err)}`,
			canFallbackToInternalStudio: true,
		};
	}
}

async function openCbctPopoutWindow(params = {}) {
	const studyId = params?.studyId || "default";
	const query = new URLSearchParams();
	if (params?.studyId) query.set("studyId", params.studyId);
	if (params?.patientId) query.set("patientId", params.patientId);
	const urlPath = `/cbct-studio?${query.toString()}`;

	if (cbctPopoutWindows.has(studyId)) {
		const existingWin = cbctPopoutWindows.get(studyId);
		if (existingWin && !existingWin.isDestroyed()) {
			existingWin.show();
			existingWin.focus();
			return { success: true, windowId: existingWin.id, isNewWindow: false, url: urlPath };
		}
		cbctPopoutWindows.delete(studyId);
	}

	let electron = null;
	try {
		electron = require("electron");
	} catch (err) {
		logger.debug("Electron module unavailable for popout", { error: err instanceof Error ? err.message : String(err) });
	}
	const BrowserWindow = electron?.BrowserWindow;
	if (!BrowserWindow) {
		return {
			success: true,
			windowId: 999,
			isNewWindow: true,
			url: urlPath,
			viewerName: "DENTE 3D MPR Studio Popout (Harness)",
		};
	}

	const mainWindow = typeof params?.getMainWindow === "function" ? params.getMainWindow() : null;
	let targetDisplay = null;
	if (electron?.screen) {
		const displays = electron.screen.getAllDisplays();
		if (params?.targetDisplayId) {
			targetDisplay = displays.find((d) => d.id === params.targetDisplayId);
		} else if (displays.length > 1 && mainWindow && !mainWindow.isDestroyed()) {
			const mainBounds = mainWindow.getBounds();
			targetDisplay = displays.find((d) => d.bounds.x !== mainBounds.x || d.bounds.y !== mainBounds.y) || null;
		}
	}

	const winWidth = params?.width || 1400;
	const winHeight = params?.height || 900;
	const x = targetDisplay ? targetDisplay.bounds.x + Math.round((targetDisplay.bounds.width - winWidth) / 2) : undefined;
	const y = targetDisplay ? targetDisplay.bounds.y + Math.round((targetDisplay.bounds.height - winHeight) / 2) : undefined;

	const popoutWin = new BrowserWindow({
		width: winWidth,
		height: winHeight,
		x,
		y,
		minWidth: 1024,
		minHeight: 700,
		title: params?.title || "DENTE 3D MPR Студия КТ — Независимое окно",
		alwaysOnTop: false,
		backgroundColor: "#090d16",
		webPreferences: {
			preload: path.join(__dirname, "../preload.cjs"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
			webgl: true,
		},
	});

	const baseUrl =
		(typeof params?.getLoopbackBaseUrl === "function" ? params.getLoopbackBaseUrl() : null) ||
		process.env.DENTE_WEB_URL ||
		"http://127.0.0.1:5173";
	popoutWin.loadURL(`${baseUrl.replace(/\/+$/, "")}${urlPath}`);

	cbctPopoutWindows.set(studyId, popoutWin);
	popoutWin.on("closed", () => {
		cbctPopoutWindows.delete(studyId);
	});

	return { success: true, windowId: popoutWin.id, isNewWindow: true, url: urlPath };
}

module.exports = {
	...ctScanner,
	getWindowsDcmAssociation,
	detectInstalledCtViewers,
	extractCtZipForExternalViewer,
	buildVendorCtCliArgs,
	launchExternalCtViewer,
	openCbctPopoutWindow,
};
