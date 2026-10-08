/**
 * useDicomWorkbenchActions (Layer 3 Aggregator)
 *
 * Consolidates plan actions and manifest/session actions into a unified API.
 */

import type { DicomAuthContext } from "./types";
import { useDicomWorkbenchManifestActions } from "./useDicomWorkbenchManifestActions";
import { useDicomWorkbenchPlanActions } from "./useDicomWorkbenchPlanActions";
import type { useDicomWorkbenchState } from "./useDicomWorkbenchState";

export interface UseDicomWorkbenchActionsParams {
	auth: DicomAuthContext;
	state: ReturnType<typeof useDicomWorkbenchState>;
	setError: (error: string | null) => void;
	ohifBaseUrl: string;
}

export function useDicomWorkbenchActions({
	auth,
	state,
	setError,
	ohifBaseUrl,
}: UseDicomWorkbenchActionsParams) {
	const manifestActions = useDicomWorkbenchManifestActions({
		auth,
		state,
		setError,
		ohifBaseUrl,
	});

	const planActions = useDicomWorkbenchPlanActions({
		auth,
		state,
		setError,
		ohifBaseUrl,
		applyDicomWorkbenchManifest: manifestActions.applyDicomWorkbenchManifest,
	});

	return {
		...planActions,
		...manifestActions,
	};
}
