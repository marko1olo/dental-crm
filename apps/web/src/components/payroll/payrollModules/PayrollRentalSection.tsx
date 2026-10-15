import React from "react";
import { Building2, Percent } from "lucide-react";

export interface PayrollRentalSectionProps {
	readonly payoutModel: "percentage" | "chair_rental";
	readonly baseCommissionPercent: number;
	readonly chairRentalRub: number;
	readonly shiftsCount: number;
	readonly shiftRateRub: number;
	readonly advanceRub: number;
	readonly taxRegime: "employee" | "self_employed";
	readonly npd6TaxKop?: number | undefined;
	readonly netPayoutToDoctorKop: number;
	readonly isNpdReceiptDone: boolean;
	readonly onSetChairRentalRub: (val: number) => void;
	readonly onSetShiftsCount: (val: number) => void;
	readonly onSetShiftRateRub: (val: number) => void;
	readonly onSetAdvanceRub: (val: number) => void;
	readonly onSetIsNpdReceiptDone: (val: boolean) => void;
}

export const PayrollRentalSection: React.FC<PayrollRentalSectionProps> = ({
	payoutModel,
	baseCommissionPercent,
	chairRentalRub,
	shiftsCount,
	shiftRateRub,
	advanceRub,
	taxRegime,
	npd6TaxKop,
	netPayoutToDoctorKop,
	isNpdReceiptDone,
	onSetChairRentalRub,
	onSetShiftsCount,
	onSetShiftRateRub,
	onSetAdvanceRub,
	onSetIsNpdReceiptDone,
}) => {
	const handleShiftsCountChange = (count: number) => {
		const safeCount = Math.max(0, count);
		onSetShiftsCount(safeCount);
		onSetChairRentalRub(safeCount * shiftRateRub);
	};

	const handleShiftRateChange = (rate: number) => {
		const safeRate = Math.max(0, rate);
		onSetShiftRateRub(safeRate);
		onSetChairRentalRub(shiftsCount * safeRate);
	};

	const calculatedNpdRub = Math.round(
		(npd6TaxKop ?? Math.round(netPayoutToDoctorKop * 0.06)) / 100,
	);

	return (
		<div
			className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-xs"
			data-testid="doctor-payroll-rental-section"
		>
			{payoutModel === "chair_rental" ? (
				<div
					className="flex flex-col gap-2 flex-1"
					data-testid="doctor-payroll-chair-rental-panel"
				>
					<div className="flex items-center gap-2 flex-wrap">
						<Building2 className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />
						<span className="font-bold text-[var(--ink,#0f172a)] whitespace-nowrap">
							Аренда кресла (Соло):
						</span>

						{/* Simple Shift Calculation: Количество смен × Ставка смены (Mandate 8n) */}
						<div className="flex items-center gap-1.5 flex-wrap">
							<div className="flex items-center gap-1">
								<input
									type="number"
									min={0}
									max={31}
									value={shiftsCount}
									onChange={(e) => handleShiftsCountChange(Number(e.target.value) || 0)}
									className="w-14 h-8 px-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-center font-bold text-xs"
									title="Количество отработанных смен"
									data-testid="doctor-payroll-shifts-count-input"
								/>
								<span className="text-[var(--muted,#64748b)]">смен ×</span>
							</div>

							<div className="flex items-center gap-1">
								<input
									type="number"
									min={0}
									step={500}
									value={shiftRateRub}
									onChange={(e) => handleShiftRateChange(Number(e.target.value) || 0)}
									className="w-20 h-8 px-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-right font-bold text-xs"
									title="Ставка субаренды за 1 смену"
									data-testid="doctor-payroll-shift-rate-input"
								/>
								<span className="text-[var(--muted,#64748b)]">₽/смена =</span>
							</div>

							<div className="flex items-center gap-1">
								<input
									type="number"
									min={0}
									value={chairRentalRub}
									onChange={(e) => onSetChairRentalRub(Math.max(0, Number(e.target.value) || 0))}
									className="w-24 h-8 px-2 rounded-lg border border-[var(--teal,#0d9488)]/40 bg-[var(--paper,#ffffff)] text-right font-black text-xs text-[var(--teal,#0d9488)]"
									title="Итоговая сумма аренды кресла за расчетный месяц"
									data-testid="doctor-payroll-chair-rental-input"
								/>
								<span className="font-bold text-[var(--ink,#0f172a)]">₽</span>
							</div>
						</div>
					</div>

					<div className="text-[11px] text-[var(--teal,#0d9488)] font-medium">
						Прозрачная соло-экономика: Выручка (касса 54-ФЗ) − Аренда ({shiftsCount} см × {shiftRateRub.toLocaleString("ru-RU")} ₽) − ЗТЛ − Материалы = 100% чистый доход
					</div>
				</div>
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
