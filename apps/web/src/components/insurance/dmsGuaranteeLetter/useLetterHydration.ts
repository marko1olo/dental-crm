/**
 * useLetterHydration.ts — Загрузка существующего гарантийного письма пациента из Fastify API / PostgreSQL
 */

import { useEffect } from "react";
import type { DmsGuaranteeLetter } from "../insuranceMath.js";
import { fetchPatientGuaranteeLettersFromApi, type PatientDmsProfile } from "./types.js";
import type { useLetterFieldsState } from "./useLetterFieldsState.js";

export function useLetterHydration(
	isOpen: boolean,
	patient?: PatientDmsProfile | undefined,
	initialLetter?: DmsGuaranteeLetter | undefined,
	setters?: ReturnType<typeof useLetterFieldsState> | undefined,
) {
	useEffect(() => {
		if (!isOpen || initialLetter || !patient?.id || !setters) return;
		let isCancelled = false;

		fetchPatientGuaranteeLettersFromApi(patient.id)
			.then((letters) => {
				if (isCancelled || !letters || letters.length === 0) return;
				const rawLetters = letters as Record<string, any>[];
				const active = rawLetters.find((l) => l.status === "active") || rawLetters[0];
				if (!active) return;

				if (active.letterNumber) setters.setLetterNumber(String(active.letterNumber));
				if (active.insurerKey) setters.setInsurerKey(String(active.insurerKey));
				if (active.insurerName) setters.setCustomInsurerName(String(active.insurerName));
				if (active.policyNumber) setters.setPolicyNumber(String(active.policyNumber));
				if (active.issueDate) setters.setIssueDate(String(active.issueDate).slice(0, 10));
				if (active.validFrom) setters.setValidFrom(String(active.validFrom).slice(0, 10));
				if (active.validUntil) setters.setValidUntil(String(active.validUntil).slice(0, 10));
				if (active.maxCoverageRub !== undefined) setters.setMaxCoverageRub(Number(active.maxCoverageRub));
				if (active.usedAmountRub !== undefined) setters.setUsedAmountRub(Number(active.usedAmountRub));
				if (active.franchisePct !== undefined) setters.setFranchisePct(Number(active.franchisePct));
				if (active.franchiseType) setters.setFranchiseType(active.franchiseType);
				if (active.franchiseFixedRub !== undefined) setters.setFranchiseFixedRub(Number(active.franchiseFixedRub));
				if (Array.isArray(active.approvedServiceCodes)) setters.setApprovedServiceCodes([...active.approvedServiceCodes]);
				if (Array.isArray(active.approvedDiagnosisCodes)) setters.setApprovedDiagnosisCodes([...active.approvedDiagnosisCodes]);
				if (Array.isArray(active.programExclusions)) setters.setSelectedExclusions([...active.programExclusions]);
				if (active.notes) setters.setNotes(String(active.notes));
				if (active.status) setters.setStatus(active.status);
			})
			.catch(() => {});

		return () => { isCancelled = true; };
	}, [isOpen, initialLetter, patient?.id, setters]);
}
