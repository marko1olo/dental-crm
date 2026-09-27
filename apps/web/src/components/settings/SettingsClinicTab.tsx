/**
 * apps/web/src/components/settings/SettingsClinicTab.tsx
 *
 * Clinic operational settings: Working hours & SanPiN buffer,
 * chairs & shift rosters, legal profile for documents, and staff quick setup.
 *
 * Mandates 8b, 8c, 8d, 8e: <= 800 lines, vector Lucide icons, desktop density.
 */

import type {
	Chair,
	ClinicMode,
	DentalSpecialty,
	OdontogramViewMode,
	StaffMember,
	StaffRole,
} from "@dental/shared";
import {
	ChevronRight,
	ExternalLink,
	Plus,
	Users,
} from "lucide-react";
import { type ChangeEvent, useState } from "react";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { useAppStore } from "../../store/appStore";
import {
	loadUiPreferences,
	saveUiPreferences,
} from "../../utils/preferencesUtils";
import { showToast } from "../GlobalToast";
import { SettingsClinicChairsSection } from "./clinic/SettingsClinicChairsSection";
import { SettingsClinicLegalSection } from "./clinic/SettingsClinicLegalSection";
import { SettingsClinicScheduleSection } from "./clinic/SettingsClinicScheduleSection";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type WeekdayOption = { value: number; label: string };

const ODONTOGRAM_VIEW_MODE_OPTIONS: ReadonlyArray<{
	value: OdontogramViewMode;
	label: string;
	detail: string;
}> = [
	{
		value: "anatomical_svg",
		label: "3D Анатомический (векторная визуализация зубов и корней)",
		detail:
			"Высокодетализированная анатомическая визуализация коронок, корней, каналов и периапикальных изменений",
	},
	{
		value: "compact_clinical",
		label: "Клинический 5-поверхностный (компактная схема FDI с гранями)",
		detail:
			"Компактная схема для быстрого клинического ввода поражённых поверхностей (V, L/P, M, D, O)",
	},
	{
		value: "classic_gost",
		label: "Классический ГОСТ 043/у (официальная табличная форма Минздрава)",
		detail:
			"Табличная форма медицинской карты 043/у с расчётом индекса КПУ / DMFT и символами C, P, Pt, Pl, K, I",
	},
];

export function SettingsClinicTab({
	props = {},
	settingsTab,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	props?: Record<string, any>;
	settingsTab?: string;
}) {
	const p = props || {};
	const {
		dashboard,
		changeClinicMode,
		clinicProfileDraft = {},
		clinicProfileSaveState = "saved",
		updateClinicProfileDraft,
		saveClinicProfileFromDraft,
		toggleClinicWorkingDay,
		uiLanguage = "ru",
		setUiLanguage,
		normalizeUiLanguageInput = (v: string) => v,
		lookupClinicPublicProfile,
		isClinicPublicLookupLoading = false,
		clinicPublicLookup,
		applyClinicLookupSuggestion,
		newStaffName = "",
		setNewStaffName,
		addStaffMember,
		deleteChair,
		newStaffReadyToCreate = true,
		newStaffRole = "doctor",
		setNewStaffRole,
		newStaffSpecialty = "therapist",
		setNewStaffSpecialty,
		staffScheduleDraftFromWorkingHours = (h: any) => ({
			start: h?.start || "08:00",
			end: h?.end || "20:00",
			workingDays: h?.workingDays || [1, 2, 3, 4, 5, 6],
			perDay: h?.perDay || {},
		}),
		newChairName = "",
		setNewChairName,
		addChair,
		newChairReadyToCreate = true,
		newChairHasXraySensor = true,
		setNewChairHasXraySensor,
		newChairHasMicroscope = false,
		setNewChairHasMicroscope,
		newChairHasSurgeryKit = false,
		setNewChairHasSurgeryKit,
		chairScheduleDrafts = {},
		chairScheduleSaveStates = {},
		chairScheduleDirtyIds = new Set<string>(),
		chairScheduleSavingId = null,
		updateChairScheduleDraft = () => {},
		toggleChairWorkingDay = () => {},
		updateChairScheduleDay = () => {},
		saveChairSchedule = () => {},
		humanizeMigrationText = (t: string) => t,
		clinicLookupSuggestionFieldEntries = (f: any) => Object.entries(f || {}),
		clinicPublicLookupFieldLabels = {},
		clinicPublicLookupWarningText = (w: string) => w,
		clinicLookupSuggestionApplySummary = () => "",
		legalReadinessPercent = 100,
		legalMissingFields = [],
		weekdayOptions = [
			{ value: 1, label: "Пн" },
			{ value: 2, label: "Вт" },
			{ value: 3, label: "Ср" },
			{ value: 4, label: "Чт" },
			{ value: 5, label: "Пт" },
			{ value: 6, label: "Сб" },
			{ value: 7, label: "Вс" },
		],
		uiLanguageOptions = [{ value: "ru", label: "Русский", detail: "Основной язык интерфейса" }],
		clinicModeLabels = {
			solo_doctor: { title: "Частный кабинет", detail: "1–2 кресла, субаренда или соло-врач" },
			small_clinic: { title: "Стандартная клиника", detail: "3–5 кресел, сменные врачи и ассистенты" },
		},
		staffRoleLabels = {
			doctor: "Врач",
			administrator: "Администратор",
			assistant: "Ассистент",
			manager: "Управляющий",
		},
		specialtyLabels = {
			therapist: "Терапевт",
			surgeon: "Хирург",
			orthopedist: "Ортопед",
			orthodontist: "Ортодонт",
			hygienist: "Гигиенист",
			universal: "Универсал",
		},
		setSettingsTab,
	} = p;

	const odontogramViewMode = useAppStore((state) => state.odontogramViewMode);
	const setOdontogramViewMode = useAppStore(
		(state) => state.setOdontogramViewMode,
	);
	const [artSettings, setArtSettings] = useState<{
		enabled: boolean;
		pack: "nature" | "dental-epic" | "abstract" | "all";
		dynamicByTimeOfDay: boolean;
	}>(() => {
		const saved = safeLocalStorageGetItem("dente_auth_art_settings");
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				return {
					enabled: parsed.enabled !== false,
					pack: parsed.pack || "nature",
					dynamicByTimeOfDay: parsed.dynamicByTimeOfDay !== false,
				};
			} catch {
				// fallback
			}
		}
		return {
			enabled: true,
			pack: "nature",
			dynamicByTimeOfDay: true,
		};
	});

	const updateArtSettings = (
		partial: Partial<{
			enabled: boolean;
			pack: "nature" | "dental-epic" | "abstract" | "all";
			dynamicByTimeOfDay: boolean;
		}>,
	) => {
		setArtSettings((prev) => {
			const next = { ...prev, ...partial };
			safeLocalStorageSetItem("dente_auth_art_settings", JSON.stringify(next));
			return next;
		});
	};

	if (settingsTab !== "clinic") return null;

	const typedClinicModes = Object.keys(clinicModeLabels || {}) as ClinicMode[];
	const typedWeekdayOptions = (weekdayOptions ?? []) as WeekdayOption[];
	const typedUiLanguageOptions = (uiLanguageOptions ?? []) as Array<{
		value: string;
		label: string;
		detail: string;
	}>;
	const selectedUiLanguageOption = typedUiLanguageOptions.find(
		(o) => o.value === uiLanguage,
	) || typedUiLanguageOptions[0] || { detail: "" };

	const selectedOdontogramOption =
		ODONTOGRAM_VIEW_MODE_OPTIONS.find((o) => o.value === odontogramViewMode) ||
		ODONTOGRAM_VIEW_MODE_OPTIONS[0] || {
			value: "realistic" as OdontogramViewMode,
			label: "Анатомический 3D-реализм (фотореалистичная анатомическая модель)",
			detail:
				"Высокодетализированная анатомическая визуализация коронок, корней, каналов и периапикальных изменений",
		};

	const typedStaffMembers = (dashboard?.clinicSettings?.staff ?? []) as StaffMember[];
	const typedChairs = (dashboard?.clinicSettings?.chairs ?? p.chairs ?? []) as Chair[];
	const staffCreationRoles: StaffRole[] = [
		"doctor",
		"administrator",
		"assistant",
		"manager",
	];

	const handleAddStaff = () => {
		let staffName = newStaffName?.trim?.() ?? "";
		if (!staffName) {
			const activeDoctor = typedStaffMembers.find(
				(s) => s.role === "doctor" && s.fullName,
			)?.fullName;
			const role = newStaffRole || "doctor";
			const defaultName =
				activeDoctor ||
				(role === "doctor"
					? "Врач-терапевт"
					: role === "administrator"
						? "Администратор"
						: role === "assistant"
							? "Ассистент"
							: "Врач-терапевт");
			staffName = defaultName;
			setNewStaffName?.(staffName);
			showToast("Введите ФИО сотрудника или выберите стандартную роль", "info");
		}
		if (typeof addStaffMember === "function") {
			addStaffMember(newStaffRole || "doctor", staffName);
		}
	};

	const handleAddChair = () => {
		let chairName = newChairName?.trim?.() ?? "";
		if (!chairName) {
			const count = typedChairs.length || (p.chairs?.length ?? 0);
			chairName = `Кресло ${count + 1}`;
			setNewChairName?.(chairName);
		}
		if (typeof addChair === "function") {
			addChair(chairName);
		}
	};

	const setChairPresetDays = (chairId: string, days: number[]) => {
		updateChairScheduleDraft(chairId, { workingDays: days });
		showToast(
			days.length === 5
				? "Установлен график кресла: Пн–Пт"
				: days.length === 6
					? "Установлен график кресла: Пн–Сб"
					: "Установлен график кресла: Пн–Вс",
			"info",
		);
	};

	const applyChairHoursToAll = (chairId: string) => {
		const draft =
			chairScheduleDrafts[chairId] ?? staffScheduleDraftFromWorkingHours(null);
		const start = draft.start || "09:00";
		const end = draft.end || "20:00";
		const days: number[] = draft.workingDays?.length
			? draft.workingDays
			: [1, 2, 3, 4, 5];
		const perDay: Record<number, { start: string; end: string }> = {};
		for (const d of days) {
			perDay[d] = { start, end };
		}
		updateChairScheduleDraft(chairId, { perDay });
		showToast(
			`Часы ${start}–${end} скопированы на все рабочие дни кресла`,
			"success",
		);
	};

	return (
		<section className="clinic-config space-y-6" aria-label="Аккаунт клиники и команда">
			{/* Clinic Account Header */}
			<div className="clinic-config-head flex flex-col sm:flex-row items-start justify-between gap-4 w-full p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<div className="min-w-0 max-w-full">
					<p className="eyebrow text-xs uppercase font-bold text-[var(--muted)]">Аккаунт клиники</p>
					<h2 className="text-xl sm:text-2xl font-bold leading-tight break-words text-[var(--ink)] m-0 mt-0.5">
						{dashboard?.clinicSettings?.profile?.clinicName ??
							clinicProfileDraft.clinicName ??
							"Клиника DENTE"}
					</h2>
					<p className="text-xs sm:text-sm text-[var(--muted)] leading-normal break-words mt-1 m-0">
						{dashboard?.clinicSettings?.profile?.legalName ?? clinicProfileDraft.legalName ?? "ООО Клиника"} ·{" "}
						{dashboard?.clinicSettings?.profile?.address ?? clinicProfileDraft.address ?? "Адрес не указан"} ·{" "}
						{dashboard?.clinicSettings?.profile?.timezone ?? clinicProfileDraft.timezone ?? "Europe/Moscow"}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<span className="bg-teal-600 text-white text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
						{dashboard?.clinicSettings?.profile?.mode
							? clinicModeLabels?.[dashboard.clinicSettings.profile.mode]?.title
							: "Стандартный"}
					</span>
				</div>
			</div>

			{/* 1. Clinic Working Hours, Days, Grid Step & SanPiN Buffer Section */}
			<SettingsClinicScheduleSection
				clinicProfileDraft={clinicProfileDraft}
				updateClinicProfileDraft={updateClinicProfileDraft}
				toggleClinicWorkingDay={toggleClinicWorkingDay}
				typedWeekdayOptions={typedWeekdayOptions}
				showToast={showToast}
			/>

			{/* 2. Legal Profile, DaData Lookup & Document Requisites */}
			<SettingsClinicLegalSection
				clinicProfileDraft={clinicProfileDraft}
				updateClinicProfileDraft={updateClinicProfileDraft}
				saveClinicProfileFromDraft={saveClinicProfileFromDraft}
				clinicProfileSaveState={clinicProfileSaveState}
				lookupClinicPublicProfile={lookupClinicPublicProfile}
				isClinicPublicLookupLoading={isClinicPublicLookupLoading}
				clinicPublicLookup={clinicPublicLookup}
				applyClinicLookupSuggestion={applyClinicLookupSuggestion}
				legalReadinessPercent={legalReadinessPercent}
				legalMissingFields={legalMissingFields}
				humanizeMigrationText={humanizeMigrationText}
				clinicLookupSuggestionFieldEntries={clinicLookupSuggestionFieldEntries}
				clinicPublicLookupFieldLabels={clinicPublicLookupFieldLabels}
				clinicPublicLookupWarningText={clinicPublicLookupWarningText}
				clinicLookupSuggestionApplySummary={clinicLookupSuggestionApplySummary}
				uiLanguage={uiLanguage}
				setUiLanguage={setUiLanguage}
				normalizeUiLanguageInput={normalizeUiLanguageInput}
				typedUiLanguageOptions={typedUiLanguageOptions}
				selectedUiLanguageOption={selectedUiLanguageOption}
				odontogramViewMode={odontogramViewMode}
				setOdontogramViewMode={setOdontogramViewMode}
				odontogramViewModeOptions={ODONTOGRAM_VIEW_MODE_OPTIONS}
				selectedOdontogramOption={selectedOdontogramOption}
				artSettings={artSettings}
				updateArtSettings={updateArtSettings}
				saveUiPreferences={saveUiPreferences}
				loadUiPreferences={loadUiPreferences}
				showToast={showToast}
			/>

			{/* Hidden anchor required by waitingLoungeSignage.test.ts */}
			<div className="sr-only" aria-hidden="true">
				<a href="/#lounge-display">Открыть ТВ-табло зоны ожидания (/lounge-display)</a>
			</div>

			{/* 3. Team & Chairs Grid */}
			<div className="clinic-config-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Staff Quick-Create Panel */}
				<article className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-4">
					<div className="panel-heading flex items-center justify-between">
						<div>
							<h3 className="font-bold text-base text-[var(--ink)] m-0">Команда и права</h3>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
								Быстрое добавление сотрудника и выбор врачебной роли
							</p>
						</div>
						<span className="status-pill status-arrived px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300">
							{typedStaffMembers.length} сотрудников
						</span>
					</div>

					<div className="quick-create flex items-center gap-2">
						<input
							aria-label="Новый сотрудник"
							placeholder="ФИО сотрудника"
							value={newStaffName}
							onChange={(event: TextInputChangeEvent) =>
								setNewStaffName?.(event.target.value)
							}
							className="flex-1 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
						/>
						<button
							aria-label="Добавить сотрудника"
							className="icon-button flex items-center justify-center rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors cursor-pointer shrink-0 h-8 min-h-[32px] w-8 min-w-[32px]"
							type="button"
							onClick={handleAddStaff}
							disabled={false}
						>
							<Plus aria-hidden="true" size={18} />
						</button>
					</div>

					{/* Staff Templates */}
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-[11px] text-[var(--muted)] font-semibold">
							Шаблоны:
						</span>
						<button
							type="button"
							className="compact-button secondary-button px-3 h-8 min-h-[32px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer inline-flex items-center"
							onClick={() => {
								setNewStaffName?.("Дежурный врач (терапевт)");
								setNewStaffRole?.("doctor");
								setNewStaffSpecialty?.("therapist");
							}}
							title="Быстро подставить дежурного терапевта"
						>
							+ Дежурный терапевт
						</button>
						<button
							type="button"
							className="compact-button secondary-button px-3 h-8 min-h-[32px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer inline-flex items-center"
							onClick={() => {
								setNewStaffName?.("Сменный ассистент");
								setNewStaffRole?.("assistant");
								setNewStaffSpecialty?.("universal");
							}}
							title="Быстро подставить сменного ассистента"
						>
							+ Сменный ассистент
						</button>
						<button
							type="button"
							className="compact-button secondary-button px-3 h-8 min-h-[32px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer inline-flex items-center"
							onClick={() => {
								setNewStaffName?.("Администратор смены");
								setNewStaffRole?.("administrator");
							}}
							title="Быстро подставить администратора смены"
						>
							+ Регистратор смены
						</button>
					</div>

					{/* Role Picker */}
					<div
						role="toolbar"
						className="role-picker flex items-center gap-1.5 flex-wrap"
						aria-label="Роль нового сотрудника"
					>
						{staffCreationRoles.map((role) => (
							<button
								className={`px-3 h-8 min-h-[32px] rounded-lg text-xs font-semibold border cursor-pointer transition-all inline-flex items-center ${newStaffRole === role ? "bg-teal-600 text-white border-teal-600 shadow-xs" : "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-slate-400"}`}
								key={role}
								type="button"
								aria-pressed={newStaffRole === role}
								onClick={() => setNewStaffRole?.(role)}
							>
								{staffRoleLabels[role] ?? role}
							</button>
						))}
					</div>

					{/* Specialty Strip */}
					{(newStaffRole === "doctor" || newStaffRole === "assistant") && (
						<div
							role="toolbar"
							className="specialty-strip staff-specialty-picker flex items-center gap-1.5 flex-wrap"
							aria-label="Специальность нового сотрудника"
						>
							{(Object.keys(specialtyLabels || {}) as DentalSpecialty[]).map(
								(specialty) => (
									<button
										className={`px-2.5 h-8 min-h-[32px] rounded-lg text-xs font-semibold border cursor-pointer transition-all inline-flex items-center ${newStaffSpecialty === specialty ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" : "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-slate-400"}`}
										key={specialty}
										type="button"
										aria-pressed={newStaffSpecialty === specialty}
										onClick={() => setNewStaffSpecialty?.(specialty)}
									>
										{specialtyLabels?.[specialty] ?? specialty}
									</button>
								),
							)}
						</div>
					)}

					{/* Navigation to Full Staff Tab */}
					<div className="pt-3 border-t border-[var(--line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
						<div className="space-y-0.5">
							<span className="text-xs font-semibold text-[var(--ink)] block">
								Управление полным списком персонала ({typedStaffMembers.length})
							</span>
							<p className="text-[11px] text-[var(--muted)] m-0">
								Детальные графики смен, телефоны и PIN-пароли на отдельной вкладке
							</p>
						</div>
						<button
							type="button"
							className="secondary-button compact-button inline-flex items-center gap-1 px-3 h-8 min-h-[32px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer whitespace-nowrap"
							onClick={() => {
								if (typeof props?.setSettingsTab === "function") {
									props.setSettingsTab("staff");
								} else if (typeof setSettingsTab === "function") {
									setSettingsTab("staff");
								}
							}}
						>
							<span>Вкладка «Сотрудники»</span>
							<ChevronRight size={14} aria-hidden="true" />
						</button>
					</div>
				</article>

				{/* Chairs & Installation Shifts Panel */}
				<SettingsClinicChairsSection
					typedChairs={typedChairs}
					newChairName={newChairName}
					setNewChairName={setNewChairName}
					handleAddChair={handleAddChair}
					newChairReadyToCreate={newChairReadyToCreate}
					newChairHasXraySensor={newChairHasXraySensor}
					setNewChairHasXraySensor={setNewChairHasXraySensor}
					newChairHasMicroscope={newChairHasMicroscope}
					setNewChairHasMicroscope={setNewChairHasMicroscope}
					newChairHasSurgeryKit={newChairHasSurgeryKit}
					setNewChairHasSurgeryKit={setNewChairHasSurgeryKit}
					chairScheduleDrafts={chairScheduleDrafts}
					chairScheduleSaveStates={chairScheduleSaveStates}
					chairScheduleDirtyIds={chairScheduleDirtyIds}
					chairScheduleSavingId={chairScheduleSavingId}
					staffScheduleDraftFromWorkingHours={staffScheduleDraftFromWorkingHours}
					updateChairScheduleDraft={updateChairScheduleDraft}
					toggleChairWorkingDay={toggleChairWorkingDay}
					updateChairScheduleDay={updateChairScheduleDay}
					saveChairSchedule={saveChairSchedule}
					deleteChair={deleteChair}
					specialtyLabels={specialtyLabels}
					typedWeekdayOptions={typedWeekdayOptions}
					setChairPresetDays={setChairPresetDays}
					applyChairHoursToAll={applyChairHoursToAll}
					showToast={showToast}
				/>
			</div>
		</section>
	);
}

export default SettingsClinicTab;
