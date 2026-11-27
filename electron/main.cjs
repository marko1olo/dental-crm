/**
 * DENTE Dental CRM — Electron Main Process Entrypoint
 *
 * Lifecycle, single-instance lock, HTTP loopback origin loading (never `file://`),
 * keyboard shortcut interception, graceful shutdown, and modular hardware exports.
 */

const path = require("node:path");
const { configureDesktopLogFile, createDesktopLogger } = require("./src/desktopLogger.cjs");
const {
	startLoopbackHttpServer, stopLoopbackHttpServer, getLoopbackBaseUrl,
	probePostgresTcpSocket, getLocalServerStatus, switchLocalDatabaseMode, stopManagedServices,
	ensureEmbeddedBackendStarted,
} = require("./src/embeddedServerSupervisor.cjs");
const {
	checkKktStatusTcpSocket, printFiscalReceiptTcpSocket, printAtol10FiscalReceipt, printShtrihMFiscalReceipt,
} = require("./src/kktHardwareDriver.cjs");
const {
	getWindowsSerialPorts, getSystemPrinters, printThermalLabel, printDocumentSilent, printEscPosReceipt,
} = require("./src/printerAndSerialBridge.cjs");
const {
	getTwainDevices, acquireTwainImage, validateHotFolderPath,
	setupDicomFolderWatch: setupDicomWatchCore, unwatchDicomFolder, closeAllWatchers,
	setupAutoHardwareWatchers: setupAutoWatchersCore,
} = require("./src/twainWiaScannerBridge.cjs");
const {
	DENTAL_HARDWARE_PRESETS, DENTAL_PHOTO_PROTOCOL_12, detectHardwareVendorFromPath, matchPhotoProtocolSlot,
	parseHotFolderFilenameMetadata, parseDicomFilenameMetadata, detectInstalledDentalHardware,
	getAnatomicalDentalPreviewDataUri,
} = require("./src/dentalHardwareCatalog.cjs");
const {
	VENDOR_CLI_TEMPLATES, launchSlidaExport, parseSlidaIniResponse, parseSlidaXmlResponse,
	parseSlidaResponse, generateVddsMediaContent, parseVddsMediaResponse, launchVddsExport,
	getVendorCliTemplate, formatCommandLineBridge, launchCliBridge,
} = require("./src/imagingExchangeProtocols.cjs");
const {
	KNOWN_CT_VIEWER_CANDIDATES, getWindowsDcmAssociation, detectInstalledCtViewers, extractCtZipForExternalViewer,
	buildVendorCtCliArgs, launchExternalCtViewer, extractPatientHint, detectCtModality, scanDownloadsForCt,
	openCbctPopoutWindow,
} = require("./src/ctViewerBridge.cjs");
const {
	DEFAULT_LAN_BEACON_PORT, isPrivateIpv4, getLocalPhysicalLanAddresses,
	resolveConfiguredClinicServerUrl, probeClinicDiscoveryEndpoint, probeLanServersViaUdp,
} = require("./src/lanBeaconDesktopBridge.cjs");
const {
	resolveVaultDirectory, listVaultBackups, pruneVaultBackups,
	runPgDumpStreamBackup, runVaultBackupCycle, createAutoBackupScheduler,
} = require("./src/autoBackupVaultRunner.cjs");
const { registerIpcHandlers } = require("./src/ipcHandlers.cjs");
const lifecycle = require("./src/windowLifecycleAndUpdater.cjs");

const logger = createDesktopLogger("DesktopMain");

let electron = null;
try {
	electron = require("electron");
} catch (err) {
	logger.debug("Running outside Electron runtime (Node test/packaging harness)", {
		error: err instanceof Error ? err.message : String(err),
	});
}

const app = electron?.app;
const BrowserWindow = electron?.BrowserWindow;
const ipcMain = electron?.ipcMain;
const session = electron?.session;

let mainWindow = null;
let backupScheduler = null;

function getMainWindow() {
	return mainWindow;
}

function getUserDataDir() {
	try {
		return app?.getPath ? app.getPath("userData") : null;
	} catch (err) {
		logger.debug("app.getPath(userData) unavailable", { error: err instanceof Error ? err.message : String(err) });
		return null;
	}
}

const checkForDesktopUpdates = () => lifecycle.checkForDesktopUpdates(app);
const installDesktopUpdate = () => lifecycle.installDesktopUpdate();
const toggleFullScreen = (flag) => lifecycle.toggleFullScreen(mainWindow, flag);
const toggleKioskMode = (flag) => lifecycle.toggleKioskMode(mainWindow, flag);
const getWindowState = () => lifecycle.getWindowState(mainWindow);
const setupDicomFolderWatch = (folderPath, callbackId) => setupDicomWatchCore(folderPath, callbackId, getMainWindow);
const setupAutoHardwareWatchers = (win) => setupAutoWatchersCore(win, getMainWindow);

function handleProtocolUrl(urlStr) {
	if (!urlStr || typeof urlStr !== "string") return;
	try {
		if (!urlStr.startsWith("dental-dicom://") && !urlStr.startsWith("dente-ct://")) return;
		const search = new URL(urlStr).searchParams;
		const viewerId = search.get("viewer") || search.get("viewerId") || undefined;
		const exePath = search.get("exe") || search.get("exePath") || undefined;
		const studyPath = search.get("path") || search.get("studyPath") || undefined;
		if (studyPath || viewerId || exePath) {
			void launchExternalCtViewer({ viewerId, exePath, studyPath, getLoopbackBaseUrl, getMainWindow });
		}
	} catch (err) {
		logger.warn("Error handling protocol URL", { error: err instanceof Error ? err.message : String(err) });
	}
}

async function createWindow() {
	if (!BrowserWindow) return;
	const userDataDir = getUserDataDir();
	const runtimeConfigPath = userDataDir ? path.join(userDataDir, "runtime.json") : null;
	const embeddedStatus = await ensureEmbeddedBackendStarted({
		userDataDir,
		runtimeConfigPath,
		argv: process.argv,
	});
	if (embeddedStatus?.mode === "standalone" && (!embeddedStatus.pg?.started || !embeddedStatus.api?.started)) {
		logger.warn("Standalone embedded backend started in degraded state", embeddedStatus);
	}
	const loopback = await startLoopbackHttpServer({ runtimeConfigPath });

	mainWindow = new BrowserWindow({
		width: 1440,
		height: 900,
		minWidth: 1200,
		minHeight: 768,
		title: "DENTE Dental CRM — Desktop Standalone",
		backgroundColor: "#0f172a",
		webPreferences: {
			preload: path.join(__dirname, "preload.cjs"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
		},
	});

	const configuredClinicServerUrl = resolveConfiguredClinicServerUrl();
	const baseWebUrl = process.env.DENTE_WEB_URL || loopback.url;
	const targetUrl = configuredClinicServerUrl
		? `${baseWebUrl}?clinic_server=${encodeURIComponent(configuredClinicServerUrl)}`
		: baseWebUrl;
	await mainWindow.loadURL(targetUrl);

	mainWindow.on("closed", () => {
		mainWindow = null;
	});
	lifecycle.bindWindowHotkeys(mainWindow, toggleFullScreen);

	const updateTimer = setTimeout(async () => {
		if (mainWindow && !mainWindow.isDestroyed?.()) {
			try {
				const updateInfo = await checkForDesktopUpdates();
				if (updateInfo.updateAvailable && mainWindow.webContents) {
					mainWindow.webContents.send("dente:update-available", updateInfo);
				}
			} catch (err) {
				logger.warn("Silent background update check failed", err);
			}
		}
	}, 5000);
	if (typeof updateTimer.unref === "function") updateTimer.unref();
}

if (app && app.commandLine) {
	app.commandLine.appendSwitch("enable-gpu-rasterization");
	app.commandLine.appendSwitch("enable-zero-copy");
	app.commandLine.appendSwitch("ignore-gpu-blocklist");
	app.commandLine.appendSwitch("disk-cache-size", "268435456");
	app.commandLine.appendSwitch("media-cache-size", "134217728");
}

if (app && app.whenReady) {
	const gotLock = app.requestSingleInstanceLock ? app.requestSingleInstanceLock() : true;
	if (!gotLock) {
		app.quit();
	} else {
		app.whenReady().then(async () => {
			configureDesktopLogFile(getUserDataDir());
			if (session?.defaultSession) {
				session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
					const responseHeaders = { ...details.responseHeaders };
					const url = (details.url || "").toLowerCase();
					if (url.includes("/assets/") || /\.(js|css|woff2|woff|svg|png|jpg)$/.test(url)) {
						responseHeaders["Cache-Control"] = ["public, max-age=31536000, immutable"];
					}
					callback({ responseHeaders });
				});
			}
			if (app.setAsDefaultProtocolClient) {
				try {
					app.setAsDefaultProtocolClient("dental-dicom");
					app.setAsDefaultProtocolClient("dente-ct");
				} catch (protoErr) {
					logger.warn("Protocol client registration failed", protoErr);
				}
			}
			app.on("second-instance", (_event, argv) => {
				if (mainWindow) {
					if (mainWindow.isMinimized()) mainWindow.restore();
					mainWindow.focus();
				}
				const uriArg = argv?.find((arg) => arg.startsWith("dental-dicom://") || arg.startsWith("dente-ct://"));
				if (uriArg) handleProtocolUrl(uriArg);
			});
			app.on("open-url", (event, url) => {
				event.preventDefault();
				handleProtocolUrl(url);
			});

			registerIpcHandlers({
				ipcMain,
				getMainWindow,
				toggleFullScreen,
				toggleKioskMode,
				getWindowState,
				checkForDesktopUpdates,
				installDesktopUpdate,
				getUserDataDir,
			});

			await createWindow();
			backupScheduler = createAutoBackupScheduler({ userDataDir: getUserDataDir() });
			backupScheduler.start();

			app.on("activate", () => {
				if (BrowserWindow && BrowserWindow.getAllWindows().length === 0) void createWindow();
			});
		});

		app.on("window-all-closed", async () => {
			closeAllWatchers();
			if (backupScheduler) backupScheduler.stop();
			await stopManagedServices();
			if (process.platform !== "darwin") app.quit();
		});
	}
}

module.exports = {
	getWindowsSerialPorts,
	getTwainDevices,
	acquireTwainImage,
	validateHotFolderPath,
	getSystemPrinters,
	printThermalLabel,
	printDocumentSilent,
	printEscPosReceipt,
	printFiscalReceiptTcpSocket,
	printAtol10FiscalReceipt,
	printShtrihMFiscalReceipt,
	setupDicomFolderWatch,
	unwatchDicomFolder,
	checkKktStatusTcpSocket,
	toggleFullScreen,
	toggleKioskMode,
	getWindowState,
	getLocalServerStatus,
	ensureEmbeddedBackendStarted,
	probePostgresTcpSocket,
	switchLocalDatabaseMode,
	startLoopbackHttpServer,
	stopLoopbackHttpServer,
	getLoopbackBaseUrl,
	checkForDesktopUpdates,
	installDesktopUpdate,
	setupAutoHardwareWatchers,
	handleProtocolUrl,
	DENTAL_HARDWARE_PRESETS,
	DENTAL_PHOTO_PROTOCOL_12,
	detectHardwareVendorFromPath,
	matchPhotoProtocolSlot,
	parseHotFolderFilenameMetadata,
	parseDicomFilenameMetadata,
	detectInstalledDentalHardware,
	getAnatomicalDentalPreviewDataUri,
	VENDOR_CLI_TEMPLATES,
	launchSlidaExport,
	parseSlidaIniResponse,
	parseSlidaXmlResponse,
	parseSlidaResponse,
	generateVddsMediaContent,
	parseVddsMediaResponse,
	launchVddsExport,
	getVendorCliTemplate,
	formatCommandLineBridge,
	launchCliBridge,
	KNOWN_CT_VIEWER_CANDIDATES,
	getWindowsDcmAssociation,
	detectInstalledCtViewers,
	extractCtZipForExternalViewer,
	buildVendorCtCliArgs,
	launchExternalCtViewer,
	extractPatientHint,
	detectCtModality,
	scanDownloadsForCt,
	openCbctPopoutWindow,
	DEFAULT_LAN_BEACON_PORT,
	isPrivateIpv4,
	getLocalPhysicalLanAddresses,
	resolveConfiguredClinicServerUrl,
	probeClinicDiscoveryEndpoint,
	probeLanServersViaUdp,
	resolveVaultDirectory,
	listVaultBackups,
	pruneVaultBackups,
	runPgDumpStreamBackup,
	runVaultBackupCycle,
	createAutoBackupScheduler,
};
