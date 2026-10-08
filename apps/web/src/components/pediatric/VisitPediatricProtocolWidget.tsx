/**
 * ═══════════════════════════════════════════════════════════════════════════
 * VISIT PEDIATRIC PROTOCOL WIDGET (CANONICAL FACADE)
 * Fast 1-Click Form 043/u & Order 804n Pediatric Dental Logging
 * Decomposed into ./protocolWidget/ DAG hierarchy per /decomposer skill
 * 100% AST Export Parity & Backward Compatibility Preserved
 * ══════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import {
	PediatricProtocolWidgetContent,
	type VisitPediatricProtocolWidgetProps,
} from "./protocolWidget";

export type {
	FranklExpressItem,
	PediatricProtocolId,
	PediatricServiceItem,
	PediatricProtocolDefinition,
	PediatricSurfacePreset,
	PediatricSedationState,
	VisitPediatricProtocolWidgetProps,
} from "./protocolWidget";

export {
	isValidFdiTooth,
	PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION,
	FRANKL_EXPRESS_ITEMS,
	PEDIATRIC_PROTOCOL_PRESETS,
	PEDIATRIC_TEETH_NAMES,
	PEDIATRIC_SURFACE_PRESETS,
	QUICK_PEDIATRIC_TEETH,
	DEFAULT_SEDATION_STATE,
	PediatricBehaviorCard,
	PediatricPrimaryTeethCard,
	PediatricSedationProtocol,
	PediatricTreatmentSteps,
	PediatricRewardsModal,
	PediatricProtocolDetailsAccordion,
	PediatricProtocolTopBar,
	PediatricProtocolDesktopActionBar,
	PediatricMobileBottomBar,
	PediatricProtocolWidgetContent,
} from "./protocolWidget";

export const VisitPediatricProtocolWidget: React.FC<
	VisitPediatricProtocolWidgetProps
> = (props) => {
	return <PediatricProtocolWidgetContent {...props} />;
};

export default VisitPediatricProtocolWidget;
