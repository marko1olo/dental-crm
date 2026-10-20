import React from "react";
import { Percent } from "lucide-react";
import { PayrollRentalInputs } from "./PayrollRentalInputs";

export interface PayrollRentalSectionProps {
	readonly payoutModel: "percentage" | "chair_rental";
	readonly chairRentalMode?: "fixed" | "split_70_30" | undefined;
	readonly baseCommissionPercent: number;
	readonly chairRentalRub: number;
	readonly shiftsCount: number;
	readonly shiftRateRub: number;
	readonly advanceRub: number;
	readonly taxRegime: "employee" | "self_employed";
	readonly npd6TaxKop?: number | undefined;
	readonly netPayoutToDoctorKop: number;
	readonly isNpdReceiptDone: boolean;
	readonly onSetChairRentalMode?: ((mode: "fixed" | "split_70_30") => void) | undefined;
	readonly onSetChairRentalRub: (val: number) => void;
	readonly onSetShiftsCount: (val: number) => void;
	readonly onSetShiftRateRub: (val: number) => void;
	readonly onSetAdvanceRub: (val: number) => void;
	readonly onSetIsNpdReceiptDone: (val: boolean) => void;
}

export const PayrollRentalSection: React.FC<PayrollRentalSectionProps> = ({
	payoutModel,
	chairRentalMode = "fixed",
	baseCommissionPercent,
	chairRentalRub,
	shiftsCount,
	shiftRateRub,
	advanceRub,
	taxRegime,
	npd6TaxKop,
	netPayoutToDoctorKop,
	isNpdReceiptDone,
	onSetChairRentalMode,
	onSetChairRentalRub,
	onSetShiftsCount,
	onSetShiftRateRub,
	onSetAdvanceRub,
	onSetIsNpdReceiptDone,
}) => {
	const calculatedNpdRub = Math.round(
		(npd6TaxKop ?? Math.round(netPayoutToDoctorKop * 0.06)) / 100,
	);

	return (
		<div
			className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-xs"
			data-testid="doctor-payroll-rental-section"
		>
			{payoutModel === "chair_rental" ? (
				<PayrollRentalInputs
					chairRentalMode={chairRentalMode}
					shiftsCount={shiftsCount}
					shiftRateRub={shiftRateRub}
					chairRentalRub={chairRentalRub}
					onSetChairRentalMode={onSetChairRentalMode}
					onSetChairRentalRub={onSetChairRentalRub}
					onSetShiftsCount={onSetShiftsCount}
					onSetShiftRateRub={onSetShiftRateRub}
				/>
			) : (
				<div className="flex items-center gap-2">
					<Percent className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />
					<span className="text-[var(--muted,#64748b)]">
						Ставка комиссии врача по пресету специальности:{" "}
						<strong className="text-[var(--ink,#0f172a)] font-bold">
							{baseCommissionPercent}%
						</strong>{" "}
						от чистой базы выручки (после вычета ЗТЛ и материалов)
					</span>
				</div>
			)}

			<div className="flex items-center gap-3 flex-wrap shrink-0">
				<div className="flex items-center gap-1.5">
					<label className="font-semibold text-[var(--muted,#64748b)] whitespace-nowrap">
						Аванс:
					</label>
					<input
						type="number"
						value={advanceRub}
						onChange={(e) => onSetAdvanceRub(Math.max(0, Number(e.target.value) || 0))}
						className="w-20 sm:w-24 h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-right font-bold text-xs"
						data-testid="doctor-payroll-advance-input"
						placeholder="0"
					/>
					<span className="text-[var(--muted,#64748b)]">₽</span>
				</div>

				{(taxRegime === "self_employed" || payoutModel === "chair_rental") && (
					<div className="flex items-center gap-2">
						<span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-800 text-[11px]">
							НПД 6%: {calculatedNpdRub.toLocaleString("ru-RU")} ₽
						</span>
						<label className="flex items-center gap-1.5 cursor-pointer font-medium text-[var(--ink,#0f172a)] select-none text-xs">
							<input
								type="checkbox"
								checked={isNpdReceiptDone}
								onChange={(e) => onSetIsNpdReceiptDone(e.target.checked)}
								className="rounded border-[var(--line,#cbd5e1)] text-[var(--teal,#0d9488)]"
								data-testid="doctor-payroll-npd-checkbox"
							/>
							<span>Чек «Мой налог»</span>
						</label>
					</div>
				)}
			</div>
		</div>
	);
};

export default PayrollRentalSection;
