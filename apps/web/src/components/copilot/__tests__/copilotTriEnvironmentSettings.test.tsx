/**
 * @file copilotTriEnvironmentSettings.test.tsx
 * @description Red Team Inquisitor Test Suite: Auto-Detection Runtime Environment,
 * Logical Settings Categories (Intelligence, Equipment, Voice & Privacy, Memory, Matrix),
 * Mandate 8b file limits, Mandate 8e doctor autonomy, and Mandate 8x clinical language.
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
	detectRuntimeEnvironment,
	type CopilotRuntimeEnvironment,
} from "../../../store/copilotStore";
import {
	ENVIRONMENT_CAPABILITIES_MATRIX,
	type CapabilityStatus,
} from "../copilotCatalogData";
import { CopilotSettingsModal } from "../CopilotSettingsModal";
import { CopilotSettingsCapabilitiesTable, renderCapabilityStatusBadge } from "../settings/CopilotSettingsCapabilitiesTable";
import { CopilotWebBrowserTab, CopilotDesktopNativeTab, CopilotMobileTabletTab } from "../settings/CopilotSettingsEnvironmentTabs";
import { CopilotSettingsEquipmentTab } from "../settings/CopilotSettingsEquipmentTab";
import { CopilotSettingsVoicePrivacyTab } from "../settings/CopilotSettingsVoicePrivacyTab";
import { CopilotSettingsMemoryTab } from "../settings/CopilotSettingsMemoryTab";
import { CopilotSettingsGeneralTab } from "../settings/CopilotSettingsGeneralTab";

describe("Copilot Auto-Detection & Logical Settings (Wave 36.2)", () => {
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
				globalDictationHotkey: "F9",
				gloveModeTouchTarget: true,
				screenWakeLock: true,
				hapticFeedbackEnabled: true,
				autoMicOnAppointmentOpen: false,
			},
		});
	});

	it("1. detectRuntimeEnvironment() автоматически определяет среду без ручного выбора", () => {
		// В Node.js среде по умолчанию (нет window) возвращает web_browser
		const env = detectRuntimeEnvironment();
		assert.equal(env, "web_browser");

		// Проверка метода стора refreshRuntimeEnvironment
		const store = useCopilotStore.getState();
		const refreshed = store.refreshRuntimeEnvironment();
		assert.equal(refreshed, "web_browser");
		assert.equal(useCopilotStore.getState().settings.runtimeMode, "web_browser");
	});

	it("2. copilotStore содержит параметры всех систем (оборудование, голос, сенсорика)", () => {
		const settings = useCopilotStore.getState().settings;

		// Среда: Браузер и Голос
		assert.equal(typeof settings.autoSaveDrafts, "boolean");
		assert.ok(["high", "normal", "low"].includes(settings.webSpeechSensitivity));
		assert.equal(typeof settings.maskPhiData, "boolean");

		// Оборудование кабинета
		assert.ok(settings.localDropzonePath.includes("Export"));
		assert.equal(settings.tomographyViewerApp, "planmeca_romexis");
		assert.equal(settings.fiscalRegisterComPort, "COM1");
		assert.equal(settings.globalDictationHotkey, "F9");

		// Сенсорная эргономика под капотом
		assert.equal(settings.gloveModeTouchTarget, true);
		assert.equal(settings.screenWakeLock, true);
		assert.equal(settings.hapticFeedbackEnabled, true);
		assert.equal(settings.autoMicOnAppointmentOpen, false);
	});

	it("3. updateSettings корректно обновляет параметры оборудования и голоса", () => {
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

	it("4. ENVIRONMENT_CAPABILITIES_MATRIX содержит честную раскладку возможностей", () => {
		assert.ok(ENVIRONMENT_CAPABILITIES_MATRIX.length >= 10, "Матрица обязана содержать не менее 10 ключевых возможностей");

		// RVG захват: требует десктопное приложение
		const rvg = ENVIRONMENT_CAPABILITIES_MATRIX.find((c) => c.id === "rvg_capture");
		assert.ok(rvg);
		assert.equal(rvg?.web, "desktop_required");
		assert.equal(rvg?.desktop, "available");
		assert.equal(rvg?.mobile, "unavailable");

		// Дневники SOAP: доступны во всех средах
		const diary = ENVIRONMENT_CAPABILITIES_MATRIX.find((c) => c.id === "emr_diary");
		assert.ok(diary);
		assert.equal(diary?.web, "available");
		assert.equal(diary?.desktop, "available");
		assert.equal(diary?.mobile, "available");
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
	});

	it("7. CopilotSettingsModal рендерит тихий авто-индикатор устройства и 5 логических категорий (БЕЗ ручного селектора)", () => {
		const html = renderToString(
			<CopilotSettingsModal
				isOpen={true}
				onClose={() => {}}
			/>
		);

		// Шапка и авто-индикатор устройства
		assert.ok(html.includes("Настройки ИИ и Копайлота"));
		assert.ok(html.includes("Обнаружено устройство:"));
		assert.ok(html.includes("Веб-браузер"));

		// Запрет ручного селектора сред!
		assert.ok(!html.includes("Текущая рабочая среда врача:"), "Ручной селектор сред обязан быть полностью удален!");

		// 5 логических вкладок
		assert.ok(html.includes("Интеллект и модель"));
		assert.ok(html.includes("Оборудование кабинета"));
		assert.ok(html.includes("Голос и приватность"));
		assert.ok(html.includes("Память ИИ"));
		assert.ok(html.includes("Матрица возможностей"));

		// Мандат 8e: кнопка Сохранить настройки не заблокирована
		assert.ok(html.includes("Сохранить настройки"));
		assert.ok(!html.includes("disabled"), "Кнопки сохранения не должны блокироваться атрибутом disabled (Мандат 8e)");
	});

	it("8. CopilotSettingsVoicePrivacyTab рендерит настройки Web Speech, автосейва и маскирования PHI", () => {
		const html = renderToString(
			<CopilotSettingsVoicePrivacyTab
				webSpeechSensitivity="normal"
				setSpeechSensitivity={() => {}}
				autoSaveDrafts={true}
				setAutoSaveDrafts={() => {}}
				maskPhiData={true}
				setMaskPhiData={() => {}}
				autoMicOnAppointmentOpen={false}
				setAutoMic={() => {}}
			/>
		);

		assert.ok(html.includes("Голосовое управление и безопасность данных"));
		assert.ok(html.includes("Чувствительность распознавания речи Web Speech"));
		assert.ok(html.includes("Автосохранение черновиков дневников SOAP"));
		assert.ok(html.includes("Защита персональных данных пациента"));
		assert.ok(html.includes("Автоматический переход к микрофону в карте приёма"));
	});

	it("9. CopilotSettingsEquipmentTab рендерит сетевой путь dropzone, выбор Romexis/Ez3D, COM-порт и аппаратную эргономику", () => {
		const html = renderToString(
			<CopilotSettingsEquipmentTab
				localDropzonePath="C:\\Radiology\\Export"
				setDropzonePath={() => {}}
				tomographyViewerApp="planmeca_romexis"
				setTomographyViewer={() => {}}
				fiscalRegisterComPort="COM1"
				setComPort={() => {}}
				globalDictationHotkey="F9"
				setGlobalHotkey={() => {}}
				gloveModeTouchTarget={true}
				setGloveMode={() => {}}
				screenWakeLock={true}
				setWakeLock={() => {}}
				hapticFeedbackEnabled={true}
				setHaptic={() => {}}
			/>
		);

		assert.ok(html.includes("Оборудование и рабочая станция кабинета"));
		assert.ok(html.includes("Сетевая папка визиографов и КЛКТ (ПК Dropzone)"));
		assert.ok(html.includes("Planmeca Romexis 3D / ProSensor"));
		assert.ok(html.includes("Vatech Ez3D Plus / EzDent-i"));
		assert.ok(html.includes("COM-порт кассы и чеков"));
		assert.ok(html.includes("Глобальный хоткей диктовки"));
		assert.ok(html.includes("Сенсорная эргономика рабочего места"));
		assert.ok(html.includes("Режим работы в перчатках"));
		assert.ok(html.includes("Удержание экрана включенным (Screen Wake Lock)"));
	});

	it("10. CopilotSettingsMemoryTab рендерит правила и привычки врача с добавлением и удалением", () => {
		const html = renderToString(
			<CopilotSettingsMemoryTab />
		);

		assert.ok(html.includes("Долгосрочная клиническая память врача"));
		assert.ok(html.includes("Добавить клиническое предпочтение:"));
		assert.ok(html.includes("Сохраненные правила и привычки"));
	});

	it("11. CopilotSettingsCapabilitiesTable рендерит сравнительную матрицу сред DENTE", () => {
		const html = renderToString(
			<CopilotSettingsCapabilitiesTable runtimeMode="web_browser" />
		);

		assert.ok(html.includes("Сравнительная матрица сред DENTE"));
		assert.ok(html.includes("Текущая: Веб-браузер"));
		assert.ok(html.includes("Оптический захват визиографа"));
	});

	it("12. Мандат 8b: проверка размеров всех файлов настроек Копайлота (Sweet Spot <= 350-450 строк)", () => {
		const checkFile = (relPath: string, maxLines: number) => {
			const fullPath = path.resolve(__dirname, relPath);
			assert.ok(fs.existsSync(fullPath), `Файл ${relPath} обязан существовать`);
			const lines = fs.readFileSync(fullPath, "utf-8").split("\n").length;
			assert.ok(
				lines <= maxLines,
				`Файл ${relPath} имеет ${lines} строк (лимит: <= ${maxLines} строк, Мандат 8b)`
			);
		};

		checkFile("../CopilotSettingsModal.tsx", 350);
		checkFile("../../../store/copilotStore.ts", 450);
		checkFile("../settings/CopilotSettingsGeneralTab.tsx", 260);
		checkFile("../settings/CopilotSettingsEquipmentTab.tsx", 250);
		checkFile("../settings/CopilotSettingsVoicePrivacyTab.tsx", 200);
		checkFile("../settings/CopilotSettingsMemoryTab.tsx", 200);
		checkFile("../settings/CopilotSettingsCapabilitiesTable.tsx", 150);
		checkFile("../settings/CopilotSettingsEnvironmentTabs.tsx", 350);
	});

	it("13. Мандат 8d pt 7: строго 0 cartoon emojis в исходном коде всех компонентов настроек", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		const files = [
			"../CopilotSettingsModal.tsx",
			"../settings/CopilotSettingsGeneralTab.tsx",
			"../settings/CopilotSettingsEquipmentTab.tsx",
			"../settings/CopilotSettingsVoicePrivacyTab.tsx",
			"../settings/CopilotSettingsMemoryTab.tsx",
			"../settings/CopilotSettingsCapabilitiesTable.tsx",
			"../settings/CopilotSettingsEnvironmentTabs.tsx",
		];

		for (const rel of files) {
			const full = path.resolve(__dirname, rel);
			const code = fs.readFileSync(full, "utf-8");
			assert.ok(!emojiRegex.test(code), `Файл ${rel} содержит запрещенные cartoon emoji!`);
		}
	});
});
