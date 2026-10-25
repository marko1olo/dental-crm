/**
 * useDoctorPieceRateCalculator.ts
 *
 * Хук интерактивного калькулятора сдельной оплаты труда (piece-rate pay) и мотивации врачей.
 * Модуль декомпозирован согласно Мандату 8b (строго <= 120 строк).
 */

import { useMemo, useState } from "react";
import { showToast } from "../../../GlobalToast";
import {
	calculateDoctorPieceRatePayout,
	formatKopecksToRublesDisplay,
	type DoctorCategoryPerformanceInput,
	type DoctorPieceRatePayoutResult,
} from "@dental/shared";
import type { PieceRatePreset } from "./pieceRateTypes";

export function useDoctorPieceRateCalculator() {
	const [therapyRub, setTherapyRub] = useState<number>(450000);
	const [orthopedicsRub, setOrthopedicsRub] = useState<number>(350000);
	const [surgeryRub, setSurgeryRub] = useState<number>(150000);
	const [hygieneRub, setHygieneRub] = useState<number>(60000);

	const [therapyRatePct, setTherapyRatePct] = useState<number>(25);
	const [orthopedicsRatePct, setOrthopedicsRatePct] = useState<number>(20);
	const [surgeryRatePct, setSurgeryRatePct] = useState<number>(25);
	const [hygieneRatePct, setHygieneRatePct] = useState<number>(30);

	const [labCostRub, setLabCostRub] = useState<number>(95000);
	const [labDeductionPct, setLabDeductionPct] = useState<number>(100);
	const [materialCostRub, setMaterialCostRub] = useState<number>(45000);
	const [materialDeductionPct, setMaterialDeductionPct] = useState<number>(0);
	const [baseSalaryRub, setBaseSalaryRub] = useState<number>(0);
	const [activePresetId, setActivePresetId] = useState<string>("therapist_standard");

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
		therapyRub, therapyRatePct, orthopedicsRub, orthopedicsRatePct,
		surgeryRub, surgeryRatePct, hygieneRub, hygieneRatePct,
		labCostRub, labDeductionPct, materialCostRub, materialDeductionPct, baseSalaryRub,
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
		const fmt = formatKopecksToRublesDisplay;
		const reportText = [
			"=== РАСЧЁТ СДЕЛЬНОЙ ОПЛАТЫ ТРУДА ВРАЧА ===",
			`Общая выручка: ${fmt(calculation.totalRevenueKopecks)}`,
			`— Терапия (${therapyRatePct}% от ${fmt(therapyRub * 100)}): ${fmt(calculation.accruedTherapyKopecks)}`,
			`— Ортопедия (${orthopedicsRatePct}% от ${fmt(orthopedicsRub * 100)}): ${fmt(calculation.accruedOrthopedicsKopecks)}`,
			`— Хирургия (${surgeryRatePct}% от ${fmt(surgeryRub * 100)}): ${fmt(calculation.accruedSurgeryKopecks)}`,
			`— Гигиена (${hygieneRatePct}% от ${fmt(hygieneRub * 100)}): ${fmt(calculation.accruedHygieneKopecks)}`,
			`Всего начислено комиссионных: ${fmt(calculation.grossAccruedCommissionKopecks)}`,
			`Удержано ЗТЛ (${labDeductionPct}%): −${fmt(calculation.withheldLabKopecks)}`,
			`Удержано материалов (${materialDeductionPct}%): −${fmt(calculation.withheldMaterialKopecks)}`,
			`Гарантированный оклад / смены: +${fmt(calculation.baseShiftSalaryKopecks)}`,
			"--------------------------------------------------",
			`ИТОГО К ВЫПЛАТЕ ВРАЧУ: ${fmt(calculation.netPayoutKopecks)}`,
			`Маржинальный доход клиники: ${fmt(calculation.totalRevenueKopecks - calculation.netPayoutKopecks)} (${calculation.clinicMarginPct}%)`,
		].join("\n");
		navigator.clipboard.writeText(reportText);
		showToast("Ведомость сдельной оплаты скопирована в буфер", "success");
	};

	return {
		therapyRub, setTherapyRub, therapyRatePct, setTherapyRatePct,
		orthopedicsRub, setOrthopedicsRub, orthopedicsRatePct, setOrthopedicsRatePct,
		surgeryRub, setSurgeryRub, surgeryRatePct, setSurgeryRatePct,
		hygieneRub, setHygieneRub, hygieneRatePct, setHygieneRatePct,
		labCostRub, setLabCostRub, labDeductionPct, setLabDeductionPct,
		materialCostRub, setMaterialCostRub, materialDeductionPct, setMaterialDeductionPct,
		baseSalaryRub, setBaseSalaryRub, activePresetId, calculation,
		handleApplyPreset, handleCopyReport,
	};
}
