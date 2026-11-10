import { useState, useEffect } from "react";
import type { FranklRating, FranklRatingDefinition } from "../../odontogram/pediatricDentitionEngine";
import { getFranklDefinition } from "../../odontogram/pediatricDentitionEngine";
import type { ToothData } from "../../odontogram/ToothChart";
import type { RootResorptionStage } from "../../odontogram/anatomicalToothGeometries";
import { showToast } from "../../GlobalToast";
import { RESORPTION_STAGES } from "./pediatricTypes";

export function useToothPediatricState(
	toothNumber: number,
	toothData: ToothData | undefined,
	initialFrankl: FranklRating = 3,
	onUpdateTooth?: (updates: Partial<ToothData>) => void,
	onInsertToProtocol?: (text: string) => void,
) {
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
		onUpdateTooth?.({
			rootResorptionStage: next as RootResorptionStage,
			rootResorption: next as RootResorptionStage,
			mobility: mobilityDegree,
		});
		const stageItem = next !== undefined ? RESORPTION_STAGES.find((s) => s.stage === next) : undefined;
		showToast(
			next !== undefined
				? `Физиологическая резорбция зуба #${toothNumber}: ${stageItem?.label || `${next}%`}`
				: `Физиологическая резорбция зуба #${toothNumber} сброшена`,
			"info",
		);
	};

	const handleInsertResorptionProtocol = () => {
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
			showToast(`Психологический статус Франкла внесен в карту!`, "success");
		} else {
			try {
				navigator.clipboard.writeText(text);
				showToast("Протокол адаптации скопирован", "success");
			} catch {
				showToast("Не удалось скопировать", "error");
			}
		}
	};

	return {
		franklRating,
		selectedResorption,
		activeFranklDef,
		handleFranklChange,
		handleResorptionChange,
		handleInsertResorptionProtocol,
		handleInsertPsychologicalProtocol,
	};
}
