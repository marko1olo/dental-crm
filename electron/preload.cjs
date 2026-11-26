/**
 * DENTE Dental CRM — Desktop Preload Script
 *
 * Securely bridges Electron Main process IPC handlers to renderer:
 * exposes `window.denteDesktopNative` matching DesktopNativeApi.
 */

const { contextBridge, ipcRenderer } = require("electron");

function subscribeChannel(channel, callback) {
	const handler = (_event, data) => callback(data);
	ipcRenderer.on(channel, handler);
	return () => {
		ipcRenderer.removeListener(channel, handler);
	};
}

function subscribeSignal(channel, callback) {
	const handler = () => callback();
	ipcRenderer.on(channel, handler);
	return () => {
		ipcRenderer.removeListener(channel, handler);
	};
}

contextBridge.exposeInMainWorld("denteDesktopNative", {
	isDesktop: true,
	platform: process.platform,
	version: "0.1.0",

	listSerialPorts: async () => await ipcRenderer.invoke("dente:list-serial-ports"),
	listTwainDevices: async () => await ipcRenderer.invoke("dente:list-twain-devices"),
	acquireTwainImage: async (deviceId) => await ipcRenderer.invoke("dente:acquire-twain-image", deviceId),
	validateHotFolder: async (folderPath) => await ipcRenderer.invoke("dente:validate-hot-folder", folderPath),

	listPrinters: async () => await ipcRenderer.invoke("dente:list-printers"),
	printThermalLabel: async (params) => await ipcRenderer.invoke("dente:print-thermal-label", params),
	printEscPosReceipt: async (params) => await ipcRenderer.invoke("dente:print-escpos-receipt", params),
	printFiscalReceiptTcp: async (params) => await ipcRenderer.invoke("dente:print-fiscal-receipt-tcp", params),
	checkKktStatusTcp: async (params) => await ipcRenderer.invoke("dente:check-kkt-status-tcp", params),
	printAtol10FiscalReceipt: async (params) => await ipcRenderer.invoke("dente:print-atol10-fiscal-receipt", params),
	printShtrihMFiscalReceipt: async (params) => await ipcRenderer.invoke("dente:print-shtrih-fiscal-receipt", params),
	printDocumentSilent: async (params) => await ipcRenderer.invoke("dente:print-document-silent", params),

	watchLocalDicomFolder: async (folderPath, callbackId) => {
		return await ipcRenderer.invoke("dente:watch-dicom-folder", { folderPath, callbackId });
	},
	unwatchLocalDicomFolder: async (folderPath) => {
		return await ipcRenderer.invoke("dente:unwatch-dicom-folder", { folderPath });
	},
	onDicomFileDetected: (callback) => subscribeChannel("dente:dicom-file-detected", callback),

	toggleFullScreen: async (flag) => await ipcRenderer.invoke("dente:toggle-fullscreen", flag),
	toggleKioskMode: async (flag) => await ipcRenderer.invoke("dente:toggle-kiosk", flag),
	getWindowState: async () => await ipcRenderer.invoke("dente:get-window-state"),

	getLocalServerStatus: async () => await ipcRenderer.invoke("dente:get-local-server-status"),
	getLoopbackUrl: async () => await ipcRenderer.invoke("dente:get-loopback-url"),
	switchLocalDatabaseMode: async (mode) => await ipcRenderer.invoke("dente:switch-local-database-mode", mode),

	discoverLanServers: async (options) => await ipcRenderer.invoke("dente:discover-lan-servers", options),
	probeLanServer: async (baseUrl) => await ipcRenderer.invoke("dente:probe-lan-server", baseUrl),
	runVaultBackup: async (options) => await ipcRenderer.invoke("dente:run-vault-backup", options),
	listVaultBackups: async (options) => await ipcRenderer.invoke("dente:list-vault-backups", options),

	checkForUpdates: async () => await ipcRenderer.invoke("dente:check-for-updates"),
	installUpdate: async () => await ipcRenderer.invoke("dente:install-update"),
	onUpdateAvailable: (callback) => subscribeChannel("dente:update-available", callback),

	onDesktopSoftRefresh: (callback) => subscribeSignal("dente:desktop-soft-refresh", callback),
	onDesktopPrintRequest: (callback) => subscribeSignal("dente:desktop-print-request", callback),
	onDesktopSaveRequest: (callback) => subscribeSignal("dente:desktop-save-request", callback),
	onDesktopSearchRequest: (callback) => subscribeSignal("dente:desktop-search-request", callback),
	onDesktopEscapeRequest: (callback) => subscribeSignal("dente:desktop-escape-request", callback),

	detectInstalledCtViewers: async () => await ipcRenderer.invoke("dente:detect-installed-ct-viewers"),
	launchExternalCtViewer: async (params) => await ipcRenderer.invoke("dente:launch-external-ct-viewer", params),
	scanDownloadsForCt: async (options) => await ipcRenderer.invoke("dente:scan-downloads-for-ct", options),
	openCbctPopoutWindow: async (params) => await ipcRenderer.invoke("dente:open-cbct-popout-window", params),
});
