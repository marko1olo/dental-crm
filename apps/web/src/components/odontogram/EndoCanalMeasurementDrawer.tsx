/**
 * apps/web/src/components/odontogram/EndoCanalMeasurementDrawer.tsx
 *
 * Canonical Facade Delegate (Mandate 8s: The Best of Breed).
 * Consolidates endodontic canal measurement into the canonical EndoCanalLogModal.
 */

import React from "react";
import {
	EndoCanalLogModal,
	type EndoCanalLogModalProps,
} from "../endo/EndoCanalLogModal";

export type EndoCanalMeasurementDrawerProps = EndoCanalLogModalProps;

export const EndoCanalMeasurementDrawer: React.FC<EndoCanalMeasurementDrawerProps> = (props) => {
	return <EndoCanalLogModal {...props} />;
};

export default EndoCanalMeasurementDrawer;
