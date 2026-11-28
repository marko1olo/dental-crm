import React, { useState, useEffect } from "react";
import { Activity, Check, FileText, Printer } from "lucide-react";
import { clientLogger } from "../../services/logging/clientLogger";
import {
	type FranklRating,
	type FranklRatingDefinition,
	getFranklDefinition,
	isPrimaryTooth,
	RESORPTION_STAGE_DEFINITIONS,
	RESORPTION_STAGES as SHARED_RESORPTION_STAGES,
} from "@dental/shared";
import { ToothDeciduous } from "../icons/DentalIcons";
import { FranklBehaviorBadge } from "../pediatric/FranklBehaviorBadge";
import { PediatricParentMemoModal } from "../pediatric/PediatricParentMemoModal";
import type { ToothData } from "../odontogram/ToothChart";
import type { RootResorptionStage } from "../odontogram/anatomicalGeometriesTypes";
import { showToast } from "../GlobalToast";

export interface ToothPediatricContextProps {
	toothNumber: number;
	toothData?: ToothData | undefined;
	patientName?: string | undefined;
	patientAgeYears?: number | undefined;
	doctorName?: string | undefined;
	initialFrankl?: FranklRating | undefined;
	onUpdateTooth?: ((updates: Partial<ToothData>) => void) | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
	onOpenParentMemo?: (() => void) | undefined;
	onOpenEndo?: ((toothNumber: number) => void) | undefined;
}

export interface PediatricResorptionStageOption {
	readonly id: RootResorptionStage;
	readonly stage: RootResorptionStage;
	readonly percent: number;
	readonly label: string;
	readonly sub: string;
	readonly stageName: string;
}

export const RESORPTION_STAGES: readonly PediatricResorptionStageOption[] =
	SHARED_RESORPTION_STAGES.map((stage) => {
		const def = RESORPTION_STAGE_DEFINITIONS[stage];
		return {
			id: stage,
			stage,
			percent: stage,
			label: stage === 0 ? "Норма (0%)" : `${stage}%`,
			sub: def.nameRu,
			stageName: def.descriptionRu,
		};
	});

export const ToothPediatricContext: React.FC<ToothPediatricContextProps> = ({
	toothNumber,
	toothData,
	patientName = "Юный пациент",
	patientAgeYears,
	doctorName = "Детский врач-стоматолог",
	initialFrankl = 3,
	onUpdateTooth,
	onInsertToProtocol,
	onOpenParentMemo,
	onOpenEndo,
}) => {
	const [isLocalMemoOpen, setIsLocalMemoOpen] = useState(false);
	const resolvedAgeYears = patientAgeYears ?? (isPrimaryTooth(toothNumber) ? 5 : 7);
	const [franklRating, setFranklRating] = useState<FranklRating>(initialFrankl);

	const initialResorption: RootResorptionStage | undefined =
		typeof toothData?.rootResorptionStage === "number"
			? toothData.rootResorptionStage
			: typeof toothData?.rootResorption === "number"
				? toothData.rootResorption
				: undefined;

	const [selectedResorption, setSelectedResorption] = useState<RootResorptionStage | undefined>(initialResorption);

	useEffect(() => {
		const currentResorption =
			typeof toothData?.rootResorptionStage === "number"
				? toothData.rootResorptionStage
				: typeof toothData?.rootResorption === "number"
					? toothData.rootResorption
					: undefined;
		setSelectedResorption(currentResorption);
	}, [toothData?.rootResorptionStage, toothData?.rootResorption]);

	const activeFranklDef: FranklRatingDefinition = getFranklDefinition(franklRating);

	const handleFranklChange = (rating: FranklRating) => {
		setFranklRating(rating);
		const def = getFranklDefinition(rating);
		showToast(`Шкала Франкла обновлена: ${def.symbol} (${def.nameRu})`, "info");
	};

	const handleResorptionChange = (stage: RootResorptionStage) => {
		const next: RootResorptionStage | undefined = selectedResorption === stage ? undefined : stage;
		setSelectedResorption(next);
		const mobilityDegree: 0 | 1 | 2 | 3 =
			next === 100 ? 3 : next === 75 ? 2 : next === 50 ? 1 : 0;
		const updates: Partial<ToothData> = {
			mobility: mobilityDegree,
			...(next !== undefined ? { rootResorptionStage: next, rootResorption: next } : {}),
		};
		onUpdateTooth?.(updates);
		const stageItem = next !== undefined ? RESORPTION_STAGES.find((s) => s.stage === next) : undefined;
		showToast(
			next !== undefined
				? `Физиологическая резорбция зуба #${toothNumber}: ${stageItem?.label || `${next}%`}`
				: `Физиологическая резорбция зуба #${toothNumber} сброшена`,
			"info",
		);
	};

	const handleInsertResorptionProtocol = async () => {
		const currentStageItem = selectedResorption !== undefined ? RESORPTION_STAGES.find((s) => s.stage === selectedResorption) : undefined;
		const stageName = currentStageItem?.stageName || "Физиологическая резорбция корней";
		const percent = currentStageItem?.percent ?? (selectedResorption ?? 0);
		const text = currentStageItem && currentStageItem.stage > 0
			? `Физиологическая резорбция корней зуба #${toothNumber}: ${stageName} (${percent}%). Физиологическая смена прикуса.`
			: `Физиологическая резорбция корней зуба #${toothNumber}: признаки резорбции корней отсутствуют (0%). Физиологическая норма.`;

		if (onInsertToProtocol) {
			onInsertToProtocol(text);
			showToast(`Запись о резорбции зуба #${toothNumber} внесена в карту!`, "success");
		} else {
			try {
				await navigator.clipboard.writeText(text);
				showToast("Протокол резорбции скопирован", "success");
			} catch (err) {
				clientLogger.warn("Failed to copy resorption protocol", err, { module: "ToothPediatricContext" });
				showToast("Не удалось скопировать", "error");
			}
		}
	};

	const handleInsertPsychologicalProtocol = async () => {
		const text = `Психоэмоциональный статус ребенка (Шкала Франкла): ${activeFranklDef.symbol} (${activeFranklDef.nameRu}). Применены техники психологической адаптации Tell-Show-Do («Сказать-Показать-Сделать»). Контакт установлен продуктивно.`;
		if (onInsertToProtocol) {
			onInsertToProtocol(text);
			showToast("Психологический статус Франкла внесен в карту!", "success");
		} else {
			try {
				await navigator.clipboard.writeText(text);
				showToast("Протокол адаптации скопирован", "success");
			} catch (err) {
				clientLogger.warn("Failed to copy psychological protocol", err, { module: "ToothPediatricContext" });
				showToast("Не удалось скопировать", "error");
			}
		}
	};

	return (
		<div className="dente-warm-tool-card" data-testid="tooth-pediatric-context">
			<div className="dente-warm-tool-header">
				<div className="dente-warm-tool-title-group">
					<ToothDeciduous size={18} className="text-[var(--primary)]" />
					<h3 className="dente-warm-tool-title">
						Детский прием: Шкала Франкла и резорбция (FDI #{toothNumber})
					</h3>
				</div>
				<div
					className="dente-warm-tag"
					style={{
						backgroundColor: activeFranklDef.badgeBg,
						color: activeFranklDef.badgeColor,
						borderColor: activeFranklDef.badgeBorder,
					}}
				>
					<span>Франкл {activeFranklDef.symbol}</span>
				</div>
			</div>

			<div className="dente-pediatric-badge-wrapper">
				<FranklBehaviorBadge rating={franklRating} onChange={handleFranklChange} showStrategies={true} compact={false} />
			</div>

			<div className="dente-resorption-box">
				<div className="dente-surface-label-row">
					<label className="dente-field-label mb-0">
						Физиологическая резорбция корней молочного зуба:
					</label>
					<button
						type="button"
						onClick={handleInsertResorptionProtocol}
						className="dente-secondary-btn h-8 px-2.5 rounded-md text-xs font-medium gap-1.5 inline-flex items-center justify-center cursor-pointer"
						title={`Внести запись о резорбции корней зуба #${toothNumber} в карту`}
					>
						<FileText size={14} />
						<span>Внести в карту</span>
					</button>
				</div>
				<div className="dente-resorption-grid">
					{RESORPTION_STAGES.map((st) => {
						const isSelected = selectedResorption === st.stage;
						return (
							<button
								key={st.id}
								type="button"
								onClick={() => handleResorptionChange(st.stage)}
								className={`dente-resorption-btn ${isSelected ? "selected" : ""}`}
							>
								<span className="resorption-title">{st.label}</span>
								<span className="resorption-sub">{st.sub}</span>
								{isSelected && <Check size={13} className="resorption-check" />}
							</button>
						);
					})}
				</div>
			</div>

			<div className="dente-pediatric-footer flex flex-wrap items-center gap-2">
				<button
					type="button"
					onClick={handleInsertPsychologicalProtocol}
					className="dente-secondary-btn min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-lg text-xs font-medium transition flex items-center gap-2 cursor-pointer"
				>
					<FileText className="w-4 h-4 shrink-0" />
					<span>Вставить статус Франкла в карту</span>
				</button>

				{onOpenEndo && (
					<button
						type="button"
						onClick={() => onOpenEndo(toothNumber)}
						className="dente-secondary-btn min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-lg text-xs font-medium transition flex items-center gap-2 cursor-pointer text-[var(--primary)] border-[var(--primary)]/30 hover:bg-[var(--primary-soft)]"
						title="Открыть эндодонтический журнал каналов для молочного зуба"
					>
						<Activity className="w-4 h-4 shrink-0" />
						<span>Каналы (Metapex/ZOE)</span>
					</button>
				)}

				<button
					type="button"
					onClick={() => {
						if (onOpenParentMemo) {
							onOpenParentMemo();
						} else {
							setIsLocalMemoOpen(true);
						}
					}}
					className="dente-primary-action-btn min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-medium transition flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
				>
					<Printer className="w-4 h-4 shrink-0" />
					<span>Печать памятки для родителей</span>
				</button>
			</div>

			{isLocalMemoOpen && (
				<PediatricParentMemoModal
					key={`memo-${toothNumber}-${patientName}-${resolvedAgeYears}`}
					isOpen={isLocalMemoOpen}
					onClose={() => setIsLocalMemoOpen(false)}
					patientName={patientName}
					patientAgeYears={resolvedAgeYears}
					doctorName={doctorName}
					initialFrankl={franklRating}
				/>
			)}
		</div>
	);
};

export default ToothPediatricContext;
