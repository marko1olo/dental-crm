/**
 * apps/web/src/components/settings/owner/DoctorPieceRateCalculatorSection.tsx
 *
 * Интерактивный калькулятор сдельной оплаты труда (piece-rate pay) и мотивации врачей.
 * Фасад декомпозирован согласно Мандату 8b (строго <= 250 строк).
 *
 * Инварианты:
 * - Все расчеты ведутся строго в целочисленных копейках (integer kopecks) через pieceRateCalculator.
 * - Ноль мультяшных эмодзи (строго Lucide иконки).
 * - Полная прозрачность выплат, удержаний ЗТЛ и материалов, маржинальности клиники.
 */

import React, { useMemo, useState } from "react";
import { Calculator, Copy } from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	calculateDoctorPieceRatePayout,
	formatKopecksToRublesDisplay,
	type DoctorCategoryPerformanceInput,
	type DoctorPieceRatePayoutResult,
} from "@dental/shared";
import {
	type PieceRatePreset,
} from "./pieceRateModules/pieceRateTypes";
import { PieceRatePresetsBar } from "./pieceRateModules/PieceRatePresetsBar";
import { PieceRateInputsPanel } from "./pieceRateModules/PieceRateInputsPanel";
import { PieceRateSummaryCard } from "./pieceRateModules/PieceRateSummaryCard";

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

	// Активный пресет
	const [activePresetId, setActivePresetId] = useState<string>("therapist_standard");

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
		setActivePresetId(preset.id);
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
			<PieceRatePresetsBar
				activePresetId={activePresetId}
				onApplyPreset={handleApplyPreset}
			/>

			{/* Сетка параметров и результатов */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
				{/* Левая колонка: Ввод выручки и ставок */}
				<div className="lg:col-span-7">
					<PieceRateInputsPanel
						therapyRub={therapyRub}
						setTherapyRub={setTherapyRub}
						therapyRatePct={therapyRatePct}
						setTherapyRatePct={setTherapyRatePct}
						orthopedicsRub={orthopedicsRub}
						setOrthopedicsRub={setOrthopedicsRub}
						orthopedicsRatePct={orthopedicsRatePct}
						setOrthopedicsRatePct={setOrthopedicsRatePct}
						surgeryRub={surgeryRub}
						setSurgeryRub={setSurgeryRub}
						surgeryRatePct={surgeryRatePct}
						setSurgeryRatePct={setSurgeryRatePct}
						hygieneRub={hygieneRub}
						setHygieneRub={setHygieneRub}
						hygieneRatePct={hygieneRatePct}
						setHygieneRatePct={setHygieneRatePct}
						labCostRub={labCostRub}
						setLabCostRub={setLabCostRub}
						labDeductionPct={labDeductionPct}
						setLabDeductionPct={setLabDeductionPct}
						materialCostRub={materialCostRub}
						setMaterialCostRub={setMaterialCostRub}
						materialDeductionPct={materialDeductionPct}
						setMaterialDeductionPct={setMaterialDeductionPct}
						baseSalaryRub={baseSalaryRub}
						setBaseSalaryRub={setBaseSalaryRub}
					/>
				</div>

				{/* Правая колонка: Итоговая ведомость и баланс клиники */}
				<div className="lg:col-span-5 space-y-4">
					<PieceRateSummaryCard calculation={calculation} />
				</div>
			</div>
		</section>
	);
}
