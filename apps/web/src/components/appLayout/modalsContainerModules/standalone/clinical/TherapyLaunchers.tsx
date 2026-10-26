/**
 * TherapyLaunchers — Терапевтические лаунчеры (гигиена, пародонтология, анамнез, реколлы) (Мандат 8b, <= 120 строк).
 *
 * Тонкий URL-роутер: все разделы работают по реальному ?patientId= из базы
 * через честные хосты. Симулятор ЭМК с вымышленным визитом снесён — живая
 * ЭМК открывается из визита в рабочем контуре.
 */

import type React from "react";
import { renderPatientDetailsLauncher } from "./PatientDetailsStandaloneLauncher";
import {
	StandaloneAnamnesisHost,
	StandaloneHygieneHost,
	StandalonePerioHost,
	StandaloneRecallsHost,
} from "./StandaloneTherapyWorkspaceHosts";
import { StandaloneClinicalTemplatesHost } from "./StandaloneClinicalTemplatesHost";
import { clearUrlTokens, hasUrlToken } from "../deepLinkUrl";

export function renderTherapyLaunchers(): React.ReactElement | null {
	if (typeof window === "undefined") return null;

	const patientDetails = renderPatientDetailsLauncher();
	if (patientDetails) return patientDetails;

	if (hasUrlToken(["hygiene"])) {
		return <StandaloneHygieneHost onClose={() => clearUrlTokens(["hygiene"])} />;
	}

	if (hasUrlToken(["perio"])) {
		const mode = new URLSearchParams(window.location.search || "").get("perio");
		return (
			<StandalonePerioHost
				mode={mode}
				onClose={() => clearUrlTokens(["perio"], ["perio"])}
			/>
		);
	}

	if (hasUrlToken(["anamnesis"])) {
		return <StandaloneAnamnesisHost onClose={() => clearUrlTokens(["anamnesis"])} />;
	}

	if (hasUrlToken(["recalls"])) {
		return <StandaloneRecallsHost onClose={() => clearUrlTokens(["recalls"])} />;
	}

	if (hasUrlToken(["protocols", "clinical-templates", "diary-templates"])) {
		return (
			<StandaloneClinicalTemplatesHost
				onClose={() => clearUrlTokens(["protocols", "clinical-templates", "diary-templates"])}
			/>
		);
	}

	return null;
}
