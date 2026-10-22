import { useVisitStore } from "../../../store/visitStore";
import {
	planLineQuantity,
	planLineTotalRub,
} from "../completedServicesPlan";
import { dispatchAddServicesToInvoice } from "./completedServicesEngine";
import { completedLineOf, serviceTitleOf } from "./serviceChecklistHelpers";
import { useCompletedServicesExternalListener } from "./useCompletedServicesExternalListener";

interface PlanSyncParams {
	readonly planText: string;
	readonly planLines: string[];
	readonly updateVisitNoteField?: (field: string, value: unknown) => void;
	readonly selectedTooth: string | null;
}

export function useCompletedServicesPlanSync({
	planText,
	planLines,
	updateVisitNoteField,
	selectedTooth,
}: PlanSyncParams) {
	useCompletedServicesExternalListener({ planText, planLines, updateVisitNoteField });

	// biome-ignore lint/suspicious/noExplicitAny: generic service item from plan
	const isMarked = (item: any) => planLines.includes(completedLineOf(item));

	// biome-ignore lint/suspicious/noExplicitAny: generic service item from plan
	const togglePlanItem = (item: any) => {
		if (!updateVisitNoteField) return;
		const line = completedLineOf(item);
		const tooth = item?.toothCode ?? item?.toothNumber ?? selectedTooth;

		if (isMarked(item)) {
			const kept = (planText ?? "")
				.split("\n")
				.filter((existing) => (existing ?? "").trim() !== line);
			updateVisitNoteField("treatmentPlan", kept.join("\n").replace(/\n+$/, ""));

			const currentList = useVisitStore.getState().completedServices;
			const targetTitle = serviceTitleOf(item);
			const removeIdx = currentList.findIndex((cs) => {
				// biome-ignore lint/suspicious/noExplicitAny: dynamic completedService item
				const csTitle = cs.name || (cs as any).title || "";
				return csTitle === targetTitle;
			});
			if (removeIdx !== -1) {
				useVisitStore.getState().removeCompletedService(removeIdx);
			}

			if (tooth) {
				const toothStr = String(tooth);
				const hasOther = kept.some(
					(l) => l.includes(`(зуб ${toothStr})`) || l.includes(`(зубы ${toothStr})`),
				);
				if (!hasOther) {
					useVisitStore.getState().setToothState(toothStr, "idle");
				}
			}
			return;
		}

		const base = (planText ?? "").replace(/\s+$/, "");
		updateVisitNoteField("treatmentPlan", base ? `${base}\n${line}` : line);

		const serviceCode = item?.serviceCode || item?.code804n || item?.code || "A16.07.002";
		const serviceTitle = serviceTitleOf(item);
		const toothNum = tooth ? Number(tooth) || undefined : undefined;

		useVisitStore.getState().addCompletedService({
			serviceId: item?.serviceId || item?.id || `plan-${serviceCode}`,
			code804n: serviceCode,
			name: serviceTitle,
			priceRub: planLineTotalRub(item) ?? 0,
			toothNumber: toothNum ? Number(toothNum) : undefined,
			toothCode: tooth ? String(tooth) : undefined,
			quantity: planLineQuantity(item) ?? 1,
		});

		const srvPayload = {
			toothNumber: tooth ? Number(tooth) || tooth : undefined,
			toothCode: tooth ? String(tooth) : undefined,
			services: [
				{
					code: serviceCode,
					code804n: serviceCode,
					title: serviceTitle,
					price: planLineTotalRub(item) ?? 0,
					priceRub: planLineTotalRub(item) ?? 0,
					unitPriceRub:
						typeof item?.unitPriceRub === "number"
							? item.unitPriceRub
							: Number(item?.unitPriceRub) || planLineTotalRub(item) || 0,
					quantity: planLineQuantity(item) ?? 1,
					toothCode: tooth ? String(tooth) : undefined,
				},
			],
			source: "chairside_checklist_toggle",
		};

		useVisitStore.getState().applyServicesToToothState(srvPayload);
		dispatchAddServicesToInvoice(srvPayload);
	};

	return { isMarked, togglePlanItem };
}
