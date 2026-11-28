/**
 * Administrative Launchers Registry — переведено в единый 3-Shell хост WorkspaceStudioOverlayHost + routeResolver.
 */

import type React from "react";
import type { StandaloneLaunchersProps } from "../modalsContainerTypes";
import type { LauncherRegistryEntry } from "./deepLinkMatcher";

export const ADMINISTRATIVE_LAUNCHERS_REGISTRY: readonly LauncherRegistryEntry<StandaloneLaunchersProps>[] =
	[];

export function renderAdministrativeLaunchers(
	_props: StandaloneLaunchersProps,
): React.ReactElement | null {
	return null;
}
