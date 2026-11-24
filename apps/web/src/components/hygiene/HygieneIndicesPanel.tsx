/**
 * @dental/web/components/hygiene/HygieneIndicesPanel.tsx
 *
 * DENTE Dental CRM — Канонический клинический калькулятор стоматологических индексов гигиены:
 * 1. OHI-S Грина-Вермиллиона (6 канонических зубов: 16, 11, 26, 31 вестибулярно; 36, 46 язычно)
 * 2. Детский индекс Федорова-Володкиной (6 нижних фронтальных 43..33 раствором Шиллера-Писарева, баллы 1..5)
 * 3. Индекс РМА (Парма, гингивит: сосочки 1, край 2, альвеолярная десна 3, расчет %)
 * 4. Silness-Löe (налет по 4 поверхностям ключевых зубов 16, 12, 24, 36, 32, 44)
 * 5. Экспресс-протоколы профгигиены
 *
 * Мандаты: 8b (Бюджет <=300 строк), 8e (Автономия врача, 0 disabled), 8am (Ровно 1 Primary CTA), 8al (4-state proof).
 */

import React, { useState, useCallback } from "react";
import type { CombinedHygieneReport, PerioToothRecord } from "@dental/shared";
import {
	calculateFedorovVolodkinaScore,
	calculatePhpScore,
	calculateSilnessLoeScore,
	calculatePmaScore,
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
import { HygieneOhisTab } from "./HygieneOhisTab";
import { HygieneSilnessLoeTab } from "./HygieneSilnessLoeTab";
import { HygieneFedorovTab, HygienePmaTab } from "./HygienePediatricAndPmaTabs";
import { HygienePanelPresetsFooter } from "./HygienePanelPresetsFooter";
import { useHygieneCalculations } from "./useHygieneCalculations";

export type ActiveHygieneTab = "ohis" | "fedorov" | "silness_loe" | "pma" | "protocols";
export type ActiveHygieneIndexTab = ActiveHygieneTab;

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
	patientName = "Пациент приёма",
	doctorName,
	patientId,
	visitId,
	previousOhiS,
}) => {
	const [activeTab, setActiveTab] = useState<ActiveHygieneTab>("ohis");
	const [isStudioOpen, setIsStudioOpen] = useState<boolean>(false);

	const {
		ohisTeeth,
		setOhisTeeth,
		ohisResult,
		handleSetIdealOhis,
		fedorovScores,
		setFedorovScores,
		fedorovResult,
		handleSetIdealFedorov,
		pmaScores,
		setPmaScores,
		pmaResult,
		handleSetIdealPma,
		silnessScores,
		setSilnessScores,
		silnessResult,
		handleSetIdealSilness,
	} = useHygieneCalculations();

	// Вставка в дневник приёма ЭМК
	const handleInsertCurrentToProtocol = useCallback(() => {
		let text = "";
		if (activeTab === "ohis") {
			text = `• Индекс гигиены Грина-Вермиллиона (OHI-S): ${ohisResult.score.toFixed(1)} (${ohisResult.label}). Налет DI: ${ohisResult.debris.toFixed(1)}, камень CI: ${ohisResult.calculus.toFixed(1)}. ${ohisResult.statusDescription}`;
		} else if (activeTab === "fedorov") {
			text = `• Детский индекс гигиены Федорова-Володкиной: ${fedorovResult.score.toFixed(1)} балла (${fedorovResult.ratingText}). Раствор Шиллера-Писарева (зубы 43..33).`;
		} else if (activeTab === "silness_loe") {
			text = `• Индекс зубного налета Silness-Löe: ${silnessResult.score.toFixed(1)} (${silnessResult.ratingText}). Ключевые зубы (16, 12, 24, 36, 32, 44), 4 поверхности.`;
		} else if (activeTab === "pma") {
			text = `• Папиллярно-маргинально-альвеолярный индекс РМА (Парма): ${pmaResult.pmaPercent}% (${pmaResult.ratingText}).`;
		} else {
			text = createClinicalProHygieneProtocolText();
		}
		onInsertToProtocol?.(text);
	}, [activeTab, ohisResult, fedorovResult, silnessResult, pmaResult, onInsertToProtocol]);

	const handleApplyPreset = useCallback((_presetName: string, protocolText: string) => {
		onInsertToProtocol?.(protocolText);
	}, [onInsertToProtocol]);

	return (
		<div className="flex flex-col gap-3 p-3.5 bg-[var(--paper-soft)] border border-[var(--line)] rounded-2xl text-[var(--ink)]">
			{/* Шапка панели: кнопка Студии — нейтральная Secondary (Мандат 8am: ровно 1 Primary CTA) */}
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div>
					<h3 className="text-sm font-semibold text-[var(--ink)]">
						Индексы гигиены полости рта (OHI-S, Федорова-Володкиной, PMA)
					</h3>
					<p className="text-xs text-[var(--ink-muted)]">
						Расчет индексов гигиены • Физиологическая норма
					</p>
				</div>

				<button
					type="button"
					onClick={() => setIsStudioOpen(true)}
					className="px-3.5 py-1.5 text-xs font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] rounded-lg transition-colors min-h-[36px] cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-xs"
				>
					Открыть студию гигиены
				</button>
			</div>

			{/* Сегментные табы выбора индекса */}
			<div className="flex items-center gap-1.5 p-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl overflow-x-auto">
				{(
					[
						{ id: "ohis", label: "OHI-S (Грин-Вермиллион)" },
						{ id: "silness_loe", label: "Silness-Löe (налет)" },
						{ id: "fedorov", label: "Федорова-Володкиной (дети)" },
						{ id: "pma", label: "РМА (Парма)" },
						{ id: "protocols", label: "Экспресс-протоколы" },
					] as const
				).map((tab) => (
					<button
						key={tab.id}
						type="button"
						onClick={() => setActiveTab(tab.id)}
						className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer min-h-[32px] ${
							activeTab === tab.id
								? "bg-[var(--primary)] text-white shadow-xs"
								: "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						{tab.label}
					</button>
				))}
			</div>

			{/* Вкладка 1: OHI-S Грина-Вермиллиона */}
			{activeTab === "ohis" && (
				<HygieneOhisTab
					ohisTeeth={ohisTeeth}
					ohisResult={ohisResult}
					onSetIdealOhis={handleSetIdealOhis}
					onUpdateTooth={(toothNumber, field, value) => {
						setOhisTeeth((p) => {
							const prevEntry = p[toothNumber] ?? { debris: 0, calculus: 0 };
							return { ...p, [toothNumber]: { ...prevEntry, [field]: value } };
						});
					}}
				/>
			)}

			{/* Вкладка 2: Silness-Löe */}
			{activeTab === "silness_loe" && (
				<HygieneSilnessLoeTab
					silnessScores={silnessScores}
					silnessResult={silnessResult}
					onSetIdealSilness={handleSetIdealSilness}
					onUpdateSurface={(toothNumber, surface, value) => {
						setSilnessScores((p) => {
							const prevTooth = p[toothNumber] ?? { vestibular: 0, oral: 0, mesial: 0, distal: 0 };
							return { ...p, [toothNumber]: { ...prevTooth, [surface]: value } };
						});
					}}
				/>
			)}

			{/* Вкладка 3: Федорова-Володкиной (дети) */}
			{activeTab === "fedorov" && (
				<HygieneFedorovTab
					fedorovScores={fedorovScores}
					fedorovResult={fedorovResult}
					onSetIdealFedorov={handleSetIdealFedorov}
					onUpdateTooth={(toothNumber, score) => {
						setFedorovScores((p) => ({ ...p, [toothNumber]: score }));
					}}
				/>
			)}

			{/* Вкладка 4: Индекс РМА (Парма, гингивит) */}
			{activeTab === "pma" && (
				<HygienePmaTab
					pmaScores={pmaScores}
					pmaResult={pmaResult}
					onSetIdealPma={handleSetIdealPma}
					onUpdateTooth={(toothNumber, score) => {
						setPmaScores((p) => ({ ...p, [toothNumber]: score }));
					}}
				/>
			)}

			{/* Вкладка 5: Экспресс-протоколы */}
			{activeTab === "protocols" && (
				<HygieneExpressPresetsStrip
					onPresetHygieneNorm={handleSetIdealOhis}
					onPresetHygieneFair={() => setOhisTeeth({ 16: { debris: 1, calculus: 0 }, 11: { debris: 1, calculus: 0 }, 26: { debris: 1, calculus: 0 }, 31: { debris: 1, calculus: 0 }, 36: { debris: 1, calculus: 0 }, 46: { debris: 0, calculus: 0 } })}
					onPresetHygienePoor={() => setOhisTeeth({ 16: { debris: 2, calculus: 1 }, 11: { debris: 2, calculus: 1 }, 26: { debris: 2, calculus: 1 }, 31: { debris: 2, calculus: 1 }, 36: { debris: 2, calculus: 1 }, 46: { debris: 2, calculus: 1 } })}
					onPresetHygieneSevere={() => setOhisTeeth({ 16: { debris: 3, calculus: 2 }, 11: { debris: 3, calculus: 2 }, 26: { debris: 3, calculus: 2 }, 31: { debris: 3, calculus: 2 }, 36: { debris: 3, calculus: 2 }, 46: { debris: 3, calculus: 2 } })}
					onPresetPeriodontalNorm={() => handleApplyPreset("norm", createClinicalPerioNormProtocolText())}
					onPresetCatarrhalGingivitis={() => handleApplyPreset("gingivitis", "Хронический катаральный гингивит")}
					onPresetMildPeriodontitis={() => handleApplyPreset("mild", "Хронический генерализованный пародонтит легкой степени")}
					onPresetModeratePeriodontitis={() => handleApplyPreset("moderate", "Хронический генерализованный пародонтит средней степени")}
					onPresetSeverePeriodontitis={() => handleApplyPreset("severe", "Хронический генерализованный пародонтит тяжелой степени")}
					onPresetProHygieneDone={() => handleApplyPreset("prophy", createClinicalProHygieneProtocolText())}
					onPresetDeepFluoridation={() => handleApplyPreset("fluor", createDeepFluoridationProtocolText())}
					onPresetRemineralization={() => handleApplyPreset("remin", createToothMousseProtocolText())}
					onPresetToothMousse={() => handleApplyPreset("mousse", createToothMousseProtocolText())}
					onPresetPerioAntiseptic={() => handleApplyPreset("antiseptic", createPerioAntisepticProtocolText())}
				/>
			)}

			{/* Быстрые статусные кнопки и Primary CTA */}
			<HygienePanelPresetsFooter
				onSetIdealOhis={handleSetIdealOhis}
				onSetGingivitisPreset={() => {
					setOhisTeeth({ 16: { debris: 1, calculus: 0 }, 11: { debris: 1, calculus: 0 }, 26: { debris: 1, calculus: 0 }, 31: { debris: 1, calculus: 0 }, 36: { debris: 1, calculus: 0 }, 46: { debris: 1, calculus: 0 } });
					setPmaScores({ 16: 1, 11: 1, 26: 1, 36: 0, 31: 0, 46: 0 });
				}}
				onSetMildPeriodontitisPreset={() => {
					setOhisTeeth({ 16: { debris: 2, calculus: 1 }, 11: { debris: 1, calculus: 1 }, 26: { debris: 2, calculus: 1 }, 31: { debris: 1, calculus: 1 }, 36: { debris: 2, calculus: 1 }, 46: { debris: 2, calculus: 1 } });
					setPmaScores({ 16: 2, 11: 1, 26: 2, 36: 1, 31: 1, 46: 2 });
				}}
				onSetPeriodontitisPreset={() => {
					setOhisTeeth({ 16: { debris: 3, calculus: 2 }, 11: { debris: 2, calculus: 2 }, 26: { debris: 3, calculus: 2 }, 31: { debris: 2, calculus: 2 }, 36: { debris: 3, calculus: 2 }, 46: { debris: 3, calculus: 2 } });
					setPmaScores({ 16: 3, 11: 2, 26: 3, 36: 2, 31: 2, 46: 3 });
				}}
				onSetProHygienePreset={() => handleApplyPreset("prophy", createClinicalProHygieneProtocolText())}
				onInsertToProtocol={handleInsertCurrentToProtocol}
			/>

			<HygieneStudioModal
				key={patientId || "hygiene-studio"}
				isOpen={isStudioOpen}
				onClose={() => setIsStudioOpen(false)}
				patientId={patientId}
				visitId={visitId}
				patientName={patientName}
				doctorName={doctorName}
				previousOhiS={previousOhiS}
			/>
		</div>
	);
};

HygieneIndicesPanel.displayName = "HygieneIndicesPanel";
