/**
 * HygienePanelContent.tsx — Содержимое панели экспресс-расчета гигиенических индексов.
 * (Layer 4 UI View).
 */

import React from "react";
import type { PerioToothRecord } from "@dental/shared";
import { OhiSilnessCalculator } from "./OhiSilnessCalculator";
import { KpuBleedingIndicesCalculator } from "./KpuBleedingIndicesCalculator";
import { PmaKpiSextantsGrid } from "./PmaKpiSextantsGrid";
import { HygieneExpressPresetsStrip } from "./HygieneExpressPresetsStrip";
import { HygieneHomeCareCard } from "./HygieneHomeCareCard";
import { HygienePanelHeader } from "./HygienePanelHeader";
import { HygieneTabsBar } from "./HygieneTabsBar";
import { HygieneDynamicsBanner } from "./HygieneDynamicsBanner";
import type { useHygienePanelLogic } from "./useHygienePanelLogic";

export interface HygienePanelContentProps {
	readonly logic: ReturnType<typeof useHygienePanelLogic>;
	readonly readOnly?: boolean | undefined;
	readonly compactMode?: boolean | undefined;
	readonly perioTeeth?: readonly PerioToothRecord[] | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
}

export const HygienePanelContent: React.FC<HygienePanelContentProps> = ({
	logic,
	readOnly = false,
	compactMode = false,
	perioTeeth,
	patientName,
	doctorName,
	onInsertToProtocol,
}) => {
	return (
		<div
			data-testid="hygiene-indices-panel"
			className="w-full flex flex-col gap-4 p-3.5 sm:p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] shadow-xs max-w-full overflow-x-clip"
		>
			{/* Шапка и быстрые действия */}
			<HygienePanelHeader
				readOnly={readOnly}
				perioTeeth={perioTeeth}
				insertStatus={logic.insertStatus}
				copyStatus={logic.copyStatus}
				onOpenBottomSheet={() => logic.setIsBottomSheetOpen(true)}
				onSyncFromPerio={logic.handleSyncFromPerio}
				onInsertTo043={logic.handleInsertTo043}
				onPrintProtocol={logic.handlePrintProtocol}
				onCopyText={logic.handleCopyText}
			/>

			{/* Экспресс-пресеты клинических статусов и протоколов 804н */}
			{!readOnly && (
				<HygieneExpressPresetsStrip
					onPresetHygieneNorm={logic.handlePresetHygieneNorm}
					onPresetHygieneFair={logic.handlePresetHygieneFair}
					onPresetHygienePoor={logic.handlePresetHygienePoor}
					onPresetHygieneSevere={logic.handlePresetHygieneSevere}
					onPresetPeriodontalNorm={logic.handlePresetPeriodontalNorm}
					onPresetCatarrhalGingivitis={logic.handlePresetCatarrhalGingivitis}
					onPresetMildPeriodontitis={logic.handlePresetMildPeriodontitis}
					onPresetModeratePeriodontitis={logic.handlePresetModeratePeriodontitis}
					onPresetSeverePeriodontitis={logic.handlePresetSeverePeriodontitis}
					onPresetProHygieneDone={logic.handlePresetProHygieneDone}
					onPresetDeepFluoridation={logic.handlePresetDeepFluoridation}
					onPresetToothMousse={logic.handlePresetToothMousse}
					onPresetPerioAntiseptic={logic.handlePresetPerioAntiseptic}
				/>
			)}

			{/* Сегментированный контроль индексов (Apple HIG: 36px) */}
			<HygieneTabsBar
				activeTab={logic.activeTab}
				onSelectTab={logic.setActiveTab}
			/>

			{/* Сравнение динамики OHI-S с прошлым визитом */}
			<HygieneDynamicsBanner
				comparisonText={logic.comparisonText}
				currentScore={logic.report.ohiS.totalScore}
				previousScoreNum={logic.previousScoreNum}
				previousDate={logic.previousDate}
			/>

			{/* Телеметрия OHI-S и Silness-Löe */}
			<OhiSilnessCalculator
				assessments={logic.assessments}
				report={logic.report}
				silnessResult={logic.silnessResult}
				activeTab={logic.activeTab}
				onUpdateToothScore={logic.updateToothScore}
				readOnly={readOnly}
				compactMode={compactMode}
				comparisonText={logic.comparisonText}
			/>

			{/* Вторичные индексы (PMA и КПИ Леуса) и сетка 6 индексных зубов */}
			<PmaKpiSextantsGrid
				assessments={logic.assessments}
				report={logic.report}
				onUpdateToothScore={logic.updateToothScore}
				readOnly={readOnly}
			/>

			{/* Индексы КПУ и кровоточивости десневой бороздки */}
			<KpuBleedingIndicesCalculator
				onInsertToProtocol={onInsertToProtocol}
				readOnly={readOnly}
			/>

			{/* Персональная карта домашнего ухода */}
			<HygieneHomeCareCard
				patientName={patientName}
				doctorName={doctorName}
				onInsertToProtocol={onInsertToProtocol}
				readOnly={readOnly}
			/>
		</div>
	);
};
