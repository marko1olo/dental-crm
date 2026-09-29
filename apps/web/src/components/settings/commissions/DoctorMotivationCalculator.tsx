import {
	calculateDoctorPieceRatePayout,
	formatKopecksToRublesDisplay,
	parseRublesToKopecks,
} from "@dental/shared";
import {
	Calculator,
	ChevronDown,
	Coins,
	FileText,
	Layers,
	Percent,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";

export interface DoctorMotivationCalculatorProps {
	readonly defaultTherapyRate?: number;
	readonly defaultOrthoRate?: number;
	readonly defaultSurgeryRate?: number;
	readonly defaultHygieneRate?: number;
}

export const DoctorMotivationCalculator: React.FC<
	DoctorMotivationCalculatorProps
> = ({
	defaultTherapyRate = 25,
	defaultOrthoRate = 20,
	defaultSurgeryRate = 25,
	defaultHygieneRate = 30,
}) => {
	const [isOpen, setIsOpen] = useState(false);

	// Revenue inputs in rubles (text for decimal comma support)
	const [therapyRev, setTherapyRev] = useState("200000");
	const [orthoRev, setOrthoRev] = useState("500000");
	const [surgeryRev, setSurgeryRev] = useState("100000");
	const [hygieneRev, setHygieneRev] = useState("50000");

	// Direction commission rates (%)
	const [therapyRate, setTherapyRate] = useState(defaultTherapyRate);
	const [orthoRate, setOrthoRate] = useState(defaultOrthoRate);
	const [surgeryRate, setSurgeryRate] = useState(defaultSurgeryRate);
	const [hygieneRate, setHygieneRate] = useState(defaultHygieneRate);

	// Deductions
	const [labCost, setLabCost] = useState("80000");
	const [labDeductionPct, setLabDeductionPct] = useState(100);
	const [materialCost, setMaterialCost] = useState("20000");
	const [materialDeductionPct, setMaterialDeductionPct] = useState(0);

	// Base Shift Salary (Оклад / фикс за смену)
	const [baseShiftSalary, setBaseShiftSalary] = useState("0");

	// Refund storno simulation (Мандат 8e, 8n)
	const [refundRev, setRefundRev] = useState("0");

	const payoutResult = useMemo(() => {
		return calculateDoctorPieceRatePayout({
			therapyRevenueKopecks: parseRublesToKopecks(therapyRev),
			therapyRatePct: Number(therapyRate) || 0,
			orthopedicsRevenueKopecks: parseRublesToKopecks(orthoRev),
			orthopedicsRatePct: Number(orthoRate) || 0,
			surgeryRevenueKopecks: parseRublesToKopecks(surgeryRev),
			surgeryRatePct: Number(surgeryRate) || 0,
			hygieneRevenueKopecks: parseRublesToKopecks(hygieneRev),
			hygieneRatePct: Number(hygieneRate) || 0,
			labOrdersCostKopecks: parseRublesToKopecks(labCost),
			labDeductionPct: Number(labDeductionPct) || 0,
			materialCostKopecks: parseRublesToKopecks(materialCost),
			materialDeductionPct: Number(materialDeductionPct) || 0,
			baseShiftSalaryKopecks: parseRublesToKopecks(baseShiftSalary),
		});
	}, [
		therapyRev,
		therapyRate,
		orthoRev,
		orthoRate,
		surgeryRev,
		surgeryRate,
		hygieneRev,
		hygieneRate,
		labCost,
		labDeductionPct,
		materialCost,
		materialDeductionPct,
		baseShiftSalary,
	]);

	const refundKopecks = parseRublesToKopecks(refundRev);
	const avgRate = Math.round(
		((Number(therapyRate) || 0) +
			(Number(orthoRate) || 0) +
			(Number(surgeryRate) || 0) +
			(Number(hygieneRate) || 0)) / 4
	);
	const stornoCommissionKopecks = Math.round((refundKopecks * avgRate) / 100);
	const finalNetPayoutKopecks = Math.max(
		0,
		payoutResult.netPayoutKopecks - stornoCommissionKopecks
	);

	const clinicRetainedKopecks = Math.max(
		0,
		payoutResult.totalRevenueKopecks -
			finalNetPayoutKopecks -
			payoutResult.totalDeductionsKopecks,
	);

	return (
		<div className="rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] overflow-hidden">
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className="w-full px-4 py-3 cursor-pointer text-xs font-bold text-[var(--ink)] hover:bg-[var(--line)]/30 flex items-center justify-between select-none transition-colors"
			>
				<div className="flex items-center gap-2">
					<Calculator size={16} className="text-[var(--teal)] shrink-0" />
					<span>Интерактивный симулятор мотивации и сдельной оплаты врача</span>
					<span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--teal-soft)] text-[var(--teal-dark)] font-bold">
						Копейка-в-копейку
					</span>
				</div>
				<ChevronDown
					size={15}
					className={`text-[var(--muted)] transition-transform duration-200 ${
						isOpen ? "rotate-180" : ""
					}`}
				/>
			</button>

			{isOpen && (
				<div className="p-4 border-t border-[var(--line)] space-y-4">
					<p className="text-xs text-[var(--muted)] m-0">
						Моделирование начисления сдельной зарплаты с раздельными ставками
						по терапевтическому, ортопедическому, хирургическому приёмам,
						удержанием лабораторных заказ-нарядов (ЗТЛ), материалов и гарантией
						смены (Мандаты 8e, 8n).
					</p>

					{/* 4 Direction Splits */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
						<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-[var(--ink)]">
									Терапия
								</span>
								<div className="flex items-center gap-1">
									<input
										type="number"
										min="0"
										max="100"
										value={therapyRate}
										onChange={(e) => setTherapyRate(Number(e.target.value))}
										className="w-12 h-6 text-xs text-center font-bold rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
									/>
									<span className="text-xs text-[var(--muted)]">%</span>
								</div>
							</div>
							<div className="flex flex-col gap-1">
								<label className="text-[11px] text-[var(--muted)]">
									Выручка (₽):
								</label>
								<input
									type="text"
									inputMode="decimal"
									value={therapyRev}
									onChange={(e) => setTherapyRev(e.target.value)}
									className="h-8 px-2 text-xs rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] font-mono"
								/>
							</div>
							<span className="text-[11px] text-[var(--teal)] font-semibold">
								Начислено:{" "}
								{formatKopecksToRublesDisplay(
									payoutResult.accruedTherapyKopecks,
								)}
							</span>
						</div>

						<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-[var(--ink)]">
									Ортопедия
								</span>
								<div className="flex items-center gap-1">
									<input
										type="number"
										min="0"
										max="100"
										value={orthoRate}
										onChange={(e) => setOrthoRate(Number(e.target.value))}
										className="w-12 h-6 text-xs text-center font-bold rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
									/>
									<span className="text-xs text-[var(--muted)]">%</span>
								</div>
							</div>
							<div className="flex flex-col gap-1">
								<label className="text-[11px] text-[var(--muted)]">
									Выручка (₽):
								</label>
								<input
									type="text"
									inputMode="decimal"
									value={orthoRev}
									onChange={(e) => setOrthoRev(e.target.value)}
									className="h-8 px-2 text-xs rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] font-mono"
								/>
							</div>
							<span className="text-[11px] text-[var(--teal)] font-semibold">
								Начислено:{" "}
								{formatKopecksToRublesDisplay(
									payoutResult.accruedOrthopedicsKopecks,
								)}
							</span>
						</div>

						<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-[var(--ink)]">
									Хирургия
								</span>
								<div className="flex items-center gap-1">
									<input
										type="number"
										min="0"
										max="100"
										value={surgeryRate}
										onChange={(e) => setSurgeryRate(Number(e.target.value))}
										className="w-12 h-6 text-xs text-center font-bold rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
									/>
									<span className="text-xs text-[var(--muted)]">%</span>
								</div>
							</div>
							<div className="flex flex-col gap-1">
								<label className="text-[11px] text-[var(--muted)]">
									Выручка (₽):
								</label>
								<input
									type="text"
									inputMode="decimal"
									value={surgeryRev}
									onChange={(e) => setSurgeryRev(e.target.value)}
									className="h-8 px-2 text-xs rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] font-mono"
								/>
							</div>
							<span className="text-[11px] text-[var(--teal)] font-semibold">
								Начислено:{" "}
								{formatKopecksToRublesDisplay(
									payoutResult.accruedSurgeryKopecks,
								)}
							</span>
						</div>

						<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-[var(--ink)]">
									Гигиена
								</span>
								<div className="flex items-center gap-1">
									<input
										type="number"
										min="0"
										max="100"
										value={hygieneRate}
										onChange={(e) => setHygieneRate(Number(e.target.value))}
										className="w-12 h-6 text-xs text-center font-bold rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
									/>
									<span className="text-xs text-[var(--muted)]">%</span>
								</div>
							</div>
							<div className="flex flex-col gap-1">
								<label className="text-[11px] text-[var(--muted)]">
									Выручка (₽):
								</label>
								<input
									type="text"
									inputMode="decimal"
									value={hygieneRev}
									onChange={(e) => setHygieneRev(e.target.value)}
									className="h-8 px-2 text-xs rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] font-mono"
								/>
							</div>
							<span className="text-[11px] text-[var(--teal)] font-semibold">
								Начислено:{" "}
								{formatKopecksToRublesDisplay(
									payoutResult.accruedHygieneKopecks,
								)}
							</span>
						</div>
					</div>

					{/* Deductions, Base Shift Salary & Refund Storno */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
						<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-1.5">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-rose-700 dark:text-rose-400">
									Лаборатория (ЗТЛ)
								</span>
								<div className="flex items-center gap-1">
									<input
										type="number"
										min="0"
										max="100"
										value={labDeductionPct}
										onChange={(e) =>
											setLabDeductionPct(Number(e.target.value))
										}
										className="w-12 h-6 text-xs text-center font-bold rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
									/>
									<span className="text-xs text-[var(--muted)]">%</span>
								</div>
							</div>
							<input
								type="text"
								inputMode="decimal"
								value={labCost}
								onChange={(e) => setLabCost(e.target.value)}
								placeholder="Расходы на ЗТЛ (₽)"
								className="h-8 px-2 text-xs rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] font-mono"
							/>
							<span className="text-[11px] text-rose-600 dark:text-rose-400">
								Удержано:{" "}
								{formatKopecksToRublesDisplay(payoutResult.withheldLabKopecks)}
							</span>
						</div>

						<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-1.5">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-amber-700 dark:text-amber-400">
									Расходники / имплантаты
								</span>
								<div className="flex items-center gap-1">
									<input
										type="number"
										min="0"
										max="100"
										value={materialDeductionPct}
										onChange={(e) =>
											setMaterialDeductionPct(Number(e.target.value))
										}
										className="w-12 h-6 text-xs text-center font-bold rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
									/>
									<span className="text-xs text-[var(--muted)]">%</span>
								</div>
							</div>
							<input
								type="text"
								inputMode="decimal"
								value={materialCost}
								onChange={(e) => setMaterialCost(e.target.value)}
								placeholder="Себестоимость материалов (₽)"
								className="h-8 px-2 text-xs rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] font-mono"
							/>
							<span className="text-[11px] text-amber-600 dark:text-amber-400">
								Удержано:{" "}
								{formatKopecksToRublesDisplay(
									payoutResult.withheldMaterialKopecks,
								)}
							</span>
						</div>

						<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-1.5">
							<span className="text-xs font-bold text-[var(--ink)]">
								Гарантированный оклад за смены
							</span>
							<input
								type="text"
								inputMode="decimal"
								value={baseShiftSalary}
								onChange={(e) => setBaseShiftSalary(e.target.value)}
								placeholder="Фикс / оклад за смену (₽)"
								className="h-8 px-2 text-xs rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] font-mono"
							/>
							<span className="text-[11px] text-[var(--muted)]">
								Фиксированная база:{" "}
								{formatKopecksToRublesDisplay(
									payoutResult.baseShiftSalaryKopecks,
								)}
							</span>
						</div>

						<div className="p-3 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col gap-1.5">
							<span className="text-xs font-bold text-rose-700 dark:text-rose-400">
								Сторно возвратов (₽)
							</span>
							<input
								type="text"
								inputMode="decimal"
								value={refundRev}
								onChange={(e) => setRefundRev(e.target.value)}
								placeholder="Возврат пациенту (₽)"
								className="h-8 px-2 text-xs rounded border border-rose-300 dark:border-rose-800 bg-[var(--paper)] text-[var(--ink)] font-mono"
							/>
							<span className="text-[11px] font-bold text-rose-700 dark:text-rose-300">
								{stornoCommissionKopecks > 0
									? `Сторно комиссии: -${formatKopecksToRublesDisplay(stornoCommissionKopecks)}`
									: "Сторно: 0 ₽"}
							</span>
						</div>
					</div>

					{/* Clinical Warranty Guarantee Notice */}
					<div className="p-2.5 rounded-lg border border-teal-200 dark:border-teal-900/60 bg-teal-50/40 dark:bg-teal-950/20 flex items-center justify-between gap-2 text-xs">
						<span className="text-[var(--ink)]">
							<strong>Гарантийная переделка (0 ₽ пациенту):</strong> При гарантийной работе начисление врачу 0 ₽ при его вине, расход материалов списывается на клинику. Расчет надежно защищен от деления на ноль (Zero Dead-Ends).
						</span>
					</div>

					{/* Summary Breakdown Strip */}
					<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-3 text-xs">
						<div>
							<span className="text-[var(--muted)] block">Общая выручка:</span>
							<strong className="text-sm font-bold text-[var(--ink)]">
								{formatKopecksToRublesDisplay(
									payoutResult.totalRevenueKopecks,
								)}
							</strong>
						</div>
						<div>
							<span className="text-[var(--muted)] block">Сдельно начислено:</span>
							<strong className="text-sm font-bold text-[var(--teal)]">
								{formatKopecksToRublesDisplay(
									payoutResult.grossAccruedCommissionKopecks,
								)}
							</strong>
						</div>
						<div>
							<span className="text-[var(--muted)] block">Всего удержано:</span>
							<strong className="text-sm font-bold text-rose-600 dark:text-rose-400">
								-
								{formatKopecksToRublesDisplay(
									payoutResult.totalDeductionsKopecks + stornoCommissionKopecks,
								)}
							</strong>
						</div>
						<div className="p-2 rounded-lg bg-[var(--teal-soft)] border border-[var(--teal)]/30 text-right">
							<span className="text-[10px] font-bold text-[var(--teal-dark)] uppercase tracking-wider block">
								К выплате врачу:
							</span>
							<strong className="text-base font-extrabold text-[var(--teal-dark)]">
								{formatKopecksToRublesDisplay(finalNetPayoutKopecks)}
							</strong>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
