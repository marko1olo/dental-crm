/**
 * useCbctStandaloneStudio.ts — Фасадный хук состояния КЛКТ-студии (Мандат 8b <= 120 строк).
 */

import { useState } from "react";
import type { CbctViewportType } from "../cbctMprMath";
import type { CbctStandaloneStudioViewProps } from "./types";
import { useCbctStudioLayoutState } from "./modules/useCbctStudioLayoutState";
import { useCbctStudioImplantState } from "./modules/useCbctStudioImplantState";
import { useCbctStudioNerveArchState } from "./modules/useCbctStudioNerveArchState";
import { useCbctStudioExportActions } from "./modules/useCbctStudioExportActions";

export function useCbctStandaloneStudio(props: CbctStandaloneStudioViewProps) {
	const layoutState = useCbctStudioLayoutState(props);
	const implantState = useCbctStudioImplantState();
	const nerveArchState = useCbctStudioNerveArchState();
	const exportActions = useCbctStudioExportActions(layoutState.effectivePatientId, layoutState.effectiveStudyId);

	const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
	const [activeTool, setActiveTool] = useState<any>("crosshair");
	const [activeViewport, setActiveViewport] = useState<CbctViewportType>("axial");
	const [isComparisonSplitOpen, setIsComparisonSplitOpen] = useState<boolean>(false);
	const [isLabOrderModalOpen, setIsLabOrderModalOpen] = useState<boolean>(false);
	const [labOrderDraft, setLabOrderDraft] = useState<any>(null);

	const handleToggleMaximize = (viewport: CbctViewportType) => {
		layoutState.setMaximizedViewport((prev) => (prev === viewport ? null : viewport));
	};

	return {
		...layoutState,
		...implantState,
		...nerveArchState,
		...exportActions,
		isReportModalOpen,
		setIsReportModalOpen,
		activeTool,
		setActiveTool,
		activeViewport,
		setActiveViewport,
		handleToggleMaximize,
		isComparisonSplitOpen,
		setIsComparisonSplitOpen,
		isLabOrderModalOpen,
		setIsLabOrderModalOpen,
		labOrderDraft,
		setLabOrderDraft,
		// Fallback aliases for backward compatibility with view
		patientDisplayName: layoutState.effectivePatientName,
		patientId: layoutState.effectivePatientId,
		studyId: layoutState.effectiveStudyId,
		onClose: props.onClose ?? (() => {}),
	};
}
