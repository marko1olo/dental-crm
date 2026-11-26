/**
 * DENTE Dental CRM — Electron IPC Handlers Registry
 *
 * Maps `dente:*` IPC channels to modular desktop hardware, loopback, LAN, and vault drivers.
 */

const {
	DENTAL_HARDWARE_PRESETS,
	DENTAL_PHOTO_PROTOCOL_12,
	detectInstalledDentalHardware,
	matchPhotoProtocolSlot,
	parseHotFolderFilenameMetadata,
} = require("./dentalHardwareCatalog.cjs");
const {
	launchCliBridge,
	launchSlidaExport,
	launchVddsExport,
	parseSlidaResponse,
	parseVddsMediaResponse,
} = require("./imagingExchangeProtocols.cjs");
const {
	checkKktStatusTcpSocket,
	printAtol10FiscalReceipt,
	printFiscalReceiptTcpSocket,
	printShtrihMFiscalReceipt,
} = require("./kktHardwareDriver.cjs");
const {
	getSystemPrinters,
	getWindowsSerialPorts,
	printDocumentSilent,
	printEscPosReceipt,
	printThermalLabel,
} = require("./printerAndSerialBridge.cjs");
const {
	acquireTwainImage,
	getTwainDevices,
	setupDicomFolderWatch,
	unwatchDicomFolder,
	validateHotFolderPath,
} = require("./twainWiaScannerBridge.cjs");
const {
	detectInstalledCtViewers,
	launchExternalCtViewer,
	openCbctPopoutWindow,
	scanDownloadsForCt,
} = require("./ctViewerBridge.cjs");
const {
	getLocalServerStatus,
	getLoopbackBaseUrl,
	switchLocalDatabaseMode,
} = require("./embeddedServerSupervisor.cjs");
const {
	getLocalPhysicalLanAddresses,
	probeClinicDiscoveryEndpoint,
	probeLanServersViaUdp,
} = require("./lanBeaconDesktopBridge.cjs");
const {
	listVaultBackups,
	runVaultBackupCycle,
} = require("./autoBackupVaultRunner.cjs");

function registerIpcHandlers({
	ipcMain,
	getMainWindow,
	toggleFullScreen,
	toggleKioskMode,
	getWindowState,
	checkForDesktopUpdates,
	installDesktopUpdate,
	getUserDataDir,
} = {}) {
	if (!ipcMain) return;

	ipcMain.handle("dente:list-serial-ports", async () => await getWindowsSerialPorts());
	ipcMain.handle("dente:list-twain-devices", async () => await getTwainDevices());
	ipcMain.handle("dente:acquire-twain-image", async (_event, deviceId) => await acquireTwainImage(deviceId));
	ipcMain.handle("dente:validate-hot-folder", async (_event, folderPath) => await validateHotFolderPath(folderPath));

	ipcMain.handle("dente:detect-dental-hardware", async () => detectInstalledDentalHardware());
	ipcMain.handle("dente:get-dental-hardware-presets", async () => DENTAL_HARDWARE_PRESETS);
	ipcMain.handle("dente:launch-slida-export", async (_event, params) => launchSlidaExport(params || {}));
	ipcMain.handle("dente:launch-vdds-export", async (_event, params) => launchVddsExport(params || {}));
	ipcMain.handle("dente:launch-cli-bridge", async (_event, params) => await launchCliBridge(params || {}));
	ipcMain.handle("dente:parse-slida-response", async (_event, content) => parseSlidaResponse(content || ""));
	ipcMain.handle("dente:parse-vdds-response", async (_event, content) => parseVddsMediaResponse(content || ""));
	ipcMain.handle("dente:get-photo-protocol-slots", async () => DENTAL_PHOTO_PROTOCOL_12);
	ipcMain.handle("dente:match-photo-protocol-slot", async (_event, fileName) => matchPhotoProtocolSlot(fileName || ""));
	ipcMain.handle("dente:parse-hot-folder-metadata", async (_event, { fileName, targetPath } = {}) => {
		return parseHotFolderFilenameMetadata(fileName, targetPath);
	});

	ipcMain.handle("dente:list-printers", async () => await getSystemPrinters(getMainWindow));
	ipcMain.handle("dente:print-thermal-label", async (_event, params) => await printThermalLabel(params));
	ipcMain.handle("dente:print-escpos-receipt", async (_event, params) => await printEscPosReceipt(params));
	ipcMain.handle("dente:print-fiscal-receipt-tcp", async (_event, params) => await printFiscalReceiptTcpSocket(params));
	ipcMain.handle("dente:check-kkt-status-tcp", async (_event, params) => await checkKktStatusTcpSocket(params));
	ipcMain.handle("dente:print-atol10-fiscal-receipt", async (_event, params) => await printAtol10FiscalReceipt(params));
	ipcMain.handle("dente:print-shtrih-fiscal-receipt", async (_event, params) => await printShtrihMFiscalReceipt(params));
	ipcMain.handle("dente:print-document-silent", async (_event, params) => await printDocumentSilent(params));

	ipcMain.handle("dente:watch-dicom-folder", async (_event, { folderPath, callbackId } = {}) => {
		return setupDicomFolderWatch(folderPath, callbackId, getMainWindow);
	});
	ipcMain.handle("dente:unwatch-dicom-folder", async (_event, { folderPath } = {}) => {
		return unwatchDicomFolder(folderPath);
	});

	ipcMain.handle("dente:toggle-fullscreen", async (_event, flag) => toggleFullScreen(flag));
	ipcMain.handle("dente:toggle-kiosk", async (_event, flag) => toggleKioskMode(flag));
	ipcMain.handle("dente:get-window-state", async () => getWindowState());

	ipcMain.handle("dente:get-local-server-status", async () => await getLocalServerStatus());
	ipcMain.handle("dente:get-loopback-url", async () => ({ loopbackUrl: getLoopbackBaseUrl() }));
	ipcMain.handle("dente:switch-local-database-mode", async (_event, mode) => await switchLocalDatabaseMode(mode));

	ipcMain.handle("dente:discover-lan-servers", async (_event, options) => {
		const servers = await probeLanServersViaUdp(options || {});
		const interfaces = getLocalPhysicalLanAddresses();
		return { servers, interfaces };
	});
	ipcMain.handle("dente:probe-lan-server", async (_event, baseUrl) => await probeClinicDiscoveryEndpoint(baseUrl));

	ipcMain.handle("dente:run-vault-backup", async (_event, options) => {
		const userDataDir = typeof getUserDataDir === "function" ? getUserDataDir() : undefined;
		return await runVaultBackupCycle({ ...(options || {}), userDataDir });
	});
	ipcMain.handle("dente:list-vault-backups", async (_event, options) => {
		const userDataDir = typeof getUserDataDir === "function" ? getUserDataDir() : undefined;
		return await listVaultBackups({ ...(options || {}), userDataDir });
	});

	ipcMain.handle("dente:check-for-updates", async () => await checkForDesktopUpdates());
	ipcMain.handle("dente:install-update", async () => await installDesktopUpdate());

	ipcMain.handle("dente:detect-installed-ct-viewers", async () => await detectInstalledCtViewers());
	ipcMain.handle("dente:launch-external-ct-viewer", async (_event, params) => {
		return await launchExternalCtViewer({ ...(params || {}), getLoopbackBaseUrl, getMainWindow });
	});
	ipcMain.handle("dente:scan-downloads-for-ct", async (_event, options) => await scanDownloadsForCt(options));
	ipcMain.handle("dente:open-cbct-popout-window", async (_event, params) => {
		return await openCbctPopoutWindow({ ...(params || {}), getLoopbackBaseUrl, getMainWindow });
	});
}

module.exports = {
	registerIpcHandlers,
};
