/**
 * StandaloneClinicalTemplatesHost — Честный хост клинических протоколов приёма (Мандат 8b <= 120 строк).
 * Позволяет открыть канонические протоколы (?protocols=1, #protocols) и генератор (?protocols=1&generator=1).
 */

import React, { useCallback } from "react";
import { ClinicalProtocolsCatalogModal } from "../../../../visit/clinicalCatalog/ClinicalProtocolsCatalogModal";
import { EmrProtocolGeneratorModal } from "../../../../emr/protocolGenerator/EmrProtocolGeneratorModal";
import { readPatientIdFromUrl, useLauncherPatientName } from "../useLauncherPatientDebt";
import { isDemoShowcaseMode } from "../../../../../lib/demoMode";
import type { VisitNoteFieldsPatch } from "../../../../visit/clinicalCatalog/clinicalProtocolsCatalog";

export const StandaloneClinicalTemplatesHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const patientId = readPatientIdFromUrl();
	const patientName = useLauncherPatientName(patientId);
	const isGenerator = typeof window !== "undefined" && (window.location.search.includes("generator") || window.location.hash.includes("generator"));
	const isDemo = isDemoShowcaseMode();

	const handleApplyPatch = useCallback((patch: VisitNoteFieldsPatch, message: string) => {
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente:protocol-applied", { detail: { patch, message } }),
			);
		}
		onClose();
	}, [onClose]);

	if (isGenerator) {
		return (
			<div
				className="w-full min-h-screen bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-soft,#0f172a)] flex items-center justify-center"
				data-testid="emr-protocol-standalone-root"
			>
				<EmrProtocolGeneratorModal
					isOpen={true}
					onClose={onClose}
					patientFullName={patientName || (isDemo ? "Смирнов Алексей Павлович" : "")}
					medicalCardNumber={isDemo ? "ЭМК-7821" : ""}
					doctorFullName={isDemo ? "Д-р Воронов Алексей Владимирович" : ""}
					doctorSpecialty="Врач-стоматолог-терапевт"
					initialToothNumber={16}
					initialIcd10Code="K02.1"
				/>
			</div>
		);
	}

	return (
		<div
			className="w-full min-h-screen bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-soft,#0f172a)]"
			data-testid="clinical-templates-standalone-root"
		>
			<ClinicalProtocolsCatalogModal
				isOpen={true}
				onClose={onClose}
				activeTooth={16}
				onApplyPatch={handleApplyPatch}
			/>
		</div>
	);
};
