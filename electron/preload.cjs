/**
 * DENTE Dental CRM — Desktop Preload Script
 *
 * Securely bridges Electron Main process IPC handlers to renderer:
 * exposes `window.denteDesktopNative` matching DesktopNativeApi.
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("denteDesktopNative", {
	isDesktop: true,
	platform: process.platform,
	version: "0.1.0",

	listSerialPorts: async () => {
		return await ipcRenderer.invoke("dente:list-serial-ports");
	},

	listTwainDevices: async () => {
		return await ipcRenderer.invoke("dente:list-twain-devices");
	},

	acquireTwainImage: async (deviceId) => {
		return await ipcRenderer.invoke("dente:acquire-twain-image", deviceId);
	},

	listPrinters: async () => {
		return await ipcRenderer.invoke("dente:list-printers");
	},

	printThermalLabel: async (params) => {
		return await ipcRenderer.invoke("dente:print-thermal-label", params);
	},

	printFiscalReceiptTcp: async (params) => {
		return await ipcRenderer.invoke("dente:print-fiscal-receipt-tcp", params);
	},

	checkKktStatusTcp: async (params) => {
		return await ipcRenderer.invoke("dente:check-kkt-status-tcp", params);
	},

	watchLocalDicomFolder: async (folderPath, callbackId) => {
		return await ipcRenderer.invoke("dente:watch-dicom-folder", {
			folderPath,
			callbackId,
		});
	},

	unwatchLocalDicomFolder: async (folderPath) => {
		return await ipcRenderer.invoke("dente:unwatch-dicom-folder", {
			folderPath,
		});
	},

	onDicomFileDetected: (callback) => {
		const handler = (_event, data) => callback(data);
		ipcRenderer.on("dente:dicom-file-detected", handler);
		return () => {
			ipcRenderer.removeListener("dente:dicom-file-detected", handler);
		};
	},
});
