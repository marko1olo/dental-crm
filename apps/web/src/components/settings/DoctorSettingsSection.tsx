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
	FileText,
	HardDrive,
	Layers,
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
		<div className="space-y-6" data-testid="doctor-settings-section">
			{/* Super-Header: Doctor Cockpit Banner */}
			<div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-transparent border border-teal-500/25 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
				<div className="flex items-center gap-3 min-w-0">
					<div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-md">
						<Stethoscope size={24} />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<h3 className="font-extrabold text-base sm:text-lg text-[var(--ink)]">
								Кабинет врача: персональные настройки
							</h3>
							<span
								className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30 whitespace-nowrap shrink-0 select-none leading-none"
								style={{ lineHeight: 1 }}
								title="Персональные клинические стандарты врача (не перетираются общеклиническими настройками)"
							>
								<ShieldCheck size={12} className="text-teal-600 dark:text-teal-400 shrink-0" />
								<span>Врачебная автономия</span>
							</span>
						</div>
						<p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-2 sm:truncate max-w-xl">
							Персональные клинические стандарты врача: шаблоны медицинской карты, пресеты анестезии и материалы
						</p>
					</div>
				</div>

				{/* Quick Clinical Specialty Presets */}
				<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0 self-stretch xl:self-auto">
					<span className="text-xs font-semibold text-[var(--muted)] whitespace-nowrap hidden lg:inline">
						Специализация:
					</span>
					<div className="dente-segmented-bar flex flex-wrap sm:flex-nowrap">
						{SPECIALTY_PRESET_BUTTONS.map((spec) => {
							const isSelected = currentSpecialty === spec.key;
							return (
								<button
									key={spec.key}
									type="button"
									onClick={() => {
										applySpecialtyPreset(spec.key);
										showToast(`Пресет «${spec.label}» активирован (настройки приёма обновлены)`, "success");
									}}
									className={`dente-segmented-item ${isSelected ? "active" : ""}`}
									data-active={isSelected}
									title={`Активировать пресет рабочего места для «${spec.label}»`}
									data-testid={`doctor-specialty-preset-banner-${spec.key}`}
								>
									{spec.label}
								</button>
							);
						})}
					</div>
				</div>
			</div>

			{/* Super-Settings: 1-Click Smart Clinical Toggles (Fully Persisted) */}
			<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
						<Wand2 size={14} className="text-teal-600" />
						Умные клинические ассистенты (включено по умолчанию):
					</span>
					<span className="text-[11px] text-[var(--muted)] hidden sm:inline">
						Сохраняется мгновенно без перезагрузки
					</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					<button
						type="button"
						onClick={() => handleToggleAssistant("autoMkb10", "МКБ-10 Автоподбор")}
						className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[56px] ${
							autoMkb10
								? "bg-teal-500/10 border-teal-500/40 text-[var(--ink)]"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] opacity-70"
						}`}
					>
						<div className="flex items-center justify-between">
							<span className="font-bold text-xs">МКБ-10 Автоподбор</span>
							<span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${autoMkb10 ? "bg-teal-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"}`}>
								{autoMkb10 ? "ВКЛ" : "ВЫКЛ"}
							</span>
						</div>
						<span className="text-[11px] text-[var(--muted)] mt-1">Автоподстановка диагноза</span>
					</button>

					<button
						type="button"
						onClick={() => handleToggleAssistant("somaticWarnings", "Соматические алерты")}
						className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[56px] ${
							somaticWarnings
								? "bg-emerald-500/10 border-emerald-500/40 text-[var(--ink)]"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] opacity-70"
						}`}
					>
						<div className="flex items-center justify-between">
							<span className="font-bold text-xs">Соматические алерты</span>
							<span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${somaticWarnings ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"}`}>
								{somaticWarnings ? "ВКЛ" : "ВЫКЛ"}
							</span>
						</div>
						<span className="text-[11px] text-[var(--muted)] mt-1">Аллергии и противопоказания</span>
					</button>

					<button
						type="button"
						onClick={() => handleToggleAssistant("instantPhotoProtocol", "Быстрый фотопротокол")}
						className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[56px] ${
							instantPhotoProtocol
								? "bg-cyan-500/10 border-cyan-500/40 text-[var(--ink)]"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] opacity-70"
						}`}
					>
						<div className="flex items-center justify-between">
							<span className="font-bold text-xs">Быстрый фотопротокол</span>
							<span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${instantPhotoProtocol ? "bg-cyan-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"}`}>
								{instantPhotoProtocol ? "ВКЛ" : "ВЫКЛ"}
							</span>
						</div>
						<span className="text-[11px] text-[var(--muted)] mt-1">Захват снимков с SD/SMB</span>
					</button>

					<button
						type="button"
						onClick={() => handleToggleAssistant("voiceDictationActive", "Голосовая диктовка")}
						className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[56px] ${
							voiceDictationActive
								? "bg-purple-500/10 border-purple-500/40 text-[var(--ink)]"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] opacity-70"
						}`}
					>
						<div className="flex items-center justify-between">
							<span className="font-bold text-xs">Голосовая диктовка</span>
							<span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${voiceDictationActive ? "bg-purple-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"}`}>
								{voiceDictationActive ? "ВКЛ" : "ВЫКЛ"}
							</span>
						</div>
						<span className="text-[11px] text-[var(--muted)] mt-1">Заполнение дневника голосом</span>
					</button>
				</div>
			</div>

			{/* Sub-Navigation Strip (Desktop 32px, Radius 8px) */}
			<div className="settings-subnav-strip" role="tablist" aria-label="Разделы настроек врача">
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
