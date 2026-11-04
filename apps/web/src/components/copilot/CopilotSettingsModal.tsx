/**
 * @file CopilotSettingsModal.tsx
 * @description Dedicated AI & Copilot settings modal: 6 logical clinical categories
 * (Intelligence & Model, Trust & Autonomy, Doctor Persona, Voice & Privacy, Long-term Memory, Capabilities Matrix),
 * Auto device detection, and Clinical Ergonomics (Mandate 8b <= 350 lines).
 */

import React, { useState } from "react";
import {
	Brain, Globe, Mic, Monitor, ShieldCheck, Sliders, Smartphone,
	Sparkles, Stethoscope, Table, X
} from "lucide-react";
import {
	useCopilotStore,
	type AiProvider,
	type AiSpeedMode,
	type AiTrustLevel,
	type ClinicalSpecialization,
	type CopilotRuntimeEnvironment,
	type DiaryTemplate,
	type ModelRoutingMode,
	type WebSpeechSensitivity,
} from "../../store/copilotStore";
import { showToast } from "../GlobalToast";
import { CopilotSettingsIntelligenceTab } from "./settings/CopilotSettingsIntelligenceTab";
import { CopilotSettingsTrustTab } from "./settings/CopilotSettingsTrustTab";
import { CopilotSettingsPersonaTab } from "./settings/CopilotSettingsPersonaTab";
import { CopilotSettingsVoicePrivacyTab } from "./settings/CopilotSettingsVoicePrivacyTab";
import { CopilotSettingsMemoryTab } from "./settings/CopilotSettingsMemoryTab";
import { CopilotSettingsCapabilitiesTable } from "./settings/CopilotSettingsCapabilitiesTable";
import { MODERN_BYOK_MODELS } from "./settings/CopilotSettingsModelRouting";

export interface CopilotSettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	onOpenMemoryTab?: () => void;
}

export type SettingsTab = "intelligence" | "trust" | "persona" | "voice_privacy" | "memory" | "matrix";

export function CopilotSettingsModal({ isOpen, onClose, onOpenMemoryTab }: CopilotSettingsModalProps) {
	const settings = useCopilotStore((s) => s.settings);
	const memoryCount = useCopilotStore((s) => s.memoryFacts.length);
	const updateSettings = useCopilotStore((s) => s.updateSettings);

	const [activeTab, setActiveTab] = useState<SettingsTab>("intelligence");
	const [trustLevel, setTrustLevelState] = useState<AiTrustLevel>(settings.trustLevel);
	const [model, setModelState] = useState<string>(settings.model);
	const [modelRoutingMode, setModelRoutingMode] = useState<ModelRoutingMode>(settings.modelRoutingMode || "server_managed");
	const [byokProvider, setByokProvider] = useState<AiProvider>(settings.byokProvider || "gemini");
	const [byokApiKey, setByokApiKey] = useState<string>(settings.byokApiKey || "");
	const [byokModel, setByokModel] = useState<string>(settings.byokModel || "gemini-2.5-flash");
	const [speedMode, setSpeedModeState] = useState<AiSpeedMode>(settings.speedMode);
	const [showThinkingProcess, setShowThinkingState] = useState<boolean>(settings.showThinkingProcess);
	const [temperature, setTemperatureState] = useState<number>(settings.temperature ?? 0.2);
	const [clinicalSpecialization, setSpecState] = useState<ClinicalSpecialization>(settings.clinicalSpecialization);
	const [diaryTemplate, setDiaryTemplateState] = useState<DiaryTemplate>(settings.diaryTemplate);
	const [customDoctorInstructions, setCustomDoctorInstructions] = useState<string>(settings.customDoctorInstructions || "");
	const [granularPermissions, setGranularPermissions] = useState(settings.granularPermissions || {
		autoApproveFileReads: true,
		autoApproveFileWrites: false,
		autoApproveClinicalMutations: true,
		autoApproveFinancialDrafts: true,
		autoApproveExternalSoftware: false,
	});

	// Голос и приватность (152-ФЗ)
	const [autoSaveDrafts, setAutoSaveDrafts] = useState<boolean>(settings.autoSaveDrafts);
	const [webSpeechSensitivity, setSpeechSensitivity] = useState<WebSpeechSensitivity>(settings.webSpeechSensitivity || "normal");
	const [maskPhiData, setMaskPhiData] = useState<boolean>(settings.maskPhiData ?? true);
	const [autoMicOnAppointmentOpen, setAutoMic] = useState<boolean>(settings.autoMicOnAppointmentOpen ?? false);
	const [globalDictationHotkey, setGlobalHotkey] = useState<string>(settings.globalDictationHotkey || "F9");

	// Рабочая станция и сенсорная эргономика
	const [localDropzonePath] = useState<string>(settings.localDropzonePath);
	const [gloveModeTouchTarget] = useState<boolean>(settings.gloveModeTouchTarget ?? true);
	const [screenWakeLock] = useState<boolean>(settings.screenWakeLock ?? true);
	const [hapticFeedbackEnabled] = useState<boolean>(settings.hapticFeedbackEnabled ?? true);

	const runtimeMode: CopilotRuntimeEnvironment = settings.runtimeMode;
	const isChairside = runtimeMode === "chairside_tablet" || runtimeMode === "mobile_tablet";

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
		const targetModel = MODERN_BYOK_MODELS.find((m) => m.id === (modelRoutingMode === "custom_byok" ? byokModel : model));
		updateSettings({
			trustLevel,
			model: modelRoutingMode === "custom_byok" ? byokModel : "server_managed",
			modelRoutingMode,
			byokProvider,
			byokApiKey,
			byokModel,
			provider: modelRoutingMode === "custom_byok" ? byokProvider : (targetModel?.provider || "gemini"),
			speedMode,
			showThinkingProcess,
			temperature,
			clinicalSpecialization,
			diaryTemplate,
			customDoctorInstructions,
			granularPermissions,
			autoSaveDrafts,
			webSpeechSensitivity,
			maskPhiData,
			globalDictationHotkey,
			localDropzonePath,
			gloveModeTouchTarget,
			screenWakeLock,
			hapticFeedbackEnabled,
			autoMicOnAppointmentOpen,
		});
		showToast("Настройки ИИ успешно сохранены", "success");
		onClose();
	};

	return (
		<div className="fixed inset-0 z-[99995] flex items-center justify-center p-3 max-md:p-0 max-md:items-end">
			<div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
			<div className="relative z-10 w-full max-w-4xl max-h-[92vh] flex flex-col bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-2xl max-md:rounded-b-none max-md:rounded-t-[24px] border border-[var(--line)] shadow-2xl overflow-hidden">
				{/* Apple HIG тактильный Drag Handle на мобильных экранах */}
				<div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0">
					<div className="w-9 h-1.5 touch-none rounded-full bg-[var(--line,rgba(15,118,110,0.25))]" />
				</div>

				{/* Шапка */}
				<header className="px-5 py-3 border-b border-[var(--line)] flex items-center justify-between gap-3 shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/12 border border-[var(--teal,#0d9488)]/30 flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
							<Sliders size={16} />
						</div>
						<div className="min-w-0">
							<h3 className="text-sm font-bold text-[var(--ink)] truncate">Настройки ИИ и Копайлота</h3>
							<p className="text-[11px] text-[var(--muted)] truncate">Интеллект, уровни доверия, персона врача, голос и память</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="icon-button w-11 h-11 sm:w-8 sm:h-8 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg border border-[var(--line)] hover:bg-[var(--line)] cursor-pointer"
						aria-label="Закрыть"
					>
						<X size={16} />
					</button>
				</header>

				{/* Тихий индикатор обнаруженного устройства (без ручных селекторов) */}
				<div className="px-5 py-2.5 border-b border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between text-xs shrink-0">
					<div className="flex items-center gap-2">
						<span className="text-[11px] text-[var(--muted)]">Обнаружено устройство:</span>
						<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]">
							{runtimeMode === "desktop_native" ? (
								<>
									<Monitor size={13} className="text-[var(--teal,#0d9488)]" />
									<span>Рабочая станция ОС</span>
								</>
							) : isChairside ? (
								<>
									<Smartphone size={13} className="text-[var(--teal,#0d9488)]" />
									<span>Сенсорный планшет</span>
								</>
							) : (
								<>
									<Globe size={13} className="text-[var(--teal,#0d9488)]" />
									<span>Веб-браузер</span>
								</>
							)}
						</span>
					</div>
					<span className="text-[10px] text-[var(--muted)] hidden sm:inline">Определяется автоматически</span>
				</div>

				{/* Логические навигационные вкладки настроек */}
				<div className="flex border-b border-[var(--line)] px-5 gap-3 text-xs font-semibold shrink-0 overflow-x-auto no-scrollbar bg-[var(--paper)]">
					<button
						type="button"
						onClick={() => setActiveTab("intelligence")}
						className={`py-2.5 border-0 border-b-2 flex items-center gap-1.5 cursor-pointer bg-transparent whitespace-nowrap outline-none focus:outline-none shrink-0 ${
							activeTab === "intelligence" ? "border-b-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-bold" : "border-b-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						<Brain size={13} />
						<span>Интеллект и модель</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("trust")}
						className={`py-2.5 border-0 border-b-2 flex items-center gap-1.5 cursor-pointer bg-transparent whitespace-nowrap outline-none focus:outline-none shrink-0 ${
							activeTab === "trust" ? "border-b-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-bold" : "border-b-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						<ShieldCheck size={13} />
						<span>Уровень доверия</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("persona")}
						className={`py-2.5 border-0 border-b-2 flex items-center gap-1.5 cursor-pointer bg-transparent whitespace-nowrap outline-none focus:outline-none shrink-0 ${
							activeTab === "persona" ? "border-b-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-bold" : "border-b-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						<Stethoscope size={13} />
						<span>Профиль врача</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("voice_privacy")}
						className={`py-2.5 border-0 border-b-2 flex items-center gap-1.5 cursor-pointer bg-transparent whitespace-nowrap outline-none focus:outline-none shrink-0 ${
							activeTab === "voice_privacy" ? "border-b-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-bold" : "border-b-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						<Mic size={13} />
						<span>Голос и приватность</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("memory")}
						className={`py-2.5 border-0 border-b-2 flex items-center gap-1.5 cursor-pointer bg-transparent whitespace-nowrap outline-none focus:outline-none shrink-0 ${
							activeTab === "memory" ? "border-b-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-bold" : "border-b-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						<Sparkles size={13} />
						<span>Память ИИ ({memoryCount})</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("matrix")}
						className={`py-2.5 border-0 border-b-2 flex items-center gap-1.5 cursor-pointer bg-transparent whitespace-nowrap outline-none focus:outline-none shrink-0 ${
							activeTab === "matrix" ? "border-b-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-bold" : "border-b-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						<Table size={13} />
						<span>Матрица возможностей</span>
					</button>
				</div>

				{/* Контент активной вкладки со скроллом */}
				<div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
					{activeTab === "intelligence" && (
						<CopilotSettingsIntelligenceTab
							modelRoutingMode={modelRoutingMode}
							setModelRoutingMode={setModelRoutingMode}
							byokProvider={byokProvider}
							setByokProvider={setByokProvider}
							byokApiKey={byokApiKey}
							setByokApiKey={setByokApiKey}
							byokModel={byokModel}
							setByokModel={setByokModel}
							speedMode={speedMode}
							setSpeedMode={setSpeedModeState}
							showThinkingProcess={showThinkingProcess}
							setShowThinkingProcess={setShowThinkingState}
							temperature={temperature}
							setTemperature={setTemperatureState}
						/>
					)}

					{activeTab === "trust" && (
						<CopilotSettingsTrustTab
							trustLevel={trustLevel}
							setTrustLevel={setTrustLevelState}
							granularPermissions={granularPermissions}
							setGranularPermissions={setGranularPermissions}
						/>
					)}

					{activeTab === "persona" && (
						<CopilotSettingsPersonaTab
							clinicalSpecialization={clinicalSpecialization}
							setClinicalSpecialization={setSpecState}
							diaryTemplate={diaryTemplate}
							setDiaryTemplate={setDiaryTemplateState}
							customInstructions={customDoctorInstructions}
							setCustomInstructions={setCustomDoctorInstructions}
						/>
					)}

					{activeTab === "voice_privacy" && (
						<CopilotSettingsVoicePrivacyTab
							webSpeechSensitivity={webSpeechSensitivity}
							setSpeechSensitivity={setSpeechSensitivity}
							autoSaveDrafts={autoSaveDrafts}
							setAutoSaveDrafts={setAutoSaveDrafts}
							maskPhiData={maskPhiData}
							setMaskPhiData={setMaskPhiData}
							autoMicOnAppointmentOpen={autoMicOnAppointmentOpen}
							setAutoMic={setAutoMic}
							globalDictationHotkey={globalDictationHotkey}
							setGlobalHotkey={setGlobalHotkey}
						/>
					)}

					{activeTab === "memory" && (
						<CopilotSettingsMemoryTab
							onOpenFullMemory={() => { onClose(); onOpenMemoryTab?.(); }}
						/>
					)}

					{activeTab === "matrix" && (
						<CopilotSettingsCapabilitiesTable runtimeMode={runtimeMode} />
					)}
				</div>

				{/* Нижняя панель действий */}
				<footer className="px-5 py-3 border-t border-[var(--line)] bg-[var(--paper)] flex items-center justify-between gap-2 shrink-0">
					<div className="text-[11px] text-[var(--muted)]">
						Устройство: <strong className="text-[var(--ink)]">{runtimeMode === "desktop_native" ? "Рабочая станция ОС" : isChairside ? "Сенсорный планшет" : "Веб-браузер"}</strong>
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
