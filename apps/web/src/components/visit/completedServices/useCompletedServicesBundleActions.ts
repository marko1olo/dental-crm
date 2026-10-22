import { money } from "../../../AppHelpers";
import { countLabel } from "../../../lib/russianPlural";
import { useVisitStore } from "../../../store/visitStore";
import { showToast } from "../../GlobalToast";
import { formatCompletedServiceLine } from "../completedServicesPlan";
import {
	dispatchAddServicesToInvoice,
	formatToothBadgeMsg,
} from "./completedServicesEngine";
import { buildBundlePayload } from "./completedServicesPayloadEngine";
import type { ClinicalServiceBundle } from "./types";

interface BundleActionsParams {
	readonly planText: string;
	readonly updateVisitNoteField?: ((field: string, value: unknown) => void) | undefined;
	readonly selectedTooth: string | null;
}

export function useCompletedServicesBundleActions({
	planText,
	updateVisitNoteField,
	selectedTooth,
}: BundleActionsParams) {
	const handleAddBundle = (bundle: ClinicalServiceBundle) => {
		if (!updateVisitNoteField) return;
		const bundleLines = bundle.services.map((s) =>
			formatCompletedServiceLine({
				code804n: s.code804n,
				title: s.title,
				priceRub: s.priceRub,
				toothCode: selectedTooth,
			}),
		);
		const base = (planText ?? "").replace(/\s+$/, "");
		const updated = base ? `${base}\n${bundleLines.join("\n")}` : bundleLines.join("\n");
		updateVisitNoteField("treatmentPlan", updated);

		const toothNum = selectedTooth ? Number.parseInt(selectedTooth, 10) || undefined : undefined;
		for (const s of bundle.services) {
			useVisitStore.getState().addCompletedService({
				serviceId: `${bundle.id}-${s.code804n}`,
				code804n: s.code804n,
				name: s.title,
				priceRub: s.priceRub,
				toothNumber: toothNum ? Number(toothNum) : undefined,
				toothCode: selectedTooth ? String(selectedTooth) : undefined,
				quantity: 1,
			});
		}

		const bundlePayload = buildBundlePayload(bundle, selectedTooth);
		useVisitStore.getState().applyServicesToToothState(bundlePayload);
		dispatchAddServicesToInvoice(bundlePayload);

		const toothMsg = formatToothBadgeMsg(selectedTooth);
		showToast(
			`Пакет «${bundle.title}»${toothMsg} (${countLabel(bundle.services.length, "услуга", "услуги", "услуг")} на ${money(bundle.totalPriceRub)}) внесен в карту и счет`,
			"success",
			3500,
		);
	};

	// biome-ignore lint/suspicious/noExplicitAny: dynamic invoice payload
	const handleApplyDiagnosisPackage = (newLines: string[], invoicePayload: any) => {
		if (!updateVisitNoteField) return;
		const base = (planText ?? "").replace(/\s+$/, "");
		const updated = base ? `${base}\n${newLines.join("\n")}` : newLines.join("\n");
		updateVisitNoteField("treatmentPlan", updated);
		dispatchAddServicesToInvoice(invoicePayload);
	};

	return { handleAddBundle, handleApplyDiagnosisPackage };
}
