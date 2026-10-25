/**
 * apps/web/src/components/settings/owner/DoctorPieceRateCalculatorSection.tsx
 *
 * Интерактивный калькулятор сдельной оплаты труда (piece-rate pay) и мотивации врачей.
 * Фасад декомпозирован согласно Мандату 8b (строго <= 120 строк).
 *
 * Инварианты:
 * - Все расчеты ведутся строго в целочисленных копейках (integer kopecks) через pieceRateCalculator.
 * - Ноль мультяшных эмодзи (строго Lucide иконки).
 * - Полная прозрачность выплат, удержаний ЗТЛ и материалов, маржинальности клиники.
 */

import React from "react";
import { Calculator, Copy } from "lucide-react";
import { useDoctorPieceRateCalculator } from "./pieceRateModules/useDoctorPieceRateCalculator";
import { PieceRatePresetsBar } from "./pieceRateModules/PieceRatePresetsBar";
import { PieceRateInputsPanel } from "./pieceRateModules/PieceRateInputsPanel";
import { PieceRateSummaryCard } from "./pieceRateModules/PieceRateSummaryCard";

export function DoctorPieceRateCalculatorSection() {
	const calc = useDoctorPieceRateCalculator();

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
					onClick={calc.handleCopyReport}
					className="primary-button text-xs py-1.5 px-3 min-h-[36px] flex items-center gap-1.5 cursor-pointer rounded-xl font-medium"
				>
					<Copy size={14} />
					<span>Скопировать расчёт</span>
				</button>
			</div>

			{/* Быстрые пресеты условий оплаты */}
			<PieceRatePresetsBar
				activePresetId={calc.activePresetId}
				onApplyPreset={calc.handleApplyPreset}
			/>

			{/* Сетка параметров и результатов */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
				{/* Левая колонка: Ввод выручки и ставок */}
				<div className="lg:col-span-7">
					<PieceRateInputsPanel
						therapyRub={calc.therapyRub}
						setTherapyRub={calc.setTherapyRub}
						therapyRatePct={calc.therapyRatePct}
						setTherapyRatePct={calc.setTherapyRatePct}
						orthopedicsRub={calc.orthopedicsRub}
						setOrthopedicsRub={calc.setOrthopedicsRub}
						orthopedicsRatePct={calc.orthopedicsRatePct}
						setOrthopedicsRatePct={calc.setOrthopedicsRatePct}
						surgeryRub={calc.surgeryRub}
						setSurgeryRub={calc.setSurgeryRub}
						surgeryRatePct={calc.surgeryRatePct}
						setSurgeryRatePct={calc.setSurgeryRatePct}
						hygieneRub={calc.hygieneRub}
						setHygieneRub={calc.setHygieneRub}
						hygieneRatePct={calc.hygieneRatePct}
						setHygieneRatePct={calc.setHygieneRatePct}
						labCostRub={calc.labCostRub}
						setLabCostRub={calc.setLabCostRub}
						labDeductionPct={calc.labDeductionPct}
						setLabDeductionPct={calc.setLabDeductionPct}
						materialCostRub={calc.materialCostRub}
						setMaterialCostRub={calc.setMaterialCostRub}
						materialDeductionPct={calc.materialDeductionPct}
						setMaterialDeductionPct={calc.setMaterialDeductionPct}
						baseSalaryRub={calc.baseSalaryRub}
						setBaseSalaryRub={calc.setBaseSalaryRub}
					/>
				</div>

				{/* Правая колонка: Итоговая ведомость и баланс клиники */}
				<div className="lg:col-span-5 space-y-4">
					<PieceRateSummaryCard calculation={calc.calculation} />
				</div>
			</div>
		</section>
	);
}
