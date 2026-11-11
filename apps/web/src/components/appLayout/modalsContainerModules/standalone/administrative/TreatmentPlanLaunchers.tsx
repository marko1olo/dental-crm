/**
 * TreatmentPlanLaunchers — Сравнение сценариев, сметы и планы лечения (Мандат 8b, <= 60 строк).
 * Тонкий URL-роутер: единый канонический лаунчер DirectTreatmentPlanLauncher (SSOT).
 */

import React from "react";
import type { StandaloneLaunchersProps } from "../../modalsContainerTypes";
import { hasUrlToken } from "../deepLinkUrl";
import { DirectTreatmentPlanLauncher } from "../../../../treatment-plans/DirectTreatmentPlanLauncher";

export function renderTreatmentPlanLaunchers(props: StandaloneLaunchersProps): React.ReactElement | null {
	const { isPlanScenariosDirectModalOpen, isCasePresenterDirectModalOpen } = props;

	if (
		isPlanScenariosDirectModalOpen ||
		isCasePresenterDirectModalOpen ||
		hasUrlToken([
			"scenarios",
			"presenter",
			"estimator",
			"treatment-studio",
			"treatment_studio",
			"treatment-plans",
			"treatment_plans",
			"plans",
			"estimates",
		])
	) {
		return <DirectTreatmentPlanLauncher />;
	}

	return null;
}
