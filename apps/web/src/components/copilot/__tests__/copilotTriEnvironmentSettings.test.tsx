/**
 * @file copilotTriEnvironmentSettings.test.tsx
 * @description Red Team Inquisitor Test Suite: Tri-Environment Settings (Web, Desktop PC, Mobile Tablet),
 * Capabilities Matrix, Mandate 8b file limits, Mandate 8e doctor autonomy, and Mandate 8x language.
 */

import React from "react";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToString } from "react-dom/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
	useCopilotStore,
	type CopilotRuntimeEnvironment,
} from "../../../store/copilotStore";
import {
	ENVIRONMENT_CAPABILITIES_MATRIX,
	type CapabilityStatus,
} from "../copilotCatalogData";
import { CopilotSettingsModal } from "../CopilotSettingsModal";
import { CopilotSettingsCapabilitiesTable, renderCapabilityStatusBadge } from "../settings/CopilotSettingsCapabilitiesTable";
import { CopilotWebBrowserTab, CopilotDesktopNativeTab, CopilotMobileTabletTab } from "../settings/CopilotSettingsEnvironmentTabs";
import { CopilotSettingsGeneralTab } from "../settings/CopilotSettingsGeneralTab";

describe("Copilot Tri-Environment Settings & Capabilities Matrix (Wave 35.1)", () => {
	beforeEach(() => {
		useCopilotStore.setState({
			settings: {
				trustLevel: "balanced",
				provider: "gemini",
				model: "gemini-2.5-flash",
				speedMode: "turbo",
				showThinkingProcess: true,
				clinicalSpecialization: "therapy",
				diaryTemplate: "soap",
				runtimeMode: "web_browser",
				autoSaveDrafts: true,
				webSpeechSensitivity: "normal",
				maskPhiData: true,
				localDropzonePath: "C:\\Radiology\\Export",
				tomographyViewerApp: "planmeca_romexis",
				fiscalRegisterComPort: "COM1",
				localInferenceServerUrl: "http://localhost:11434",
				globalDictationHotkey: "F9",
				gloveModeTouchTarget: true,
				screenWakeLock: true,
				hapticFeedbackEnabled: true,
				autoMicOnAppointmentOpen: false,
			},
		});
	});

	it("1. расширяет runtimeMode в copilotStore до 3 суверенных сред: web_browser, desktop_native, mobile_tablet", () => {
		const store = useCopilotStore.getState();
		assert.equal(store.settings.runtimeMode, "web_browser");

		store.setRuntimeMode("desktop_native");
		assert.equal(useCopilotStore.getState().settings.runtimeMode, "desktop_native");

		store.setRuntimeMode("mobile_tablet");
		assert.equal(useCopilotStore.getState().settings.runtimeMode, "mobile_tablet");

		store.setRuntimeMode("web_browser");
		assert.equal(useCopilotStore.getState().settings.runtimeMode, "web_browser");
	});

	it("2. copilotStore содержит гранулярные настройки для браузера, десктопа ПК и планшета", () => {
		const settings = useCopilotStore.getState().settings;

		// Среда: Браузер
		assert.equal(typeof settings.autoSaveDrafts, "boolean");
		assert.ok(["high", "normal", "low"].includes(settings.webSpeechSensitivity));
		assert.equal(typeof settings.maskPhiData, "boolean");

		// Среда: Десктоп ПК
		assert.ok(settings.localDropzonePath.includes("Export"));
		assert.equal(settings.tomographyViewerApp, "planmeca_romexis");
		assert.equal(settings.fiscalRegisterComPort, "COM1");
		assert.ok(settings.localInferenceServerUrl.includes("11434"));
		assert.equal(settings.globalDictationHotkey, "F9");

		// Среда: Мобилка / Планшет
		assert.equal(settings.gloveModeTouchTarget, true);
		assert.equal(settings.screenWakeLock, true);
		assert.equal(settings.hapticFeedbackEnabled, true);
		assert.equal(settings.autoMicOnAppointmentOpen, false);
	});

	it("3. updateSettings корректно обновляет параметры любой из трех сред", () => {
		const store = useCopilotStore.getState();

		store.updateSettings({
			webSpeechSensitivity: "high",
			tomographyViewerApp: "vatech_ez3d",
			fiscalRegisterComPort: "COM3",
			gloveModeTouchTarget: false,
			screenWakeLock: true,
		});

		const updated = useCopilotStore.getState().settings;
		assert.equal(updated.webSpeechSensitivity, "high");
		assert.equal(updated.tomographyViewerApp, "vatech_ez3d");
		assert.equal(updated.fiscalRegisterComPort, "COM3");
		assert.equal(updated.gloveModeTouchTarget, false);
		assert.equal(updated.screenWakeLock, true);
	});

	it("4. ENVIRONMENT_CAPABILITIES_MATRIX содержит честную раскладку возможностей по средам", () => {
		assert.ok(ENVIRONMENT_CAPABILITIES_MATRIX.length >= 10, "Матрица обязана содержать не менее 10 ключевых возможностей");

		// RVG захват: требует десктопное приложение
		const rvg = ENVIRONMENT_CAPABILITIES_MATRIX.find((c) => c.id === "rvg_capture");
		assert.ok(rvg);
		assert.equal(rvg?.web, "desktop_required");
		assert.equal(rvg?.desktop, "available");
		assert.equal(rvg?.mobile, "unavailable");

		// Режим в перчатках: специфика планшета
		const glove = ENVIRONMENT_CAPABILITIES_MATRIX.find((c) => c.id === "glove_mode");
		assert.ok(glove);
		assert.equal(glove?.web, "unavailable");
		assert.equal(glove?.desktop, "unavailable");
		assert.equal(glove?.mobile, "mobile_specific");

		// Дневники SOAP: доступны во всех средах
		const diary = ENVIRONMENT_CAPABILITIES_MATRIX.find((c) => c.id === "emr_diary");
		assert.ok(diary);
		assert.equal(diary?.web, "available");
		assert.equal(diary?.desktop, "available");
		assert.equal(diary?.mobile, "available");

		// Локальный инференс: требует десктоп
		const localAi = ENVIRONMENT_CAPABILITIES_MATRIX.find((c) => c.id === "local_inference");
		assert.ok(localAi);
		assert.equal(localAi?.web, "desktop_required");
		assert.equal(localAi?.desktop, "available");
	});

	it("5. Мандат 8x: матрица возможностей не содержит номеров советских приказов и канцелярита", () => {
		for (const cap of ENVIRONMENT_CAPABILITIES_MATRIX) {
			assert.doesNotMatch(cap.name, /043\/у|804н|152-ФЗ|54-ФЗ/i, `Пункт ${cap.id} содержит запрещенный канцелярит в name`);
			assert.doesNotMatch(cap.description, /043\/у|804н|152-ФЗ|54-ФЗ/i, `Пункт ${cap.id} содержит запрещенный канцелярит в description`);
		}
	});

	it("6. renderCapabilityStatusBadge рендерит канонические бейджи возможностей", () => {
		const htmlAvail = renderToString(renderCapabilityStatusBadge("available"));
		assert.ok(htmlAvail.includes("Доступно"));
		assert.ok(htmlAvail.includes("emerald"));

		const htmlDesk = renderToString(renderCapabilityStatusBadge("desktop_required"));
		assert.ok(htmlDesk.includes("Требуется приложение для ПК"));
		assert.ok(htmlDesk.includes("slate"));

		const htmlMob = renderToString(renderCapabilityStatusBadge("mobile_specific"));
		assert.ok(htmlMob.includes("Специфика мобильного планшета"));
		assert.ok(htmlMob.includes("sky"));
	});

	it("7. CopilotSettingsModal рендерит 3-позиционный селектор сред и все 5 навигационных вкладок", () => {
		const html = renderToString(
			<CopilotSettingsModal
				isOpen={true}
				onClose={() => {}}
			/>
		);

		// Шапка и селектор сред
		assert.ok(html.includes("Настройки ИИ и Копайлота"));
		assert.ok(html.includes("Текущая рабочая среда врача:"));
		assert.ok(html.includes("Веб-браузер"));
		assert.ok(html.includes("Десктоп ПК"));
		assert.ok(html.includes("Планшет у кресла"));

		// Вкладки
		assert.ok(html.includes("Общие"));
		assert.ok(html.includes("Браузер"));
		assert.ok(html.includes("Планшет"));
		assert.ok(html.includes("Матрица возможностей"));

		// Мандат 8e: кнопка Сохранить настройки не заблокирована
		assert.ok(html.includes("Сохранить настройки"));
		assert.ok(!html.includes("disabled"), "Кнопки сохранения не должны блокироваться атрибутом disabled (Мандат 8e)");
	});

	it("8. CopilotWebBrowserTab рендерит настройки Web Speech, автосейва и маскирования PHI", () => {
		const html = renderToString(
			<CopilotWebBrowserTab
				webSpeechSensitivity="normal"
				setSpeechSensitivity={() => {}}
				autoSaveDrafts={true}
				setAutoSaveDrafts={() => {}}
				maskPhiData={true}
				setMaskPhiData={() => {}}
			/>
		);

		assert.ok(html.includes("Среда «Веб-браузер»"));
		assert.ok(html.includes("Чувствительность распознавания речи Web Speech"));
		assert.ok(html.includes("Автосохранение черновиков дневников SOAP"));
		assert.ok(html.includes("Защита персональных данных пациента"));
	});

	it("9. CopilotDesktopNativeTab рендерит сетевой путь dropzone, выбор Romexis/Ez3D, COM-порт и Ollama", () => {
		const html = renderToString(
			<CopilotDesktopNativeTab
				localDropzonePath="C:\\Radiology\\Export"
				setDropzonePath={() => {}}
				tomographyViewerApp="planmeca_romexis"
				setTomographyViewer={() => {}}
				fiscalRegisterComPort="COM1"
				setComPort={() => {}}
				localInferenceServerUrl="http://localhost:11434"
				setLocalInferenceUrl={() => {}}
				globalDictationHotkey="F9"
				setGlobalHotkey={() => {}}
			/>
		);

		assert.ok(html.includes("Среда «Десктоп ПК (Рабочая станция)»"));
		assert.ok(html.includes("Сетевая папка визиографов и КЛКТ (ПК Dropzone)"));
		assert.ok(html.includes("Planmeca Romexis 3D / ProSensor"));
		assert.ok(html.includes("Vatech Ez3D Plus / EzDent-i"));
		assert.ok(html.includes("COM-порт кассы и чеков"));
		assert.ok(html.includes("Сервер локальной нейросети"));
		assert.ok(html.includes("Глобальный хоткей диктовки"));
	});

	it("10. CopilotMobileTabletTab рендерит Glove Mode >= 48px, Screen WakeLock, Haptic и авто-микрофон", () => {
		const html = renderToString(
			<CopilotMobileTabletTab
				gloveModeTouchTarget={true}
				setGloveMode={() => {}}
				screenWakeLock={true}
				setWakeLock={() => {}}
				hapticFeedbackEnabled={true}
				setHaptic={() => {}}
				autoMicOnAppointmentOpen={false}
				setAutoMic={() => {}}
			/>
		);

		assert.ok(html.includes("Среда «Мобилка / Планшет у кресла»"));
		assert.ok(html.includes("Режим работы в перчатках (Touch Target"));
		assert.ok(html.includes("Удержание экрана включенным (Screen Wake Lock)"));
		assert.ok(html.includes("Тактильный виброотклик при фиксации команд"));
		assert.ok(html.includes("Автоматический переход к микрофону в карте приёма"));
	});

	it("11. CopilotSettingsCapabilitiesTable рендерит сравнительную таблицу для всех трех сред", () => {
		const html = renderToString(
			<CopilotSettingsCapabilitiesTable runtimeMode="desktop_native" />
		);

		assert.ok(html.includes("Сравнительная матрица сред DENTE"));
		assert.ok(html.includes("Текущая: Десктоп ПК"));
		assert.ok(html.includes("Оптический захват визиографа"));
		assert.ok(html.includes("Сетевая папка томографа (Dropzone)"));
		assert.ok(html.includes("Режим в перчатках"));
	});

	it("12. Мандат 8b: проверка размеров файлов настроек Копайлота", () => {
		const checkFile = (relPath: string, maxLines: number) => {
			const fullPath = path.resolve(__dirname, relPath);
			assert.ok(fs.existsSync(fullPath), `Файл ${relPath} обязан существовать`);
			const lines = fs.readFileSync(fullPath, "utf-8").split("\n").length;
			assert.ok(
				lines <= maxLines,
				`Файл ${relPath} имеет ${lines} строк (лимит: <= ${maxLines} строк, Мандат 8b)`
			);
		};

		checkFile("../CopilotSettingsModal.tsx", 450);
		checkFile("../../../store/copilotStore.ts", 380);
		checkFile("../settings/CopilotSettingsGeneralTab.tsx", 300);
		checkFile("../settings/CopilotSettingsEnvironmentTabs.tsx", 350);
		checkFile("../settings/CopilotSettingsCapabilitiesTable.tsx", 150);
	});

	it("13. Мандат 8d pt 7: строго 0 cartoon emojis в исходном коде всех компонентов настроек", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		const files = [
			"../CopilotSettingsModal.tsx",
			"../settings/CopilotSettingsGeneralTab.tsx",
			"../settings/CopilotSettingsEnvironmentTabs.tsx",
			"../settings/CopilotSettingsCapabilitiesTable.tsx",
		];

		for (const rel of files) {
			const full = path.resolve(__dirname, rel);
			const code = fs.readFileSync(full, "utf-8");
			assert.ok(!emojiRegex.test(code), `Файл ${rel} содержит запрещенные cartoon emoji!`);
		}
	});
});
