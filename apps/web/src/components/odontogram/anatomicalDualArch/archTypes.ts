/**
 * DENTE Dental CRM — Anatomical Arch Bridge Types
 * Compliant with Mandate 8b (<= 120 lines).
 */

import type { RestorativeMaterialKey } from "../anatomicalGeometriesTypes";

export interface ToothBridgePropsResult {
	isPontic: boolean;
	bridgeMaterial?: RestorativeMaterialKey | undefined;
	hasLeftBridgeConnector: boolean;
	hasRightBridgeConnector: boolean;
}
