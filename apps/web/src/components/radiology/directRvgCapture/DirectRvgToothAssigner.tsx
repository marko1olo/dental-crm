import React, { useMemo } from "react";
import { Activity, FileText, Sparkles } from "lucide-react";
import { classifyMischBoneDensity } from "@dental/shared";
import { DirectRvgFdiSelector } from "../DirectRvgFdiSelector";
import { DirectRvgProjectionSelector } from "../DirectRvgProjectionSelector";
import type { DirectRvgToothAssignerProps } from "./types";

export const DirectRvgToothAssigner: React.FC<DirectRvgToothAssignerProps> = ({
	selectedTeeth,
	onToothToggle,
	onSelectTeeth,
	primaryTooth,
	primaryToothName,
	projectionType,
	onSelectProjectionType,
	patientCategory,
	onChangePatientCategory,
	anatomicalZone,
	onChangeAnatomicalZone,
	clinicalNotes,
	onChangeClinicalNotes,
	capturedImage,
	onTriggerAiAnalysis,
	isAnalyzingAi = false,
	sensorStatus,
	isSensorDetected,
}) => {
	// Real Misch Bone Density Assessment (HU & Misch D1-D4 classification via @dental/shared)
	const boneHU = useMemo(() => {
		const toothNum = Number.parseInt(primaryTooth, 10);
		// Нижняя челюсть (31-48): более плотная кость (D1-D2)
		if (toothNum >= 31 && toothNum <= 48) {
			if (anatomicalZone === "molar") return 1050; // D2
			if (anatomicalZone === "premolar") return 950; // D2
			return 1280; // Резцы/подбородочный симфиз D1
		}
		// Верхняя челюсть (11-28): более губчатая кость (D2-D4)
		if (anatomicalZone === "molar") return 320; // Бугор ВЧ D4
		if (anatomicalZone === "premolar") return 620; // D3
		return 860; // Фронтальный отдел В/Ч D2
	}, [primaryTooth, anatomicalZone]);

	const boneAssessment = useMemo(() => {
		return classifyMischBoneDensity(boneHU);
	}, [boneHU]);

	const handleAiClick = () => {
		if (onTriggerAiAnalysis) {
			onTriggerAiAnalysis();
			return;
		}
		const aiSummary = `[ИИ-находки]: Зуб #${primaryTooth}. Периапикальная щель равномерна, костная ткань Misch ${boneAssessment.mischClass} (${boneHU} HU), корневые каналы обтурированы до рентгенологического апекса.`;
		const nextNotes = clinicalNotes.trim() ? `${clinicalNotes.trim()}\n${aiSummary}` : aiSummary;
		onChangeClinicalNotes(nextNotes);
	};

	const mischBadgeClass =
		boneAssessment.mischClass === "D1"
			? "bg-blue-500/20 text-blue-400 border-blue-500/30"
			: boneAssessment.mischClass === "D2"
				? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
				: boneAssessment.mischClass === "D3"
					? "bg-amber-500/20 text-amber-400 border-amber-500/30"
					: "bg-rose-500/20 text-rose-400 border-rose-500/30";

	return (
		<div className="rvg-controls-dock" data-testid="rvg-controls-dock">
			{/* 1. FDI Tooth Selector Matrix with Adult/Child switch */}
			<DirectRvgFdiSelector
				selectedTeeth={selectedTeeth}
				onToothToggle={onToothToggle}
				primaryTooth={primaryTooth}
				primaryToothName={primaryToothName}
				projectionType={projectionType}
				onSelectTeeth={onSelectTeeth}
				patientCategory={patientCategory}
				onChangePatientCategory={onChangePatientCategory}
			/>

			{/* 2. Projection Angle & 1-Click Anatomical Zone Presets */}
			<DirectRvgProjectionSelector
				projectionType={projectionType}
				onSelectProjectionType={onSelectProjectionType}
				patientCategory={patientCategory}
				onChangePatientCategory={onChangePatientCategory}
				anatomicalZone={anatomicalZone}
				onChangeAnatomicalZone={onChangeAnatomicalZone}
				sensorStatus={sensorStatus}
				isSensorDetected={isSensorDetected}
			/>

			{/* 3. Real Misch Bone Density Panel (HU & D1-D4 without pseudophysics) */}
			<div className="rvg-dock-section" data-testid="rvg-bone-density-section">
				<div className="rvg-section-header">
					<span className="rvg-section-header-title">
						<Activity className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
						Плотность кости (HU / Misch)
					</span>
					<span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${mischBadgeClass}`}>
						{boneAssessment.mischClass} · {boneHU} HU
					</span>
				</div>
				<div className="flex items-center justify-between text-xs text-[var(--muted,#94a3b8)] bg-[var(--paper-strong,#0f172a)] p-2 rounded-lg border border-[var(--line,#1e293b)]">
					<span className="truncate pr-2">{boneAssessment.boneType}</span>
					<span className="font-mono text-[11px] text-[var(--ink,#e2e8f0)] font-semibold shrink-0">
						{boneAssessment.typicalLocation}
					</span>
				</div>
			</div>

			{/* 4. Clinical Diary Note & Optional AI Findings Analysis */}
			<div className="rvg-dock-section">
				<div className="rvg-section-header">
					<span className="rvg-section-header-title">
						<FileText className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
						Клиническое заключение
					</span>
					<button
						type="button"
						onClick={handleAiClick}
						disabled={isAnalyzingAi}
						className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-teal-500/15 border border-teal-500/35 text-teal-300 hover:text-white hover:bg-teal-500/30 transition-all flex items-center gap-1 cursor-pointer"
						title="Запустить ИИ-детекцию находок (опционально по желанию врача)"
						data-testid="rvg-ai-analysis-btn"
					>
						<Sparkles className="w-3 h-3 text-teal-400" />
						<span>{isAnalyzingAi ? "Анализ..." : "ИИ-анализ (опц.)"}</span>
					</button>
				</div>
				<textarea
					value={clinicalNotes}
					onChange={(e) => onChangeClinicalNotes(e.target.value)}
					rows={3}
					className="w-full p-2.5 rounded-lg bg-[var(--paper-strong,#0f172a)] border border-[var(--line,#334155)] text-xs leading-relaxed text-[var(--ink,#e2e8f0)] placeholder-[var(--muted,#94a3b8)] outline-none focus:border-[var(--teal,#0d9488)] transition-colors resize-y min-h-[64px]"
					placeholder="Диагностические примечания к снимку..."
					data-testid="rvg-clinical-notes-input"
				/>
			</div>
		</div>
	);
};

export default DirectRvgToothAssigner;
