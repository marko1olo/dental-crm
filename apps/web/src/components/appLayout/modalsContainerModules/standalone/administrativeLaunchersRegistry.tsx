/**
 * Administrative Launchers Registry — Совместимый реестр (DirectShiftLauncher сохранен для контура смен).
 */

import React from "react";
import type { StandaloneLaunchersProps } from "../modalsContainerTypes";
import type { LauncherRegistryEntry } from "./deepLinkMatcher";
import { DirectShiftLauncher } from "../../../shift/DirectShiftLauncher";
import { renderSpecializedAdministrativeLaunchers } from "./SpecializedAdministrativeLaunchers";

export const ADMINISTRATIVE_LAUNCHERS_REGISTRY: readonly LauncherRegistryEntry<StandaloneLaunchersProps>[] =
	[
		{
			id: "shift-studio",
			title: "Закрытие смены и Z-отчёт",
			criteria: {
				tokens: ["shift-closing", "z-report"],
				exactHashes: ["#shift-closing", "#z-report"],
				searchIncludes: ["shift_closing=1", "z_report=1"],
			},
			render: () => <DirectShiftLauncher />,
		},
	];

export function renderAdministrativeLaunchers(
	props: StandaloneLaunchersProps,
): React.ReactElement | null {
	return renderSpecializedAdministrativeLaunchers(props);
}
