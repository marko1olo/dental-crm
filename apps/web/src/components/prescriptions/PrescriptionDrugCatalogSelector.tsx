/**
 * PrescriptionDrugCatalogSelector.tsx
 *
 * Left panel of Statutory Prescription Modal:
 * Fast 1-click dental prescription presets, drug catalog browser,
 * custom drug formulation draft, and validity duration selectors.
 */

import React from "react";
import {
	Award,
	CheckCircle2,
	PenTool,
	Plus,
	Printer,
	Search,
	Sparkles,
} from "lucide-react";
import type { DentalFastPrescriptionSet } from "./prescriptionDataSets";
import type { PrescriptionFormType } from "./PrescriptionPrintModal";

export interface PrescriptionDrugCatalogSelectorProps {
	readonly fastPresets: readonly DentalFastPrescriptionSet[];
	readonly onApplyAndInsertToDiary: (preset: DentalFastPrescriptionSet) => void;
	readonly onApplyAndPrint: (preset: DentalFastPrescriptionSet) => void;
	readonly searchQuery: string;
	readonly onSearchQueryChange: (query: string) => void;
	readonly filteredCatalog: readonly {
		readonly id: string;
		readonly tradeNameRu: string;
		readonly latinRp: string;
		readonly dosageRu: string;
		readonly category?: string;
	}[];
	readonly selectedDrugIds: readonly string[];
	readonly onToggleDrug: (id: string) => void;
	readonly isAddingCustom: boolean;
	readonly onToggleAddingCustom: () => void;
	readonly customTradeName: string;
	readonly onCustomTradeNameChange: (val: string) => void;
	readonly customLatinRp: string;
	readonly onCustomLatinRpChange: (val: string) => void;
	readonly customDispense: string;
	readonly onCustomDispenseChange: (val: string) => void;
	readonly customSigna: string;
	readonly onCustomSignaChange: (val: string) => void;
	readonly onAddCustomDrug: () => void;
	readonly customSeriesNumber: string;
	readonly onCustomSeriesNumberChange: (val: string) => void;
	readonly validityDays: "15" | "30" | "60" | "365";
	readonly onValidityDaysChange: (days: "15" | "30" | "60" | "365") => void;
	readonly isChronicSpecialCare: boolean;
	readonly onToggleChronicSpecialCare: () => void;
	readonly chronicPeriodicity: string;
	readonly onChronicPeriodicityChange: (val: string) => void;
	readonly patientAddress: string;
	readonly onPatientAddressChange: (val: string) => void;
	readonly activeForm: PrescriptionFormType;
}

export const PrescriptionDrugCatalogSelector: React.FC<PrescriptionDrugCatalogSelectorProps> = ({
	fastPresets,
	onApplyAndInsertToDiary,
	onApplyAndPrint,
	searchQuery,
	onSearchQueryChange,
	filteredCatalog,
	selectedDrugIds,
	onToggleDrug,
	isAddingCustom,
	onToggleAddingCustom,
	customTradeName,
	onCustomTradeNameChange,
	customLatinRp,
	onCustomLatinRpChange,
	customDispense,
	onCustomDispenseChange,
	customSigna,
	onCustomSignaChange,
	onAddCustomDrug,
	customSeriesNumber,
	onCustomSeriesNumberChange,
	validityDays,
	onValidityDaysChange,
	isChronicSpecialCare,
	onToggleChronicSpecialCare,
	chronicPeriodicity,
	onChronicPeriodicityChange,
	patientAddress,
	onPatientAddressChange,
	activeForm,
}) => {
	return (
		<div className="w-full lg:w-1/2 p-4 sm:p-6 overflow-y-auto flex flex-col gap-4">
			{/* 1-Click Fast Presets Bar */}
			<div className="flex flex-col gap-2">
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
					<Sparkles className="w-3.5 h-3.5 text-[var(--teal)]" />
					Стоматологические 1-клик пакеты назначений:
				</span>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					{fastPresets.slice(0, 4).map((preset) => (
						<div
							key={preset.id}
							className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal)] transition-all flex flex-col justify-between gap-1.5"
						>
							<div>
								<div className="text-xs font-bold text-[var(--ink)] leading-snug">
									{preset.label}
								</div>
								<div className="text-[11px] text-[var(--muted)] line-clamp-2 mt-0.5">
									{preset.desc}
								</div>
							</div>
							<div className="flex items-center gap-1.5 pt-1 border-t border-[var(--line)]">
								<button
									type="button"
									onClick={() => onApplyAndInsertToDiary(preset)}
									className="h-7 px-2 text-[11px] font-semibold rounded bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--teal-surface)] transition-all cursor-pointer flex items-center gap-1"
								>
									<PenTool className="w-3 h-3 text-[var(--teal)]" />
									В дневник
								</button>
								<button
									type="button"
									onClick={() => onApplyAndPrint(preset)}
									className="h-7 px-2 text-[11px] font-semibold rounded bg-[var(--teal)] text-[var(--ink-inverse)] hover:opacity-90 transition-all cursor-pointer flex items-center gap-1 ml-auto"
								>
									<Printer className="w-3 h-3" />
									Печать
								</button>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Search and Drug List */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
						<Award className="w-3.5 h-3.5 text-[var(--teal)]" />
						Формуляр препаратов (Приказ № 1094н):
					</span>
					<button
						type="button"
						onClick={onToggleAddingCustom}
						className="text-xs font-bold text-[var(--teal)] hover:underline flex items-center gap-1 cursor-pointer"
					>
						<Plus className="w-3 h-3" />
						Свой препарат
					</button>
				</div>

				<div className="relative">
					<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
					<input
						type="text"
						placeholder="Поиск по МНН, торговому названию или латыни..."
						value={searchQuery}
						onChange={(e) => onSearchQueryChange(e.target.value)}
						className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--teal)]"
					/>
				</div>

				<div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
					{filteredCatalog.map((drug) => {
						const isSelected = selectedDrugIds.includes(drug.id);
						return (
							<div
								key={drug.id}
								onClick={() => onToggleDrug(drug.id)}
								className={`p-2 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
									isSelected
										? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--ink)] font-semibold shadow-xs"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--line-strong)]"
								}`}
							>
								<div className="min-w-0">
									<div className="font-bold truncate">{drug.tradeNameRu}</div>
									<div className="text-[11px] text-[var(--muted)] truncate italic">
										{drug.latinRp}
									</div>
								</div>
								<div className="flex items-center gap-2 shrink-0">
									<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)]">
										{drug.dosageRu}
									</span>
									<div
										className={`w-4 h-4 rounded-md border flex items-center justify-center ${
											isSelected
												? "bg-[var(--teal)] border-[var(--teal)] text-[var(--ink-inverse)]"
												: "border-[var(--line)]"
										}`}
									>
										{isSelected && <CheckCircle2 className="w-3 h-3" />}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Custom Drug Input Strip */}
			{isAddingCustom && (
				<div className="p-3 rounded-xl border border-[var(--teal)] bg-[var(--teal-surface)] flex flex-col gap-2">
					<div className="text-xs font-bold text-[var(--ink)]">
						Добавление нестандартного препарата:
					</div>
					<input
						type="text"
						placeholder="Торговое название (напр. Нимесил)..."
						value={customTradeName}
						onChange={(e) => onCustomTradeNameChange(e.target.value)}
						className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
					/>
					<input
						type="text"
						placeholder="Латинская пропись (Rp.: Nimesulidi 100 mg)..."
						value={customLatinRp}
						onChange={(e) => onCustomLatinRpChange(e.target.value)}
						className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
					/>
					<div className="flex gap-2">
						<input
							type="text"
							placeholder="Отпуск (D.t.d. N 10)..."
							value={customDispense}
							onChange={(e) => onCustomDispenseChange(e.target.value)}
							className="w-1/2 px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
						/>
						<input
							type="text"
							placeholder="Сигнатура (S. Внутрь по 1 пак. 2 р/д)..."
							value={customSigna}
							onChange={(e) => onCustomSignaChange(e.target.value)}
							className="w-1/2 px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
						/>
					</div>
					<button
						type="button"
						onClick={onAddCustomDrug}
						className="h-8 px-3 text-xs font-bold rounded-lg bg-[var(--teal)] text-[var(--ink-inverse,#fff)] hover:opacity-90 transition-all cursor-pointer self-end"
					>
						Добавить в рецепт
					</button>
				</div>
			)}

			{/* Prescription Form Details & Validity Selector */}
			<div className="flex flex-col gap-2 pt-2 border-t border-[var(--line)]">
				<div className="grid grid-cols-2 gap-2">
					<div>
						<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
							Серия и номер бланка:
						</label>
						<input
							type="text"
							value={customSeriesNumber}
							onChange={(e) => onCustomSeriesNumberChange(e.target.value)}
							className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] font-mono"
						/>
					</div>
					<div>
						<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
							Срок действия:
						</label>
						<div className="grid grid-cols-4 gap-1">
							{[
								{ days: "15" as const, label: "15 дней" },
								{ days: "30" as const, label: "30 дн." },
								{ days: "60" as const, label: "60 дн." },
								{ days: "365" as const, label: "1 год" },
							].map((opt) => (
								<button
									key={opt.days}
									type="button"
									onClick={() => onValidityDaysChange(opt.days)}
									className={`h-7 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
										validityDays === opt.days
											? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal)]"
											: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)]"
									}`}
								>
									{opt.label}
								</button>
							))}
						</div>
					</div>
				</div>

				{validityDays === "365" && (
					<div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col gap-1.5">
						<label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-800 dark:text-amber-200">
							<input
								type="checkbox"
								checked={isChronicSpecialCare}
								onChange={onToggleChronicSpecialCare}
								className="rounded text-[var(--teal)] focus:ring-[var(--teal)]"
							/>
							Спец. отметка «По специальному назначению» (хронические заболевания)
						</label>
						{isChronicSpecialCare && (
							<input
								type="text"
								placeholder="Периодичность отпуска (напр. ежемесячно / 1 раз в 15 дней)..."
								value={chronicPeriodicity}
								onChange={(e) => onChronicPeriodicityChange(e.target.value)}
								className="w-full px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-amber-500/30 text-[var(--ink)]"
							/>
						)}
					</div>
				)}

				{activeForm === "148-1u-88" && (
					<div>
						<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
							Адрес проживания пациента (Обязательно для ф. 148-1/у-88):
						</label>
						<input
							type="text"
							placeholder="Город, улица, дом, кв..."
							value={patientAddress}
							onChange={(e) => onPatientAddressChange(e.target.value)}
							className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)]"
						/>
					</div>
				)}
			</div>
		</div>
	);
};
