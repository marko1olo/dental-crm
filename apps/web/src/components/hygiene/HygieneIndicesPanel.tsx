/**
 * HygieneIndicesPanel.tsx — Экспресс-расчет клинических индексов гигиены полости рта (OHI-S, PMA, КПИ Леуса, Silness-Löe, Федорова-Володкиной, PHP).
 * Архитектурная декомпозиция по Mandate 8b (Layer 5 Facade, <= 120 строк).
 */

import React from "react";
import type { CombinedHygieneReport, PerioToothRecord } from "@dental/shared";
import {
	calculateFedorovVolodkinaScore,
	calculatePhpScore,
	calculateSilnessLoeScore,
	type ExtendedToothAssessment,
	type FedorovVolodkinaResult,
	type PhpResult,
	type SilnessLoeResult,
} from "@dental/shared";
import {
	CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU,
	CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU,
	CLINICAL_TOOTH_MOUSSE_SUMMARY_RU,
	createDeepFluoridationProtocolText,
	createPerioAntisepticProtocolText,
	createToothMousseProtocolText,
	HYGIENE_EXPRESS_SERVICES,
} from "./hygienePresetsData";
import { OhiSilnessCalculator } from "./OhiSilnessCalculator";
import { KpuBleedingIndicesCalculator } from "./KpuBleedingIndicesCalculator";
import { PmaKpiSextantsGrid } from "./PmaKpiSextantsGrid";
import { HygieneExpressPresetsStrip } from "./HygieneExpressPresetsStrip";
import { HygieneHomeCareCard } from "./HygieneHomeCareCard";
import { HygieneBottomSheetDrawer } from "./HygieneBottomSheetDrawer";
import { HygienePanelContent } from "./HygienePanelContent";
import { type ActiveHygieneIndexTab, useHygienePanelLogic } from "./useHygienePanelLogic";

export {
	CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU,
	CLINICAL_TOOTH_MOUSSE_SUMMARY_RU,
	CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU,
	HYGIENE_EXPRESS_SERVICES,
	createDeepFluoridationProtocolText,
	createToothMousseProtocolText,
	createPerioAntisepticProtocolText,
	type ExtendedToothAssessment,
	type SilnessLoeResult,
	type FedorovVolodkinaResult,
	type PhpResult,
	calculateSilnessLoeScore,
	calculateFedorovVolodkinaScore,
	calculatePhpScore,
	OhiSilnessCalculator,
	KpuBleedingIndicesCalculator,
	HygieneExpressPresetsStrip,
	HygieneHomeCareCard,
	HygieneBottomSheetDrawer,
	type ActiveHygieneIndexTab,
};

export interface HygieneIndicesPanelProps {
	readonly perioTeeth?: readonly PerioToothRecord[] | undefined;
	readonly onChange?: ((report: CombinedHygieneReport) => void) | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly compactMode?: boolean | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly previousOhiS?:
		| { ohi_s: number; debris?: number; calculus?: number; date?: string }
		| number
		| null
		| undefined;
}

export const HygieneIndicesPanel: React.FC<HygieneIndicesPanelProps> = ({
	perioTeeth,
	onChange,
	onInsertToProtocol,
	readOnly = false,
	compactMode = false,
	patientName,
	doctorName,
	patientId,
	visitId,
	previousOhiS,
}) => {
	const logic = useHygienePanelLogic({
		perioTeeth,
		onChange,
		onInsertToProtocol,
		readOnly,
		patientId,
		visitId,
		doctorName,
		previousOhiS,
	});

	const contentProps = { logic, readOnly, compactMode, perioTeeth, patientName, doctorName, onInsertToProtocol };

	return (
		<>
			<HygienePanelContent {...contentProps} />
			<HygieneBottomSheetDrawer
				isOpen={logic.isBottomSheetOpen}
				onClose={() => logic.setIsBottomSheetOpen(false)}
				title="Индексы гигиены полости рта"
				subtitle="Экспресс-пресеты OHI-S, SBI, 804н и домашний уход"
			>
				<HygienePanelContent {...contentProps} />
			</HygieneBottomSheetDrawer>
		</>
	);
};

HygieneIndicesPanel.displayName = "HygieneIndicesPanel";
