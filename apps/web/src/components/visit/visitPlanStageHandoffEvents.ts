export interface StageHandoffPayload {
	readonly title: string;
	readonly stageNumber: number;
	readonly items: any[];
}

export function dispatchTakeStageToVisit(
	stagePayload: StageHandoffPayload,
	items: any[],
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

export function dispatchOpenLabOrderForStage(
	stagePayload: StageHandoffPayload,
	items: any[],
	treatmentPlanId?: string | undefined,
	patient?: any | null | undefined,
): void {
	if (typeof window !== "undefined") {
		const stageItems = items || stagePayload?.items || [];
		const teeth = stageItems
			.map((it: any) => it.toothNumber ?? it.toothCode)
			.filter((t: any): t is number | string => t !== undefined && t !== null && t !== "");
		const uniqueTeeth = Array.from(new Set(teeth));
		const teethStr = uniqueTeeth.join(", ");
		const totalPriceRub = stageItems.reduce((acc: number, it: any) => {
			const price = Number(it.unitPriceRub ?? it.price ?? it.priceRub ?? 0);
			const qty = Number(it.quantity || 1);
			const discount = Number(it.discountRub ?? it.discount ?? 0);
			return acc + Math.max(0, price * qty - discount);
		}, 0);

		const detailPayload = {
			treatmentPlanId,
			stageNumber: stagePayload.stageNumber,
			stageTitle: stagePayload.title,
			items: stageItems,
			teeth: uniqueTeeth,
			selectedTeeth: uniqueTeeth,
			toothNumber: uniqueTeeth[0],
			toothFdi: teethStr || (uniqueTeeth[0] ? String(uniqueTeeth[0]) : undefined),
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
