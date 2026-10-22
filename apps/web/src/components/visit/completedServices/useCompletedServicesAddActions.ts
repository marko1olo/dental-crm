import { useCompletedServicesBundleActions } from "./useCompletedServicesBundleActions";
import { useCompletedServicesExpressAndCatalog } from "./useCompletedServicesExpressAndCatalog";

interface AddActionsParams {
	readonly planText: string;
	readonly updateVisitNoteField?: (field: string, value: unknown) => void;
	readonly selectedTooth: string | null;
	readonly onClearSearch: () => void;
}

export function useCompletedServicesAddActions({
	planText,
	updateVisitNoteField,
	selectedTooth,
	onClearSearch,
}: AddActionsParams) {
	const expressAndCatalog = useCompletedServicesExpressAndCatalog({
		planText,
		updateVisitNoteField,
		selectedTooth,
		onClearSearch,
	});

	const bundleActions = useCompletedServicesBundleActions({
		planText,
		updateVisitNoteField,
		selectedTooth,
	});

	return {
		...expressAndCatalog,
		...bundleActions,
	};
}
