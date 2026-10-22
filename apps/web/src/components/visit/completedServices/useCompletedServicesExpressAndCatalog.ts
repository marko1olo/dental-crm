import { money } from "../../../AppHelpers";
import { useVisitStore } from "../../../store/visitStore";
import { showToast } from "../../GlobalToast";
import {
	type ChairsideExpressService,
	type FilteredCatalogService,
	formatCompletedServiceLine,
} from "../completedServicesPlan";
import {
	dispatchAddServicesToInvoice,
	formatToothBadgeMsg,
} from "./completedServicesEngine";
import {
	buildCatalogServicePayload,
	buildExpressServicePayload,
} from "./completedServicesPayloadEngine";

interface ExpressAndCatalogParams {
	readonly planText: string;
	readonly updateVisitNoteField?: ((field: string, value: unknown) => void) | undefined;
	readonly selectedTooth: string | null;
	readonly onClearSearch: () => void;
}

export function useCompletedServicesExpressAndCatalog({
	planText,
	updateVisitNoteField,
	selectedTooth,
	onClearSearch,
}: ExpressAndCatalogParams) {
	const handleAddExpressService = (service: ChairsideExpressService) => {
		if (!updateVisitNoteField) return;
		const line = formatCompletedServiceLine({
			code804n: service.code804n,
			title: service.title,
			priceRub: service.priceRub,
			toothCode: selectedTooth,
		});
		const base = (planText ?? "").replace(/\s+$/, "");
		updateVisitNoteField("treatmentPlan", base ? `${base}\n${line}` : line);

		const toothNum = selectedTooth ? Number.parseInt(selectedTooth, 10) || undefined : undefined;
		useVisitStore.getState().addCompletedService({
			serviceId: service.id,
			code804n: service.code804n,
			name: service.title,
			priceRub: service.priceRub,
			toothNumber: toothNum ? Number(toothNum) : undefined,
			toothCode: selectedTooth ? String(selectedTooth) : undefined,
			quantity: 1,
		});

		const expressPayload = buildExpressServicePayload(service, selectedTooth);
		useVisitStore.getState().applyServicesToToothState(expressPayload);
		dispatchAddServicesToInvoice(expressPayload);

		const toothMsg = formatToothBadgeMsg(selectedTooth);
		showToast(
			`Услуга «[${service.code804n}] ${service.title}»${toothMsg} (${money(service.priceRub)}) внесена в карту и счёт`,
			"success",
			3500,
		);
	};

	const handleAddCatalogService = (item: FilteredCatalogService) => {
		if (!updateVisitNoteField) return;
		const line = formatCompletedServiceLine({
			code804n: item.code,
			title: item.title,
			priceRub: item.priceRub,
			toothCode: selectedTooth,
		});
		const base = (planText ?? "").replace(/\s+$/, "");
		updateVisitNoteField("treatmentPlan", base ? `${base}\n${line}` : line);

		const toothNum = selectedTooth ? Number.parseInt(selectedTooth, 10) || undefined : undefined;
		useVisitStore.getState().addCompletedService({
			serviceId: item.id,
			code804n: item.code,
			name: item.title,
			priceRub: item.priceRub,
			toothNumber: toothNum ? Number(toothNum) : undefined,
			toothCode: selectedTooth ? String(selectedTooth) : undefined,
			quantity: 1,
		});

		const catalogPayload = buildCatalogServicePayload(item, selectedTooth);
		useVisitStore.getState().applyServicesToToothState(catalogPayload);
		dispatchAddServicesToInvoice(catalogPayload);

		const toothMsg = formatToothBadgeMsg(selectedTooth);
		showToast(
			`Услуга «[${item.code}] ${item.title}»${toothMsg} (${money(item.priceRub)}) внесена в карту и счёт`,
			"success",
			3500,
		);
		onClearSearch();
	};

	return { handleAddExpressService, handleAddCatalogService };
}
