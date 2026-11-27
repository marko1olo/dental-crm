import { kopecksToRubles } from "@dental/shared";
import { resolvePlanStageItemKopecks, type PlanStageItem } from "./visitPlanStageHandoff";

export interface StageHandoffPayload {
	readonly title: string;
	readonly stageNumber: number;
	readonly items: readonly PlanStageItem[] | PlanStageItem[];
}

export function dispatchTakeStageToVisit(
	stagePayload: StageHandoffPayload,
	items: readonly PlanStageItem[] | PlanStageItem[],
	patientId?: string | undefined,
): void {
	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent("dente-take-stage-to-visit", {
				detail: {
					stage: stagePayload,
					items,
					patientId,
				},
			}),
		);
	}
}

export interface HandoffPatientLike {
	id?: string | undefined;
	fullName?: string | null | undefined;
	name?: string | null | undefined;
	[key: string]: unknown;
}

export function dispatchOpenLabOrderForStage(
	stagePayload: StageHandoffPayload,
	items: readonly PlanStageItem[] | PlanStageItem[],
	treatmentPlanId?: string | undefined,
	patient?: HandoffPatientLike | null | undefined,
): void {
	if (typeof window !== "undefined") {
		const stageItems: readonly PlanStageItem[] = items || stagePayload?.items || [];
		const teeth = stageItems
			.map((it: PlanStageItem) => it.toothNumber ?? it.toothCode)
			.filter((t: unknown): t is number | string => t !== undefined && t !== null && t !== "");
		const uniqueTeeth = Array.from(new Set(teeth));
		const teethStr = uniqueTeeth.join(", ");
		const totalPriceKopecks = stageItems.reduce<number>(
			(acc: number, it: PlanStageItem) => acc + resolvePlanStageItemKopecks(it).netTotalKopecks,
			0,
		);
		const totalPriceRub = kopecksToRubles(totalPriceKopecks);

		const detailPayload = {
			treatmentPlanId,
			stageNumber: stagePayload.stageNumber,
			stageTitle: stagePayload.title,
			items: stageItems,
			teeth: uniqueTeeth,
			selectedTeeth: uniqueTeeth,
			toothNumber: uniqueTeeth[0],
			toothFdi: teethStr || (uniqueTeeth[0] ? String(uniqueTeeth[0]) : undefined),
			priceKopecks: totalPriceKopecks > 0 ? totalPriceKopecks : undefined,
			priceRub: totalPriceRub > 0 ? totalPriceRub : undefined,
			patientId: patient?.id,
			patientName: patient?.fullName || patient?.name,
		};
		window.dispatchEvent(
			new CustomEvent("dente-open-lab-order-modal", { detail: detailPayload }),
		);
		window.dispatchEvent(
			new CustomEvent("dente-open-create-lab-order", { detail: detailPayload }),
		);
	}
}
