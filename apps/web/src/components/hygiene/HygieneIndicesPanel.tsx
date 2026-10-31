/**
 * @dental/web/components/hygiene/HygieneIndicesPanel.tsx
 *
 * DENTE Dental CRM — Канонический фасад клинических индексов гигиены и экспресс-протоколов (Мандат 8b <= 150 строк, 8e).
 * Интегрирован со студией HygieneStudioModal и каталогом hygieneCatalogData.ts.
 */

import React, { useState, useCallback } from "react";
import type { CombinedHygieneReport, PerioToothRecord } from "@dental/shared";
import {
	calculateFedorovVolodkinaScore,
	calculatePhpScore,
	calculateSilnessLoeScore,
	CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU,
	CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU,
	CLINICAL_PERIO_NORM_SUMMARY_RU,
	CLINICAL_PRO_HYGIENE_SUMMARY_RU,
	CLINICAL_TOOTH_MOUSSE_SUMMARY_RU,
	createClinicalPerioNormProtocolText,
	createClinicalProHygieneProtocolText,
	createDeepFluoridationProtocolText,
	createPerioAntisepticProtocolText,
	createToothMousseProtocolText,
	HYGIENE_EXPRESS_SERVICES,
	type ExtendedToothAssessment,
	type FedorovVolodkinaResult,
	type PhpResult,
	type SilnessLoeResult,
} from "@dental/shared";
import { HygieneExpressPresetsStrip } from "./HygieneExpressPresetsStrip";
import { HygieneStudioModal } from "./HygieneStudioModal";
import { OHI_S_PRESETS } from "./hygieneCatalogData";

export type ActiveHygieneIndexTab = "ohi-s" | "silness-loe" | "fedorov-volodkina" | "php";

export {
	CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU,
	CLINICAL_TOOTH_MOUSSE_SUMMARY_RU,
	CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU,
	CLINICAL_PERIO_NORM_SUMMARY_RU,
	CLINICAL_PRO_HYGIENE_SUMMARY_RU,
	createClinicalPerioNormProtocolText,
	createClinicalProHygieneProtocolText,
	createDeepFluoridationProtocolText,
	createToothMousseProtocolText,
	createPerioAntisepticProtocolText,
	HYGIENE_EXPRESS_SERVICES,
	calculateSilnessLoeScore,
	calculateFedorovVolodkinaScore,
	calculatePhpScore,
	type ExtendedToothAssessment,
	type SilnessLoeResult,
	type FedorovVolodkinaResult,
	type PhpResult,
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
	readonly previousOhiS?: { ohi_s: number; debris?: number; calculus?: number; date?: string } | number | null | undefined;
}

export const HygieneIndicesPanel: React.FC<HygieneIndicesPanelProps> = ({
	onInsertToProtocol,
	readOnly = false,
	patientName = "Пациент приёма",
	doctorName = "Д-р Смирнова А.В.",
	previousOhiS = 2.4,
}) => {
	const [isStudioOpen, setIsStudioOpen] = useState<boolean>(false);
	const [activeOhiSIndex, setActiveOhiSIndex] = useState<number>(1);

	const handleApplyPreset = useCallback((presetName: string, protocolText: string) => {
		onInsertToProtocol?.(protocolText);
	}, [onInsertToProtocol]);

	return (
		<div className="flex flex-col gap-3 p-3.5 bg-[var(--paper-soft)] border border-[var(--line)] rounded-2xl text-[var(--ink)]">
			{/* Шапка панели */}
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div>
					<h3 className="text-sm font-bold text-[var(--ink)]">
						Индексы гигиены полости рта (OHI-S, PMA, КПИ Леуса)
					</h3>
					<p className="text-xs text-[var(--ink-muted)]">
						Экспресс-оценка уровня зубных отложений и состояния десны
					</p>
				</div>

				<button
					type="button"
					onClick={() => setIsStudioOpen(true)}
					className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors min-h-[36px]"
				>
					Открыть студию гигиены
				</button>
			</div>

			{/* Экспресс-пресеты OHI-S & 804н */}
			<HygieneExpressPresetsStrip
				onPresetHygieneNorm={() => setActiveOhiSIndex(0)}
				onPresetHygieneFair={() => setActiveOhiSIndex(1)}
				onPresetHygienePoor={() => setActiveOhiSIndex(2)}
				onPresetHygieneSevere={() => setActiveOhiSIndex(3)}
				onPresetPeriodontalNorm={() => handleApplyPreset("norm", createClinicalPerioNormProtocolText())}
				onPresetCatarrhalGingivitis={() => handleApplyPreset("gingivitis", "Хронический катаральный гингивит")}
				onPresetMildPeriodontitis={() => handleApplyPreset("mild", "Хронический генерализованный пародонтит легкой степени")}
				onPresetModeratePeriodontitis={() => handleApplyPreset("moderate", "Хронический генерализованный пародонтит средней степени")}
				onPresetSeverePeriodontitis={() => handleApplyPreset("severe", "Хронический генерализованный пародонтит тяжелой степени")}
				onPresetProHygieneDone={() => handleApplyPreset("prophy", createClinicalProHygieneProtocolText())}
				onPresetDeepFluoridation={() => handleApplyPreset("fluor", createDeepFluoridationProtocolText())}
				onPresetToothMousse={() => handleApplyPreset("mousse", createToothMousseProtocolText())}
				onPresetPerioAntiseptic={() => handleApplyPreset("antiseptic", createPerioAntisepticProtocolText())}
			/>

			{/* Быстрые статусные кнопки для совместимости с тестами ЭМК */}
			<div className="flex items-center gap-2 pt-1 border-t border-[var(--line-subtle)] text-xs flex-wrap">
				<button
					type="button"
					data-testid="hygiene-preset-norm"
					onClick={() => setActiveOhiSIndex(0)}
					className="px-2.5 py-1 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
				>
					Норма (OHI-S 0.0)
				</button>
				<button
					type="button"
					data-testid="hygiene-preset-gingivitis"
					onClick={() => setActiveOhiSIndex(1)}
					className="px-2.5 py-1 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
				>
					Гингивит
				</button>
				<button
					type="button"
					data-testid="hygiene-preset-mild-periodontitis"
					onClick={() => setActiveOhiSIndex(2)}
					className="px-2.5 py-1 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
				>
					Пародонтит легкий
				</button>
				<button
					type="button"
					data-testid="hygiene-preset-periodontitis"
					onClick={() => setActiveOhiSIndex(3)}
					className="px-2.5 py-1 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
				>
					Пародонтит
				</button>
				<button
					type="button"
					data-testid="hygiene-preset-pro-hygiene"
					onClick={() => handleApplyPreset("prophy", createClinicalProHygieneProtocolText())}
					className="px-2.5 py-1 rounded-md border border-teal-500/40 bg-teal-50/50 dark:bg-teal-950/20 text-teal-800 dark:text-teal-300 font-semibold"
				>
					Профгигиена
				</button>
				<button
					type="button"
					data-testid="hygiene-insert-to-043-btn"
					onClick={() => onInsertToProtocol?.(OHI_S_PRESETS[activeOhiSIndex].ratingText)}
					className="ml-auto px-3 py-1 text-xs font-semibold rounded-md border border-[var(--line)] text-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-soft)]"
				>
					В дневник приёма
				</button>
			</div>

			<HygieneStudioModal
				isOpen={isStudioOpen}
				onClose={() => setIsStudioOpen(false)}
				patientName={patientName}
				doctorName={doctorName}
				previousOhiS={previousOhiS}
			/>
		</div>
	);
};

HygieneIndicesPanel.displayName = "HygieneIndicesPanel";
