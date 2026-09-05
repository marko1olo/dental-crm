import React, { useState, useEffect } from "react";
import {
	Check,
	FileText,
	Heart,
	Printer,
} from "lucide-react";
import {
	type FranklRating,
	type FranklRatingDefinition,
	FRANKL_SCALE_DEFINITIONS,
	getFranklDefinition,
} from "../odontogram/pediatricDentitionEngine";
import { FranklBehaviorBadge } from "../pediatric/FranklBehaviorBadge";
import type { ToothData } from "../odontogram/ToothChart";
import type { RootResorptionStage } from "../odontogram/anatomicalToothGeometries";
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
}

export interface PediatricResorptionStageOption {
	readonly id: RootResorptionStage;
	readonly stage: RootResorptionStage;
	readonly percent: number;
	readonly label: string;
	readonly sub: string;
	readonly stageName: string;
}

export const RESORPTION_STAGES: readonly PediatricResorptionStageOption[] = [
	{
		id: 25,
		stage: 25,
		percent: 25,
		label: "I стадия (25%)",
		sub: "Апикальная резорбция (25% длины корня)",
		stageName: "I стадия — апикальная резорбция",
	},
	{
		id: 50,
		stage: 50,
		percent: 50,
		label: "II стадия (50%)",
		sub: "Средняя резорбция (50% длины корня)",
		stageName: "II стадия — средняя резорбция",
	},
	{
		id: 75,
		stage: 75,
		percent: 75,
		label: "III стадия (75%)",
		sub: "Пришеечная резорбция (сохранена 1/3)",
		stageName: "III стадия — пришеечная резорбция",
	},
	{
		id: 100,
		stage: 100,
		percent: 100,
		label: "IV стадия (100%)",
		sub: "Полная резорбция / эксфолиация (выпадение)",
		stageName: "IV стадия — полная резорбция / эксфолиация",
	},
] as const;

export const ToothPediatricContext: React.FC<ToothPediatricContextProps> = ({
	toothNumber,
	toothData,
	patientName = "Юный пациент",
	patientAgeYears = 6,
	doctorName = "Детский врач-стоматолог",
	initialFrankl = 3,
	onUpdateTooth,
	onInsertToProtocol,
	onOpenParentMemo,
}) => {
	const [franklRating, setFranklRating] = useState<FranklRating>(initialFrankl);

	const initialResorption: RootResorptionStage | undefined =
		(toothData?.rootResorptionStage && toothData.rootResorptionStage > 0)
			? toothData.rootResorptionStage
			: (toothData?.rootResorption && toothData.rootResorption > 0)
				? toothData.rootResorption
				: undefined;

	const [selectedResorption, setSelectedResorption] = useState<RootResorptionStage | undefined>(
		initialResorption,
	);

	useEffect(() => {
		const currentResorption: RootResorptionStage | undefined =
			(toothData?.rootResorptionStage && toothData.rootResorptionStage > 0)
				? toothData.rootResorptionStage
				: (toothData?.rootResorption && toothData.rootResorption > 0)
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
		onUpdateTooth?.({
			rootResorptionStage: next as RootResorptionStage,
		});
		if (next) {
			const stageItem = RESORPTION_STAGES.find((s) => s.stage === next);
			const label = stageItem?.label || `${next}%`;
			showToast(`Физиологическая резорбция зуба #${toothNumber}: ${label}`, "info");
		} else {
			showToast(`Физиологическая резорбция зуба #${toothNumber} сброшена`, "info");
		}
	};

	const handleInsertResorptionProtocol = () => {
		const currentStageItem = selectedResorption
			? RESORPTION_STAGES.find((s) => s.stage === selectedResorption)
			: undefined;

		const stageName = currentStageItem?.stageName || "Физиологическая резорбция корней";
		const percent = currentStageItem?.percent ?? (selectedResorption ?? 25);

		const text = currentStageItem
			? `Физиологическая резорбция корней зуба #${toothNumber}: ${stageName} (${percent}%). Физиологическая смена прикуса.`
			: `Физиологическая резорбция корней зуба #${toothNumber}: признаки резорбции корней отсутствуют (0%). Физиологическая норма.`;

		if (onInsertToProtocol) {
			onInsertToProtocol(text);
			showToast(`Запись о резорбции зуба #${toothNumber} внесена в 043/у!`, "success");
		} else {
			try {
				navigator.clipboard.writeText(text);
				showToast("Протокол резорбции скопирован", "success");
			} catch {
				showToast("Не удалось скопировать", "error");
			}
		}
	};

	const handleInsertPsychologicalProtocol = () => {
		const text = `Психоэмоциональный статус ребенка (Шкала Франкла): ${activeFranklDef.symbol} (${activeFranklDef.nameRu}). Применены техники психологической адаптации Tell-Show-Do («Сказать-Показать-Сделать»). Контакт установлен продуктивно.`;
		if (onInsertToProtocol) {
			onInsertToProtocol(text);
			showToast(`Психологический статус Франкла внесен в 043/у!`, "success");
		} else {
			try {
				navigator.clipboard.writeText(text);
				showToast("Протокол адаптации скопирован", "success");
			} catch {
				showToast("Не удалось скопировать", "error");
			}
		}
	};

	return (
		<div className="dente-warm-tool-card" data-testid="tooth-pediatric-context">
			<div className="dente-warm-tool-header">
				<div className="dente-warm-tool-title-group">
					<Heart size={18} color="#ec4899" />
					<h3 className="dente-warm-tool-title">
						Детский прием: Шкала Франкла & Резорбция (FDI #{toothNumber})
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
					<span>{activeFranklDef.emoji} Франкл {activeFranklDef.symbol}</span>
				</div>
			</div>

			{/* Frankl Rating Badge with Tell-Show-Do Strategies */}
			<div className="dente-pediatric-badge-wrapper">
				<FranklBehaviorBadge
					rating={franklRating}
					onChange={handleFranklChange}
					showStrategies={true}
					compact={false}
				/>
			</div>

			{/* Physiological Root Resorption Staging (For Deciduous Teeth) */}
			<div className="dente-resorption-box">
				<div className="dente-surface-label-row">
					<label className="dente-field-label" style={{ marginBottom: 0 }}>
						Физиологическая резорбция корней молочного зуба:
					</label>
					<button
						type="button"
						onClick={handleInsertResorptionProtocol}
						className="dente-secondary-btn"
						style={{ minHeight: "30px", padding: "3px 10px", fontSize: "12px", gap: "5px" }}
						title={`Внести запись о резорбции корней зуба #${toothNumber} в карту 043/у`}
					>
						<FileText size={13} />
						<span>Внести в 043/у</span>
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

			{/* Actions Row: TSD to 043/u and Parent Memo */}
			<div className="dente-pediatric-footer">
				<button
					type="button"
					onClick={handleInsertPsychologicalProtocol}
					className="dente-secondary-btn"
				>
					<FileText size={15} />
					<span>Вставить статус Франкла в 043/у</span>
				</button>

				<button
					type="button"
					onClick={() => {
						if (onOpenParentMemo) {
							onOpenParentMemo();
						} else {
							try {
								window.dispatchEvent(
									new CustomEvent("dente-open-pediatric-memo", {
										detail: {
											patientName,
											patientAgeYears,
											doctorName,
											franklRating,
											toothNumber,
										},
									}),
								);
								showToast("Запрос на печать памятки для родителей отправлен", "info");
							} catch {
								showToast("Памятка для родителей подготовлена к печати", "info");
							}
						}
					}}
					className="dente-primary-action-btn"
				>
					<Printer size={15} />
					<span>Печать памятки для родителей...</span>
				</button>
			</div>
		</div>
	);
};

export default ToothPediatricContext;
