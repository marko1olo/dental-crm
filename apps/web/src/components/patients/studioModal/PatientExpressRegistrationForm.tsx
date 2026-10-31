/**
 * PatientExpressRegistrationForm.tsx — Экспресс-форма регистрации за 10 секунд.
 *
 * МАНДАТЫ:
 * - Мандат 8e (Автономия врача и администратора): для начала приёма достаточно ФИО и телефона.
 *   Запрещено требовать паспортные данные, СНИЛС или ИНН до посадки в кресло.
 *   Физиологическая норма в 1 клик (Соматически здоров / Интактные зубы).
 * - Apple HIG: удобные поля ввода, min-h-[44px], четкая читаемость на смартфонах.
 * - Мандат 8b (Sweet Spot: 150–210 строк).
 */

import React from "react";
import { AlertCircle, ChevronDown, ChevronUp, ShieldCheck, HeartPulse } from "lucide-react";
import type { PatientCategory } from "../patientCatalogData";

export interface PatientExpressRegistrationFormProps {
	readonly draftName: string;
	readonly onDraftNameChange: (val: string) => void;
	readonly draftPhone: string;
	readonly onDraftPhoneChange: (val: string) => void;
	readonly draftBirthDate: string;
	readonly onDraftBirthDateChange: (val: string) => void;
	readonly draftCategory: PatientCategory;
	readonly onDraftCategoryChange: (cat: PatientCategory) => void;
	readonly draftIsSomaticNorm: boolean;
	readonly onDraftIsSomaticNormChange: (norm: boolean) => void;
	readonly draftNotes: string;
	readonly onDraftNotesChange: (notes: string) => void;
	readonly draftPassportSeries: string;
	readonly onDraftPassportSeriesChange: (series: string) => void;
	readonly draftPassportNumber: string;
	readonly onDraftPassportNumberChange: (num: string) => void;
	readonly draftSnils: string;
	readonly onDraftSnilsChange: (snils: string) => void;
	readonly showDocFields: boolean;
	readonly onToggleDocFields: () => void;
	readonly guidanceMessage: string | null;
	readonly nameInputRef: React.RefObject<HTMLInputElement | null>;
	readonly phoneInputRef: React.RefObject<HTMLInputElement | null>;
}

export const PatientExpressRegistrationForm: React.FC<PatientExpressRegistrationFormProps> = React.memo(
	function PatientExpressRegistrationForm({
		draftName,
		onDraftNameChange,
		draftPhone,
		onDraftPhoneChange,
		draftBirthDate,
		onDraftBirthDateChange,
		draftCategory,
		onDraftCategoryChange,
		draftIsSomaticNorm,
		onDraftIsSomaticNormChange,
		draftNotes,
		onDraftNotesChange,
		draftPassportSeries,
		onDraftPassportSeriesChange,
		draftPassportNumber,
		onDraftPassportNumberChange,
		draftSnils,
		onDraftSnilsChange,
		showDocFields,
		onToggleDocFields,
		guidanceMessage,
		nameInputRef,
		phoneInputRef,
	}) {
		return (
			<div className="space-y-4" data-testid="patient-express-registration-form">
				{guidanceMessage && (
					<div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
						<AlertCircle size={16} className="shrink-0" />
						<span>{guidanceMessage}</span>
					</div>
				)}

				<div className="p-4 rounded-2xl bg-[var(--paper-subtle)] border border-[var(--line)] space-y-3.5">
					<div className="flex items-center justify-between">
						<h3 className="text-xs font-semibold text-[var(--muted)]">
							Обязательные данные для приёма (10 секунд)
						</h3>
						<span className="text-[11px] text-[var(--teal)] font-medium">Без бюрократии</span>
					</div>

					<div className="space-y-3">
						<div>
							<label className="block text-xs font-medium mb-1 text-[var(--ink-secondary)]">
								Фамилия, Имя и Отчество <span className="text-red-500">*</span>
							</label>
							<input
								ref={nameInputRef}
								type="text"
								value={draftName}
								onChange={(e) => onDraftNameChange(e.target.value)}
								placeholder="Иванов Алексей Сергеевич"
								className="w-full h-11 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] placeholder-[var(--muted)] focus:border-[var(--teal)] focus:outline-none transition-colors"
								data-testid="express-patient-name-input"
							/>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label className="block text-xs font-medium mb-1 text-[var(--ink-secondary)]">
									Мобильный телефон <span className="text-red-500">*</span>
								</label>
								<input
									ref={phoneInputRef}
									type="tel"
									value={draftPhone}
									onChange={(e) => onDraftPhoneChange(e.target.value)}
									placeholder="+7 (999) 000-00-00"
									className="w-full h-11 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] placeholder-[var(--muted)] focus:border-[var(--teal)] focus:outline-none transition-colors"
									data-testid="express-patient-phone-input"
								/>
							</div>
							<div>
								<label className="block text-xs font-medium mb-1 text-[var(--ink-secondary)]">
									Дата рождения (по желанию)
								</label>
								<input
									type="date"
									value={draftBirthDate}
									onChange={(e) => onDraftBirthDateChange(e.target.value)}
									className="w-full h-11 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none transition-colors"
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
							<div>
								<label className="block text-xs font-medium mb-1 text-[var(--ink-secondary)]">
									Категория пациента
								</label>
								<div className="flex items-center gap-1.5">
									{(["primary", "regular", "vip"] as const).map((cat) => (
										<button
											key={cat}
											type="button"
											onClick={() => onDraftCategoryChange(cat)}
											className={`flex-1 h-9 px-2 text-xs font-medium rounded-lg border transition-colors ${
												draftCategory === cat
													? cat === "vip"
														? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
														: "border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--teal)] font-semibold"
													: "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
										>
											{cat === "primary" ? "Первичный" : cat === "regular" ? "Постоянный" : "VIP"}
										</button>
									))}
								</div>
							</div>

							<div>
								<label className="block text-xs font-medium mb-1 text-[var(--ink-secondary)]">
									Соматический статус
								</label>
								<button
									type="button"
									onClick={() => onDraftIsSomaticNormChange(!draftIsSomaticNorm)}
									className={`w-full h-9 px-3 rounded-lg border text-xs font-medium flex items-center justify-between transition-colors ${
										draftIsSomaticNorm
											? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
											: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
									}`}
								>
									<div className="flex items-center gap-1.5">
										{draftIsSomaticNorm ? <ShieldCheck size={14} /> : <HeartPulse size={14} />}
										<span>{draftIsSomaticNorm ? "✓ Соматически здоров" : "Особый статус"}</span>
									</div>
									<span className="text-[10px] text-[var(--muted)]">1 клик</span>
								</button>
							</div>
						</div>

						<div>
							<label className="block text-xs font-medium mb-1 text-[var(--ink-secondary)]">
								Клинические заметки / Жалобы
							</label>
							<input
								type="text"
								value={draftNotes}
								onChange={(e) => onDraftNotesChange(e.target.value)}
								placeholder="Острая боль, консультация ортодонта..."
								className="w-full h-10 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] placeholder-[var(--muted)] focus:border-[var(--teal)] focus:outline-none transition-colors"
							/>
						</div>
					</div>
				</div>

				<div className="border border-[var(--line)] rounded-2xl overflow-hidden bg-[var(--paper-subtle)]">
					<button
						type="button"
						onClick={onToggleDocFields}
						className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-medium text-[var(--ink-secondary)] hover:bg-[var(--paper)] transition-colors min-h-[44px] sm:min-h-0"
					>
						<span>Паспорт и СНИЛС (строго опционально после приёма)</span>
						{showDocFields ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
					</button>
					{showDocFields && (
						<div className="p-4 pt-1 space-y-3 border-t border-[var(--line)] bg-[var(--paper)]">
							<p className="text-[11px] text-[var(--muted)]">
								Пациент может заполнить паспортные данные в зоне ожидания или после осмотра.
							</p>
							<div className="grid grid-cols-2 gap-2.5">
								<input
									type="text"
									placeholder="Серия паспорта"
									value={draftPassportSeries}
									onChange={(e) => onDraftPassportSeriesChange(e.target.value)}
									className="h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-subtle)] text-xs text-[var(--ink)]"
								/>
								<input
									type="text"
									placeholder="Номер паспорта"
									value={draftPassportNumber}
									onChange={(e) => onDraftPassportNumberChange(e.target.value)}
									className="h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-subtle)] text-xs text-[var(--ink)]"
								/>
							</div>
							<input
								type="text"
								placeholder="СНИЛС (000-000-000 00)"
								value={draftSnils}
								onChange={(e) => onDraftSnilsChange(e.target.value)}
								className="w-full h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-subtle)] text-xs text-[var(--ink)]"
							/>
						</div>
					)}
				</div>
			</div>
		);
	},
);
