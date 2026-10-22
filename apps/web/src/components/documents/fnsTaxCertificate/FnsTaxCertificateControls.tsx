import React from "react";
import type { TaxDeductionRelationship } from "../taxCertificateEngine";

interface FnsTaxCertificateControlsProps {
	selectedYear: number;
	setSelectedYear: (y: number) => void;
	relationship: TaxDeductionRelationship;
	setRelationship: (r: TaxDeductionRelationship) => void;
	effectiveInn: string;
	setTaxpayerInn: (inn: string) => void;
	isInnValid: boolean;
	taxpayerFullName: string;
	setTaxpayerFullName: (f: string) => void;
	taxpayerBirthDate: string;
	setTaxpayerBirthDate: (b: string) => void;
}

export const FnsTaxCertificateControls: React.FC<FnsTaxCertificateControlsProps> = ({
	selectedYear,
	setSelectedYear,
	relationship,
	setRelationship,
	effectiveInn,
	setTaxpayerInn,
	isInnValid,
	taxpayerFullName,
	setTaxpayerFullName,
	taxpayerBirthDate,
	setTaxpayerBirthDate,
}) => (
	<div className="p-4 border-b border-[var(--line)] bg-[var(--paper)] grid grid-cols-1 sm:grid-cols-3 gap-3">
		<div>
			<label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">
				Налоговый период (год):
			</label>
			<select
				value={selectedYear}
				onChange={(e) => setSelectedYear(Number(e.target.value))}
				className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
				data-testid="tax-cert-year-select"
			>
				<option value={2026}>2026 год</option>
				<option value={2025}>2025 год</option>
				<option value={2024}>2024 год</option>
			</select>
		</div>

		<div>
			<label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">
				Кто налогоплательщик:
			</label>
			<select
				value={relationship}
				onChange={(e) => setRelationship(e.target.value as TaxDeductionRelationship)}
				className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
				data-testid="tax-cert-relationship-select"
			>
				<option value="patient">Сам пациент (Код 1)</option>
				<option value="spouse">Супруг / супруга (Код 2)</option>
				<option value="parent">Родитель (Код 3)</option>
				<option value="child">Ребенок до 18/24 лет (Код 4)</option>
			</select>
		</div>

		<div>
			<label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">
				ИНН плательщика (опционально):
			</label>
			<input
				type="text"
				value={effectiveInn}
				onChange={(e) => setTaxpayerInn(e.target.value)}
				placeholder="12 цифр (необязательно при наличии паспорта)"
				className={`w-full h-8 px-2 text-xs rounded-lg border bg-[var(--paper-soft)] text-[var(--ink)] ${
					isInnValid ? "border-[var(--line)]" : "border-rose-500"
				}`}
				data-testid="tax-cert-inn-input"
			/>
			{!isInnValid && (
				<span className="text-[11px] text-rose-500 block mt-0.5">
					Некорректная контрольная сумма ИНН
				</span>
			)}
		</div>

		{relationship !== "patient" && (
			<>
				<div>
					<label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">
						ФИО налогоплательщика:
					</label>
					<input
						type="text"
						value={taxpayerFullName}
						onChange={(e) => setTaxpayerFullName(e.target.value)}
						placeholder="ФИО плательщика (супруг, родитель)"
						className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
						data-testid="tax-cert-taxpayer-name-input"
					/>
				</div>
				<div>
					<label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">
						Дата рождения плательщика:
					</label>
					<input
						type="date"
						value={taxpayerBirthDate}
						onChange={(e) => setTaxpayerBirthDate(e.target.value)}
						className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
						data-testid="tax-cert-taxpayer-birthdate-input"
					/>
				</div>
			</>
		)}
	</div>
);
