import type {
	Chair,
	ClinicMode,
	DentalSpecialty,
	RoleQueue,
	StaffMember,
	StaffRole,
} from "@dental/shared";
import {
	CalendarDays,
	CheckCircle2,
	Copy,
	ExternalLink,
	KeyRound,
	Plus,
	RefreshCw,
	Search,
	ShieldCheck,
} from "lucide-react";
import type { ChangeEvent, KeyboardEvent } from "react";
import React, { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsStore } from "../../store/settingsStore";
import { showToast } from "../GlobalToast";
import { WorkspaceFeaturesSelector } from "../workspace/WorkspaceFeaturesSelector";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type InputChangeEvent = ChangeEvent<HTMLInputElement>;
type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;
type WeekdayOption = { value: number; label: string };


export function SettingsClinicTab({ settingsTab }: { settingsTab: string }) {
	const appLogicProps = useAppLogicContext();
	const settingsStoreProps = useSettingsStore();

	const newStaffReadyToCreate =
		(appLogicProps.newStaffName || "").trim().length > 0;
	const newChairReadyToCreate =
		(appLogicProps.newChairName || "").trim().length > 0;
	const adminSecretReady =
		(settingsStoreProps.telegramAdminSecretDraft || "").trim().length > 0;

	const mergedProps: Record<string, any> = {
		...appLogicProps,
		...settingsStoreProps,
		newStaffReadyToCreate,
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
		newStaffName,
		setNewStaffName,
		addStaffMember,
		newStaffRole,
		setNewStaffRole,
		newStaffSpecialty,
		setNewStaffSpecialty,
		staffScheduleDrafts,
		staffScheduleDraftFromWorkingHours,
		staffScheduleSaveStates,
		staffScheduleDirtyIds,
		staffScheduleSavingId,
		updateStaffScheduleDraft,
		toggleStaffWorkingDay,
		updateStaffScheduleDay,
		saveStaffSchedule,
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
	const typedStaffMembers = (dashboard.clinicSettings?.staff ??
		[]) as StaffMember[];
	const typedChairs = (dashboard.clinicSettings?.chairs ?? []) as Chair[];
	const staffCreationRoles: StaffRole[] = [
		"doctor",
		"administrator",
		"assistant",
		"manager",
	];

	return (
		<>
			<section className="clinic-config" aria-label="Аккаунт клиники и команда">
				<div className="clinic-config-head">
					<div>
						<p className="eyebrow">Аккаунт клиники</p>
						<h2>
							{dashboard.clinicSettings?.profile?.clinicName ?? "Не указано"}
						</h2>
						<p>
							{dashboard.clinicSettings?.profile?.legalName ?? "Не указано"} ·{" "}
							{dashboard.clinicSettings?.profile?.address ?? "Не указано"} ·{" "}
							{dashboard.clinicSettings?.profile?.timezone ?? "Europe/Moscow"}
						</p>
					</div>
					<div className="clinic-mode-status">
						<span>
							{
								clinicModeLabels[
									dashboard.clinicSettings?.profile?.mode ?? "family"
								]?.title
							}
						</span>
					</div>
				</div>

				<div className="mode-grid" aria-label="Режим продукта">
					{typedClinicModes.map((mode) => (
						<button
							className={`mode-card ${dashboard.clinicSettings?.profile?.mode === mode ? "active" : ""}`}
							key={mode}
							type="button"
							aria-pressed={dashboard.clinicSettings?.profile?.mode === mode}
							onClick={() => changeClinicMode(mode)}
						>
							<strong>{clinicModeLabels[mode]?.title ?? mode}</strong>
							<span>{clinicModeLabels[mode]?.detail ?? ""}</span>
						</button>
					))}
				</div>

				<div className="clinic-hints">
					{typedModeHints.map((hint) => (
						<span key={hint}>{hint}</span>
					))}
				</div>

				<div className="mode-readiness">
					<div>
						<p className="eyebrow">Готовность режима</p>
						<strong>
							{dashboard.shiftIntelligence?.modeFit?.fitScore ?? 0}%
						</strong>
						<span>
							{dashboard.shiftIntelligence?.modeFit?.lowFrictionNextStep ?? ""}
						</span>
					</div>
					<div>
						<p className="eyebrow">Открытые роли</p>
						{typedRoleQueues.map((queue) => (
							<span key={queue.role}>
								{staffRoleLabels[queue.role] ?? queue.role}: {queue.openItems}
							</span>
						))}
					</div>
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
								{legalMissingFields.length
									? `Не заполнено: ${legalMissingFields.join(", ")}`
									: "Минимум заполнен"}
							</span>
						</div>
					</div>

					{/* === ОСНОВНЫЕ ПОЛЯ — всегда видны === */}
					<div className="clinic-profile-form-grid settings-essential-block">
						<label>
							Название клиники
							<input
								value={clinicProfileDraft?.clinicName ?? ""}
								onChange={(event: TextInputChangeEvent) =>
									updateClinicProfileDraft("clinicName", event.target.value)
								}
							/>
						</label>
						<label>
							Телефон
							<input
								value={clinicProfileDraft?.phone ?? ""}
								onChange={(event: TextInputChangeEvent) =>
									updateClinicProfileDraft("phone", event.target.value)
								}
							/>
						</label>
						<label className="form-span-2">
							Адрес
							<input
								value={clinicProfileDraft?.address ?? ""}
								onChange={(event: TextInputChangeEvent) =>
									updateClinicProfileDraft("address", event.target.value)
								}
							/>
						</label>
						<div className="form-span-2">
							<span className="field-label settings-section-title">
								Режим работы клиники
							</span>
							<div className="settings-segmented-group">
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
										className={`settings-segmented-btn ${(clinicProfileDraft?.mode ?? "") === option.value ? "active" : ""}`}
										onClick={() =>
											updateClinicProfileDraft("mode", option.value)
										}
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
								value={clinicProfileDraft?.workdayStart ?? ""}
								onChange={(event: InputChangeEvent) =>
									updateClinicProfileDraft("workdayStart", event.target.value)
								}
							/>
						</label>
						<label>
							Конец смены
							<input
								type="time"
								value={clinicProfileDraft?.workdayEnd ?? ""}
								onChange={(event: InputChangeEvent) =>
									updateClinicProfileDraft("workdayEnd", event.target.value)
								}
							/>
						</label>
						<div
							className="weekday-toggle-row form-span-2"
							role="group"
							aria-label="Рабочие дни клиники"
						>
							<span>Рабочие дни</span>
							{typedWeekdayOptions.map((day: any) => (
								<button
									className={
										(clinicProfileDraft?.workingDays ?? []).includes(day.value)
											? "active"
											: ""
									}
									key={day.value}
									type="button"
									aria-pressed={(
										clinicProfileDraft?.workingDays ?? []
									).includes(day.value)}
									onClick={() => toggleClinicWorkingDay(day.value)}
								>
									{day.label}
								</button>
							))}
						</div>
					</div>

					{/* === ДЛЯ ДОКУМЕНТОВ — collapsible === */}
					<details className="settings-advanced-block">
						<summary className="settings-advanced-toggle">
							<span className="settings-advanced-label">
								<span className="settings-advanced-icon">📋</span>
								Для договоров и налоговых документов
							</span>
							<span className="settings-advanced-hint">
								ИНН, лицензия, банк, подписант
							</span>
							<span className="settings-advanced-chevron">▼</span>
						</summary>
						<div className="clinic-profile-form-grid settings-advanced-form">
							<label>
								Юридическое лицо
								<input
									value={clinicProfileDraft?.legalName ?? ""}
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
									value={clinicProfileDraft?.inn ?? ""}
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
									value={clinicProfileDraft?.kpp ?? ""}
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
									value={clinicProfileDraft?.ogrn ?? ""}
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
									value={clinicProfileDraft?.email ?? ""}
									onChange={(event: TextInputChangeEvent) =>
										updateClinicProfileDraft("email", event.target.value)
									}
								/>
							</label>
							<label>
								Сайт
								<input
									value={clinicProfileDraft?.website ?? ""}
									onChange={(event: TextInputChangeEvent) =>
										updateClinicProfileDraft("website", event.target.value)
									}
								/>
							</label>
							<label>
								Номер лицензии
								<input
									value={clinicProfileDraft?.medicalLicenseNumber ?? ""}
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
									value={clinicProfileDraft?.medicalLicenseIssuedAt ?? ""}
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
									value={clinicProfileDraft?.medicalLicenseIssuer ?? ""}
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
									value={clinicProfileDraft?.signatoryName ?? ""}
									onChange={(event: TextInputChangeEvent) =>
										updateClinicProfileDraft(
											"signatoryName",
											event.target.value,
										)
									}
								/>
								<small className="field-note">
									ФИО того, кто подписывает договоры
								</small>
							</label>
							<label>
								Должность подписанта
								<input
									value={clinicProfileDraft?.signatoryTitle ?? ""}
									onChange={(event: TextInputChangeEvent) =>
										updateClinicProfileDraft(
											"signatoryTitle",
											event.target.value,
										)
									}
								/>
								<small className="field-note">
									Например: индивидуальный предприниматель
								</small>
							</label>
							<label className="form-span-2">
								Банковские реквизиты
								<textarea
									value={clinicProfileDraft?.bankDetails ?? ""}
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
									value={clinicProfileDraft?.timezone ?? ""}
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
									{selectedUiLanguageOption?.detail ?? ""}
								</small>
							</label>
							<label>
								Минут на визит
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
							</label>
							<label>
								Буфер между записями, мин
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
							</label>
							<label className="checkbox-line form-span-2">
								<input
									checked={clinicProfileDraft?.egiszEnabled ?? false}
									type="checkbox"
									className="toggle-switch"
									onChange={(event: InputChangeEvent) =>
										updateClinicProfileDraft(
											"egiszEnabled",
											event.target.checked,
										)
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
						<div
							className="clinic-public-lookup-result"
							data-testid="clinic-public-lookup-result"
							aria-label="Публичный поиск реквизитов клиники"
						>
							<div className="dicom-discovery-head">
								<strong>
									Публичный поиск:{" "}
									{clinicPublicLookupProviderStatusLabels[
										clinicPublicLookup.providerStatus
									] ??
										humanizeMigrationText(
											clinicPublicLookup.providerStatus,
										)}{" "}
									· запрос {clinicPublicLookup.safeQuery || "не сформирован"}
								</strong>
								<span>
									{humanizeMigrationText(clinicPublicLookup.nextAction)}
								</span>
							</div>
							<small className="clinic-public-boundary">
								{clinicPublicLookupBoundaryText}
							</small>
							{clinicPublicLookup.suggestions.length ? (
								<div className="clinic-public-suggestions">
									{typedClinicPublicLookupSuggestions
										.slice(0, 4)
										.map((suggestion, index) => (
											<article key={`${suggestion.source}-${index}`}>
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
												{suggestion.warnings
													.slice(0, 2)
													.map((warning: string) => (
														<small key={warning}>
															{clinicPublicLookupWarningText(warning)}
														</small>
													))}
												<small className="clinic-public-apply-summary">
													{clinicLookupSuggestionApplySummary(
														suggestion.fields,
													)}
												</small>
												<button
													className="text-button"
													type="button"
													disabled={
														!clinicLookupSuggestionFieldEntries(
															suggestion.fields,
														).length
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
							{clinicPublicLookup.publicLookupTargets.length ? (
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
							{clinicPublicLookup.warnings
								.slice(0, 4)
								.map((warning: string) => (
									<small key={warning}>
										{clinicPublicLookupWarningText(warning)}
									</small>
								))}
						</div>
					) : null}
				</section>

				<div className="clinic-config-grid">
					<article>
						<div className="panel-heading">
							<h3>Команда и права</h3>
							<span className="status-pill status-arrived">
								{dashboard.clinicSettings.staff.length}
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
								onClick={() => addStaffMember(newStaffRole)}
								disabled={!newStaffReadyToCreate}
							>
								<Plus aria-hidden="true" />
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
						<div className="role-picker" aria-label="Роль нового сотрудника">
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
								className="specialty-strip staff-specialty-picker"
								aria-label="Специальность нового сотрудника"
							>
								{(Object.keys(specialtyLabels) as DentalSpecialty[]).map(
									(specialty) => (
										<button
											className={
												newStaffSpecialty === specialty ? "active" : ""
											}
											key={specialty}
											type="button"
											aria-pressed={newStaffSpecialty === specialty}
											onClick={() => setNewStaffSpecialty(specialty)}
										>
											{specialtyLabels[specialty]}
										</button>
									),
								)}
							</div>
						) : null}

						<div className="staff-list">
							{typedStaffMembers.map((member) => {
								const scheduleDraft =
									staffScheduleDrafts[member.id] ??
									staffScheduleDraftFromWorkingHours(
										member.workingHours ?? null,
									);
								const scheduleSaveState =
									staffScheduleSaveStates[member.id] ?? "saved";
								const scheduleDirty = staffScheduleDirtyIds.has(member.id);
								const scheduleSaving =
									staffScheduleSavingId === member.id ||
									scheduleSaveState === "saving";
								const scheduleSaveLabel = scheduleSaving
									? "Автосохранение"
									: scheduleSaveState === "error"
										? "Не сохранено"
										: scheduleDirty
											? "Ждет автосохранения"
											: "Сохранено";
								return (
									<div className="staff-row" key={member.id}>
										<span
											className="staff-color-indicator"
											style={{ background: member.color }}
										/>
										<div>
											<strong>{member.fullName}</strong>
											<p>
												{staffRoleLabels[member.role]} ·{" "}
												{member.specialties
													.map((item) => specialtyLabels[item])
													.join(", ")}
											</p>
										</div>
										<small>
											{member.canSignMedicalRecords
												? "ЭМК"
												: member.canManageImports
													? "Импорт"
													: "Доступ"}
										</small>
										<div className="staff-schedule-editor">
											<label>
												С
												<input
													type="time"
													value={scheduleDraft.start}
													onChange={(event: InputChangeEvent) =>
														updateStaffScheduleDraft(member.id, {
															start: event.target.value,
														})
													}
												/>
											</label>
											<label>
												До
												<input
													type="time"
													value={scheduleDraft.end}
													onChange={(event: InputChangeEvent) =>
														updateStaffScheduleDraft(member.id, {
															end: event.target.value,
														})
													}
												/>
											</label>
											<div
												className="weekday-toggle-row staff-weekday-row"
												role="group"
												aria-label={`Рабочие дни: ${member.fullName}`}
											>
												{typedWeekdayOptions.map((day: any) => (
													<button
														className={
															scheduleDraft.workingDays.includes(day.value)
																? "active"
																: ""
														}
														key={day.value}
														type="button"
														aria-pressed={scheduleDraft.workingDays.includes(
															day.value,
														)}
														onClick={() =>
															toggleStaffWorkingDay(member.id, day.value)
														}
													>
														{day.label}
													</button>
												))}
											</div>
											<details className="settings-advanced-block schedule-advanced-block">
												<summary className="settings-advanced-toggle">
													<span className="settings-advanced-label">
														Индивидуальные часы по дням
													</span>
													<span className="settings-advanced-chevron">▼</span>
												</summary>
												<div
													className="staff-day-hours"
													aria-label={`Часы по дням: ${member.fullName}`}
												>
													{typedWeekdayOptions
														.filter((day) =>
															scheduleDraft.workingDays.includes(day.value),
														)
														.map((day: any) => {
															const dayHours = scheduleDraft.perDay[day.value];
															return (
																<div key={`hours-${member.id}-${day.value}`}>
																	<span>{day.label}</span>
																	<input
																		aria-label={`${day.label}, начало`}
																		type="time"
																		value={
																			dayHours?.start ?? scheduleDraft.start
																		}
																		onChange={(event: InputChangeEvent) =>
																			updateStaffScheduleDay(
																				member.id,
																				day.value,
																				{ start: event.target.value },
																			)
																		}
																	/>
																	<input
																		aria-label={`${day.label}, конец`}
																		type="time"
																		value={dayHours?.end ?? scheduleDraft.end}
																		onChange={(event: InputChangeEvent) =>
																			updateStaffScheduleDay(
																				member.id,
																				day.value,
																				{ end: event.target.value },
																			)
																		}
																	/>
																</div>
															);
														})}
												</div>
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
													onClick={() => void saveStaffSchedule(member.id)}
													disabled={scheduleSaving}
												>
													{scheduleSaving ? "Сохраняю" : "Сохранить сейчас"}
												</button>
											</div>
										</div>

									</div>
								);
							})}
						</div>
					</article>

					<article>
						<div className="panel-heading">
							<h3>Кресла и кабинеты</h3>
							<span className="status-pill status-confirmed">
								{dashboard.clinicSettings.chairs.length}
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
								onClick={addChair}
								disabled={!newChairReadyToCreate}
							>
								<Plus aria-hidden="true" />
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
						<div className="staff-list">
							{typedChairs.map((chair) => {
								const scheduleDraft =
									chairScheduleDrafts[chair.id] ??
									staffScheduleDraftFromWorkingHours(
										chair.workingHours ?? null,
									);
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
									<div className="staff-row" key={chair.id}>
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
												/>
											</label>
											<div
												className="weekday-toggle-row staff-weekday-row"
												role="group"
												aria-label={`Рабочие дни кресла: ${chair.name}`}
											>
												{typedWeekdayOptions.map((day: any) => (
													<button
														className={
															scheduleDraft.workingDays.includes(day.value)
																? "active"
																: ""
														}
														key={day.value}
														type="button"
														aria-pressed={scheduleDraft.workingDays.includes(
															day.value,
														)}
														onClick={() =>
															toggleChairWorkingDay(chair.id, day.value)
														}
													>
														{day.label}
													</button>
												))}
											</div>
											<details className="settings-advanced-block schedule-advanced-block">
												<summary className="settings-advanced-toggle">
													<span className="settings-advanced-label">
														Индивидуальные часы по дням
													</span>
													<span className="settings-advanced-chevron">▼</span>
												</summary>
												<div
													className="staff-day-hours"
													aria-label={`Часы по дням кресла: ${chair.name}`}
												>
													{typedWeekdayOptions
														.filter((day) =>
															scheduleDraft.workingDays.includes(day.value),
														)
														.map((day: any) => {
															const dayHours = scheduleDraft.perDay[day.value];
															return (
																<div
																	key={`chair-hours-${chair.id}-${day.value}`}
																>
																	<span>{day.label}</span>
																	<input
																		aria-label={`${day.label}, начало кресла`}
																		type="time"
																		value={
																			dayHours?.start ?? scheduleDraft.start
																		}
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
												</div>
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
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</article>
				</div>
			</section>

			{/* Feature Toggles - Workspace Modules */}
			<section
				id="settings-workspace-features"
				className="settings-workspace-features-section"
			>
				<h3 className="settings-workspace-features-title">
					Модули и функции рабочего пространства
				</h3>
				<WorkspaceFeaturesSelector />
			</section>
		</>
	);
}
