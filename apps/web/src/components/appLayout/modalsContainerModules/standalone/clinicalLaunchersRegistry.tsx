/**
 * Clinical Launchers Registry — Совместимый реестр (наложенные клинические студии обслуживаются WorkspaceStudioOverlayHost).
 */

import type React from "react";
import type { StandaloneLaunchersProps } from "../modalsContainerTypes";
import type { LauncherRegistryEntry } from "./deepLinkMatcher";

export const CLINICAL_LAUNCHERS_REGISTRY: readonly LauncherRegistryEntry<StandaloneLaunchersProps>[] =
	[];

export function renderClinicalLaunchers(
	_props: StandaloneLaunchersProps,
): React.ReactElement | null {
	return null;
}
