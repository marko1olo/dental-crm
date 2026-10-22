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
		(toothData?.rootResorptionStage && toothData.rootResorptionStage > 0)
			? toothData.rootResorptionStage
			: (toothData?.rootResorption && toothData.rootResorption > 0)
				? toothData.rootResorption
				: undefined;

	const [selectedResorption, setSelectedResorption] = useState<RootResorptionStage | undefined>(initialResorption);

	useEffect(() => {
		const currentResorption =
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
		onUpdateTooth?.({ rootResorptionStage: next as RootResorptionStage });
		const stageItem = next ? RESORPTION_STAGES.find((s) => s.stage === next) : undefined;
		showToast(next ? `Физиологическая резорбция зуба #${toothNumber}: ${stageItem?.label || `${next}%`}` : `Физиологическая резорбция зуба #${toothNumber} сброшена`, "info");
	};

	const handleInsertResorptionProtocol = () => {
		const currentStageItem = selectedResorption ? RESORPTION_STAGES.find((s) => s.stage === selectedResorption) : undefined;
		const stageName = currentStageItem?.stageName || "Физиологическая резорбция корней";
		const percent = currentStageItem?.percent ?? (selectedResorption ?? 25);
		const text = currentStageItem
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
