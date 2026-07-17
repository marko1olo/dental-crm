import type {
	Chair,
	ClinicMode,
	RoleQueue,
	StaffMember,
	StaffRole,
} from "@dental/shared";
import {
	Building2,
	Calendar,
	CalendarDays,
	Clock,
	ExternalLink,
	Plus,
	Search,
	ShieldCheck,
	Store,
	Trash2,
} from "lucide-react";
import "./SettingsClinicTab.css";
import type { ChangeEvent } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsStore } from "../../store/settingsStore";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { WorkspaceFeaturesSelector } from "../workspace/WorkspaceFeaturesSelector";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type InputChangeEvent = ChangeEvent<HTMLInputElement>;
type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;
type WeekdayOption = { value: number; label: string };

export function SettingsClinicTab({ settingsTab }: { settingsTab: string }) {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const appLogicProps = Object.assign({}, appLogic, derivations) as any;
	const settingsStoreProps = useSettingsStore();

	const newChairReadyToCreate =
		(appLogicProps.newChairName || "").trim().length > 0;
	const adminSecretReady =
		(settingsStoreProps.telegramAdminSecretDraft || "").trim().length > 0;

	const mergedProps: Record<string, any> = {
		...appLogicProps,
		...settingsStoreProps,

		newChairReadyToCreate,
		adminSecretReady,
	};

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
		// newStaffName,
		// setNewStaffName,
		// addStaffMember,
		// newStaffRole,
		// setNewStaffRole,
		// newStaffSpecialty,
		// setNewStaffSpecialty,
		// staffScheduleDrafts,
		staffScheduleDraftFromWorkingHours,
		// staffScheduleSaveStates,
		// staffScheduleDirtyIds,
		// staffScheduleSavingId,
		// updateStaffScheduleDraft,
		// toggleStaffWorkingDay,
		// updateStaffScheduleDay,
		// saveStaffSchedule,
		newChairName,
		setNewChairName,
		addChair,
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
		clinicPublicLookupProviderStatusLabels,
		humanizeMigrationText,
		clinicPublicLookupBoundaryText,
		clinicPublicLookupSuggestionSourceLabels,
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
		deleteChair,
	} = mergedProps;

	if (settingsTab !== "clinic") return null;
	if (!dashboard) return null;

	const typedClinicModes = Object.keys(clinicModeLabels) as ClinicMode[];
	const typedModeHints = (dashboard.clinicSettings?.modeHints ??
		[]) as string[];
	const typedRoleQueues = (dashboard.shiftIntelligence?.roleQueues ??
		[]) as RoleQueue[];

	const typedWeekdayOptions = weekdayOptions as WeekdayOption[];
	const typedUiLanguageOptions = uiLanguageOptions as Array<{
		value: string;
		label: string;
		detail: string;
	}>;
	const selectedUiLanguageOption = typedUiLanguageOptions.find(
		(o) => o.value === uiLanguage,
	) ||
		typedUiLanguageOptions[0] || { detail: "" };

	const typedClinicPublicLookupSuggestions =
		clinicPublicLookup?.suggestions ?? [];
	const typedClinicPublicLookupTargets =
		clinicPublicLookup?.publicLookupTargets ?? [];
	const _typedStaffMembers = (dashboard.clinicSettings?.staff ??
		[]) as StaffMember[];
	const typedChairs = (dashboard.clinicSettings?.chairs ?? []) as Chair[];
	const _staffCreationRoles: StaffRole[] = [
		"doctor",
		"administrator",
		"assistant",
		"manager",
	];

	return (
		<div className="clinic-studio-container animate-fade-in">
			{/* Режим клиники */}
			<section className="clinic-section-card" aria-label="Режим продукта">
				<div className="clinic-section-header">
					<div className="clinic-section-icon">
						<Store size={24} />
					</div>
					<div className="clinic-section-title">
						<h3>Режим работы продукта</h3>
						<p>Настройте Dental CRM под специфику вашей клиники</p>
					</div>
					<div className="clinic-mode-status">
						<span className="status-pill status-confirmed">
							Готовность: {dashboard.shiftIntelligence?.modeFit?.fitScore ?? 0}%
						</span>
					</div>
				</div>

				<div className="clinic-mode-selector">
					{typedClinicModes.map((mode) => (
						<button
							className={`clinic-mode-card ${dashboard.clinicSettings?.profile?.mode === mode ? "active" : ""}`}
							key={mode}
							type="button"
							aria-pressed={dashboard.clinicSettings?.profile?.mode === mode}
							onClick={() => changeClinicMode(mode)}
						>
							<h4>{clinicModeLabels[mode]?.title ?? mode}</h4>
							<p>{clinicModeLabels[mode]?.detail ?? ""}</p>
						</button>
					))}
				</div>
			</section>

			{/* Профиль клиники */}
			<section
				className="clinic-section-card"
				aria-label="Юридический профиль клиники"
			>
				<div className="clinic-section-header">
					<div className="clinic-section-icon">
						<Building2 size={24} />
					</div>
					<div className="clinic-section-title">
						<h3>Профиль и реквизиты</h3>
						<p>Основные данные, контакты и информация для документов</p>
					</div>
					<div className="clinic-mode-status">
						<span
							className={`status-pill ${legalMissingFields.length === 0 ? "status-confirmed" : "status-cancelled"}`}
						>
							{legalMissingFields.length === 0
								? "100% Заполнено"
								: `Не заполнено: ${legalMissingFields.length}`}
						</span>
					</div>
				</div>

				<div className="clinic-form-grid">
					<div className="clinic-form-group">
						<label>Название клиники (для расписания)</label>
						<input
							value={clinicProfileDraft?.clinicName ?? ""}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft("clinicName", event.target.value)
							}
							placeholder="Стоматология Улыбка"
						/>
					</div>
					<div className="clinic-form-group">
						<label>Юридическое лицо (для договоров)</label>
						<input
							value={clinicProfileDraft?.legalName ?? ""}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft("legalName", event.target.value)
							}
							placeholder="ООО «Стоматология»"
						/>
					</div>
					<div className="clinic-form-group">
						<label>ИНН</label>
						<div style={{ display: "flex", gap: "8px" }}>
							<input
								inputMode="numeric"
								value={clinicProfileDraft?.inn ?? ""}
								onChange={(event: InputChangeEvent) =>
									updateClinicProfileDraft(
										"inn",
										event.target.value.replace(/[^\d]/g, "").slice(0, 12),
									)
								}
								placeholder="ИНН"
							/>
							<button
								className="secondary-button"
								type="button"
								style={{ padding: "0 12px" }}
								onClick={() => void lookupClinicPublicProfile()}
								disabled={
									isClinicPublicLookupLoading || !clinicProfileDraft?.inn
								}
								title="Заполнить реквизиты по ИНН"
							>
								{isClinicPublicLookupLoading ? "..." : <Search size={18} />}
							</button>
						</div>
					</div>
					<div className="clinic-form-group">
						<label>КПП</label>
						<input
							inputMode="numeric"
							value={clinicProfileDraft?.kpp ?? ""}
							onChange={(event: InputChangeEvent) =>
								updateClinicProfileDraft(
									"kpp",
									event.target.value.replace(/[^\d]/g, "").slice(0, 9),
								)
							}
							placeholder="Для ИП оставить пустым"
						/>
					</div>
					<div className="clinic-form-group">
						<label>ОГРН / ОГРНИП</label>
						<input
							inputMode="numeric"
							value={clinicProfileDraft?.ogrn ?? ""}
							onChange={(event: InputChangeEvent) =>
								updateClinicProfileDraft(
									"ogrn",
									event.target.value.replace(/[^\d]/g, "").slice(0, 15),
								)
							}
							placeholder="ОГРН"
						/>
					</div>
					<div className="clinic-form-group">
						<label>Юридический адрес</label>
						<input
							value={clinicProfileDraft?.address ?? ""}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft("address", event.target.value)
							}
							placeholder="г. Москва, ул. Примерная, д. 1"
						/>
					</div>
					<div className="clinic-form-group">
						<label>Телефон для пациентов</label>
						<input
							value={clinicProfileDraft?.phone ?? ""}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft("phone", event.target.value)
							}
							placeholder="+7 (999) 123-45-67"
						/>
					</div>
					<div className="clinic-form-group">
						<label>Email</label>
						<input
							value={clinicProfileDraft?.email ?? ""}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft("email", event.target.value)
							}
							placeholder="info@clinic.ru"
						/>
					</div>
					<div className="clinic-form-group">
						<label>Номер лицензии</label>
						<input
							value={clinicProfileDraft?.medicalLicenseNumber ?? ""}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft(
									"medicalLicenseNumber",
									event.target.value,
								)
							}
							placeholder="ЛО-12-34-567890"
						/>
					</div>
					<div className="clinic-form-group">
						<label>Дата лицензии</label>
						<input
							value={clinicProfileDraft?.medicalLicenseIssuedAt ?? ""}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft(
									"medicalLicenseIssuedAt",
									event.target.value,
								)
							}
							placeholder="01.01.2023"
						/>
					</div>
					<div className="clinic-form-group full-width">
						<label>Кем выдана лицензия</label>
						<input
							value={clinicProfileDraft?.medicalLicenseIssuer ?? ""}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft(
									"medicalLicenseIssuer",
									event.target.value,
								)
							}
							placeholder="Департамент здравоохранения г. Москвы"
						/>
					</div>
					<div className="clinic-form-group">
						<label>Подписант (ФИО)</label>
						<input
							value={clinicProfileDraft?.signatoryName ?? ""}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft("signatoryName", event.target.value)
							}
							placeholder="Иванов Иван Иванович"
						/>
					</div>
					<div className="clinic-form-group">
						<label>Должность подписанта (в род. падеже)</label>
						<input
							value={clinicProfileDraft?.signatoryTitle ?? ""}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft("signatoryTitle", event.target.value)
							}
							placeholder="генерального директора"
						/>
					</div>
					<div className="clinic-form-group full-width">
						<label>Банковские реквизиты</label>
						<textarea
							value={clinicProfileDraft?.bankDetails ?? ""}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft("bankDetails", event.target.value)
							}
							placeholder="р/с 40702810..., БИК 044525225, ПАО СБЕРБАНК"
						/>
					</div>

					<div className="clinic-form-group">
						<label>Часовой пояс</label>
						<input
							value={clinicProfileDraft?.timezone ?? ""}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft("timezone", event.target.value)
							}
							placeholder="Europe/Moscow"
						/>
					</div>
					<div className="clinic-form-group">
						<label>Язык интерфейса</label>
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
					</div>
				</div>

				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						borderTop: "1px solid var(--line)",
						paddingTop: "20px",
						marginTop: "12px",
					}}
				>
					<span className={`save-state save-state-${clinicProfileSaveState}`}>
						{clinicProfileSaveState === "saved"
							? "✓ Все изменения сохранены"
							: clinicProfileSaveState === "error"
								? "⚠ Проверьте правильность полей"
								: "✏️ Есть несохраненные изменения"}
					</span>
					<button
						className="primary-button"
						type="button"
						onClick={() => void saveClinicProfileFromDraft()}
						disabled={clinicProfileSaveState === "saving"}
					>
						<ShieldCheck size={16} style={{ marginRight: "8px" }} />
						{clinicProfileSaveState === "saving"
							? "Сохраняю…"
							: "Сохранить профиль клиники"}
					</button>
				</div>
			</section>

			{/* График работы */}
			<section className="clinic-section-card" aria-label="График работы">
				<div className="clinic-section-header">
					<div className="clinic-section-icon">
						<Clock size={24} />
					</div>
					<div className="clinic-section-title">
						<h3>График работы клиники</h3>
						<p>Настройки времени и параметров записи по умолчанию</p>
					</div>
				</div>

				<div className="clinic-form-grid">
					<div className="clinic-form-group">
						<label>Начало смены</label>
						<input
							type="time"
							value={clinicProfileDraft?.workdayStart ?? ""}
							onChange={(event: InputChangeEvent) =>
								updateClinicProfileDraft("workdayStart", event.target.value)
							}
						/>
					</div>
					<div className="clinic-form-group">
						<label>Конец смены</label>
						<input
							type="time"
							value={clinicProfileDraft?.workdayEnd ?? ""}
							onChange={(event: InputChangeEvent) =>
								updateClinicProfileDraft("workdayEnd", event.target.value)
							}
						/>
					</div>
					<div className="clinic-form-group">
						<label>Длительность визита по умолчанию (мин)</label>
						<input
							inputMode="numeric"
							value={clinicProfileDraft?.defaultVisitMinutes ?? ""}
							onChange={(event: InputChangeEvent) =>
								updateClinicProfileDraft(
									"defaultVisitMinutes",
									event.target.value.replace(/[^\d]/g, "").slice(0, 3),
								)
							}
						/>
					</div>
					<div className="clinic-form-group">
						<label>Буфер между записями (мин)</label>
						<input
							inputMode="numeric"
							value={clinicProfileDraft?.appointmentBufferMinutes ?? ""}
							onChange={(event: InputChangeEvent) =>
								updateClinicProfileDraft(
									"appointmentBufferMinutes",
									event.target.value.replace(/[^\d]/g, "").slice(0, 3),
								)
							}
						/>
					</div>
					<div className="clinic-form-group full-width">
						<label>Рабочие дни клиники</label>
						<div className="weekday-toggle-row">
							{typedWeekdayOptions.map((day: any) => {
								const isWorking = (
									clinicProfileDraft?.workingDays ?? []
								).includes(day.value);
								return (
									<button
										key={day.value}
										type="button"
										className={isWorking ? "active" : ""}
										aria-pressed={isWorking}
										onClick={() => toggleClinicWorkingDay(day.value)}
									>
										{day.label}
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</section>

			{/* Кресла и кабинеты */}
			<section className="clinic-section-card" aria-label="Кресла и кабинеты">
				<div className="clinic-section-header">
					<div className="clinic-section-icon">
						<Calendar size={24} />
					</div>
					<div className="clinic-section-title">
						<h3>Кресла и кабинеты</h3>
						<p>Добавьте кресла и укажите доступное в них оборудование</p>
					</div>
					<div className="clinic-mode-status">
						<span className="status-pill status-confirmed">
							Кресел: {dashboard.clinicSettings.chairs.length}
						</span>
					</div>
				</div>

				<div className="chair-quick-create">
					<div className="chair-quick-create-row">
						<input
							aria-label="Новое кресло"
							placeholder="Название (например: Кабинет 1)"
							value={newChairName}
							onChange={(event: TextInputChangeEvent) =>
								setNewChairName(event.target.value)
							}
						/>
						<button
							aria-label="Добавить кресло"
							className="primary-button"
							type="button"
							onClick={addChair}
							disabled={!newChairReadyToCreate}
						>
							<Plus size={18} style={{ marginRight: "6px" }} /> Добавить
						</button>
					</div>
					<div className="chair-equipment-picker">
						<span
							style={{
								fontSize: "13px",
								color: "var(--muted)",
								alignSelf: "center",
								marginRight: "8px",
							}}
						>
							Оборудование:
						</span>
						<button
							className={newChairHasXraySensor ? "active" : ""}
							type="button"
							onClick={() => setNewChairHasXraySensor((v: boolean) => !v)}
						>
							RVG (Визиограф)
						</button>
						<button
							className={newChairHasMicroscope ? "active" : ""}
							type="button"
							onClick={() => setNewChairHasMicroscope((v: boolean) => !v)}
						>
							Микроскоп
						</button>
						<button
							className={newChairHasSurgeryKit ? "active" : ""}
							type="button"
							onClick={() => setNewChairHasSurgeryKit((v: boolean) => !v)}
						>
							Хирургия
						</button>
					</div>
				</div>

				<div className="premium-chair-grid">
					{typedChairs.map((chair) => (
						<div className="premium-chair-card" key={chair.id}>
							<div className="premium-chair-header">
								<div className="premium-chair-title">
									<div className="premium-chair-icon">
										<CalendarDays size={20} />
									</div>
									<h4>{chair.name}</h4>
								</div>
								<button
									className="icon-button"
									style={{ color: "var(--danger-color)" }}
									onClick={() => deleteChair(chair.id)}
									title="Удалить кресло"
								>
									<Trash2 size={16} />
								</button>
							</div>

							<div className="premium-chair-badges">
								{chair.hasXraySensor && (
									<span className="status-pill status-neutral">
										☢️ Визиограф
									</span>
								)}
								{chair.hasMicroscope && (
									<span className="status-pill status-neutral">
										🔬 Микроскоп
									</span>
								)}
								{chair.hasSurgeryKit && (
									<span className="status-pill status-neutral">
										🔪 Хирургия
									</span>
								)}
								{!chair.hasXraySensor &&
									!chair.hasMicroscope &&
									!chair.hasSurgeryKit && (
										<span className="status-pill status-cancelled">
											Базовое
										</span>
									)}
							</div>
						</div>
					))}
				</div>
			</section>

			<section className="clinic-section-card" style={{ marginTop: "24px" }}>
				<div className="clinic-section-header">
					<div
						className="clinic-section-icon"
						style={{
							background: "rgba(168, 85, 247, 0.1)",
							color: "rgb(168, 85, 247)",
						}}
					>
						<Building2 size={24} />
					</div>
					<div className="clinic-section-title">
						<h3>Экран входа устройства</h3>
						<p>Настройка живого арт-фона для этого устройства</p>
					</div>
				</div>
				<div className="clinic-form-grid" style={{ gridTemplateColumns: "1fr" }}>
					<AuthArtSettingsBlock />
				</div>
			</section>
		</div>
	);
}

function AuthArtSettingsBlock() {
	const React = require("react");
	const [settings, setSettings] = React.useState(() => {
		try {
			const saved = localStorage.getItem("dente_auth_art_settings");
			if (saved) return JSON.parse(saved);
		} catch (e) {}
		return { enabled: true, pack: "nature", dynamicByTimeOfDay: true };
	});

	const saveSettings = (newSettings: any) => {
		setSettings(newSettings);
		localStorage.setItem("dente_auth_art_settings", JSON.stringify(newSettings));
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
			<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
				<label className="switch">
					<input
						type="checkbox"
						checked={settings.enabled}
						onChange={(e) => saveSettings({ ...settings, enabled: e.target.checked })}
					/>
					<span className="slider round"></span>
				</label>
				<label style={{ fontSize: "14px", fontWeight: 500 }}>Показывать арт-фон на экране входа</label>
			</div>
			<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
				<label className="switch">
					<input
						type="checkbox"
						checked={settings.dynamicByTimeOfDay}
						onChange={(e) => saveSettings({ ...settings, dynamicByTimeOfDay: e.target.checked })}
						disabled={!settings.enabled}
					/>
					<span className="slider round"></span>
				</label>
				<label style={{ fontSize: "14px", fontWeight: 500, opacity: settings.enabled ? 1 : 0.5 }}>Менять фон по времени суток</label>
			</div>
			<div className="clinic-form-group">
				<label style={{ opacity: settings.enabled ? 1 : 0.5 }}>Коллекция артов</label>
				<select
					value={settings.pack}
					onChange={(e) => saveSettings({ ...settings, pack: e.target.value })}
					disabled={!settings.enabled}
					style={{ maxWidth: "300px" }}
				>
					<option value="nature">Природа (Nature)</option>
					<option value="abstract">Абстракция (Abstract)</option>
					<option value="dental-epic">Эпичная стоматология (Dental Epic)</option>
					<option value="anime">Аниме (Опционально)</option>
				</select>
			</div>
		</div>
	);
}
