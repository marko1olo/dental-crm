/**
 * apps/web/src/components/settings/clinic/SettingsClinicLegalSection.tsx
 *
 * Facade container for Clinic legal profile, DaData lookup,
 * requisites, medical license, and EGISZ bindings.
 *
 * Decomposed into legalModules/ per Mandates 8b, 8e: <= 250 lines ceiling.
 */

import React from "react";
import { ChevronDown, ExternalLink, Search, ShieldCheck, X } from "lucide-react";
import { ClinicLicenseCard } from "./legalModules/ClinicLicenseCard";
import { ClinicRequisitesCard } from "./legalModules/ClinicRequisitesCard";
import { ClinicEgiszBindingCard } from "./legalModules/ClinicEgiszBindingCard";
import type { SettingsClinicLegalSectionProps } from "./legalModules/clinicLegalTypes";

export { type SettingsClinicLegalSectionProps } from "./legalModules/clinicLegalTypes";

export const SettingsClinicLegalSection: React.FC<SettingsClinicLegalSectionProps> = ({
	clinicProfileDraft, updateClinicProfileDraft, saveClinicProfileFromDraft,
	clinicProfileSaveState, lookupClinicPublicProfile, isClinicPublicLookupLoading,
	clinicPublicLookup, applyClinicLookupSuggestion, legalReadinessPercent,
	legalMissingFields, humanizeMigrationText, clinicLookupSuggestionFieldEntries,
	clinicPublicLookupFieldLabels,
}) => {
	const typedSuggestions = clinicPublicLookup?.suggestions ?? [];

	return (
		<section className="clinic-legal-form space-y-4" aria-label="Юридический профиль клиники">
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

			{/* Поиск реквизитов через DaData / ЕГРЮЛ */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
				<div className="dente-search-wrap flex-1">
					<Search className="dente-search-icon" size={14} aria-hidden="true" />
					<input
						type="search"
						value={clinicProfileDraft.inn || ""}
						onChange={(e) =>
							updateClinicProfileDraft("inn", e.target.value.replace(/[^\d]/g, "").slice(0, 12))
						}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								void lookupClinicPublicProfile();
							}
						}}
						placeholder="Быстрый поиск реквизитов по ИНН клиники (10 или 12 цифр)..."
						className="dente-search-input"
						data-testid="input-quick-search-inn"
					/>
					{clinicProfileDraft.inn && (
						<button
							type="button"
							onClick={() => updateClinicProfileDraft("inn", "")}
							className="dente-search-clear"
							aria-label="Очистить ИНН"
						>
							<X size={13} />
						</button>
					)}
				</div>
				<div className="dente-segmented-bar shrink-0">
					<button
						className="dente-segmented-item active"
						type="button"
						onClick={() => void lookupClinicPublicProfile()}
						disabled={isClinicPublicLookupLoading || !clinicProfileDraft.inn}
						data-testid="btn-lookup-clinic-profile"
					>
						<Search aria-hidden="true" size={14} />
						<span>{isClinicPublicLookupLoading ? "Ищу в ЕГРЮЛ..." : "Найти в ЕГРЮЛ / DaData"}</span>
					</button>
				</div>
			</div>

			{/* Базовые данные клиники */}
			<div className="clinic-profile-form-grid settings-essential-block">
				<label>
					Название клиники (для пациентов)
					<input
						data-testid="input-clinic-name"
						value={clinicProfileDraft.clinicName || ""}
						onChange={(e) => updateClinicProfileDraft("clinicName", e.target.value)}
					/>
				</label>
				<label>
					Контактный телефон регистратуры
					<input
						data-testid="input-clinic-phone"
						value={clinicProfileDraft.phone || ""}
						onChange={(e) => updateClinicProfileDraft("phone", e.target.value)}
					/>
				</label>
				<label className="form-span-2">
					Фактический адрес клиники
					<input
						data-testid="input-clinic-address"
						value={clinicProfileDraft.address || ""}
						onChange={(e) => updateClinicProfileDraft("address", e.target.value)}
					/>
				</label>
			</div>

			{/* Модули реквизитов, лицензии и ЕГИСЗ */}
			<ClinicRequisitesCard
				clinicProfileDraft={clinicProfileDraft}
				updateClinicProfileDraft={updateClinicProfileDraft}
			/>

			<ClinicLicenseCard
				clinicProfileDraft={clinicProfileDraft}
				updateClinicProfileDraft={updateClinicProfileDraft}
			/>

			<ClinicEgiszBindingCard
				clinicProfileDraft={clinicProfileDraft}
				updateClinicProfileDraft={updateClinicProfileDraft}
			/>

			{/* Логотип, печать и брендинг бланков */}
			<details className="settings-advanced-block" data-testid="clinic-branding-section">
				<summary className="settings-advanced-toggle">
					<span className="settings-advanced-label">
						Фирменный стиль, логотип, печать и табло ожидания
					</span>
					<ChevronDown size={14} className="settings-advanced-chevron shrink-0" />
				</summary>
				<div className="clinic-profile-form-grid settings-advanced-form">
					<label>
						URL логотипа клиники
						<input
							type="text"
							placeholder="https://... или data:image/png;base64,..."
							value={clinicProfileDraft.logoUrl || ""}
							data-testid="input-clinic-logo-url"
							onChange={(e) => updateClinicProfileDraft("logoUrl", e.target.value)}
						/>
					</label>
					<label>
						URL печати / факсимиле
						<input
							type="text"
							placeholder="https://... или data:image/png;base64,..."
							value={clinicProfileDraft.stampUrl || ""}
							data-testid="input-clinic-stamp-url"
							onChange={(e) => updateClinicProfileDraft("stampUrl", e.target.value)}
						/>
					</label>
					<div className="form-span-2 flex items-center justify-between pt-2">
						<a
							href="/#lounge-display"
							target="_blank"
							rel="noreferrer"
							className="secondary-btn inline-flex items-center gap-2 text-xs"
						>
							<ExternalLink size={13} aria-hidden="true" />
							<span>Открыть ТВ-табло зоны ожидания (/lounge-display)</span>
						</a>
					</div>
				</div>
			</details>

			{/* Кнопка сохранения профиля */}
			<div className="clinic-profile-actions flex items-center justify-between gap-4 pt-2">
				<span className="text-xs text-[var(--ink-muted)]">
					{clinicProfileSaveState === "saved"
						? "✓ Реквизиты сохранены"
						: clinicProfileSaveState === "error"
							? "Проверьте корректность реквизитов"
							: "Изменения вступают в силу в договорах и чеках после сохранения"}
				</span>
				<button
					className="h-9 min-h-[36px] px-3.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white shadow-xs inline-flex items-center gap-2 text-[13px] font-semibold cursor-pointer transition-all"
					type="button"
					data-testid="btn-save-clinic-profile"
					onClick={() => void saveClinicProfileFromDraft()}
					disabled={clinicProfileSaveState === "saving"}
				>
					<ShieldCheck aria-hidden="true" size={16} className="w-4 h-4 shrink-0" />
					<span>{clinicProfileSaveState === "saving" ? "Сохраняю…" : "Сохранить реквизиты"}</span>
				</button>
			</div>

			{/* Результаты поиска DaData */}
			{clinicPublicLookup && (
				<section
					className="clinic-public-lookup-result"
					data-testid="clinic-public-lookup-result"
					aria-label="Публичный поиск реквизитов клиники"
				>
					<div className="dicom-discovery-head">
						<strong>Публичный поиск: {humanizeMigrationText(clinicPublicLookup?.providerStatus ?? "")}</strong>
					</div>
					{(typedSuggestions ?? []).length > 0 && (
						<div className="clinic-public-suggestions">
							{typedSuggestions.slice(0, 4).map((suggestion: any, index: number) => (
								<article key={`${suggestion.source}-${index}`}>
									<strong>{suggestion.source} · {Math.round((suggestion.confidence || 1) * 100)}%</strong>
									<p>
										{clinicLookupSuggestionFieldEntries(suggestion.fields)
											.map(([k, v]) => `${clinicPublicLookupFieldLabels[k] ?? k}: ${String(v).trim()}`)
											.join(" · ")}
									</p>
									<button
										className="text-button"
										type="button"
										onClick={() => applyClinicLookupSuggestion(suggestion.fields)}
									>
										Подставить в профиль
									</button>
								</article>
							))}
						</div>
					)}
				</section>
			)}
		</section>
	);
};

export default SettingsClinicLegalSection;
