/**
 * apps/web/src/components/settings/DoctorSettingsSection.tsx
 *
 * Dedicated settings workspace tailored specifically for clinicians (Doctors).
 * Encapsulates personal profile, clinical protocols, clinical safety rules,
 * procedure material BOMs, AI dictation, and chairside hardware.
 *
 * Mandates 8b, 8c, 8d, 8e: Strictly <= 800 lines, vector Lucide icons, doctor autonomy.
 */

import React, { useState, useEffect } from "react";
import {
	Activity,
	Bot,
	Camera,
	FileText,
	HardDrive,
	HeartPulse,
	Layers,
	Mic,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	User,
	Wand2,
} from "lucide-react";
import { ErrorBoundary } from "../ErrorBoundary";
import { HardwareSettingsTab } from "./HardwareSettingsTab";
import { MaterialBomsSettingsPanel } from "../inventory/MaterialBomsSettingsPanel";
import { SettingsAiTab } from "./SettingsAiTab";
import { SettingsProfileTab } from "./SettingsProfileTab";
import { SettingsProtocolsTab } from "./SettingsProtocolsTab";
import { SettingsRulesTab } from "./SettingsRulesTab";
import { DoctorClinicalPreferencesSection } from "./DoctorClinicalPreferencesSection";
import {
	useDoctorPreferencesStore,
	type DoctorSpecialtyKey,
} from "../../store/doctorPreferencesStore";
import { showToast } from "../GlobalToast";

import {
	DOCTOR_TABS,
	type DoctorSubTab,
	type DoctorTabDefinition,
} from "./doctorSettingsTabs";
import { DelimitedTileCard } from "./DelimitedTileCard";
export { DOCTOR_TABS, type DoctorSubTab, type DoctorTabDefinition };

export interface DoctorSettingsSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: props bag
	readonly props: Record<string, any>;
	readonly initialTab?: DoctorSubTab;
	readonly onSelectTab?: (tab: string) => void;
}

const SPECIALTY_PRESET_BUTTONS: readonly {
	key: DoctorSpecialtyKey;
	label: string;
	title: string;
}[] = [
	{ key: "therapist", label: "Терапевт", title: "Терапевтическая стоматология" },
	{ key: "surgeon", label: "Хирург", title: "Хирургическая стоматология и имплантология" },
	{ key: "orthopedist", label: "Ортопед", title: "Ортопедическая стоматология и протезирование" },
	{ key: "orthodontist", label: "Ортодонт", title: "Ортодонтия и исправление прикуса" },
	{ key: "periodontist", label: "Пародонтолог", title: "Пародонтология и здоровье десен" },
	{ key: "pediatric", label: "Детский", title: "Детская стоматология" },
];

export const DoctorSettingsSection: React.FC<DoctorSettingsSectionProps> = ({
	props,
	initialTab = "profile",
	onSelectTab,
}) => {
	const [activeSubTab, setActiveSubTab] = useState<DoctorSubTab>(initialTab);

	useEffect(() => {
		if (initialTab) {
			setActiveSubTab(initialTab);
		}
	}, [initialTab]);

	// Persisted doctor preferences and smart toggles
	const preferences = useDoctorPreferencesStore((s) => s.preferences);
	const updatePreferences = useDoctorPreferencesStore((s) => s.updatePreferences);
	const applySpecialtyPreset = useDoctorPreferencesStore((s) => s.applySpecialtyPreset);

	const autoMkb10 = preferences.autoMkb10;
	const somaticWarnings = preferences.somaticWarnings;
	const instantPhotoProtocol = preferences.instantPhotoProtocol;
	const voiceDictationActive = preferences.voiceDictationActive;
	const currentSpecialty = preferences.specialty;

	const handleTabChange = (tabId: DoctorSubTab) => {
		setActiveSubTab(tabId);
		onSelectTab?.(tabId);
	};

	const handleToggleAssistant = (
		key: "autoMkb10" | "somaticWarnings" | "instantPhotoProtocol" | "voiceDictationActive",
		label: string,
	) => {
		const next = !preferences[key];
		updatePreferences({ [key]: next });
		showToast(`${label}: ${next ? "включено" : "выключено"}`, next ? "success" : "info");
	};

	return (
		<div className="space-y-4" data-testid="doctor-settings-section">
			{/* Sub-Navigation Strip (Desktop 32px, Radius 8px) */}
			<div className="settings-subnav-strip overflow-x-auto pb-2 border-b border-[var(--line)]" role="tablist" aria-label="Разделы настроек врача">
				{DOCTOR_TABS.map((tab) => {
					const Icon = tab.icon;
					const isSelected = activeSubTab === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							role="tab"
							aria-selected={isSelected}
							onClick={() => handleTabChange(tab.id)}
							title={tab.description}
							className={`settings-subnav-btn ${isSelected ? "active" : ""}`}
							data-testid={`doctor-tab-${tab.id}`}
						>
							<Icon size={14} className="shrink-0" />
							<span className="whitespace-nowrap">{tab.label}</span>
						</button>
					);
				})}
			</div>

			{/* When on Profile tab: Show Smart Clinical Assistants as a quiet, dense Apple Grouped Card */}
			{activeSubTab === "profile" && (
				<div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3.5 space-y-2.5 shadow-xs">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<Wand2 size={14} className="text-[var(--teal)]" />
							<h4 className="text-xs font-bold text-[var(--ink)] m-0">
								Клинические ассистенты приёма
							</h4>
						</div>
						<div className="flex items-center gap-3">
							<span className="text-[11px] text-[var(--muted)] hidden md:inline">
								Сохраняется мгновенно без перезагрузки
							</span>
							<div className="flex items-center gap-1.5 shrink-0">
								<span className="text-[11px] font-medium text-[var(--muted)] whitespace-nowrap">
									Профиль:
								</span>
								<select
									value={currentSpecialty}
									onChange={(e) => {
										const val = e.target.value as DoctorSpecialtyKey;
										applySpecialtyPreset(val);
										const label = SPECIALTY_PRESET_BUTTONS.find((b) => b.key === val)?.label || val;
										showToast(`Пресет «${label}» активирован`, "success");
									}}
									className="h-7 text-xs px-2.5 py-0 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] font-medium cursor-pointer focus:outline-none focus:border-[var(--teal)] transition-colors"
									data-testid="doctor-specialty-preset-select"
								>
									{SPECIALTY_PRESET_BUTTONS.map((spec) => (
										<option key={spec.key} value={spec.key}>
											{spec.label}
										</option>
									))}
								</select>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
						<DelimitedTileCard
							icon={FileText}
							title="МКБ-10 Автоподбор"
							description="Подстановка диагноза"
							checked={autoMkb10}
							onChange={() => handleToggleAssistant("autoMkb10", "МКБ-10 Автоподбор")}
							testId="doctor-assistant-toggle-autoMkb10"
						/>
						<DelimitedTileCard
							icon={HeartPulse}
							title="Соматические алерты"
							description="Аллергии и стоп-факторы"
							checked={somaticWarnings}
							onChange={() => handleToggleAssistant("somaticWarnings", "Соматические алерты")}
							testId="doctor-assistant-toggle-somaticWarnings"
						/>
						<DelimitedTileCard
							icon={Camera}
							title="Быстрый фотопротокол"
							description="Захват снимков SD/SMB"
							checked={instantPhotoProtocol}
							onChange={() => handleToggleAssistant("instantPhotoProtocol", "Быстрый фотопротокол")}
							testId="doctor-assistant-toggle-instantPhotoProtocol"
						/>
						<DelimitedTileCard
							icon={Mic}
							title="Голосовая диктовка"
							description="Заполнение карты голосом"
							checked={voiceDictationActive}
							onChange={() => handleToggleAssistant("voiceDictationActive", "Голосовая диктовка")}
							testId="doctor-assistant-toggle-voiceDictationActive"
						/>
					</div>
				</div>
			)}

			{/* Sub-Tab Content Rendering */}
			<div className="pt-2">
				{activeSubTab === "profile" && (
					<ErrorBoundary moduleName="Мой профиль">
						<SettingsProfileTab props={props} />
					</ErrorBoundary>
				)}

				{activeSubTab === "preferences" && (
					<ErrorBoundary moduleName="Клинические пресеты">
						<DoctorClinicalPreferencesSection
							soundNotificationsMuted={
								props?.soundNotificationsMuted ??
								props?.appLogic?.soundNotificationsMuted
							}
							onToggleSoundMuted={
								props?.setSoundNotificationsMuted ??
								props?.appLogic?.setSoundNotificationsMuted
							}
							onTestOnlineBookingSound={
								props?.testOnlineBookingSound ??
								props?.appLogic?.testOnlineBookingSound
							}
							onTestSlotEndSound={
								props?.testSlotEndSound ??
								props?.appLogic?.testSlotEndSound
							}
						/>
					</ErrorBoundary>
				)}

				{activeSubTab === "protocols" && (
					<ErrorBoundary moduleName="Клинические протоколы">
						<SettingsProtocolsTab />
					</ErrorBoundary>
				)}

				{activeSubTab === "rules" && (
					<ErrorBoundary moduleName="Клинические правила">
						<SettingsRulesTab />
					</ErrorBoundary>
				)}

				{activeSubTab === "procedure-boms" && (
					<ErrorBoundary moduleName="Техкарты расхода материалов">
						<MaterialBomsSettingsPanel
							{...(props?.auth?.currentUser?.organizationId
								? { organizationId: props.auth.currentUser.organizationId }
								: {})}
						/>
					</ErrorBoundary>
				)}

				{activeSubTab === "ai" && (
					<ErrorBoundary moduleName="ИИ-ассистент">
						<SettingsAiTab />
					</ErrorBoundary>
				)}

				{activeSubTab === "hardware" && (
					<ErrorBoundary moduleName="Оборудование кабинета">
						<HardwareSettingsTab />
					</ErrorBoundary>
				)}
			</div>
		</div>
	);
};
