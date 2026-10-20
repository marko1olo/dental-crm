import React from "react";
import { Building2 } from "lucide-react";

export interface PayrollRentalInputsProps {
	readonly chairRentalMode?: "fixed" | "split_70_30" | undefined;
	readonly shiftsCount: number;
	readonly shiftRateRub: number;
	readonly chairRentalRub: number;
	readonly onSetChairRentalMode?: ((mode: "fixed" | "split_70_30") => void) | undefined;
	readonly onSetChairRentalRub: (val: number) => void;
	readonly onSetShiftsCount: (val: number) => void;
	readonly onSetShiftRateRub: (val: number) => void;
}

export const PayrollRentalInputs: React.FC<PayrollRentalInputsProps> = ({
	chairRentalMode = "fixed",
	shiftsCount,
	shiftRateRub,
	chairRentalRub,
	onSetChairRentalMode,
	onSetChairRentalRub,
	onSetShiftsCount,
	onSetShiftRateRub,
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

	return (
		<div className="flex flex-col gap-2 flex-1" data-testid="doctor-payroll-chair-rental-panel">
			<div className="flex items-center gap-2 flex-wrap">
				<Building2 className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />
				<span className="font-bold text-[var(--ink,#0f172a)] whitespace-nowrap">
					Аренда кресла (Соло-врач):
				</span>

				{onSetChairRentalMode && (
					<div className="inline-flex rounded-lg border border-[var(--line,#e2e8f0)] p-0.5 bg-[var(--paper,#ffffff)] text-xs">
						<button
							type="button"
							onClick={() => onSetChairRentalMode("fixed")}
							className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer border ${
								chairRentalMode === "fixed"
									? "bg-[var(--primary,#0d9488)] text-white border-transparent"
									: "bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-hover,#f1f5f9)]"
							}`}
							data-testid="chair-rental-mode-fixed"
						>
							Фикс за смену
						</button>
						<button
							type="button"
							onClick={() => onSetChairRentalMode("split_70_30")}
							className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer border ${
								chairRentalMode === "split_70_30"
									? "bg-[var(--primary,#0d9488)] text-white border-transparent"
									: "bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-hover,#f1f5f9)]"
							}`}
							data-testid="chair-rental-mode-split"
						>
							Сплит 70 / 30
						</button>
					</div>
				)}

				{chairRentalMode === "fixed" ? (
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
				) : (
					<div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink,#0f172a)] bg-[var(--paper,#ffffff)] px-2.5 py-1 rounded-lg border border-[var(--line,#e2e8f0)]">
						<span>Врач забирает <strong className="text-[var(--teal,#0d9488)] font-bold">70%</strong></span>
						<span className="text-[var(--muted,#64748b)]">• Клиника удерживает 30% за аренду кресла</span>
					</div>
				)}
			</div>

			<div className="text-[11px] text-[var(--teal,#0d9488)] font-medium">
				{chairRentalMode === "fixed"
					? `Прозрачная соло-экономика: Выручка (касса 54-ФЗ) − Аренда (${shiftsCount} см × ${shiftRateRub.toLocaleString("ru-RU")} ₽) − ЗТЛ − Материалы = 100% чистый доход`
					: "Прозрачная соло-экономика: Выручка (касса 54-ФЗ) − ЗТЛ − Материалы = Чистая база → Сплит 70% врачу, 30% клинике за аренду кресла"}
			</div>
		</div>
	);
};

export default PayrollRentalInputs;
