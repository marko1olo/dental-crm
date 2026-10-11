/**
 * DENTE CRM — Consultation Header Toolbar Component (Layer 4)
 * Directed Acyclic Graph (DAG): Layer 4 (Presentation Subcomponent)
 * Desktop density: 32-36px, zero clutter, single row
 */

import React from "react";
import { ConsultationTopToolbar, type ConsultationSplitMode } from "../ConsultationTopToolbar.js";
import type { ConsultationSlot } from "../consultationCanvasRenderers.js";
import type { ActiveConsultationTool } from "./types.js";

export interface ConsultationHeaderToolbarProps {
	readonly patientName?: string | undefined;
	readonly patientCardNumber?: string | undefined;
	readonly patientAge?: string | number | undefined;
	readonly patientGender?: string | undefined;
	readonly activeSlot: ConsultationSlot;
	readonly onSelectSlot: (slot: ConsultationSlot) => void;
	readonly splitMode: ConsultationSplitMode;
	readonly onToggleSplitMode: () => void;
	readonly activeTool: ActiveConsultationTool;
	readonly onSelectTool: (tool: ActiveConsultationTool) => void;
	readonly isSyncNav: boolean;
	readonly onToggleSyncNav: () => void;
	readonly onResetView: () => void;
	readonly onToggleInvert: () => void;
	readonly onClearAnnotations: () => void;
	readonly onTakeSnapshot: () => void;
	readonly onInsertProtocol: () => void;
	readonly isFullscreen: boolean;
	readonly onToggleFullscreen: () => void;
	readonly onClose?: (() => void) | undefined;
}

export const ConsultationHeaderToolbar: React.FC<ConsultationHeaderToolbarProps> = (props) => {
	return <ConsultationTopToolbar {...props} />;
};
