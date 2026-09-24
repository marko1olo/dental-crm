import type {
	Chair,
	ClinicMode,
	DentalSpecialty,
	OdontogramViewMode,
	StaffMember,
	StaffRole,
} from "@dental/shared";
import {
	CalendarDays,
	ChevronDown,
	ChevronRight,
	Clock,
	ExternalLink,
	FileText,
	Plus,
	Search,
	ShieldCheck,
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

const ART_PACK_LABELS: Record<string, string> = {
	nature: "Природа",
	"dental-epic": "Эпичная стоматология",
	abstract: "Абстракция",
	anime: "Аниме",
	all: "Все коллекции (случайно)",
};

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type InputChangeEvent = ChangeEvent<HTMLInputElement>;
type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;
type WeekdayOption = { value: number; label: string };

/*
 * Подписи публичного поиска реквизитов. Компонент читал их из пропсов, но их
 * там не было и быть не могло: они объявлены как константы модуля в соседних
 * файлах настроек (SettingsAuditTab, SettingsImportsTab), а не приходят из
 * логики. Значит на экране вместо подписи печатался бы ключ вида
 * `not_configured`, а граница текста о том, что можно отправлять наружу,
 * не показывалась бы вовсе. Держим их здесь, рядом с местом применения.
 *
 * Дублирование этих словарей по файлам настроек вынесено долгом. Канонический
 * экспорт уже есть — SettingsViewHelpers.tsx:49, — но эти три файла его не
 * импортируют, а держат свои копии; на сегодня копии совпадают знак в знак.
 * Четвёртая копия ушла вместе с LegacyMigrationStudio.tsx: там словарь лежал под
 * именем с подчёркиванием, то есть был объявлен и не использовался.
 */
const clinicPublicLookupBoundaryText =
	"Публичный поиск получает только реквизиты клиники: ИНН, ОГРН, КПП, название, адрес или лицензию. Пациентов, снимки, базы и локальные пути сюда не отправлять.";

const clinicPublicLookupProviderStatusLabels: Record<string, string> = {
	ready: "профиль найден",
	not_configured: "онлайн-поиск не настроен",
	error: "онлайн-поиск не ответил",
	skipped_no_safe_query: "нужны реквизиты",
};

const clinicPublicLookupSuggestionSourceLabels: Record<string, string> = {
	dadata: "Сервис реквизитов",
	manual_public_targets: "Из введенных реквизитов",
};

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
		clinicProfileDraft,
		clinicProfileSaveState,
		updateClinicProfileDraft,
		saveClinicProfileFromDraft,
		toggleClinicWorkingDay,
		uiLanguage,
		setUiLanguage,
		normalizeUiLanguageInput,
		lookupClinicPublicProfile,
		isClinicPublicLookupLoading,
		clinicPublicLookup,
		applyClinicLookupSuggestion,
		newStaffName,
		setNewStaffName,
		addStaffMember,
		deleteChair,
		newStaffReadyToCreate,
		newStaffRole,
		setNewStaffRole,
		newStaffSpecialty,
		setNewStaffSpecialty,
		staffScheduleDraftFromWorkingHours,
		newChairName,
		setNewChairName,
		addChair,
		newChairReadyToCreate,
		newChairHasXraySensor,
		setNewChairHasXraySensor,
		newChairHasMicroscope,
		setNewChairHasMicroscope,
		newChairHasSurgeryKit,
		setNewChairHasSurgeryKit,
		chairScheduleDrafts,
		chairScheduleSaveStates,
		chairScheduleDirtyIds,
		chairScheduleSavingId,
		updateChairScheduleDraft,
		toggleChairWorkingDay,
		updateChairScheduleDay,
		saveChairSchedule,
		humanizeMigrationText,
		clinicLookupSuggestionFieldEntries,
		clinicPublicLookupFieldLabels,
		clinicPublicLookupWarningText,
		clinicLookupSuggestionApplySummary,
		legalReadinessPercent,
		legalMissingFields,
		weekdayOptions,
		uiLanguageOptions,
		clinicModeLabels,
		staffRoleLabels,
		specialtyLabels,
		setSettingsTab,
	} = p;

	const odontogramViewMode = useAppStore((state) => state.odontogramViewMode);
	const setOdontogramViewMode = useAppStore(
		(state) => state.setOdontogramViewMode,
	);
	const [artSettings, setArtSettings] = useState<{
		enabled: boolean;
		pack: "nature" | "dental-epic" | "abstract" | "anime" | "all";
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
			pack: "nature" | "dental-epic" | "abstract" | "anime" | "all";
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
	const typedModeHints = (dashboard?.clinicSettings?.modeHints ??
		[]) as string[];

	const typedWeekdayOptions = (weekdayOptions ?? []) as WeekdayOption[];
	const typedUiLanguageOptions = (uiLanguageOptions ?? []) as Array<{
		value: string;
		label: string;
		detail: string;
	}>;
	const selectedUiLanguageOption = typedUiLanguageOptions.find(
		(o) => o.value === uiLanguage,
	) ||
		typedUiLanguageOptions[0] || { detail: "" };

	const selectedOdontogramOption =
		ODONTOGRAM_VIEW_MODE_OPTIONS.find((o) => o.value === odontogramViewMode) ||
		ODONTOGRAM_VIEW_MODE_OPTIONS[0];

	const typedClinicPublicLookupSuggestions =
		clinicPublicLookup?.suggestions ?? [];
	const typedClinicPublicLookupTargets =
		clinicPublicLookup?.publicLookupTargets ?? [];
	const typedStaffMembers = (dashboard?.clinicSettings?.staff ??
		[]) as StaffMember[];
	const typedChairs = (dashboard?.clinicSettings?.chairs ?? []) as Chair[];
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
		<section className="clinic-config" aria-label="Аккаунт клиники и команда">
			<div className="clinic-config-head flex flex-col sm:flex-row items-start justify-between gap-4 w-full">
				<div className="min-w-0 max-w-full">
					<p className="eyebrow">Аккаунт клиники</p>
					<h2 className="text-xl sm:text-2xl font-bold leading-tight break-words text-[var(--ink)]">
						{dashboard?.clinicSettings?.profile?.clinicName ??
							"Демо Клиника DENTE"}
					</h2>
					<p className="text-xs sm:text-sm text-[var(--muted)] leading-normal break-words mt-1">
						{dashboard?.clinicSettings?.profile?.legalName ??
							"ООО Демо Клиника"}{" "}
						· {dashboard?.clinicSettings?.profile?.address ?? ""} ·{" "}
						{dashboard?.clinicSettings?.profile?.timezone ?? "Europe/Moscow"}
					</p>
				</div>
				<div className="flex flex-col gap-2 items-start sm:items-end shrink-0">
					<span className="bg-teal-600 text-white text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
						{dashboard?.clinicSettings?.profile?.mode
							? clinicModeLabels?.[dashboard.clinicSettings.profile.mode]?.title
							: "Стандартный"}
					</span>
				</div>
			</div>

			<div
				role="toolbar"
				className="mode-grid grid grid-cols-2 lg:grid-cols-4 gap-3 w-full border-t border-[var(--line)] pt-4"
				aria-label="Режим продукта"
			>
				{typedClinicModes.map((mode) => (
					<button
						className={`mode-card ${dashboard?.clinicSettings?.profile?.mode === mode ? "active" : ""}`}
						key={mode}
						type="button"
						aria-pressed={dashboard?.clinicSettings?.profile?.mode === mode}
						onClick={() => changeClinicMode(mode)}
					>
						<strong>{clinicModeLabels?.[mode]?.title}</strong>
						<span className="text-xs text-[var(--muted)] leading-normal break-words">
							{clinicModeLabels?.[mode]?.detail}
						</span>
					</button>
				))}
			</div>

			<div className="clinic-hints flex flex-col sm:flex-row gap-3 w-full">
				{typedModeHints.map((hint) => (
					<div
						key={hint}
						className="flex-1 border-l-4 border-teal-500 bg-teal-50/30 dark:bg-teal-950/20 p-3 rounded-r-lg text-xs sm:text-sm text-[var(--ink)] dark:text-slate-200 leading-normal break-words"
					>
						{hint}
					</div>
				))}
			</div>

			<section
				className="clinic-legal-form"
				aria-label="Юридический профиль клиники"
			>
				<div className="clinic-legal-summary">
					<div>
						<p className="eyebrow">Настройки клиники</p>
						<h3>Основные данные и профиль для документов</h3>
					</div>
					<div className="legal-readiness-badge">
						<strong>{legalReadinessPercent}%</strong>
						<span>
							{(legalMissingFields || []).length
								? `Не заполнено: ${(legalMissingFields || []).join(", ")}`
								: "Минимум заполнен"}
						</span>
					</div>
				</div>

				{/* === ОСНОВНЫЕ ПОЛЯ — всегда видны === */}
				<div className="clinic-profile-form-grid settings-essential-block">
					<label>
						Название клиники
						<input
							value={clinicProfileDraft.clinicName}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft("clinicName", event.target.value)
							}
						/>
					</label>
					<label>
						Телефон
						<input
							value={clinicProfileDraft.phone}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft("phone", event.target.value)
							}
						/>
					</label>
					<label className="form-span-2">
						Адрес
						<input
							value={clinicProfileDraft.address}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft("address", event.target.value)
							}
						/>
					</label>
					<div className="form-span-2">
						<span
							className="field-label"
							style={{
								fontSize: "14px",
								fontWeight: 600,
								color: "var(--ink)",
								display: "block",
								marginBottom: "8px",
							}}
						>
							Режим работы клиники
						</span>
						<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
							{[
								{
									value: "solo_doctor",
									label: "Частный кабинет (без ассистента)",
								},
								{
									value: "small_clinic",
									label: "Стандартный (с ассистентами)",
								},
							].map((option) => (
								<button
									key={option.value}
									type="button"
									className={`quick-chip ${clinicProfileDraft.mode === option.value ? "active" : ""}`}
									onClick={() => updateClinicProfileDraft("mode", option.value)}
									style={{
										background:
											clinicProfileDraft.mode === option.value
												? "var(--brand-500)"
												: "var(--surface-100, var(--paper-soft))",
										color:
											clinicProfileDraft.mode === option.value
												? "var(--on-teal, #ffffff)"
												: "var(--ink)",
										padding: "8px 16px",
										borderRadius: "20px",
										border: "none",
										cursor: "pointer",
										fontSize: "14px",
										fontWeight: 500,
									}}
								>
									{option.label}
								</button>
							))}
						</div>
					</div>
					<label>
						Начало смены
						<input
							type="time"
							value={clinicProfileDraft.workdayStart}
							onChange={(event: InputChangeEvent) =>
								updateClinicProfileDraft("workdayStart", event.target.value)
							}
						/>
					</label>
					<label>
						Конец смены
						<input
							type="time"
							value={clinicProfileDraft.workdayEnd}
							onChange={(event: InputChangeEvent) =>
								updateClinicProfileDraft("workdayEnd", event.target.value)
							}
						/>
					</label>
					<fieldset
						className="weekday-toggle-row form-span-2"
						style={{ border: "none", padding: 0, margin: 0 }}
						aria-label="Рабочие дни клиники"
					>
						<span>Рабочие дни</span>
						{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
						{typedWeekdayOptions.map((day: any) => (
							<button
								className={
									(clinicProfileDraft?.workingDays ?? []).includes(day.value)
										? "active"
										: ""
								}
								key={day.value}
								type="button"
								aria-pressed={(clinicProfileDraft?.workingDays ?? []).includes(
									day.value,
								)}
								onClick={() => toggleClinicWorkingDay(day.value)}
							>
								{day.label}
							</button>
						))}
					</fieldset>
				</div>

				{/* === ДЛЯ ДОКУМЕНТОВ — collapsible === */}
				<details className="settings-advanced-block">
					<summary className="settings-advanced-toggle">
						<span className="settings-advanced-label">
							<FileText size={16} className="settings-advanced-icon inline mr-1 text-[var(--teal)]" />
							Для договоров и налоговых документов
						</span>
						<span className="settings-advanced-hint">
							ИНН, лицензия, банк, подписант
						</span>
						<ChevronDown size={14} className="settings-advanced-chevron shrink-0" />
					</summary>
					<div className="clinic-profile-form-grid settings-advanced-form">
						<label>
							Юридическое лицо
							<input
								value={clinicProfileDraft.legalName}
								onChange={(event: TextInputChangeEvent) =>
									updateClinicProfileDraft("legalName", event.target.value)
								}
							/>
							<small className="field-note">
								ИП Иванова М.С. или ООО «Клиника»
							</small>
						</label>
						<label>
							ИНН
							<input
								inputMode="numeric"
								value={clinicProfileDraft.inn}
								onChange={(event: InputChangeEvent) =>
									updateClinicProfileDraft(
										"inn",
										event.target.value.replace(/[^\d]/g, "").slice(0, 12),
									)
								}
							/>
						</label>
						<label>
							КПП
							<input
								inputMode="numeric"
								value={clinicProfileDraft.kpp}
								onChange={(event: InputChangeEvent) =>
									updateClinicProfileDraft(
										"kpp",
										event.target.value.replace(/[^\d]/g, "").slice(0, 9),
									)
								}
							/>
							<small className="field-note">
								Только для ООО / АО. ИП оставить пустым.
							</small>
						</label>
						<label>
							ОГРН / ОГРНИП
							<input
								inputMode="numeric"
								value={clinicProfileDraft.ogrn}
								onChange={(event: InputChangeEvent) =>
									updateClinicProfileDraft(
										"ogrn",
										event.target.value.replace(/[^\d]/g, "").slice(0, 15),
									)
								}
							/>
						</label>
						<label>
							Email
							<input
								value={clinicProfileDraft.email}
								onChange={(event: TextInputChangeEvent) =>
									updateClinicProfileDraft("email", event.target.value)
								}
							/>
						</label>
						<label>
							Сайт
							<input
								value={clinicProfileDraft.website}
								onChange={(event: TextInputChangeEvent) =>
									updateClinicProfileDraft("website", event.target.value)
								}
							/>
						</label>
						<label>
							Номер лицензии
							<input
								value={clinicProfileDraft.medicalLicenseNumber}
								onChange={(event: TextInputChangeEvent) =>
									updateClinicProfileDraft(
										"medicalLicenseNumber",
										event.target.value,
									)
								}
							/>
						</label>
						<label>
							Дата лицензии
							<input
								value={clinicProfileDraft.medicalLicenseIssuedAt}
								onChange={(event: TextInputChangeEvent) =>
									updateClinicProfileDraft(
										"medicalLicenseIssuedAt",
										event.target.value,
									)
								}
							/>
						</label>
						<label className="form-span-2">
							Кем выдана лицензия
							<input
								value={clinicProfileDraft.medicalLicenseIssuer}
								onChange={(event: TextInputChangeEvent) =>
									updateClinicProfileDraft(
										"medicalLicenseIssuer",
										event.target.value,
									)
								}
							/>
						</label>
						<label>
							Подписант
							<input
								value={clinicProfileDraft.signatoryName}
								onChange={(event: TextInputChangeEvent) =>
									updateClinicProfileDraft("signatoryName", event.target.value)
								}
							/>
							<small className="field-note">
								ФИО того, кто подписывает договоры
							</small>
						</label>
						<label>
							Должность подписанта
							<input
								value={clinicProfileDraft.signatoryTitle}
								onChange={(event: TextInputChangeEvent) =>
									updateClinicProfileDraft("signatoryTitle", event.target.value)
								}
							/>
							<small className="field-note">
								Например: индивидуальный предприниматель
							</small>
						</label>
						<label className="form-span-2">
							Банковские реквизиты
							<textarea
								value={clinicProfileDraft.bankDetails}
								onChange={(event: TextInputChangeEvent) =>
									updateClinicProfileDraft("bankDetails", event.target.value)
								}
							/>
							<small className="field-note">
								р/с, БИК, банк — всё в одной строке или через запятую
							</small>
						</label>
						<label>
							Часовой пояс
							<input
								value={clinicProfileDraft.timezone}
								onChange={(event: TextInputChangeEvent) =>
									updateClinicProfileDraft("timezone", event.target.value)
								}
							/>
							<small className="field-note">Например: Europe/Moscow</small>
						</label>
						<label>
							Язык интерфейса
							<select
								value={uiLanguage}
								onChange={(event: SelectChangeEvent) =>
									setUiLanguage(normalizeUiLanguageInput(event.target.value))
								}
							>
								{typedUiLanguageOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
							<small className="field-note">
								{selectedUiLanguageOption.detail}
							</small>
						</label>
						<label>
							Вид зубной формулы по умолчанию
							<select
								value={odontogramViewMode}
								onChange={(event: SelectChangeEvent) => {
									const newMode = event.target.value as OdontogramViewMode;
									setOdontogramViewMode(newMode);
									const current = loadUiPreferences();
									saveUiPreferences({
										...current,
										odontogramViewMode: newMode,
									});
									showToast(
										`Режим зубной формулы изменён на «${ODONTOGRAM_VIEW_MODE_OPTIONS.find((o) => o.value === newMode)?.label || newMode}»`,
										"info",
									);
								}}
							>
								{ODONTOGRAM_VIEW_MODE_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
							<small className="field-note">
								{selectedOdontogramOption?.detail ||
									"Режим отображения формулы по умолчанию"}
							</small>
						</label>
						<div className="form-span-2 pt-3 border-t border-[var(--border)] mt-1">
							<div className="font-semibold text-sm mb-1 text-[var(--ink)]">
								Фоновое арт-оформление экранов
							</div>
							<small className="field-note mb-3 block">
								Атмосферные фотообои и иллюстрации на экране входа, в портале пациента и на публичных экранах клиники
							</small>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<label className="checkbox-line">
									<input
										type="checkbox"
										className="toggle-switch"
										checked={artSettings.enabled}
										onChange={(event: InputChangeEvent) => {
											const val = event.target.checked;
											updateArtSettings({ enabled: val });
											showToast(
												val
													? "Фоновое арт-оформление экранов включено"
													: "Фоновое арт-оформление экранов отключено",
												"info",
											);
										}}
									/>
									{artSettings.enabled ? "Включено" : "Выключено"}
									<small className="field-note">
										Переключатель отображения фоновых художественных коллекций
									</small>
								</label>

								<label>
									Коллекция оформления
									<select
										value={artSettings.pack}
										disabled={!artSettings.enabled}
										onChange={(event: SelectChangeEvent) => {
											const newPack = event.target.value as
												| "nature"
												| "dental-epic"
												| "abstract"
												| "anime"
												| "all";
											updateArtSettings({ pack: newPack });
											showToast(
												`Выбрана коллекция «${ART_PACK_LABELS[newPack] || newPack}»`,
												"info",
											);
										}}
									>
										<option value="nature">Природа</option>
										<option value="dental-epic">Эпичная стоматология</option>
										<option value="abstract">Абстракция</option>
										<option value="anime">Аниме</option>
										<option value="all">Все коллекции (случайно)</option>
									</select>
									<small className="field-note">
										Тематический набор фоновых изображений
									</small>
								</label>

								<label className="checkbox-line form-span-2">
									<input
										type="checkbox"
										className="toggle-switch"
										disabled={!artSettings.enabled}
										checked={artSettings.dynamicByTimeOfDay}
										onChange={(event: InputChangeEvent) => {
											const val = event.target.checked;
											updateArtSettings({ dynamicByTimeOfDay: val });
											showToast(
												val
													? "Динамическая смена утро/день/вечер/ночь включена"
													: "Динамическая смена времени суток выключена",
												"info",
											);
										}}
									/>
									Динамическая смена утро/день/вечер/ночь
									<small className="field-note">
										Автоматический подбор фотообоев под текущее время суток
									</small>
								</label>
							</div>
						</div>
						<label>
							Минут на визит
							<input
								inputMode="numeric"
								value={clinicProfileDraft.defaultVisitMinutes}
								onChange={(event: InputChangeEvent) =>
									updateClinicProfileDraft(
										"defaultVisitMinutes",
										event.target.value.replace(/[^\d]/g, "").slice(0, 3),
									)
								}
							/>
						</label>
						<label>
							Буфер между записями, мин
							<input
								inputMode="numeric"
								value={clinicProfileDraft.appointmentBufferMinutes}
								onChange={(event: InputChangeEvent) =>
									updateClinicProfileDraft(
										"appointmentBufferMinutes",
										event.target.value.replace(/[^\d]/g, "").slice(0, 3),
									)
								}
							/>
						</label>
						<label className="checkbox-line form-span-2">
							<input
								checked={clinicProfileDraft.egiszEnabled}
								type="checkbox"
								className="toggle-switch"
								onChange={(event: InputChangeEvent) =>
									updateClinicProfileDraft("egiszEnabled", event.target.checked)
								}
							/>
							ЕГИСЗ-адаптер включен
							<small className="field-note">
								Нужен только при подключении к федеральной системе ЕГИСЗ
							</small>
						</label>
					</div>
				</details>

				<div className="clinic-profile-actions">
					<button
						className="secondary-button"
						type="button"
						onClick={() => void lookupClinicPublicProfile()}
						disabled={isClinicPublicLookupLoading}
					>
						<Search aria-hidden="true" />{" "}
						{isClinicPublicLookupLoading
							? "Ищу реквизиты…"
							: "Найти реквизиты по ИНН"}
					</button>
					<button
						className="primary-button"
						type="button"
						onClick={() => void saveClinicProfileFromDraft()}
						disabled={clinicProfileSaveState === "saving"}
					>
						<ShieldCheck aria-hidden="true" />{" "}
						{clinicProfileSaveState === "saving" ? "Сохраняю…" : "Сохранить"}
					</button>
					<span className={`save-state save-state-${clinicProfileSaveState}`}>
						{clinicProfileSaveState === "saved"
							? "Сохранено"
							: clinicProfileSaveState === "error"
								? "Проверьте поля"
								: "Изменения не выдаются в документах до сохранения"}
					</span>
				</div>

				{clinicPublicLookup ? (
					<section
						className="clinic-public-lookup-result"
						data-testid="clinic-public-lookup-result"
						aria-label="Публичный поиск реквизитов клиники"
					>
						<div className="dicom-discovery-head">
							<strong>
								Публичный поиск:{" "}
								{clinicPublicLookupProviderStatusLabels[
									clinicPublicLookup?.providerStatus ?? ""
								] ??
									humanizeMigrationText(
										clinicPublicLookup?.providerStatus ?? "",
									)}{" "}
								· запрос {clinicPublicLookup?.safeQuery || "не сформирован"}
							</strong>
							<span>
								{humanizeMigrationText(clinicPublicLookup?.nextAction ?? "")}
							</span>
						</div>
						<small className="clinic-public-boundary">
							{clinicPublicLookupBoundaryText}
						</small>
						{(typedClinicPublicLookupSuggestions ?? []).length ? (
							<div className="clinic-public-suggestions">
								{typedClinicPublicLookupSuggestions
									.slice(0, 4)
									.map((suggestion, index) => ({
										suggestion,
										suggestionId: `${suggestion.source}-${suggestion.confidence}-${index}`,
									}))
									.map(({ suggestion, suggestionId }) => (
										<article key={suggestionId}>
											<strong>
												{clinicPublicLookupSuggestionSourceLabels[
													suggestion.source
												] ?? humanizeMigrationText(suggestion.source)}{" "}
												· {Math.round(suggestion.confidence * 100)}%
											</strong>
											<p>
												{clinicLookupSuggestionFieldEntries(suggestion.fields)
													.map(
														([key, value]) =>
															`${clinicPublicLookupFieldLabels[key] ?? key}: ${String(value).trim()}`,
													)
													.join(" · ")}
											</p>
											{(suggestion.warnings || [])
												.slice(0, 2)
												.map((warning: string) => (
													<small key={warning}>
														{clinicPublicLookupWarningText(warning)}
													</small>
												))}
											<small className="clinic-public-apply-summary">
												{clinicLookupSuggestionApplySummary(suggestion.fields)}
											</small>
											<button
												className="text-button"
												type="button"
												disabled={
													!clinicLookupSuggestionFieldEntries(suggestion.fields)
														.length
												}
												onClick={() =>
													applyClinicLookupSuggestion(suggestion.fields)
												}
											>
												Подставить в профиль
											</button>
										</article>
									))}
							</div>
						) : null}
						{(typedClinicPublicLookupTargets ?? []).length ? (
							<div className="clinic-public-targets">
								{typedClinicPublicLookupTargets.map((target) => (
									<a
										className="secondary-button"
										href={target.url}
										key={`${target.kind}:${target.title}`}
										target="_blank"
										rel="noreferrer noopener"
										aria-label={`Открыть публичный источник реквизитов в новой вкладке: ${target.title}`}
										title={`Открыть публичный источник реквизитов в новой вкладке: ${target.title}`}
									>
										<ExternalLink aria-hidden="true" /> {target.title}
									</a>
								))}
							</div>
						) : null}
						{(clinicPublicLookup?.warnings ?? [])
							.slice(0, 4)
							.map((warning: string) => (
								<small key={warning}>
									{clinicPublicLookupWarningText(warning)}
								</small>
							))}
					</section>
				) : null}
			</section>

			<div className="clinic-config-grid">
				<article>
					<div className="panel-heading">
						<h3>Команда и права</h3>
						<span className="status-pill status-arrived">
							{typedStaffMembers.length}
						</span>
					</div>
					<div className="quick-create">
						<input
							aria-label="Новый сотрудник"
							placeholder="ФИО сотрудника"
							value={newStaffName}
							onChange={(event: TextInputChangeEvent) =>
								setNewStaffName(event.target.value)
							}
						/>
						<button
							aria-label="Добавить сотрудника"
							className="icon-button"
							type="button"
							onClick={handleAddStaff}
							disabled={false}
							style={{ minHeight: "44px", minWidth: "44px" }}
						>
							<Plus aria-hidden="true" />
						</button>
					</div>
					<div
						style={{
							display: "flex",
							gap: "6px",
							alignItems: "center",
							flexWrap: "wrap",
							margin: "6px 0 8px",
						}}
					>
						<span
							style={{
								fontSize: "11px",
								color: "var(--muted)",
								fontWeight: 600,
							}}
						>
							Шаблоны:
						</span>
						<button
							type="button"
							className="compact-button secondary-button"
							style={{ fontSize: "11px", padding: "2px 8px" }}
							onClick={() => {
								setNewStaffName("Дежурный врач (терапевт)");
								setNewStaffRole("doctor");
								setNewStaffSpecialty("therapist");
							}}
							title="Быстро подставить дежурного терапевта"
						>
							+ Дежурный терапевт
						</button>
						<button
							type="button"
							className="compact-button secondary-button"
							style={{ fontSize: "11px", padding: "2px 8px" }}
							onClick={() => {
								setNewStaffName("Сменный ассистент");
								setNewStaffRole("assistant");
								setNewStaffSpecialty("universal");
							}}
							title="Быстро подставить сменного ассистента"
						>
							+ Сменный ассистент
						</button>
						<button
							type="button"
							className="compact-button secondary-button"
							style={{ fontSize: "11px", padding: "2px 8px" }}
							onClick={() => {
								setNewStaffName("Администратор смены");
								setNewStaffRole("administrator");
							}}
							title="Быстро подставить администратора смены"
						>
							+ Регистратор смены
						</button>
					</div>
					{!newStaffReadyToCreate ? (
						<p
							className="quick-create-guidance"
							role="status"
							aria-live="polite"
						>
							Введите ФИО сотрудника, затем выберите роль.
						</p>
					) : null}
					<div
						role="toolbar"
						className="role-picker"
						aria-label="Роль нового сотрудника"
					>
						{staffCreationRoles.map((role) => (
							<button
								className={newStaffRole === role ? "active" : ""}
								key={role}
								type="button"
								aria-pressed={newStaffRole === role}
								onClick={() => setNewStaffRole(role)}
							>
								{staffRoleLabels[role]}
							</button>
						))}
					</div>
					{newStaffRole === "doctor" || newStaffRole === "assistant" ? (
						<div
							role="toolbar"
							className="specialty-strip staff-specialty-picker"
							aria-label="Специальность нового сотрудника"
						>
							{(Object.keys(specialtyLabels || {}) as DentalSpecialty[]).map(
								(specialty) => (
									<button
										className={newStaffSpecialty === specialty ? "active" : ""}
										key={specialty}
										type="button"
										aria-pressed={newStaffSpecialty === specialty}
										onClick={() => setNewStaffSpecialty(specialty)}
									>
										{specialtyLabels?.[specialty] ?? specialty}
									</button>
								),
							)}
						</div>
					) : null}

					<div className="mt-4 p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
						<div className="space-y-1">
							<div className="text-sm font-semibold text-[var(--ink)]">
								Персонал клиники ({typedStaffMembers.length})
							</div>
							<p className="text-xs text-[var(--muted)] m-0 leading-relaxed">
								Управление детальными графиками смен, паролями и карточками персонала вынесено в специализированную вкладку «Сотрудники».
							</p>
						</div>
						<button
							type="button"
							className="secondary-button compact-button inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
							style={{ minHeight: "44px" }}
							onClick={() => {
								if (typeof props?.setSettingsTab === "function") {
									props.setSettingsTab("staff");
								} else if (typeof setSettingsTab === "function") {
									setSettingsTab("staff");
								}
							}}
						>
							<span>Перейти в «Сотрудники»</span>
							<ChevronRight size={14} aria-hidden="true" />
						</button>
					</div>
				</article>

				<article>
					<div className="panel-heading">
						<h3>Кресла и кабинеты</h3>
						<span className="status-pill status-confirmed">
							{typedChairs.length}
						</span>
					</div>
					<div className="quick-create">
						<input
							aria-label="Новое кресло"
							placeholder="Кресло / кабинет"
							value={newChairName}
							onChange={(event: TextInputChangeEvent) =>
								setNewChairName(event.target.value)
							}
						/>
						<button
							aria-label="Добавить кресло или кабинет"
							className="icon-button"
							type="button"
							onClick={handleAddChair}
							disabled={false}
							style={{ minHeight: "44px", minWidth: "44px" }}
						>
							<Plus aria-hidden="true" />
						</button>
					</div>
					<div
						style={{
							display: "flex",
							gap: "6px",
							alignItems: "center",
							flexWrap: "wrap",
							margin: "6px 0 8px",
						}}
					>
						<span
							style={{
								fontSize: "11px",
								color: "var(--muted)",
								fontWeight: 600,
							}}
						>
							Шаблоны:
						</span>
						<button
							type="button"
							className="compact-button secondary-button"
							style={{ fontSize: "11px", padding: "2px 8px" }}
							onClick={() => {
								setNewChairName(`Кабинет №${typedChairs.length + 1} (Терапия)`);
								setNewChairHasXraySensor(true);
								setNewChairHasMicroscope(false);
								setNewChairHasSurgeryKit(false);
							}}
							title="Кабинет общей терапии с RVG визиографом"
						>
							+ Кабинет Терапии
						</button>
						<button
							type="button"
							className="compact-button secondary-button"
							style={{ fontSize: "11px", padding: "2px 8px" }}
							onClick={() => {
								setNewChairName(
									`Кабинет №${typedChairs.length + 1} (Хирургия/Имплантация)`,
								);
								setNewChairHasXraySensor(true);
								setNewChairHasMicroscope(true);
								setNewChairHasSurgeryKit(true);
							}}
							title="Хирургический кабинет с микроскопом и хирургическим набором"
						>
							+ Кабинет Хирургии
						</button>
						<button
							type="button"
							className="compact-button secondary-button"
							style={{ fontSize: "11px", padding: "2px 8px" }}
							onClick={() => {
								setNewChairName("Кабинет гигиены и профосмотра");
								setNewChairHasXraySensor(false);
								setNewChairHasMicroscope(false);
								setNewChairHasSurgeryKit(false);
							}}
							title="Кабинет гигиены"
						>
							+ Кабинет Гигиены
						</button>
					</div>
					{!newChairReadyToCreate ? (
						<p
							className="quick-create-guidance"
							role="status"
							aria-live="polite"
						>
							Введите понятное название кресла или кабинета.
						</p>
					) : null}
					<div
						role="toolbar"
						className="role-picker equipment-picker"
						aria-label="Оборудование кресла"
					>
						<button
							className={newChairHasXraySensor ? "active" : ""}
							type="button"
							aria-pressed={newChairHasXraySensor}
							onClick={() =>
								setNewChairHasXraySensor((value: boolean) => !value)
							}
						>
							RVG
						</button>
						<button
							className={newChairHasMicroscope ? "active" : ""}
							type="button"
							aria-pressed={newChairHasMicroscope}
							onClick={() =>
								setNewChairHasMicroscope((value: boolean) => !value)
							}
						>
							Микроскоп
						</button>
						<button
							className={newChairHasSurgeryKit ? "active" : ""}
							type="button"
							aria-pressed={newChairHasSurgeryKit}
							onClick={() =>
								setNewChairHasSurgeryKit((value: boolean) => !value)
							}
						>
							Хирургия
						</button>
					</div>
					<div className="staff-list divide-y divide-slate-100 dark:divide-slate-800">
						{typedChairs.map((chair) => {
							const scheduleDraft =
								chairScheduleDrafts[chair.id] ??
								staffScheduleDraftFromWorkingHours(chair.workingHours ?? null);
							const scheduleSaveState =
								chairScheduleSaveStates[chair.id] ?? "saved";
							const scheduleDirty = chairScheduleDirtyIds.has(chair.id);
							const scheduleSaving =
								chairScheduleSavingId === chair.id ||
								scheduleSaveState === "saving";
							const scheduleSaveLabel = scheduleSaving
								? "Автосохранение"
								: scheduleSaveState === "error"
									? "Не сохранено"
									: scheduleDirty
										? "Ждет автосохранения"
										: "Сохранено";
							return (
								<div
									className="staff-row !border-0 !bg-transparent !shadow-none py-3"
									key={chair.id}
								>
									<CalendarDays aria-hidden="true" />
									<div>
										<strong>{chair.name}</strong>
										<p>
											{chair.room ?? "кабинет не указан"} ·{" "}
											{chair.specialization
												? specialtyLabels[chair.specialization]
												: "универсально"}
										</p>
									</div>
									<small>
										{chair.hasXraySensor
											? "RVG"
											: chair.hasMicroscope
												? "Микроскоп"
												: chair.hasSurgeryKit
													? "Хирургия"
													: "База"}
									</small>
									<div className="staff-schedule-editor">
										<label>
											С
											<input
												type="time"
												value={scheduleDraft.start}
												onChange={(event: InputChangeEvent) =>
													updateChairScheduleDraft(chair.id, {
														start: event.target.value,
													})
												}
												className="focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all"
											/>
										</label>
										<label>
											До
											<input
												type="time"
												value={scheduleDraft.end}
												onChange={(event: InputChangeEvent) =>
													updateChairScheduleDraft(chair.id, {
														end: event.target.value,
													})
												}
												className="focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all"
											/>
										</label>
										<div
											style={{
												display: "flex",
												gap: "6px",
												alignItems: "center",
												flexWrap: "wrap",
												margin: "4px 0",
											}}
										>
											<span
												style={{
													fontSize: "11px",
													color: "var(--muted)",
													fontWeight: 600,
												}}
											>
												График:
											</span>
											<button
												type="button"
												className="compact-button secondary-button"
												style={{ fontSize: "11px", padding: "2px 8px" }}
												onClick={() =>
													setChairPresetDays(chair.id, [1, 2, 3, 4, 5])
												}
												title="Установить стандартный график кресла: Пн–Пт"
											>
												Пн–Пт
											</button>
											<button
												type="button"
												className="compact-button secondary-button"
												style={{ fontSize: "11px", padding: "2px 8px" }}
												onClick={() =>
													setChairPresetDays(chair.id, [1, 2, 3, 4, 5, 6])
												}
												title="Установить график кресла: Пн–Сб"
											>
												Пн–Сб
											</button>
											<button
												type="button"
												className="compact-button secondary-button"
												style={{ fontSize: "11px", padding: "2px 8px" }}
												onClick={() =>
													setChairPresetDays(chair.id, [1, 2, 3, 4, 5, 6, 7])
												}
												title="Установить график кресла: Все 7 дней"
											>
												Все дни
											</button>
											<button
												type="button"
												className="compact-button secondary-button"
												style={{
													fontSize: "11px",
													padding: "4px 10px",
													minHeight: "44px",
													display: "inline-flex",
													alignItems: "center",
													color: "var(--teal)",
													fontWeight: 600,
												}}
												onClick={() => applyChairHoursToAll(chair.id)}
												title="Скопировать часы кресла ко всем выбранным дням"
											>
												<Clock size={14} className="inline mr-1" />
												Часы ко всем дням
											</button>
										</div>
										<fieldset
											className="weekday-toggle-row staff-weekday-row"
											style={{ border: "none", padding: 0, margin: 0 }}
											aria-label={`Рабочие дни кресла: ${chair.name}`}
										>
											{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
											{typedWeekdayOptions.map((day: any) => (
												<button
													className={`focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all hover:scale-[1.05] ${(scheduleDraft.workingDays ?? []).includes(day.value) ? "active" : ""}`}
													key={day.value}
													type="button"
													aria-pressed={(
														scheduleDraft.workingDays ?? []
													).includes(day.value)}
													onClick={() =>
														toggleChairWorkingDay(chair.id, day.value)
													}
												>
													{day.label}
												</button>
											))}
										</fieldset>
										<details className="settings-advanced-block schedule-advanced-block">
											<summary className="settings-advanced-toggle">
												<span className="settings-advanced-label">
													Индивидуальные часы по дням
												</span>
												<ChevronDown size={14} className="settings-advanced-chevron shrink-0" />
											</summary>
											<section
												className="staff-day-hours"
												aria-label={`Часы по дням кресла: ${chair.name}`}
											>
												{typedWeekdayOptions
													.filter((day) =>
														(scheduleDraft.workingDays ?? []).includes(
															day.value,
														),
													)
													// biome-ignore lint/suspicious/noExplicitAny: automated suppression
													.map((day: any) => {
														const dayHours = scheduleDraft?.perDay?.[day.value];
														return (
															<div key={`chair-hours-${chair.id}-${day.value}`}>
																<span>{day.label}</span>
																<input
																	aria-label={`${day.label}, начало кресла`}
																	type="time"
																	value={dayHours?.start ?? scheduleDraft.start}
																	onChange={(event: InputChangeEvent) =>
																		updateChairScheduleDay(
																			chair.id,
																			day.value,
																			{ start: event.target.value },
																		)
																	}
																/>
																<input
																	aria-label={`${day.label}, конец кресла`}
																	type="time"
																	value={dayHours?.end ?? scheduleDraft.end}
																	onChange={(event: InputChangeEvent) =>
																		updateChairScheduleDay(
																			chair.id,
																			day.value,
																			{ end: event.target.value },
																		)
																	}
																/>
															</div>
														);
													})}
											</section>
										</details>
										<div className="staff-schedule-actions">
											<span
												className={`save-state save-state-${scheduleSaveState}`}
											>
												{scheduleSaveLabel}
											</span>
											<button
												className="secondary-button compact-button"
												type="button"
												onClick={() => void saveChairSchedule(chair.id)}
												disabled={scheduleSaving}
											>
												{scheduleSaving ? "Сохраняю" : "Сохранить сейчас"}
											</button>
											{/*
                              До этой правки кресло нельзя было отключить ни из одного места веб-приложения:
                              deleteChair существовал в useAppLogic и не имел ни одного вызова, а дубликата,
                              в отличие от createStaffMember и updateStaffMember, никто не написал. Маршрут на
                              сервере при этом рабочий.

                              Написано «Отключить», а не «Удалить», и это не выбор формулировки. Маршрут DELETE
                              /api/settings/chairs/:chairId делает мягкую деактивацию: deactivateChairInDb
                              выполняет UPDATE chairs SET is_active = false, строка остаётся, и это сделано
                              намеренно — на chairs.id ссылаются приёмы через appointments.chair_id. Сервер
                              отвечает 200 с телом обновлённого кресла, а не 204, поэтому интерфейс, который
                              решит «строка исчезла», будет неправ. Проверки на занятые приёмы у маршрута нет и
                              не требуется: ничего не удаляется, внешние ключи остаются целыми.

                              ИСПРАВЛЕНО: первая версия этого предупреждения утверждала, что кресло «исчезнет
                              из расписания вместе с записанными приёмами». Это неправда, и текст был не просто
                              неточным, а вредным — он побуждал бы отменять и перезаписывать день приёмов, чтобы
                              избежать ущерба, которого не бывает. Проверено по коду: ScheduleView.tsx:798-800
                              фильтрует кресла по chair.active для РЯДА ЧИПОВ ФИЛЬТРА (quick-chip,
                              setScheduleChairFilterId), а не для колонок — сетки по креслам в приложении нет
                              вообще, chairId встречается в ScheduleView дважды. Приёмы рендерятся из
                              sortedAppointments, который фильтрует по выбранному чипу и активность кресла не
                              проверяет. Более того, useAppLogic сбрасывает scheduleChairFilterId, когда кресло
                              покидает активный набор, так что застрять в пустом фильтре тоже нельзя.

                              Настоящее последствие узкое и оно в тексте ниже: кресло пропадает из ВЫБОРЩИКОВ —
                              NewAppointmentForm.tsx:529 и AppointmentCard.tsx:307 оба строят список из
                              chairs.filter(chair => chair.active). Значит новые приёмы на него записать нельзя,
                              а у уже записанного приёма выборщик не покажет его текущее кресло среди вариантов.
                              Сам приём и его chairId остаются целы и видны в расписании.
                            */}
											<button
												className="secondary-button compact-button"
												type="button"
												onClick={() => {
													void deleteChair(chair.id);
												}}
											>
												Отключить
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</article>
			</div>
		</section>
	);
}
