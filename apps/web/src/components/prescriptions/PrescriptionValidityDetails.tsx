/**
 * PrescriptionValidityDetails.tsx — Blank Series, Validity & Address Selector
 * Decomposed coordinator <= 120 lines (Mandate 8b).
 */

import type React from "react";
import { PrescriptionChronicOptions } from "./PrescriptionChronicOptions";
import type { PrescriptionFormType } from "./PrescriptionPrintModal";

export interface PrescriptionValidityDetailsProps {
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

const VALIDITY_OPTIONS = [
	{ days: "15" as const, label: "15 дней" },
	{ days: "30" as const, label: "30 дн." },
	{ days: "60" as const, label: "60 дн." },
	{ days: "365" as const, label: "1 год" },
];

export const PrescriptionValidityDetails: React.FC<
	PrescriptionValidityDetailsProps
> = ({
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
		<div className="flex flex-col gap-2 pt-2 border-t border-[var(--line)]">
			<div className="grid grid-cols-2 gap-2">
				<div>
					<label
						htmlFor="prescription-series-input"
						className="text-xs font-medium text-[var(--muted)] block mb-1"
					>
						Серия и номер бланка:
					</label>
					<input
						id="prescription-series-input"
						type="text"
						value={customSeriesNumber}
						onChange={(e) => onCustomSeriesNumberChange(e.target.value)}
						className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] font-mono"
					/>
				</div>
				<div>
					<label
						htmlFor="prescription-validity-selector"
						className="text-xs font-medium text-[var(--muted)] block mb-1"
					>
						Срок действия:
					</label>
					<div
						id="prescription-validity-selector"
						className="dente-segmented-bar w-full"
					>
						{VALIDITY_OPTIONS.map((opt) => (
							<button
								key={opt.days}
								type="button"
								onClick={() => onValidityDaysChange(opt.days)}
								className={`dente-segmented-item ${validityDays === opt.days ? "active" : ""}`}
								data-active={validityDays === opt.days}
							>
								{opt.label}
							</button>
						))}
					</div>
				</div>
			</div>

			{validityDays === "365" && (
				<PrescriptionChronicOptions
					isChronicSpecialCare={isChronicSpecialCare}
					onToggleChronicSpecialCare={onToggleChronicSpecialCare}
					chronicPeriodicity={chronicPeriodicity}
					onChronicPeriodicityChange={onChronicPeriodicityChange}
				/>
			)}

			{activeForm === "148-1u-88" && (
				<div>
					<label
						htmlFor="prescription-address-input"
						className="text-xs font-medium text-[var(--muted)] block mb-1"
					>
						Адрес проживания пациента (рецепт строгого учета):
					</label>
					<input
						id="prescription-address-input"
						type="text"
						placeholder="Город, улица, дом, кв..."
						value={patientAddress}
						onChange={(e) => onPatientAddressChange(e.target.value)}
						className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)]"
					/>
				</div>
			)}
		</div>
	);
};
