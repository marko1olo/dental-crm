/**
 * @file copilotTriEnvironmentSettings.test.tsx
 * @description Red Team Inquisitor Test Suite: Auto-Detection Runtime Environment,
 * 6 Logical Clinical Settings Categories (Intelligence, Trust & Autonomy, Doctor Persona, Voice & Privacy, Memory, Matrix),
 * Mandate 8b file limits, Mandate 8e doctor autonomy, and Mandate 8x clinical language (Zero COM Ports / Hardware Cargo Cult).
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
} from "../../../store/copilotStore";
import {
	ENVIRONMENT_CAPABILITIES_MATRIX,
} from "../copilotCatalogData";
import { CopilotSettingsModal } from "../CopilotSettingsModal";
import { CopilotSettingsCapabilitiesTable, renderCapabilityStatusBadge } from "../settings/CopilotSettingsCapabilitiesTable";
import { CopilotSettingsIntelligenceTab } from "../settings/CopilotSettingsIntelligenceTab";
import { CopilotSettingsTrustTab, TRUST_LEVELS } from "../settings/CopilotSettingsTrustTab";
import { CopilotSettingsPersonaTab } from "../settings/CopilotSettingsPersonaTab";
import { CopilotSettingsVoicePrivacyTab } from "../settings/CopilotSettingsVoicePrivacyTab";
import { CopilotSettingsMemoryTab } from "../settings/CopilotSettingsMemoryTab";
import { CopilotThinkingIndicator, getClinicalThinkingPhase } from "../CopilotThinkingIndicator";
import { CopilotHistoryDrawer, getThreadDateCategory } from "../CopilotHistoryDrawer";
import { CopilotMemoryTab as CopilotMemoryMainTab, MEMORY_QUICK_PRESETS } from "../CopilotMemoryTab";

describe("Copilot Auto-Detection & Logical Settings (Zero Hardware Cargo Cult)", () => {
	beforeEach(() => {
		useCopilotStore.setState({
			settings: {
				...useCopilotStore.getState().settings,
				trustLevel: "balanced",
				provider: "gemini",
				model: "gemini-2.5-flash",
				modelRoutingMode: "server_managed",
				speedMode: "turbo",
				showThinkingProcess: true,
				temperature: 0.2,
				clinicalSpecialization: "therapy",
				diaryTemplate: "soap",
				customDoctorInstructions: "",
				granularPermissions: {
					autoApproveFileReads: true,
					autoApproveFileWrites: false,
					autoApproveClinicalMutations: true,
					autoApproveFinancialDrafts: true,
					autoApproveExternalSoftware: false,
				},
				runtimeMode: "web_browser",
				autoSaveDrafts: true,
				webSpeechSensitivity: "normal",
				maskPhiData: true,
				globalDictationHotkey: "F9",
				localDropzonePath: "C:\\Radiology\\Export",
				gloveModeTouchTarget: true,
				screenWakeLock: true,
				hapticFeedbackEnabled: true,
				autoMicOnAppointmentOpen: false,
			},
		});
	});

	it("1. detectRuntimeEnvironment() автоматически определяет среду без ручного выбора", () => {
		const env = detectRuntimeEnvironment();
		assert.equal(env, "web_browser");

		const store = useCopilotStore.getState();
		const refreshed = store.refreshRuntimeEnvironment();
		assert.equal(refreshed, "web_browser");
		assert.equal(useCopilotStore.getState().settings.runtimeMode, "web_browser");
	});

	it("2. copilotStore содержит параметры клинического интеллекта, доверия и голоса (БЕЗ COM-портов)", () => {
		const settings = useCopilotStore.getState().settings;

		// Интеллект и доверие
		assert.equal(settings.trustLevel, "balanced");
		assert.equal(typeof settings.temperature, "number");
		assert.equal(typeof settings.showThinkingProcess, "boolean");
		assert.equal(typeof settings.granularPermissions.autoApproveClinicalMutations, "boolean");

		// Клиническая персона
		assert.equal(settings.clinicalSpecialization, "therapy");
		assert.equal(settings.diaryTemplate, "soap");

		// Голос и приватность (152-ФЗ)
		assert.equal(typeof settings.autoSaveDrafts, "boolean");
		assert.ok(["high", "normal", "low"].includes(settings.webSpeechSensitivity));
		assert.equal(typeof settings.maskPhiData, "boolean");
		assert.equal(settings.globalDictationHotkey, "F9");

		// Ликвидация аппаратного карго-культа (Мандат 8e / Завет Создателя)
		assert.equal((settings as any).tomographyViewerApp, undefined, "tomographyViewerApp обязан быть полностью удален из стора");
		assert.equal((settings as any).fiscalRegisterComPort, undefined, "fiscalRegisterComPort обязан быть полностью удален из стора");
	});

	it("3. updateSettings корректно обновляет параметры доверия, температуры и персоны", () => {
		const store = useCopilotStore.getState();

		store.updateSettings({
			trustLevel: "autonomous",
			temperature: 0.1,
			clinicalSpecialization: "surgery",
			globalDictationHotkey: "F10",
		});

		const updated = useCopilotStore.getState().settings;
		assert.equal(updated.trustLevel, "autonomous");
		assert.equal(updated.temperature, 0.1);
		assert.equal(updated.clinicalSpecialization, "surgery");
		assert.equal(updated.globalDictationHotkey, "F10");
	});

	it("4. ENVIRONMENT_CAPABILITIES_MATRIX содержит честную клиническую раскладку возможностей", () => {
		assert.ok(ENVIRONMENT_CAPABILITIES_MATRIX.length >= 10, "Матрица обязана содержать не менее 10 ключевых возможностей");

		// Импорт DICOM: доступен во всех средах (дисковод, USB, локальный путь)
		const dicom = ENVIRONMENT_CAPABILITIES_MATRIX.find((c) => c.id === "dicom_import");
		assert.ok(dicom, "dicom_import обязан присутствовать в матрице");
		assert.equal(dicom?.web, "available");

		// Касса и сметы
		const kassa = ENVIRONMENT_CAPABILITIES_MATRIX.find((c) => c.id === "fiscal_kassa");
		assert.ok(kassa, "fiscal_kassa обязан присутствовать в матрице");
		assert.equal(kassa?.web, "available");

		// Дневники SOAP: доступны везде
		const diary = ENVIRONMENT_CAPABILITIES_MATRIX.find((c) => c.id === "emr_diary");
		assert.ok(diary);
		assert.equal(diary?.web, "available");
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

	it("7. CopilotSettingsModal рендерит тихий авто-индикатор устройства и 6 логических клинических категорий", () => {
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

		// 6 логических вкладок
		assert.ok(html.includes("Интеллект и модель"));
		assert.ok(html.includes("Уровень доверия"));
		assert.ok(html.includes("Профиль врача"));
		assert.ok(html.includes("Голос и приватность"));
		assert.ok(html.includes("Память ИИ"));
		assert.ok(html.includes("Матрица возможностей"));

		// Ликвидация вкладки «Оборудование кабинета» (Мандат 8e)
		assert.ok(!html.includes("Оборудование кабинета"), "Вкладка Оборудование кабинета обязана отсутствовать");

		// Мандат 8e: кнопка Сохранить настройки не заблокирована
		assert.ok(html.includes("Сохранить настройки"));
		assert.ok(!html.includes("disabled"), "Кнопки сохранения не должны блокироваться атрибутом disabled (Мандат 8e)");
	});

	it("8. CopilotSettingsVoicePrivacyTab рендерит настройки Web Speech, автосейва, горячей клавиши и маскирования PHI", () => {
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
				globalDictationHotkey="F9"
				setGlobalHotkey={() => {}}
			/>
		);

		assert.ok(html.includes("Голосовое управление и безопасность данных"));
		assert.ok(html.includes("Чувствительность распознавания речи Web Speech"));
		assert.ok(html.includes("Автосохранение черновиков дневников SOAP"));
		assert.ok(html.includes("Защита персональных данных пациента"));
		assert.ok(html.includes("Горячая клавиша быстрой диктовки"));
		assert.ok(html.includes("F9"));
	});

	it("9. CopilotSettingsTrustTab рендерит 3 уровня доверия и гранулярные чекбоксы", () => {
		const html = renderToString(
			<CopilotSettingsTrustTab
				trustLevel="balanced"
				setTrustLevel={() => {}}
				granularPermissions={{
					autoApproveFileReads: true,
					autoApproveFileWrites: false,
					autoApproveClinicalMutations: true,
					autoApproveFinancialDrafts: true,
					autoApproveExternalSoftware: false,
				}}
				setGranularPermissions={() => {}}
			/>
		);

		assert.ok(html.includes("Уровень доверия к действиям ИИ"));
		assert.ok(html.includes("Максимальный контроль (Параноик)"));
		assert.ok(html.includes("Сбалансированный (Копайлот)"));
		assert.ok(html.includes("Высокая автономия (Суперагент)"));
		assert.ok(html.includes("Гранулярные разрешения действий"));
		assert.ok(html.includes("Разметка формулы и дневника ЭМК"));
	});

	it("10. CopilotSettingsPersonaTab рендерит 6 специализаций врача, шаблоны дневников и клинические пресеты", () => {
		const html = renderToString(
			<CopilotSettingsPersonaTab
				clinicalSpecialization="therapy"
				setClinicalSpecialization={() => {}}
				diaryTemplate="soap"
				setDiaryTemplate={() => {}}
				customInstructions=""
				setCustomInstructions={() => {}}
			/>
		);

		assert.ok(html.includes("Клинический профиль и стиль врача"));
		assert.ok(html.includes("Специализация врача"));
		assert.ok(html.includes("Терапевтическая стоматология"));
		assert.ok(html.includes("Формат дневника приёма"));
		assert.ok(html.includes("Индивидуальные инструкции и персональный стиль врача"));
		assert.ok(html.includes("Микроскопист-эндодонтист"));
		assert.ok(html.includes("Хирург-имплантолог"));
		assert.ok(html.includes("Ортопед-гнатолог"));
		assert.ok(html.includes("Детский стоматолог"));
	});

	it("11. CopilotSettingsIntelligenceTab рендерит маршрутизацию модели, CoT консилиум и строгость ответа", () => {
		const html = renderToString(
			<CopilotSettingsIntelligenceTab
				modelRoutingMode="server_managed"
				setModelRoutingMode={() => {}}
				byokProvider="gemini"
				setByokProvider={() => {}}
				byokApiKey=""
				setByokApiKey={() => {}}
				byokModel="gemini-2.5-flash"
				setByokModel={() => {}}
				speedMode="turbo"
				setSpeedMode={() => {}}
				showThinkingProcess={true}
				setShowThinkingProcess={() => {}}
				temperature={0.2}
				setTemperature={() => {}}
			/>
		);

		assert.ok(html.includes("Интеллект и маршрутизация модели"));
		assert.ok(html.includes("Режим клинического консилиума"));
		assert.ok(html.includes("Турбо"));
		assert.ok(html.includes("Консилиум"));
		assert.ok(html.includes("Клиническая строгость ответа (Температура: 0.2)"));
	});

	it("12. Мандат 8b: проверка размеров всех файлов настроек Копайлота (Sweet Spot <= 350 строк)", () => {
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
		checkFile("../settings/CopilotSettingsIntelligenceTab.tsx", 200);
		checkFile("../settings/CopilotSettingsTrustTab.tsx", 200);
		checkFile("../settings/CopilotSettingsPersonaTab.tsx", 200);
		checkFile("../settings/CopilotSettingsVoicePrivacyTab.tsx", 200);
		checkFile("../settings/CopilotSettingsMemoryTab.tsx", 200);
		checkFile("../settings/CopilotSettingsCapabilitiesTable.tsx", 150);
	});

	it("13. Мандат 8d pt 7: строго 0 cartoon emojis в исходном коде всех компонентов настроек", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		const files = [
			"../CopilotSettingsModal.tsx",
			"../settings/CopilotSettingsIntelligenceTab.tsx",
			"../settings/CopilotSettingsTrustTab.tsx",
			"../settings/CopilotSettingsPersonaTab.tsx",
			"../settings/CopilotSettingsVoicePrivacyTab.tsx",
			"../settings/CopilotSettingsMemoryTab.tsx",
			"../settings/CopilotSettingsCapabilitiesTable.tsx",
		];

		for (const rel of files) {
			const full = path.resolve(__dirname, rel);
			const code = fs.readFileSync(full, "utf-8");
			assert.ok(!emojiRegex.test(code), `Файл ${rel} содержит запрещенные cartoon emoji!`);
		}
	});

	it("14. CopilotSettingsGranularPermissions содержит 5-е разрешение для внешнего ПО (Romexis, Ez3D)", () => {
		const html = renderToString(
			<CopilotSettingsTrustTab
				trustLevel="balanced"
				setTrustLevel={() => {}}
				granularPermissions={{
					autoApproveFileReads: true,
					autoApproveFileWrites: false,
					autoApproveClinicalMutations: true,
					autoApproveFinancialDrafts: true,
					autoApproveExternalSoftware: true,
				}}
				setGranularPermissions={() => {}}
			/>
		);

		assert.ok(html.includes("Запуск внешнего стоматологического ПО (Romexis, Ez3D Plus)"));
	});

	it("15. CopilotSettingsIntelligenceTab рендерит селектор лимита контекста (contextLimitTokens)", () => {
		const html = renderToString(
			<CopilotSettingsIntelligenceTab
				modelRoutingMode="server_managed"
				setModelRoutingMode={() => {}}
				byokProvider="gemini"
				setByokProvider={() => {}}
				byokApiKey=""
				setByokApiKey={() => {}}
				byokModel="gemini-2.5-flash"
				setByokModel={() => {}}
				speedMode="turbo"
				setSpeedMode={() => {}}
				showThinkingProcess={true}
				setShowThinkingProcess={() => {}}
				temperature={0.2}
				setTemperature={() => {}}
				contextLimitTokens={32768}
				setContextLimitTokens={() => {}}
			/>
		);

		assert.ok(html.includes("Лимит контекстного окна (Token Budget)"));
		assert.ok(html.includes("32k"));
		assert.ok(html.includes("128k"));
	});

	it("16. CopilotThinkingIndicator отображает живой секундомер, фазы размышления и CoT", () => {
		// Тест фаз размышления
		assert.equal(getClinicalThinkingPhase(0.5), "ИИ формирует клинический протокол...");
		assert.equal(getClinicalThinkingPhase(1.2), "Дифференциальный диагноз по МКБ-10...");
		assert.equal(getClinicalThinkingPhase(2.0), "Проверка противопоказаний и СтАР...");
		assert.equal(getClinicalThinkingPhase(3.5), "Синтез рекомендаций и сметы...");

		const html = renderToString(
			<CopilotThinkingIndicator
				isThinking={true}
				thoughtProcess="Анализ зуба 36: кариес дентина K02.1. Рекомендована нанокомпозитная реставрация."
			/>
		);

		assert.ok(html.includes("Ход клинических рассуждений"));
		assert.ok(html.includes("K02.1"));
	});

	it("17. getThreadDateCategory и CopilotHistoryDrawer группируют треды по датам", () => {
		const now = new Date();
		const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const older = new Date(now.getTime() - 72 * 60 * 60 * 1000);

		assert.equal(getThreadDateCategory({ id: "1", title: "Тест", createdAt: now.toISOString(), updatedAt: "12:00" }), "today");
		assert.equal(getThreadDateCategory({ id: "2", title: "Тест", createdAt: yesterday.toISOString(), updatedAt: "вчера 15:30" }), "yesterday");
		assert.equal(getThreadDateCategory({ id: "3", title: "Тест", createdAt: older.toISOString(), updatedAt: "22.10.2024" }), "earlier");

		const html = renderToString(
			<CopilotHistoryDrawer
				isOpen={true}
				onClose={() => {}}
				onSelectThread={() => {}}
			/>
		);

		assert.ok(html.includes("История диалогов"));
		assert.ok(html.includes("Очистить"));
	});

	it("18. CopilotMemoryMainTab отображает клинические пресеты, категорию диагнозов и сброс", () => {
		assert.ok(MEMORY_QUICK_PRESETS.length >= 4);
		const hasDiagnosis = MEMORY_QUICK_PRESETS.some((p) => p.category === "diagnosis");
		assert.ok(hasDiagnosis, "MEMORY_QUICK_PRESETS обязан содержать пресет категории diagnosis");

		const html = renderToString(
			<CopilotMemoryMainTab />
		);

		assert.ok(html.includes("Долговременная память ассистента"));
		assert.ok(html.includes("Быстрые пресеты"));
		assert.ok(html.includes("Диагнозы"));
	});

	it("19. Мандат 8b: проверка размеров всех файлов индикатора, истории и памяти", () => {
		const checkFile = (relPath: string, maxLines: number) => {
			const fullPath = path.resolve(__dirname, relPath);
			assert.ok(fs.existsSync(fullPath), `Файл ${relPath} обязан существовать`);
			const lines = fs.readFileSync(fullPath, "utf-8").split("\n").length;
			assert.ok(
				lines <= maxLines,
				`Файл ${relPath} имеет ${lines} строк (лимит: <= ${maxLines} строк, Мандат 8b)`
			);
		};

		checkFile("../CopilotThinkingIndicator.tsx", 150);
		checkFile("../CopilotHistoryDrawer.tsx", 300);
		checkFile("../CopilotMemoryTab.tsx", 240);
		checkFile("../settings/CopilotSettingsGranularPermissions.tsx", 120);
	});

	it("20. Мандат 8d pt 7: строго 0 cartoon emojis в индикаторе, истории и памяти", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		const files = [
			"../CopilotThinkingIndicator.tsx",
			"../CopilotHistoryDrawer.tsx",
			"../CopilotMemoryTab.tsx",
			"../settings/CopilotSettingsGranularPermissions.tsx",
		];

		for (const rel of files) {
			const full = path.resolve(__dirname, rel);
			const code = fs.readFileSync(full, "utf-8");
			assert.ok(!emojiRegex.test(code), `Файл ${rel} содержит запрещенные cartoon emoji!`);
		}
	});
});
