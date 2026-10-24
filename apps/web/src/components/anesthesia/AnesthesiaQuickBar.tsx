/**
 * @dental/web/components/anesthesia/AnesthesiaQuickBar.tsx
 * DENTE Chairside Anesthesia QuickBar (Mandates 8b, 8e, 8n, 8am, <= 120 lines)
 */

import { CheckCircle2 } from "lucide-react";
import React, { useId, useState } from "react";
import { type AnestheticDrugId, type InjectionTechniqueId } from "./anesthesiaCatalog";
import {
	type AnesthesiaCalculationResult,
	type AnesthesiaPatientMemoParams,
	calculateAnesthesiaSafety,
	formatAnesthesiaPatientMemo,
	resolveClinicalDefaultWeightKg,
} from "./anesthesiaEngine";
import { persistAnesthesiaLog } from "./anesthesiaQuickBar/anesthesiaApiPersistence";
import { AnesthesiaMobileBottomSheet } from "./anesthesiaQuickBar/AnesthesiaMobileBottomSheet";
import { AnesthesiaPresetDrugsRow } from "./anesthesiaQuickBar/AnesthesiaPresetDrugsRow";
import { AnesthesiaStepperAndCtaRow } from "./anesthesiaQuickBar/AnesthesiaStepperAndCtaRow";
import { AnesthesiaTopHeaderRow } from "./anesthesiaQuickBar/AnesthesiaTopHeaderRow";

if (typeof document !== "undefined") {
	import("./anesthesia.css");
}

export { STANDARD_ANESTHESIA_NORM_PRESET_RU } from "../../lib/clinicalProtocolsReception";
export type { AnesthesiaPatientMemoParams, AnesthesiaCalculationResult };
export { formatAnesthesiaPatientMemo, resolveClinicalDefaultWeightKg };
export { WEIGHT_QUICK_PRESETS, WEIGHT_PRESETS, type PrimaryAnestheticDrug, PRIMARY_ANESTHETIC_DRUGS } from "./anesthesiaQuickBar/primaryDrugs";

export interface AnesthesiaQuickBarProps {
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly patientWeightKg?: number | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly hasCardiovascularRisk?: boolean | undefined;
	readonly hasHypertension?: boolean | undefined;
	readonly hasCardiacArrhythmia?: boolean | undefined;
	readonly hasIschemicHeartDisease?: boolean | undefined;
	readonly hasMyocardialInfarctionHistory?: boolean | undefined;
	readonly takesBetaBlockers?: boolean | undefined;
	readonly hasSulfiteAllergy?: boolean | undefined;
	readonly hasBronchialAsthma?: boolean | undefined;
	readonly isPregnantOrLactating?: boolean | undefined;
	readonly hasLidocaineAllergy?: boolean | undefined;
	readonly hasArticaineAllergy?: boolean | undefined;
	readonly targetToothNumberFdi?: number | string | undefined;
	readonly onApplyAnesthesia?: ((diaryText: string, result: AnesthesiaCalculationResult) => void) | undefined;
	readonly onDisposalCarpules?: ((carpulesCount: number, drugId?: AnestheticDrugId | undefined) => void) | undefined;
	readonly onOpenEmergencyProtocol?: (() => void) | undefined;
	readonly servicePriceRub?: number | undefined;
	readonly disabled?: boolean | undefined;
}

export function AnesthesiaQuickBar(props: AnesthesiaQuickBarProps) {
	const initialDrugId: AnestheticDrugId = props.hasLidocaineAllergy || props.hasArticaineAllergy ? "mepivacaine_plain" : "articaine_1_100k";
	const [selectedDrugId, setSelectedDrugId] = useState<AnestheticDrugId | "none">(initialDrugId);
	const [techniqueId, setTechniqueId] = useState<InjectionTechniqueId>("infiltration");
	const [carpulesCount, setCarpulesCount] = useState<number>(1.0);
	const [isAspirationNegative, setIsAspirationNegative] = useState<boolean>(true);
	const [lastAppliedText, setLastAppliedText] = useState<string | null>(null);
	const [toastMessage, setToastMessage] = useState<string | null>(null);
	const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
	const memoCopyButtonId = useId();

	const weight = resolveClinicalDefaultWeightKg(props.patientWeightKg, props.patientAgeYears, false);
	const isCardioRisk = Boolean(props.hasCardiovascularRisk || props.hasHypertension || props.hasCardiacArrhythmia || props.hasIschemicHeartDisease || props.hasMyocardialInfarctionHistory || props.takesBetaBlockers);

	const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3000); };
	const stepCarpules = (delta: number) => setCarpulesCount((prev) => Math.min(6.0, Math.max(0.5, Math.round((prev + delta) * 10) / 10)));

	const applyAnesthesiaDirect = (drugId: AnestheticDrugId | "none", count: number, tech: InjectionTechniqueId = techniqueId) => {
		if (props.disabled) return;
		setSelectedDrugId(drugId); setCarpulesCount(count); setTechniqueId(tech);
		const effDrug: AnestheticDrugId = drugId === "none" ? "articaine_1_100k" : drugId;
		const result = calculateAnesthesiaSafety({
			drugId: effDrug, carpulesCount: count, patientWeightKg: weight, patientAgeYears: props.patientAgeYears ?? 35,
			asaStatus: isCardioRisk ? "asa_3" : "asa_1", hasCardiovascularRisk: isCardioRisk,
			hasSulfiteAllergy: Boolean(props.hasSulfiteAllergy), hasBronchialAsthma: Boolean(props.hasBronchialAsthma),
			isPregnantOrLactating: Boolean(props.isPregnantOrLactating), techniqueId: tech, targetToothNumberFdi: props.targetToothNumberFdi,
		});
		const diaryText = drugId === "none" ? "Анестезия не проводилась. Лечение проведено без анестезии по согласию пациента." : result.diaryEntryRu;
		setLastAppliedText(drugId === "none" ? "Лечение без анестезии" : `${drugId === "mepivacaine_plain" ? "Скандонест 3%" : drugId === "articaine_1_200k" ? "Ультракаин Д-С 1:200k" : "Ультракаин Д-С форте 1:100k"} — ${count} карп.`);
		props.onApplyAnesthesia?.(diaryText, result);
		if (drugId !== "none" && count > 0) {
			props.onDisposalCarpules?.(count, effDrug);
			persistAnesthesiaLog({ patientId: props.patientId, visitId: props.visitId, drugId: effDrug, techniqueId: tech, carpulesCount: count, patientWeightKg: weight, patientAgeYears: props.patientAgeYears ?? 35, isCardioRisk, targetToothNumberFdi: props.targetToothNumberFdi, diaryEntry: diaryText });
		}
		showToast(drugId === "none" ? "Отметка «Без анестезии» внесена в карту" : `Анестезия (${count} карп.) внесена в карту приёма`);
	};

	const copyPatientMemo = async () => {
		const drugName = selectedDrugId === "mepivacaine_plain" ? "Скандонест 3%" : selectedDrugId === "articaine_1_200k" ? "Ультракаин Д-С" : selectedDrugId === "none" ? "Без анестезии" : "Ультракаин Д-С форте";
		const memo = formatAnesthesiaPatientMemo({ clinicName: "Стоматологическая клиника DENTE", clinicPhone: "+7 (495) 123-45-67", patientName: "Пациент", doctorName: "Лечащий врач", drugTradeName: drugName, carpulesCount, targetArea: props.targetToothNumberFdi ? `зуб ${props.targetToothNumberFdi}` : "область вмешательства" });
		try { await navigator.clipboard.writeText(memo); showToast("Памятка пациенту скопирована в буфер"); } catch { showToast("Памятка сформирована"); }
	};

	return (
		<div className="anesthesia-quick-bar" data-testid="anesthesia-quick-bar">
			<AnesthesiaTopHeaderRow targetToothNumberFdi={props.targetToothNumberFdi} weight={weight} hasLidocaineAllergy={props.hasLidocaineAllergy} hasArticaineAllergy={props.hasArticaineAllergy} hasSulfiteAllergy={props.hasSulfiteAllergy} hasBronchialAsthma={props.hasBronchialAsthma} isCardioRisk={isCardioRisk} techniqueId={techniqueId} setTechniqueId={setTechniqueId} onOpenEmergencyProtocol={props.onOpenEmergencyProtocol} disabled={props.disabled} />
			<AnesthesiaPresetDrugsRow selectedDrugId={selectedDrugId} carpulesCount={carpulesCount} onApplyDirect={applyAnesthesiaDirect} onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)} disabled={props.disabled} />
			<AnesthesiaStepperAndCtaRow carpulesCount={carpulesCount} setCarpulesCount={setCarpulesCount} stepCarpules={stepCarpules} isAspirationNegative={isAspirationNegative} setIsAspirationNegative={setIsAspirationNegative} copyPatientMemo={copyPatientMemo} memoCopyButtonId={memoCopyButtonId} onApplyToCard={() => applyAnesthesiaDirect(selectedDrugId, carpulesCount)} disabled={props.disabled} />
			{lastAppliedText && (
				<div className="flex items-center gap-2 pt-1 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
					<CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
					<span>{`Внесено в дневник: ${lastAppliedText}`}</span>
				</div>
			)}
			{toastMessage && (
				<div className="anesthesia-quick-toast" role="status" aria-live="polite">
					<CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
					<span>{toastMessage}</span>
				</div>
			)}
			<AnesthesiaMobileBottomSheet isOpen={isMobileDrawerOpen} onClose={() => setIsMobileDrawerOpen(false)} carpulesCount={carpulesCount} selectedDrugId={selectedDrugId} onApplyDirect={applyAnesthesiaDirect} disabled={props.disabled} />
		</div>
	);
}
