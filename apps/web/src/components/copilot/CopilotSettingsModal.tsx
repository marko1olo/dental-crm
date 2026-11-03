/**
 * @file CopilotSettingsModal.tsx
 * @description Dedicated AI & Copilot settings modal: Tri-Environment Settings
 * (Web Browser, Desktop Workstation, Mobile Tablet), Capabilities Matrix,
 * Trust Levels, and Clinical Ergonomics (Mandate 8b <= 350 lines).
 */

import React, { useState } from "react";
import {
	Globe, Monitor, Sliders, Smartphone, Table, X
} from "lucide-react";
import {
	useCopilotStore,
	type AiSpeedMode,
	type AiTrustLevel,
	type ClinicalSpecialization,
	type CopilotRuntimeEnvironment,
	type DiaryTemplate,
	type TomographyViewerApp,
	type WebSpeechSensitivity,
} from "../../store/copilotStore";
import { showToast } from "../GlobalToast";
import {
	AI_MODELS,
	CopilotSettingsGeneralTab,
} from "./settings/CopilotSettingsGeneralTab";
import {
	CopilotWebBrowserTab,
	CopilotDesktopNativeTab,
	CopilotMobileTabletTab,
} from "./settings/CopilotSettingsEnvironmentTabs";
import { CopilotSettingsCapabilitiesTable } from "./settings/CopilotSettingsCapabilitiesTable";

export interface CopilotSettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	onOpenMemoryTab?: () => void;
}

export type SettingsTab = "general" | "web_browser" | "desktop_native" | "mobile_tablet" | "matrix";

export function CopilotSettingsModal({ isOpen, onClose, onOpenMemoryTab }: CopilotSettingsModalProps) {
	const settings = useCopilotStore((s) => s.settings);
	const memoryCount = useCopilotStore((s) => s.memoryFacts.length);
	const updateSettings = useCopilotStore((s) => s.updateSettings);

	const [activeTab, setActiveTab] = useState<SettingsTab>("general");
	const [runtimeMode, setRuntimeModeState] = useState<CopilotRuntimeEnvironment>(settings.runtimeMode);
	const [trustLevel, setTrustLevelState] = useState<AiTrustLevel>(settings.trustLevel);
	const [model, setModelState] = useState<string>(settings.model);
	const [speedMode, setSpeedModeState] = useState<AiSpeedMode>(settings.speedMode);
	const [showThinkingProcess, setShowThinkingState] = useState<boolean>(settings.showThinkingProcess);
	const [clinicalSpecialization, setSpecState] = useState<ClinicalSpecialization>(settings.clinicalSpecialization);
	const [diaryTemplate, setDiaryTemplateState] = useState<DiaryTemplate>(settings.diaryTemplate);

	// Среда: Браузер
	const [autoSaveDrafts, setAutoSaveDrafts] = useState<boolean>(settings.autoSaveDrafts);
	const [webSpeechSensitivity, setSpeechSensitivity] = useState<WebSpeechSensitivity>(settings.webSpeechSensitivity || "normal");
	const [maskPhiData, setMaskPhiData] = useState<boolean>(settings.maskPhiData ?? true);

	// Среда: Десктоп ПК
	const [localDropzonePath, setDropzoneState] = useState<string>(settings.localDropzonePath);
	const [tomographyViewerApp, setTomographyViewer] = useState<TomographyViewerApp>(settings.tomographyViewerApp || "planmeca_romexis");
	const [fiscalRegisterComPort, setComPort] = useState<string>(settings.fiscalRegisterComPort || "COM1");
	const [localInferenceServerUrl, setLocalInferenceUrl] = useState<string>(settings.localInferenceServerUrl || "http://localhost:11434");
	const [globalDictationHotkey, setGlobalHotkey] = useState<string>(settings.globalDictationHotkey || "F9");

	// Среда: Мобилка / Планшет
	const [gloveModeTouchTarget, setGloveMode] = useState<boolean>(settings.gloveModeTouchTarget ?? true);
	const [screenWakeLock, setWakeLock] = useState<boolean>(settings.screenWakeLock ?? true);
	const [hapticFeedbackEnabled, setHaptic] = useState<boolean>(settings.hapticFeedbackEnabled ?? true);
	const [autoMicOnAppointmentOpen, setAutoMic] = useState<boolean>(settings.autoMicOnAppointmentOpen ?? false);

	React.useEffect(() => {
		if (!isOpen) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const handleSave = () => {
		const targetModel = AI_MODELS.find((m) => m.id === model);
		updateSettings({
			runtimeMode,
			trustLevel,
			model,
			provider: targetModel?.provider || "gemini",
			speedMode,
			showThinkingProcess,
			clinicalSpecialization,
			diaryTemplate,
			autoSaveDrafts,
			webSpeechSensitivity,
			maskPhiData,
			localDropzonePath,
			tomographyViewerApp,
			fiscalRegisterComPort,
			localInferenceServerUrl,
			globalDictationHotkey,
			gloveModeTouchTarget,
			screenWakeLock,
			hapticFeedbackEnabled,
			autoMicOnAppointmentOpen,
		});
		showToast("Настройки ИИ и сред успешно сохранены", "success");
		onClose();
	};

	return (
		<div className="fixed inset-0 z-[99995] flex items-center justify-center p-3 max-md:p-0 max-md:items-end">
			<div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
			<div className="relative z-10 w-full max-w-2xl max-h-[92vh] flex flex-col bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-2xl max-md:rounded-b-none border border-[var(--line)] shadow-2xl overflow-hidden">
				{/* Шапка */}
				<header className="px-5 py-3 border-b border-[var(--line)] flex items-center justify-between gap-3 shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/12 border border-[var(--teal,#0d9488)]/30 flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
							<Sliders size={16} />
						</div>
						<div className="min-w-0">
							<h3 className="text-sm font-bold text-[var(--ink)] truncate">Настройки ИИ и Копайлота</h3>
							<p className="text-[11px] text-[var(--muted)] truncate">Среды исполнения, уровень доверия и матрица возможностей</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="icon-button w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--line)] hover:bg-[var(--line)] cursor-pointer"
						aria-label="Закрыть"
					>
						<X size={15} />
					</button>
				</header>

				{/* Селектор активной рабочей среды */}
				<div className="px-5 pt-3 pb-2 border-b border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] shrink-0">
					<div className="flex items-center justify-between gap-2 mb-1.5">
						<span className="text-[11px] font-bold text-[var(--ink)]">Текущая рабочая среда врача:</span>
						<span className="text-[10px] text-[var(--muted)]">Мгновенная адаптация интерфейса</span>
					</div>
					<div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
						<button
							type="button"
							onClick={() => setRuntimeModeState("web_browser")}
							className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
								runtimeMode === "web_browser"
									? "bg-[var(--teal,#0d9488)] text-white shadow-xs font-bold"
									: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<Globe size={13} />
							<span className="truncate">Веб-браузер</span>
						</button>
						<button
							type="button"
							onClick={() => setRuntimeModeState("desktop_native")}
							className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
								runtimeMode === "desktop_native"
									? "bg-[var(--teal,#0d9488)] text-white shadow-xs font-bold"
									: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<Monitor size={13} />
							<span className="truncate">Десктоп ПК</span>
						</button>
						<button
							type="button"
							onClick={() => setRuntimeModeState("mobile_tablet")}
							className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
								runtimeMode === "mobile_tablet"
									? "bg-[var(--teal,#0d9488)] text-white shadow-xs font-bold"
									: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<Smartphone size={13} />
							<span className="truncate">Планшет у кресла</span>
						</button>
					</div>
				</div>

				{/* Навигационные вкладки настроек */}
				<div className="flex border-b border-[var(--line)] px-5 gap-2 text-xs font-semibold shrink-0 overflow-x-auto no-scrollbar bg-[var(--paper)]">
					<button
						type="button"
						onClick={() => setActiveTab("general")}
						className={`py-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer bg-transparent whitespace-nowrap ${
							activeTab === "general" ? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-bold" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						<Sliders size={13} />
						<span>Общие</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("web_browser")}
						className={`py-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer bg-transparent whitespace-nowrap ${
							activeTab === "web_browser" ? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-bold" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						<Globe size={13} />
						<span>Браузер</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("desktop_native")}
						className={`py-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer bg-transparent whitespace-nowrap ${
							activeTab === "desktop_native" ? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-bold" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						<Monitor size={13} />
						<span>Десктоп ПК</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("mobile_tablet")}
						className={`py-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer bg-transparent whitespace-nowrap ${
							activeTab === "mobile_tablet" ? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-bold" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						<Smartphone size={13} />
						<span>Планшет</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("matrix")}
						className={`py-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer bg-transparent whitespace-nowrap ${
							activeTab === "matrix" ? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-bold" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						<Table size={13} />
						<span>Матрица возможностей</span>
					</button>
				</div>

				{/* Контент активной вкладки со скроллом */}
				<div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
					{activeTab === "general" && (
						<CopilotSettingsGeneralTab
							trustLevel={trustLevel}
							setTrustLevel={setTrustLevelState}
							model={model}
							setModel={setModelState}
							speedMode={speedMode}
							setSpeedMode={setSpeedModeState}
							showThinkingProcess={showThinkingProcess}
							setShowThinkingProcess={setShowThinkingState}
							clinicalSpecialization={clinicalSpecialization}
							setClinicalSpecialization={setSpecState}
							diaryTemplate={diaryTemplate}
							setDiaryTemplate={setDiaryTemplateState}
							memoryCount={memoryCount}
							onOpenMemory={() => { onClose(); onOpenMemoryTab?.(); }}
						/>
					)}

					{activeTab === "web_browser" && (
						<CopilotWebBrowserTab
							webSpeechSensitivity={webSpeechSensitivity}
							setSpeechSensitivity={setSpeechSensitivity}
							autoSaveDrafts={autoSaveDrafts}
							setAutoSaveDrafts={setAutoSaveDrafts}
							maskPhiData={maskPhiData}
							setMaskPhiData={setMaskPhiData}
						/>
					)}

					{activeTab === "desktop_native" && (
						<CopilotDesktopNativeTab
							localDropzonePath={localDropzonePath}
							setDropzonePath={setDropzoneState}
							tomographyViewerApp={tomographyViewerApp}
							setTomographyViewer={setTomographyViewer}
							fiscalRegisterComPort={fiscalRegisterComPort}
							setComPort={setComPort}
							localInferenceServerUrl={localInferenceServerUrl}
							setLocalInferenceUrl={setLocalInferenceUrl}
							globalDictationHotkey={globalDictationHotkey}
							setGlobalHotkey={setGlobalHotkey}
						/>
					)}

					{activeTab === "mobile_tablet" && (
						<CopilotMobileTabletTab
							gloveModeTouchTarget={gloveModeTouchTarget}
							setGloveMode={setGloveMode}
							screenWakeLock={screenWakeLock}
							setWakeLock={setWakeLock}
							hapticFeedbackEnabled={hapticFeedbackEnabled}
							setHaptic={setHaptic}
							autoMicOnAppointmentOpen={autoMicOnAppointmentOpen}
							setAutoMic={setAutoMic}
						/>
					)}

					{activeTab === "matrix" && (
						<CopilotSettingsCapabilitiesTable runtimeMode={runtimeMode} />
					)}
				</div>

				{/* Нижняя панель действий */}
				<footer className="px-5 py-3 border-t border-[var(--line)] bg-[var(--paper)] flex items-center justify-between gap-2 shrink-0">
					<div className="text-[11px] text-[var(--muted)]">
						Среда: <strong className="text-[var(--ink)]">{runtimeMode === "web_browser" ? "Веб-браузер" : runtimeMode === "desktop_native" ? "Десктоп ПК" : "Планшет"}</strong>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="secondary-button h-10 px-4 rounded-xl border border-[var(--line)] text-xs font-semibold hover:bg-[var(--line)] cursor-pointer"
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={handleSave}
							className="primary-button h-10 px-5 rounded-xl bg-[var(--teal,#0d9488)] text-white text-xs font-bold shadow-sm hover:opacity-95 cursor-pointer"
						>
							Сохранить настройки
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
}
