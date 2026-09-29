/**
 * apps/web/src/components/settings/clinic/SettingsClinicLegalSection.tsx
 *
 * Clinic legal profile, requisition lookup (DaData), medical license,
 * contracts signatory, odontogram default mode, and waiting lounge art settings.
 *
 * Mandates 8b, 8c, 8d, 8e: <= 800 lines, vector Lucide icons, desktop density.
 */

import React from "react";
import type { OdontogramViewMode } from "@dental/shared";
import {
	ChevronDown,
	ExternalLink,
	FileText,
	Search,
	ShieldCheck,
} from "lucide-react";

type TextInputChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;
type SelectChangeEvent = React.ChangeEvent<HTMLSelectElement>;

const ART_PACK_LABELS: Record<string, string> = {
	nature: "Природа",
	"dental-epic": "Эпичная стоматология",
	abstract: "Абстракция",
	all: "Все коллекции (случайно)",
};

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

export interface SettingsClinicLegalSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: props bag
	clinicProfileDraft: Record<string, any>;
	updateClinicProfileDraft: (field: string, value: any) => void;
	saveClinicProfileFromDraft: () => Promise<void> | void;
	clinicProfileSaveState: string;
	lookupClinicPublicProfile: () => Promise<void> | void;
	isClinicPublicLookupLoading: boolean;
	clinicPublicLookup: any;
	applyClinicLookupSuggestion: (fields: any) => void;
	legalReadinessPercent: number;
	legalMissingFields: string[];
	humanizeMigrationText: (txt: string) => string;
	clinicLookupSuggestionFieldEntries: (fields: any) => [string, any][];
	clinicPublicLookupFieldLabels: Record<string, string>;
	clinicPublicLookupWarningText: (warning: string) => string;
	clinicLookupSuggestionApplySummary: (fields: any) => string;
	uiLanguage: string;
	setUiLanguage: (lang: string) => void;
	normalizeUiLanguageInput: (input: string) => string;
	typedUiLanguageOptions: Array<{ value: string; label: string; detail: string }>;
	selectedUiLanguageOption: { detail: string };
	odontogramViewMode: OdontogramViewMode;
	setOdontogramViewMode: (mode: OdontogramViewMode) => void;
	odontogramViewModeOptions: ReadonlyArray<{ value: OdontogramViewMode; label: string; detail: string }>;
	selectedOdontogramOption?: { detail: string };
	artSettings: { enabled: boolean; pack: "nature" | "dental-epic" | "abstract" | "all"; dynamicByTimeOfDay: boolean };
	updateArtSettings: (partial: Partial<{ enabled: boolean; pack: "nature" | "dental-epic" | "abstract" | "all"; dynamicByTimeOfDay: boolean }>) => void;
	saveUiPreferences: (prefs: any) => void;
	loadUiPreferences: () => any;
	showToast: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const SettingsClinicLegalSection: React.FC<SettingsClinicLegalSectionProps> = ({
	clinicProfileDraft,
	updateClinicProfileDraft,
	saveClinicProfileFromDraft,
	clinicProfileSaveState,
	lookupClinicPublicProfile,
	isClinicPublicLookupLoading,
	clinicPublicLookup,
	applyClinicLookupSuggestion,
	legalReadinessPercent,
	legalMissingFields,
	humanizeMigrationText,
	clinicLookupSuggestionFieldEntries,
	clinicPublicLookupFieldLabels,
	clinicPublicLookupWarningText,
	clinicLookupSuggestionApplySummary,
	uiLanguage,
	setUiLanguage,
	normalizeUiLanguageInput,
	typedUiLanguageOptions,
	selectedUiLanguageOption,
	odontogramViewMode,
	setOdontogramViewMode,
	odontogramViewModeOptions,
	selectedOdontogramOption,
	artSettings,
	updateArtSettings,
	saveUiPreferences,
	loadUiPreferences,
	showToast,
}) => {
	const typedSuggestions = clinicPublicLookup?.suggestions ?? [];
	const typedTargets = clinicPublicLookup?.publicLookupTargets ?? [];

	return (
		<section className="clinic-legal-form" aria-label="Юридический профиль клиники">
			<div className="clinic-legal-summary">
				<div>
					<p className="eyebrow">Юридический профиль</p>
					<h3>Реквизиты клиники для договоров и кассовых чеков</h3>
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

			{/* Essential Profile Fields */}
			<div className="clinic-profile-form-grid settings-essential-block">
				<label>
					Название клиники (для пациентов)
					<input
						value={clinicProfileDraft.clinicName || ""}
						onChange={(event: TextInputChangeEvent) =>
							updateClinicProfileDraft("clinicName", event.target.value)
						}
					/>
				</label>
				<label>
					Контактный телефон регистратуры
					<input
						value={clinicProfileDraft.phone || ""}
						onChange={(event: TextInputChangeEvent) =>
							updateClinicProfileDraft("phone", event.target.value)
						}
					/>
				</label>
				<label className="form-span-2">
					Фактический адрес клиники
					<input
						value={clinicProfileDraft.address || ""}
						onChange={(event: TextInputChangeEvent) =>
							updateClinicProfileDraft("address", event.target.value)
						}
					/>
				</label>
			</div>

			{/* Collapsible Details for Legal Contracts, Tax & Invoicing */}
			<details className="settings-advanced-block">
				<summary className="settings-advanced-toggle">
					<span className="settings-advanced-label">
						<FileText size={16} className="settings-advanced-icon inline mr-1 text-[var(--teal)]" />
						Для договоров, кассовых чеков и налоговых документов
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
							value={clinicProfileDraft.legalName || ""}
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
							value={clinicProfileDraft.inn || ""}
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
							value={clinicProfileDraft.kpp || ""}
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
							value={clinicProfileDraft.ogrn || ""}
							onChange={(event: InputChangeEvent) =>
								updateClinicProfileDraft(
									"ogrn",
									event.target.value.replace(/[^\d]/g, "").slice(0, 15),
								)
							}
						/>
					</label>

					<label>
						Email клиники
						<input
							value={clinicProfileDraft.email || ""}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft("email", event.target.value)
							}
						/>
					</label>

					<label>
						Сайт клиники
						<input
							value={clinicProfileDraft.website || ""}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft("website", event.target.value)
							}
						/>
					</label>

					<label>
						Номер медицинской лицензии
						<input
							value={clinicProfileDraft.medicalLicenseNumber || ""}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft(
									"medicalLicenseNumber",
									event.target.value,
								)
							}
						/>
					</label>

					<label>
						Дата выдачи лицензии
						<input
							value={clinicProfileDraft.medicalLicenseIssuedAt || ""}
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
							value={clinicProfileDraft.medicalLicenseIssuer || ""}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft(
									"medicalLicenseIssuer",
									event.target.value,
								)
							}
						/>
					</label>

					<label>
						Подписант (ФИО)
						<input
							value={clinicProfileDraft.signatoryName || ""}
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
							value={clinicProfileDraft.signatoryTitle || ""}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft("signatoryTitle", event.target.value)
							}
						/>
						<small className="field-note">
							Например: индивидуальный предприниматель или генеральный директор
						</small>
					</label>

					<label className="form-span-2">
						Банковские реквизиты (р/с, БИК, банк)
						<textarea
							value={clinicProfileDraft.bankDetails || ""}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft("bankDetails", event.target.value)
							}
						/>
						<small className="field-note">
							р/с, БИК, наименование банка, корр. счёт
						</small>
					</label>

					<label>
						Часовой пояс
						<input
							value={clinicProfileDraft.timezone || "Europe/Moscow"}
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
							{selectedUiLanguageOption?.detail || ""}
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
									`Режим зубной формулы изменён на «${odontogramViewModeOptions.find((o) => o.value === newMode)?.label || newMode}»`,
									"info",
								);
							}}
						>
							{odontogramViewModeOptions.map((option) => (
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

					{/* Logo & Stamp Branding Section */}
					<div className="form-span-2 pt-3 border-t border-[var(--border)] mt-1" data-testid="clinic-branding-section">
						<div className="font-semibold text-sm mb-1 text-[var(--ink)]">
							Фирменный стиль и атрибуты документов (Логотип и факсимиле)
						</div>
						<small className="field-note mb-3 block">
							Используются в медицинской карте, согласии на лечение, договорах, счетах и актах выполненных услуг
						</small>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<label>
								URL логотипа клиники
								<input
									type="text"
									placeholder="https://... или data:image/png;base64,..."
									value={clinicProfileDraft.logoUrl || ""}
									data-testid="input-clinic-logo-url"
									onChange={(event: TextInputChangeEvent) =>
										updateClinicProfileDraft("logoUrl", event.target.value)
									}
								/>
								<small className="field-note">
									Прямая ссылка на PNG/SVG или Data URL (рекомендуется до 400x120px)
								</small>
							</label>
							<label>
								URL факсимиле / печати клиники
								<input
									type="text"
									placeholder="https://... или data:image/png;base64,..."
									value={clinicProfileDraft.stampUrl || ""}
									data-testid="input-clinic-stamp-url"
									onChange={(event: TextInputChangeEvent) =>
										updateClinicProfileDraft("stampUrl", event.target.value)
									}
								/>
								<small className="field-note">
									Оттиск синей печати на прозрачном фоне для электронных актов
								</small>
							</label>
						</div>
						{clinicProfileDraft.logoUrl && (
							<div className="mt-2 flex items-center gap-3 p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
								<span className="text-xs text-[var(--muted)]">Превью логотипа:</span>
								<img
									src={clinicProfileDraft.logoUrl}
									alt="Логотип клиники"
									className="max-h-10 max-w-[160px] object-contain rounded"
									onError={(e) => {
										(e.target as HTMLElement).style.display = "none";
									}}
								/>
							</div>
						)}
					</div>

					{/* Background Wallpaper Art & Waiting Lounge Link */}
					<div className="form-span-2 pt-3 border-t border-[var(--border)] mt-1">
						<div className="font-semibold text-sm mb-1 text-[var(--ink)]">
							Фоновое арт-оформление экранов и табло ожидания
						</div>
						<small className="field-note mb-3 block">
							Атмосферные фотообои и иллюстрации на экране входа, в портале пациента и на ТВ-табло зоны ожидания
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

							<div className="form-span-2" style={{ marginTop: "4px" }}>
								<a
									href="/#lounge-display"
									target="_blank"
									rel="noreferrer"
									className="secondary-btn"
									style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
								>
									<ExternalLink size={14} aria-hidden="true" />
									<span>Открыть ТВ-табло зоны ожидания (/lounge-display)</span>
								</a>
							</div>
						</div>
					</div>

					<label className="checkbox-line form-span-2">
						<input
							checked={clinicProfileDraft.egiszEnabled || false}
							type="checkbox"
							className="toggle-switch"
							onChange={(event: InputChangeEvent) =>
								updateClinicProfileDraft("egiszEnabled", event.target.checked)
							}
						/>
						ЕГИСЗ-адаптер включен
						<small className="field-note">
							Нужен только при подключении к федеральной системе ЕГИСЗ (РЭМД)
						</small>
					</label>
				</div>
			</details>

			{/* Actions */}
			<div className="clinic-profile-actions">
				<button
					className="secondary-button"
					type="button"
					onClick={() => void lookupClinicPublicProfile()}
					disabled={isClinicPublicLookupLoading}
				>
					<Search aria-hidden="true" size={16} />{" "}
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
					<ShieldCheck aria-hidden="true" size={16} />{" "}
					{clinicProfileSaveState === "saving" ? "Сохраняю…" : "Сохранить профиль"}
				</button>
				<span className={`save-state save-state-${clinicProfileSaveState}`}>
					{clinicProfileSaveState === "saved"
						? "Сохранено"
						: clinicProfileSaveState === "error"
							? "Проверьте поля"
							: "Изменения не выдаются в документах до сохранения"}
				</span>
			</div>

			{/* DaData Public Lookup Results */}
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
					{(typedSuggestions ?? []).length ? (
						<div className="clinic-public-suggestions">
							{typedSuggestions
								.slice(0, 4)
								.map((suggestion: any, index: number) => ({
									suggestion,
									suggestionId: `${suggestion.source}-${suggestion.confidence}-${index}`,
								}))
								.map(({ suggestion, suggestionId }: any) => (
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
					{(typedTargets ?? []).length ? (
						<div className="clinic-public-targets">
							{typedTargets.map((target: any) => (
								<a
									className="secondary-button"
									href={target.url}
									key={`${target.kind}:${target.title}`}
									target="_blank"
									rel="noreferrer noopener"
									aria-label={`Открыть публичный источник реквизитов: ${target.title}`}
									title={`Открыть публичный источник реквизитов: ${target.title}`}
								>
									<ExternalLink size={14} aria-hidden="true" /> {target.title}
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
	);
};

export default SettingsClinicLegalSection;
