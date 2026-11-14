/**
 * TherapyLaunchers — Терапевтические лаунчеры (гигиена, пародонтология, анамнез, реколлы) (Мандат 8b, <= 120 строк).
 *
 * Тонкий URL-роутер: все разделы работают по реальному ?patientId= из базы
 * через честные хосты. Симулятор ЭМК с вымышленным визитом снесён — живая
 * ЭМК открывается из визита в рабочем контуре.
 */

import React from "react";
import { renderPatientDetailsLauncher } from "./PatientDetailsStandaloneLauncher";
import {
	StandaloneAnamnesisHost,
	StandaloneHygieneHost,
	StandalonePerioHost,
	StandaloneRecallsHost,
} from "./StandaloneTherapyWorkspaceHosts";
import { StandaloneClinicalTemplatesHost } from "./StandaloneClinicalTemplatesHost";
import { StandaloneEmrProtocolHost } from "./StandaloneEmrProtocolHost";
import { StandaloneEndoHost } from "./StandaloneEndoHost";
import { StandaloneClinicalBundlesHost } from "./StandaloneClinicalBundlesHost";
import { ToothContextDrawer } from "../../../../diagnostics/ToothContextDrawer";
import { PediatricMixedDentitionModal } from "../../../../odontogram/PediatricMixedDentitionModal";
import { useVisitStore } from "../../../../../store/visitStore";
import { clearUrlTokens, hasUrlToken } from "../deepLinkUrl";

export function renderTherapyLaunchers(): React.ReactElement | null {
	if (typeof window === "undefined") return null;

	const patientDetails = renderPatientDetailsLauncher();
	if (patientDetails) return patientDetails;

	if (hasUrlToken(["hygiene"])) {
		return <StandaloneHygieneHost onClose={() => clearUrlTokens(["hygiene"])} />;
	}

	if (hasUrlToken(["perio", "periodontics", "psr"])) {
		const mode = new URLSearchParams(window.location.search || "").get("perio");
		return (
			<StandalonePerioHost
				mode={mode}
				onClose={() => clearUrlTokens(["perio", "periodontics", "psr"], ["perio", "periodontics", "psr"])}
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

	if (hasUrlToken(["emr-protocol", "protocol-generator", "star-protocol"])) {
		return (
			<StandaloneEmrProtocolHost
				onClose={() => clearUrlTokens(["emr-protocol", "protocol-generator", "star-protocol"])}
			/>
		);
	}

	if (hasUrlToken(["endo", "endodontics", "root-canals", "chairside-endo"])) {
		return (
			<StandaloneEndoHost
				onClose={() => clearUrlTokens(["endo", "endodontics", "root-canals", "chairside-endo"])}
			/>
		);
	}

	if (hasUrlToken(["clinical-bundles", "diagnosis-packages"])) {
		return (
			<StandaloneClinicalBundlesHost
				onClose={() => clearUrlTokens(["clinical-bundles", "diagnosis-packages"])}
			/>
		);
	}


	if (hasUrlToken(["tooth-drawer", "tooth-card", "chairside-tooth"])) {
		const searchParams = new URLSearchParams(window.location.search || "");
		const urlTooth = Number.parseInt(searchParams.get("tooth") || searchParams.get("fdi") || "", 10);
		const effectiveToothNumber = (!Number.isNaN(urlTooth) && urlTooth > 0)
			? urlTooth
			: (useVisitStore.getState().activeToothNumber ?? 11);
		const visitRecord = useVisitStore.getState().visitToothRecordsByCode[String(effectiveToothNumber)];
		const reactiveToothData = visitRecord
			? { toothNumber: effectiveToothNumber, state: visitRecord.state ?? "Healthy", surfaces: visitRecord.surfaces ?? [] }
			: { toothNumber: effectiveToothNumber, state: "Healthy", surfaces: [] };

		return (
			<ToothContextDrawer
				isOpen={true}
				onClose={() => clearUrlTokens(["tooth-drawer", "tooth-card", "chairside-tooth"])}
				toothNumber={effectiveToothNumber}
				toothData={reactiveToothData as any}
			/>
		);
	}

	if (hasUrlToken(["pediatric", "children", "pedodontics"])) {
		return (
			<PediatricMixedDentitionModal
				isOpen={true}
				onClose={() => clearUrlTokens(["pediatric", "children", "pedodontics"], ["pediatric", "children"])}
			/>
		);
	}

	return null;
}
