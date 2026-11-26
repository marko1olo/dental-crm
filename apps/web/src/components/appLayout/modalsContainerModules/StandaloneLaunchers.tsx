/**
 * Standalone Launchers Hub — Тонкий совместимый фасад (<= 40 строк).
 * Маршрутизация и наложенные студии перенесены в WorkspaceStudioOverlayHost + routeResolver (SSOT).
 */

import type React from "react";
import type { StandaloneLaunchersProps } from "./modalsContainerTypes";

export function renderStandaloneLaunchers(
	_props: StandaloneLaunchersProps,
): React.ReactElement | null {
	return null;
}
