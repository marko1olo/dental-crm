/**
 * apps/web/src/components/settings/owner/DoctorPieceRateCalculatorSection.tsx
 *
 * Интерактивный калькулятор сдельной оплаты труда (piece-rate pay) и мотивации врачей.
 * Полная прозрачность выплат, удержаний ЗТЛ и материалов, маржинальности клиники.
 *
 * Инварианты:
 * - Мандат 8b: строго <= 800 строк.
 * - Мандат 8d: ноль мультяшных эмодзи.
 * - Все расчеты ведутся строго в целочисленных копейках (integer kopecks) через pieceRateCalculator.
 */

import React, { useMemo, useState } from "react";
import {
	Calculator,
	Check,
	Coins,
	Copy,
	FileSpreadsheet,
	HelpCircle,
	Percent,
	RotateCcw,
	ShieldCheck,
	TrendingDown,
	TrendingUp,
	UserCheck,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	calculateDoctorPieceRatePayout,
	formatKopecksToRublesDisplay,
	parseRublesToKopecks,
	type DoctorCategoryPerformanceInput,
	type DoctorPieceRatePayoutResult,
} from "@dental/shared";

interface PieceRatePreset {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly therapyRatePct: number;
	readonly orthopedicsRatePct: number;
	readonly surgeryRatePct: number;
	readonly hygieneRatePct: number;
	readonly labDeductionPct: number;
	readonly materialDeductionPct: number;
	readonly baseShiftSalaryRub: number;
	readonly sampleTherapyRub: number;
	readonly sampleOrthopedicsRub: number;
	readonly sampleSurgeryRub: number;
	readonly sampleHygieneRub: number;
	readonly sampleLabRub: number;
	readonly sampleMaterialRub: number;
}

const PIECE_RATE_PRESETS: readonly PieceRatePreset[] = [
	{
		id: "therapist_standard",
		title: "Терапевт (Стандарт РФ)",
		description: "25% терапия, 30% гигиена. Без удержания материалов.",
		therapyRatePct: 25,
		orthopedicsRatePct: 0,
		surgeryRatePct: 0,
		hygieneRatePct: 30,
		labDeductionPct: 100,
		materialDeductionPct: 0,
		baseShiftSalaryRub: 0,
		sampleTherapyRub: 450000,
		sampleOrthopedicsRub: 0,
		sampleSurgeryRub: 0,
		sampleHygieneRub: 80000,
		sampleLabRub: 0,
		sampleMaterialRub: 35000,
	},
	{
		id: "orthopedist_standard",
		title: "Ортопед (100% удержание ЗТЛ)",
		description: "20% ортопедия с полным вычетом расходов лаборатории из начислений врача.",
		therapyRatePct: 0,
		orthopedicsRatePct: 20,
		surgeryRatePct: 0,
		hygieneRatePct: 0,
		labDeductionPct: 100,
		materialDeductionPct: 0,
		baseShiftSalaryRub: 0,
		sampleTherapyRub: 0,
		sampleOrthopedicsRub: 750000,
		sampleSurgeryRub: 0,
		sampleHygieneRub: 0,
		sampleLabRub: 220000,
		sampleMaterialRub: 45000,
	},
	{
		id: "surgeon_implantologist",
		title: "Хирург-имплантолог",
		description: "25% хирургия и костная пластика. Дорогие мембраны и титан списываются клиникой.",
		therapyRatePct: 0,
		orthopedicsRatePct: 0,
		surgeryRatePct: 25,
		hygieneRatePct: 0,
		labDeductionPct: 0,
		materialDeductionPct: 0,
		baseShiftSalaryRub: 0,
		sampleTherapyRub: 0,
		sampleOrthopedicsRub: 0,
		sampleSurgeryRub: 600000,
		sampleHygieneRub: 0,
		sampleLabRub: 0,
		sampleMaterialRub: 90000,
	},
	{
		id: "solo_universal",
		title: "Универсал (Соло / 1 кресло)",
		description: "25% со всей кассы. 100% вычет ЗТЛ заказ-нарядов. Автоматический расчет.",
		therapyRatePct: 25,
		orthopedicsRatePct: 25,
		surgeryRatePct: 25,
		hygieneRatePct: 30,
		labDeductionPct: 100,
		materialDeductionPct: 0,
		baseShiftSalaryRub: 0,
		sampleTherapyRub: 250000,
		sampleOrthopedicsRub: 350000,
		sampleSurgeryRub: 120000,
		sampleHygieneRub: 50000,
		sampleLabRub: 95000,
		sampleMaterialRub: 40000,
	},
];

export function DoctorPieceRateCalculatorSection() {
	// Состояние выручки по направлениям (в рублях ввода)
	const [therapyRub, setTherapyRub] = useState<number>(450000);
	const [orthopedicsRub, setOrthopedicsRub] = useState<number>(350000);
	const [surgeryRub, setSurgeryRub] = useState<number>(150000);
	const [hygieneRub, setHygieneRub] = useState<number>(60000);

	// Процентные ставки врача (%)
	const [therapyRatePct, setTherapyRatePct] = useState<number>(25);
	const [orthopedicsRatePct, setOrthopedicsRatePct] = useState<number>(20);
	const [surgeryRatePct, setSurgeryRatePct] = useState<number>(25);
	const [hygieneRatePct, setHygieneRatePct] = useState<number>(30);

	// Расходы и удержания
	const [labCostRub, setLabCostRub] = useState<number>(95000);
	const [labDeductionPct, setLabDeductionPct] = useState<number>(100);

	const [materialCostRub, setMaterialCostRub] = useState<number>(45000);
	const [materialDeductionPct, setMaterialDeductionPct] = useState<number>(0);

	// Гарантированный оклад / смена
	const [baseSalaryRub, setBaseSalaryRub] = useState<number>(0);

	// Расчет сдельной оплаты строго в целых копейках
	const calculation: DoctorPieceRatePayoutResult = useMemo(() => {
		const input: DoctorCategoryPerformanceInput = {
			therapyRevenueKopecks: Math.max(0, Math.round(therapyRub * 100)),
			therapyRatePct,
			orthopedicsRevenueKopecks: Math.max(0, Math.round(orthopedicsRub * 100)),
			orthopedicsRatePct,
			surgeryRevenueKopecks: Math.max(0, Math.round(surgeryRub * 100)),
			surgeryRatePct,
			hygieneRevenueKopecks: Math.max(0, Math.round(hygieneRub * 100)),
			hygieneRatePct,
			labOrdersCostKopecks: Math.max(0, Math.round(labCostRub * 100)),
			labDeductionPct,
			materialCostKopecks: Math.max(0, Math.round(materialCostRub * 100)),
			materialDeductionPct,
			baseShiftSalaryKopecks: Math.max(0, Math.round(baseSalaryRub * 100)),
		};

		return calculateDoctorPieceRatePayout(input);
	}, [
		therapyRub,
		therapyRatePct,
		orthopedicsRub,
		orthopedicsRatePct,
		surgeryRub,
		surgeryRatePct,
		hygieneRub,
		hygieneRatePct,
		labCostRub,
		labDeductionPct,
		materialCostRub,
		materialDeductionPct,
		baseSalaryRub,
	]);

	const handleApplyPreset = (preset: PieceRatePreset) => {
		setTherapyRatePct(preset.therapyRatePct);
		setOrthopedicsRatePct(preset.orthopedicsRatePct);
		setSurgeryRatePct(preset.surgeryRatePct);
		setHygieneRatePct(preset.hygieneRatePct);
		setLabDeductionPct(preset.labDeductionPct);
		setMaterialDeductionPct(preset.materialDeductionPct);
		setBaseSalaryRub(preset.baseShiftSalaryRub);
		setTherapyRub(preset.sampleTherapyRub);
		setOrthopedicsRub(preset.sampleOrthopedicsRub);
		setSurgeryRub(preset.sampleSurgeryRub);
		setHygieneRub(preset.sampleHygieneRub);
		setLabCostRub(preset.sampleLabRub);
		setMaterialCostRub(preset.sampleMaterialRub);
		showToast(`Применен пресет: «${preset.title}»`, "success");
	};

	const handleCopyReport = () => {
		const reportText = [
			"=== РАСЧЁТ СДЕЛЬНОЙ ОПЛАТЫ ТРУДА ВРАЧА ===",
			`Общая выручка: ${formatKopecksToRublesDisplay(calculation.totalRevenueKopecks)}`,
			`— Терапия (${therapyRatePct}% от ${formatKopecksToRublesDisplay(therapyRub * 100)}): ${formatKopecksToRublesDisplay(calculation.accruedTherapyKopecks)}`,
			`— Ортопедия (${orthopedicsRatePct}% от ${formatKopecksToRublesDisplay(orthopedicsRub * 100)}): ${formatKopecksToRublesDisplay(calculation.accruedOrthopedicsKopecks)}`,
			`— Хирургия (${surgeryRatePct}% от ${formatKopecksToRublesDisplay(surgeryRub * 100)}): ${formatKopecksToRublesDisplay(calculation.accruedSurgeryKopecks)}`,
			`— Гигиена (${hygieneRatePct}% от ${formatKopecksToRublesDisplay(hygieneRub * 100)}): ${formatKopecksToRublesDisplay(calculation.accruedHygieneKopecks)}`,
			`Всего начислено комиссионных: ${formatKopecksToRublesDisplay(calculation.grossAccruedCommissionKopecks)}`,
			`Удержано ЗТЛ (${labDeductionPct}%): −${formatKopecksToRublesDisplay(calculation.withheldLabKopecks)}`,
			`Удержано материалов (${materialDeductionPct}%): −${formatKopecksToRublesDisplay(calculation.withheldMaterialKopecks)}`,
			`Гарантированный оклад / смены: +${formatKopecksToRublesDisplay(calculation.baseShiftSalaryKopecks)}`,
			"--------------------------------------------------",
			`ИТОГО К ВЫПЛАТЕ ВРАЧУ: ${formatKopecksToRublesDisplay(calculation.netPayoutKopecks)}`,
			`Маржинальный доход клиники: ${formatKopecksToRublesDisplay(calculation.totalRevenueKopecks - calculation.netPayoutKopecks)} (${calculation.clinicMarginPct}%)`,
		].join("\n");

		navigator.clipboard.writeText(reportText);
		showToast("Ведомость сдельной оплаты скопирована в буфер", "success");
	};

	return (
		<section className="settings-section" data-testid="doctor-piece-rate-calculator-section">
			{/* Шапка калькулятора */}
			<div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-[var(--line)]">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal-soft)] flex items-center justify-center text-[var(--teal-dark)]">
						<Calculator size={18} />
					</div>
					<div>
						<h3 className="m-0 text-base font-bold text-[var(--ink)]">
							Калькулятор сдельной оплаты труда врачей
						</h3>
						<p className="m-0 text-xs text-[var(--muted)]">
							Моделирование мотивации: процент от выручки, удержание ЗТЛ/материалов и маржа клиники.
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={handleCopyReport}
					className="primary-button text-xs py-1.5 px-3 min-h-[34px] flex items-center gap-1.5 cursor-pointer"
				>
					<Copy size={13} />
					<span>Скопировать расчёт</span>
				</button>
			</div>

			{/* Быстрые пресеты условий оплаты */}
			<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] mb-4 space-y-2">
				<span className="text-xs font-bold text-[var(--ink)] block">
					Типовые отраслевые модели оплаты труда (1 клик):
				</span>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
					{PIECE_RATE_PRESETS.map((preset) => (
						<button
							key={preset.id}
							type="button"
							onClick={() => handleApplyPreset(preset)}
							className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-left hover:border-[var(--teal)] transition-all cursor-pointer flex flex-col justify-between min-h-[44px]"
						>
							<div>
								<span className="text-xs font-bold text-[var(--ink)] block">
									{preset.title}
								</span>
								<span className="text-[11px] text-[var(--muted)] block mt-0.5 line-clamp-2">
									{preset.description}
								</span>
							</div>
						</button>
					))}
				</div>
			</div>

			{/* Сетка параметров и результатов */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
				{/* Левая колонка: Ввод выручки и ставок */}
				<div className="lg:col-span-7 space-y-4">
					<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3">
						<span className="text-xs font-bold text-[var(--ink)] block">
							Выручка и процентная ставка врача по направлениям:
						</span>

						{/* Терапия */}
						<div className="grid grid-cols-12 gap-2 items-center">
							<span className="col-span-4 text-xs font-medium text-[var(--ink)]">Терапия:</span>
							<div className="col-span-5 relative">
								<input
									type="number"
									value={therapyRub}
									onChange={(e) => setTherapyRub(Number(e.target.value) || 0)}
									className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
								/>
								<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">₽</span>
							</div>
							<div className="col-span-3 relative">
								<input
									type="number"
									value={therapyRatePct}
									onChange={(e) => setTherapyRatePct(Number(e.target.value) || 0)}
									className="w-full text-xs px-2 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
								/>
								<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">%</span>
							</div>
						</div>

						{/* Ортопедия */}
						<div className="grid grid-cols-12 gap-2 items-center">
							<span className="col-span-4 text-xs font-medium text-[var(--ink)]">Ортопедия:</span>
							<div className="col-span-5 relative">
								<input
									type="number"
									value={orthopedicsRub}
									onChange={(e) => setOrthopedicsRub(Number(e.target.value) || 0)}
									className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
								/>
								<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">₽</span>
							</div>
							<div className="col-span-3 relative">
								<input
									type="number"
									value={orthopedicsRatePct}
									onChange={(e) => setOrthopedicsRatePct(Number(e.target.value) || 0)}
									className="w-full text-xs px-2 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
								/>
								<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">%</span>
							</div>
						</div>

						{/* Хирургия */}
						<div className="grid grid-cols-12 gap-2 items-center">
							<span className="col-span-4 text-xs font-medium text-[var(--ink)]">Хирургия:</span>
							<div className="col-span-5 relative">
								<input
									type="number"
									value={surgeryRub}
									onChange={(e) => setSurgeryRub(Number(e.target.value) || 0)}
									className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
								/>
								<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">₽</span>
							</div>
							<div className="col-span-3 relative">
								<input
									type="number"
									value={surgeryRatePct}
									onChange={(e) => setSurgeryRatePct(Number(e.target.value) || 0)}
									className="w-full text-xs px-2 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
								/>
								<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">%</span>
							</div>
						</div>

						{/* Гигиена */}
						<div className="grid grid-cols-12 gap-2 items-center">
							<span className="col-span-4 text-xs font-medium text-[var(--ink)]">Гигиена:</span>
							<div className="col-span-5 relative">
								<input
									type="number"
									value={hygieneRub}
									onChange={(e) => setHygieneRub(Number(e.target.value) || 0)}
									className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
								/>
								<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">₽</span>
							</div>
							<div className="col-span-3 relative">
								<input
									type="number"
									value={hygieneRatePct}
									onChange={(e) => setHygieneRatePct(Number(e.target.value) || 0)}
									className="w-full text-xs px-2 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
								/>
								<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">%</span>
							</div>
						</div>
					</div>

					{/* Удержания ЗТЛ и материалов */}
					<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3">
						<span className="text-xs font-bold text-[var(--ink)] block">
							Расходы и удержания с врача:
						</span>

						{/* Лаборатория ЗТЛ */}
						<div className="grid grid-cols-12 gap-2 items-center">
							<span className="col-span-4 text-xs font-medium text-[var(--ink)]">Заказ-наряды ЗТЛ:</span>
							<div className="col-span-5 relative">
								<input
									type="number"
									value={labCostRub}
									onChange={(e) => setLabCostRub(Number(e.target.value) || 0)}
									className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
								/>
								<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">₽</span>
							</div>
							<div className="col-span-3 relative">
								<input
									type="number"
									value={labDeductionPct}
									onChange={(e) => setLabDeductionPct(Number(e.target.value) || 0)}
									className="w-full text-xs px-2 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
								/>
								<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">% вычет</span>
							</div>
						</div>

						{/* Материалы */}
						<div className="grid grid-cols-12 gap-2 items-center">
							<span className="col-span-4 text-xs font-medium text-[var(--ink)]">Расходные материалы:</span>
							<div className="col-span-5 relative">
								<input
									type="number"
									value={materialCostRub}
									onChange={(e) => setMaterialCostRub(Number(e.target.value) || 0)}
									className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
								/>
								<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">₽</span>
							</div>
							<div className="col-span-3 relative">
								<input
									type="number"
									value={materialDeductionPct}
									onChange={(e) => setMaterialDeductionPct(Number(e.target.value) || 0)}
									className="w-full text-xs px-2 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
								/>
								<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">% вычет</span>
							</div>
						</div>

						{/* Гарантированный оклад */}
						<div className="grid grid-cols-12 gap-2 items-center pt-1 border-t border-[var(--line)]">
							<span className="col-span-4 text-xs font-medium text-[var(--ink)]">Гарант за смены (оклад):</span>
							<div className="col-span-8 relative">
								<input
									type="number"
									value={baseSalaryRub}
									onChange={(e) => setBaseSalaryRub(Number(e.target.value) || 0)}
									placeholder="0 ₽"
									className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
								/>
								<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">₽</span>
							</div>
						</div>
					</div>
				</div>

				{/* Правая колонка: Итоговая ведомость и баланс клиники */}
				<div className="lg:col-span-5 space-y-4">
					<div className="p-4 rounded-xl bg-gradient-to-br from-[var(--paper-soft)] to-[var(--paper)] border border-[var(--line)] shadow-2xs space-y-3">
						<span className="text-xs font-bold text-[var(--ink)] flex items-center justify-between">
							<span>Ведомость начисления</span>
							<span className="text-[11px] font-mono text-[var(--muted)]">Точность: 1 копейка</span>
						</span>

						<div className="space-y-1.5 text-xs text-[var(--ink)]">
							<div className="flex justify-between py-1 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">Общая выручка врача:</span>
								<span className="font-bold">
									{formatKopecksToRublesDisplay(calculation.totalRevenueKopecks)}
								</span>
							</div>

							<div className="flex justify-between py-0.5 text-[11px]">
								<span className="text-[var(--muted)]">Начислено комиссионных:</span>
								<span className="font-semibold text-emerald-600 dark:text-emerald-400">
									+{formatKopecksToRublesDisplay(calculation.grossAccruedCommissionKopecks)}
								</span>
							</div>

							{calculation.baseShiftSalaryKopecks > 0 && (
								<div className="flex justify-between py-0.5 text-[11px]">
									<span className="text-[var(--muted)]">Окладная часть за смены:</span>
									<span className="font-semibold text-emerald-600 dark:text-emerald-400">
										+{formatKopecksToRublesDisplay(calculation.baseShiftSalaryKopecks)}
									</span>
								</div>
							)}

							{calculation.withheldLabKopecks > 0 && (
								<div className="flex justify-between py-0.5 text-[11px]">
									<span className="text-[var(--muted)]">Удержание за ЗТЛ:</span>
									<span className="font-semibold text-amber-600 dark:text-amber-400">
										−{formatKopecksToRublesDisplay(calculation.withheldLabKopecks)}
									</span>
								</div>
							)}

							{calculation.withheldMaterialKopecks > 0 && (
								<div className="flex justify-between py-0.5 text-[11px]">
									<span className="text-[var(--muted)]">Удержание за материалы:</span>
									<span className="font-semibold text-amber-600 dark:text-amber-400">
										−{formatKopecksToRublesDisplay(calculation.withheldMaterialKopecks)}
									</span>
								</div>
							)}
						</div>

						{/* К выплате врачу */}
						<div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between">
							<div>
								<span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 block">
									К выплате врачу на руки
								</span>
								<span className="text-[10px] text-[var(--muted)] block">
									После всех вычетов и надбавок
								</span>
							</div>
							<span className="text-base font-extrabold text-teal-700 dark:text-teal-300">
								{formatKopecksToRublesDisplay(calculation.netPayoutKopecks)}
							</span>
						</div>

						{/* Доход клиники */}
						<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
							<div>
								<span className="text-[11px] font-bold text-[var(--ink)] block">
									Маржинальный доход клиники
								</span>
								<span className="text-[10px] text-[var(--muted)] block">
									Эффективная доля клиники
								</span>
							</div>
							<div className="text-right">
								<span className="text-sm font-bold text-[var(--ink)] block">
									{formatKopecksToRublesDisplay(
										calculation.totalRevenueKopecks - calculation.netPayoutKopecks,
									)}
								</span>
								<span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
									{calculation.clinicMarginPct}% маржа
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
