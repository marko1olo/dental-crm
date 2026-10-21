import { applyCopilotCommandToPlan, type CopilotCommandType } from "../../../../services/ai/treatmentPlanCopilot.js";
import { showToast } from "../../../GlobalToast.js";
import { logger } from "../../../../utils/logger.js";
import {
	extractCbctFindingsFromOdontogramAndStorage,
	generateCbctAutoPlanScenarios,
} from "../../ctImplantIntegrationBridge.js";
import type { PlanStageMutationContext } from "../types.js";

export function createCbctAndCopilotHandlers(ctx: PlanStageMutationContext) {
	const {
		patientId, effectiveTeethData, catalog, discountPercent, stages,
		setCbctAutoPlanTiers, setSelectedTierId, setCustomStages, setActiveViewTab,
		setIsCopilotExecuting, setCopilotFeedback,
	} = ctx;

	const handleGenerateCbctAutoPlan = () => {
		try {
			const findings = extractCbctFindingsFromOdontogramAndStorage(patientId, effectiveTeethData);
			const generatedTiers = generateCbctAutoPlanScenarios(findings, catalog, discountPercent);
			setCbctAutoPlanTiers(generatedTiers);
			setSelectedTierId("standard");
			setCustomStages([...generatedTiers[1].stages]);
			setActiveViewTab("3tier");
			showToast(
				`Автоплан по КЛКТ сформирован: 3 сценария (Эконом: ${generatedTiers[0].totalRub.toLocaleString("ru-RU")} ₽, Оптимум: ${generatedTiers[1].totalRub.toLocaleString("ru-RU")} ₽, Премиум: ${generatedTiers[2].totalRub.toLocaleString("ru-RU")} ₽) на 4 клинических этапа`,
				"success",
				5000,
			);
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-cbct-autoplan-generated", { detail: { patientId, tiers: generatedTiers, findings } }),
				);
			}
		} catch (err: unknown) {
			logger.error("[useTreatmentPlanLogic] Error generating CBCT auto plan", err);
			showToast("Не удалось сформировать автоплан по КЛКТ", "error");
		}
	};

	const handleExecuteCopilot = (cmdOrText: CopilotCommandType | string) => {
		setIsCopilotExecuting(true);
		try {
			const res = applyCopilotCommandToPlan(stages, cmdOrText);
			if (res.success) {
				setCustomStages([...res.stages]);
				setCopilotFeedback(res.explanation);
				showToast(`AI Copilot: ${res.commandTitle} применено`, "success");
			}
		} finally {
			setIsCopilotExecuting(false);
		}
	};

	return { handleGenerateCbctAutoPlan, handleExecuteCopilot };
}
