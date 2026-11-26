/**
 * DENTE Dental CRM — Window State, Fullscreen/Kiosk & Auto-Updater Helpers
 */

const { createDesktopLogger } = require("./desktopLogger.cjs");

const logger = createDesktopLogger("WindowLifecycleUpdater");

async function checkForDesktopUpdates(app) {
	const currentVersion = app?.getVersion ? app.getVersion() : "0.1.0";
	try {
		let autoUpdater = null;
		try {
			autoUpdater = require("electron-updater").autoUpdater;
		} catch (reqErr) {
			logger.debug("electron-updater not bundled in current environment", {
				error: reqErr instanceof Error ? reqErr.message : String(reqErr),
			});
		}
		if (autoUpdater) {
			autoUpdater.autoDownload = true;
			const updateCheck = await autoUpdater.checkForUpdates();
			const latestVersion = updateCheck?.updateInfo?.version || currentVersion;
			const hasUpdate = Boolean(updateCheck?.updateInfo && updateCheck.updateInfo.version !== currentVersion);
			return {
				updateAvailable: hasUpdate,
				currentVersion,
				latestVersion,
				releaseNotes: updateCheck?.updateInfo?.releaseNotes || undefined,
			};
		}
		return {
			updateAvailable: false,
			currentVersion,
			latestVersion: currentVersion,
			releaseNotes: "Установлена актуальная версия DENTE Desktop.",
		};
	} catch (err) {
		return {
			updateAvailable: false,
			currentVersion,
			latestVersion: currentVersion,
			error: err instanceof Error ? err.message : "Ошибка проверки обновлений",
		};
	}
}

async function installDesktopUpdate() {
	try {
		let autoUpdater = null;
		try {
			autoUpdater = require("electron-updater").autoUpdater;
		} catch (reqErr) {
			logger.debug("electron-updater unavailable for install", {
				error: reqErr instanceof Error ? reqErr.message : String(reqErr),
			});
		}
		if (autoUpdater?.quitAndInstall) {
			autoUpdater.quitAndInstall();
			return { success: true, message: "Перезапуск и установка обновления..." };
		}
		return { success: true, message: "Обновление готово к установке при следующем перезапуске." };
	} catch (err) {
		return { success: false, error: err instanceof Error ? err.message : "Ошибка установки обновления" };
	}
}

function toggleFullScreen(mainWindow, flag) {
	if (!mainWindow) {
		const target = flag !== undefined ? Boolean(flag) : false;
		return { isFullScreen: target, isKiosk: false };
	}
	const target = flag !== undefined ? Boolean(flag) : !mainWindow.isFullScreen();
	mainWindow.setFullScreen(target);
	return { isFullScreen: mainWindow.isFullScreen(), isKiosk: mainWindow.isKiosk?.() || false };
}

function toggleKioskMode(mainWindow, flag) {
	if (!mainWindow) {
		const target = flag !== undefined ? Boolean(flag) : false;
		return { isFullScreen: target, isKiosk: target };
	}
	const target = flag !== undefined ? Boolean(flag) : !(mainWindow.isKiosk?.() || false);
	if (mainWindow.setKiosk) mainWindow.setKiosk(target);
	else mainWindow.setFullScreen(target);
	return { isFullScreen: mainWindow.isFullScreen?.() || false, isKiosk: mainWindow.isKiosk?.() || false };
}

function getWindowState(mainWindow) {
	if (!mainWindow) return { isFullScreen: false, isKiosk: false, isMaximized: false };
	return {
		isFullScreen: mainWindow.isFullScreen(),
		isKiosk: mainWindow.isKiosk?.() || false,
		isMaximized: mainWindow.isMaximized?.() || false,
	};
}

function bindWindowHotkeys(mainWindow, onToggleFullScreen) {
	mainWindow.webContents.on("before-input-event", (event, input) => {
		if (input.type !== "keyDown") return;
		const key = input.key.toLowerCase();
		if (input.key === "F5" || ((input.control || input.meta) && key === "r")) {
			event.preventDefault();
			if (!mainWindow.isDestroyed()) mainWindow.webContents.send("dente:desktop-soft-refresh");
		} else if (input.key === "F11") {
			event.preventDefault();
			onToggleFullScreen();
		} else if ((input.control || input.meta) && key === "p") {
			event.preventDefault();
			if (!mainWindow.isDestroyed()) mainWindow.webContents.send("dente:desktop-print-request");
		} else if ((input.control || input.meta) && (key === "s" || key === "ы")) {
			event.preventDefault();
			if (!mainWindow.isDestroyed()) mainWindow.webContents.send("dente:desktop-save-request");
		} else if ((input.control || input.meta) && (key === "k" || key === "л")) {
			event.preventDefault();
			if (!mainWindow.isDestroyed()) mainWindow.webContents.send("dente:desktop-search-request");
		} else if (input.key === "Escape") {
			if (!mainWindow.isDestroyed()) mainWindow.webContents.send("dente:desktop-escape-request");
		}
	});
}

module.exports = {
	checkForDesktopUpdates,
	installDesktopUpdate,
	toggleFullScreen,
	toggleKioskMode,
	getWindowState,
	bindWindowHotkeys,
};
