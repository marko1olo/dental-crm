import React from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { useVisitStore } from "../../../store/visitStore";
import {
	calculateCompletedServicesSummary,
	visitOwnedPlanItems,
} from "../completedServicesPlan";
import { realVisitFieldId } from "../visitIdentity";
import { extractParsedCompletedLines } from "./serviceChecklistHelpers";
import { useCompletedServicesAddActions } from "./useCompletedServicesAddActions";
import { useCompletedServicesCatalogSearch } from "./useCompletedServicesCatalogSearch";
import { useCompletedServicesPlanSync } from "./useCompletedServicesPlanSync";
import { useCompletedServicesRemovalAction } from "./useCompletedServicesRemovalAction";

export function useCompletedServicesChecklist(overrideCatalog?: readonly any[]) {
	// biome-ignore lint/suspicious/noExplicitAny: dynamic context shape
	const context = useAppLogicContext() as any;
	const {
		visitNoteForm = {},
		updateVisitNoteField,
		dashboard,
		activeVisitPatient,
		selectedTooth: contextTooth,
		activeToothNumber,
	} = context || {};

	const visitPatientId = realVisitFieldId(dashboard?.activeVisit?.patientId);
	const visitId = realVisitFieldId(dashboard?.activeVisit?.id);
	const visitIsOpen = Boolean(visitPatientId && visitId);
	const visitPatientName =
		typeof activeVisitPatient?.fullName === "string" && activeVisitPatient.fullName.trim()
			? activeVisitPatient.fullName.trim()
			: null;

	const storeActiveTooth = useVisitStore((s) => s.activeToothNumber);
	const initialTooth = contextTooth || storeActiveTooth || activeToothNumber || null;
	const [selectedTooth, setSelectedTooth] = React.useState<string | null>(
		initialTooth ? String(initialTooth) : null,
	);
	const [isToothGridOpen, setIsToothGridOpen] = React.useState<boolean>(false);

	React.useEffect(() => {
		if (storeActiveTooth !== undefined && storeActiveTooth !== null) {
			setSelectedTooth(String(storeActiveTooth));
		}
	}, [storeActiveTooth]);

	const [bundlesExpanded, setBundlesExpanded] = React.useState<boolean>(false);
	const search = useCompletedServicesCatalogSearch(overrideCatalog, dashboard?.serviceCatalog);

	const planItems = React.useMemo(
		() => visitOwnedPlanItems(dashboard?.treatmentPlanItems, visitPatientId),
		[dashboard?.treatmentPlanItems, visitPatientId],
	);

	const planText: string =
		typeof visitNoteForm?.treatmentPlan === "string" ? visitNoteForm.treatmentPlan : "";
	const planLines = React.useMemo(
		() => (planText ?? "").split("\n").map((line) => (line ?? "").trim()),
		[planText],
	);

	const summary = React.useMemo(
		() => calculateCompletedServicesSummary(planText),
		[planText],
	);
	const completedLinesList = React.useMemo(
		() => extractParsedCompletedLines(planLines),
		[planLines],
	);

	const planSync = useCompletedServicesPlanSync({
		planText,
		planLines,
		updateVisitNoteField,
		selectedTooth,
	});

	const addActions = useCompletedServicesAddActions({
		planText,
		updateVisitNoteField,
		selectedTooth,
		onClearSearch: () => search.setCatalogSearch(""),
	});

	const removalActions = useCompletedServicesRemovalAction({
		planText,
		updateVisitNoteField,
		summary,
		visitPatientId,
		visitId,
	});

	return {
		visitIsOpen,
		visitPatientName,
		selectedTooth,
		setSelectedTooth,
		isToothGridOpen,
		setIsToothGridOpen,
		visitPatientId,
		visitId,
		bundlesExpanded,
		setBundlesExpanded,
		planItems,
		completedLinesList,
		summary,
		...search,
		...planSync,
		...addActions,
		...removalActions,
	};
}
