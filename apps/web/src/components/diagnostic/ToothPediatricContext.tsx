import React, { useState } from "react";
import {
	AlertCircle,
	Check,
	ChevronDown,
	ChevronUp,
	FileText,
	Heart,
	Info,
	Printer,
	Smile,
	Sparkles,
} from "lucide-react";
import {
	type FranklRating,
	type FranklRatingDefinition,
	FRANKL_SCALE_DEFINITIONS,
	getFranklDefinition,
} from "../odontogram/pediatricDentitionEngine";
import { FranklBehaviorBadge } from "../pediatric/FranklBehaviorBadge";
import type { ToothData } from "../odontogram/ToothChart";
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

export const RESORPTION_STAGES = [
	{ id: "resorption_1", label: "I степень", sub: "Рассасывание апикальной 1/3 корня" },
	{ id: "resorption_2", label: "II степень", sub: "Рассасывание до 1/2 длины корня" },
	{ id: "resorption_3", label: "III степень", sub: "Полное рассасывание корней / подвижность" },
	{ id: "exfoliation", label: "Физиологическая смена", sub: "Выпадение молочного зуба" },
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
	const [selectedResorption, setSelectedResorption] = useState<string>(
		toothData?.rootResorptionStage ? String(toothData.rootResorptionStage) : "",
	);

	const activeFranklDef: FranklRatingDefinition = getFranklDefinition(franklRating);

	const handleFranklChange = (rating: FranklRating) => {
		setFranklRating(rating);
		const def = getFranklDefinition(rating);
		showToast(`Шкала Франкла обновлена: ${def.symbol} (${def.nameRu})`, "info");
	};

	const handleResorptionChange = (stageId: string) => {
		const next = selectedResorption === stageId ? "" : stageId;
		setSelectedResorption(next);
		onUpdateTooth?.({
			rootResorptionStage: next ? (Number(next) as any) : undefined,
		});
		if (next) {
			const label = RESORPTION_STAGES.find((s) => s.id === stageId)?.label || stageId;
			showToast(`Физиологическая резорбция зуба #${toothNumber}: ${label}`, "info");
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
				<label className="dente-field-label">
					Физиологическая резорбция корней молочного зуба:
				</label>
				<div className="dente-resorption-grid">
					{RESORPTION_STAGES.map((st) => {
						const isSelected = selectedResorption === st.id;
						return (
							<button
								key={st.id}
								type="button"
								onClick={() => handleResorptionChange(st.id)}
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
