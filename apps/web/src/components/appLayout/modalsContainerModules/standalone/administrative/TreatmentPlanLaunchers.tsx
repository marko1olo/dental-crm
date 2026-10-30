/**
 * TreatmentPlanLaunchers — Сравнение сценариев, сметы и планы лечения (Мандат 8b, <= 120 строк).
 *
 * Тонкий URL-роутер: пациент и план приходят из базы через честные хосты.
 * Никаких вбитых пациентов, зубов и демо-режимов «для красоты».
 */

import React from "react";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import type { StandaloneLaunchersProps } from "../../modalsContainerTypes";
import { clearUrlTokens, hasUrlToken } from "../deepLinkUrl";
import {
	StandaloneScenarioComparisonHost,
	StandaloneTreatmentEstimatorHost,
	StandaloneTreatmentPlansWorkspaceHost,
} from "./StandaloneTreatmentPlanLauncherHosts";

const LiveTreatmentPlanPresenterLauncher = lazyWithRetry(() =>
	import("../LiveTreatmentPlanPresenterLauncher").then((m) => ({ default: m.LiveTreatmentPlanPresenterLauncher })),
);

export function renderTreatmentPlanLaunchers(props: StandaloneLaunchersProps): React.ReactElement | null {
	const { isPlanScenariosDirectModalOpen, setIsPlanScenariosDirectModalOpen, isCasePresenterDirectModalOpen, setIsCasePresenterDirectModalOpen } = props;

	if (isPlanScenariosDirectModalOpen) {
		return (
			<StandaloneScenarioComparisonHost
				onClose={() => {
					setIsPlanScenariosDirectModalOpen?.(false);
					clearUrlTokens(["scenarios"]);
				}}
			/>
		);
	}

	if (isCasePresenterDirectModalOpen) {
		return (
			<LiveTreatmentPlanPresenterLauncher
				isOpen={true}
				onClose={() => {
					setIsCasePresenterDirectModalOpen?.(false);
					clearUrlTokens(["presenter", "patientId", "planId"]);
				}}
			/>
		);
	}

	if (hasUrlToken(["estimator"])) {
		return (
			<StandaloneTreatmentEstimatorHost
				onClose={() => clearUrlTokens(["estimator"])}
			/>
		);
	}

	if (hasUrlToken(["treatment-plans", "treatment_plans"])) {
		return (
			<StandaloneTreatmentPlansWorkspaceHost
				onClose={() => clearUrlTokens(["treatment-plans", "treatment_plans"])}
			/>
		);
	}

	return null;
}
