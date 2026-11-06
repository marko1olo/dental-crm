/**
 * apps/web/src/components/odontogram/EndoCanalMeasurementDrawer.tsx
 *
 * Canonical Facade Delegate (Mandate 8s: The Best of Breed).
 * Consolidates endodontic canal measurement into the canonical EndoCanalLogModal.
 */

import React from "react";
import {
	EndodonticStudioModal,
	type EndodonticStudioModalProps,
} from "../endo/EndodonticStudioModal";

export type EndoCanalMeasurementDrawerProps = EndodonticStudioModalProps;

export const EndoCanalMeasurementDrawer: React.FC<EndoCanalMeasurementDrawerProps> = (props) => {
	return <EndodonticStudioModal {...props} />;
};

export default EndoCanalMeasurementDrawer;
