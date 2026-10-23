/**
 * letterPersistence.ts — Сборка объекта гарантийного письма и отправка в API / события окна
 */

import { showToast } from "../../GlobalToast.js";
import type { DmsGuaranteeLetter } from "../insuranceMath.js";
import { saveGuaranteeLetterToApi, type PatientDmsProfile } from "./types.js";
import type { useLetterFieldsState } from "./useLetterFieldsState.js";

export function buildCurrentLetter(
	state: ReturnType<typeof useLetterFieldsState>,
	patient?: PatientDmsProfile | undefined,
	initialLetter?: DmsGuaranteeLetter | undefined,
	overrideStatus?: DmsGuaranteeLetter["status"],
): DmsGuaranteeLetter {
	const resolvedPolicy = state.policyNumber.trim() || patient?.policyNumber ||
		(state.isEmergencyCare ? "ЭКСТРЕННЫЙ-ДМС-ОСТРАЯ-БОЛЬ" : state.isDeferredScan ? "ДМС-ДОСЫЛКА-СКАНА" : "ПОЛИС-ДМС-БЕЗ-НОМЕРА");
	const resolvedLetterNum = state.letterNumber.trim() ||
		(state.isEmergencyCare ? "ГП-ЭКСТРЕННО-ОСТРАЯ-БОЛЬ" : state.isDeferredScan ? "ГП-ДОСЫЛКА-СКАНА" : "БЕЗ-НОМЕРА");
	const resolvedCoverage = state.maxCoverageRub > 0 ? state.maxCoverageRub : 50000;
	const resolvedNotes = state.isDeferredScan && !state.notes.includes("досылка")
		? `${state.notes.trim() ? state.notes.trim() + " • " : ""}Отложенный ввод скана (гарантия в пути / устное подтверждение куратора)`.trim()
		: state.notes.trim();

	return {
		id: initialLetter?.id || "",
		organizationId: initialLetter?.organizationId,
		patientId: patient?.id || initialLetter?.patientId || "pat-1",
		patientFullName: patient?.fullName || initialLetter?.patientFullName || "Пациент",
		patientBirthDate: patient?.birthDate ?? initialLetter?.patientBirthDate,
		policyNumber: resolvedPolicy,
		insurerKey: state.insurerKey,
		insurerName: state.customInsurerName || "Страховая компания ДМС",
		letterNumber: resolvedLetterNum,
		issueDate: state.issueDate,
		validFrom: state.validFrom,
		validUntil: state.validUntil,
		maxCoverageRub: resolvedCoverage,
		usedAmountRub: state.usedAmountRub,
		franchisePct: state.franchiseType === "percent" ? state.franchisePct : 0,
		franchiseType: state.franchiseType,
		franchiseFixedRub: state.franchiseType === "fixed_rub" ? state.franchiseFixedRub : 0,
		programExclusions: state.selectedExclusions,
		approvedServiceCodes: state.approvedServiceCodes,
		approvedDiagnosisCodes: state.approvedDiagnosisCodes,
		notes: resolvedNotes,
		status: overrideStatus || state.status,
	};
}

export async function persistAndDispatchLetter(
	letter: DmsGuaranteeLetter,
	patient?: PatientDmsProfile | undefined,
	initialId?: string
): Promise<DmsGuaranteeLetter> {
	let persistedLetter = letter;
	if (patient?.id) {
		const targetId = initialId || (letter.id && !letter.id.startsWith("preview-") && !letter.id.startsWith("letter-") ? letter.id : undefined);
		const res = await saveGuaranteeLetterToApi({
			id: targetId,
			patientId: patient.id,
			patientFullName: patient.fullName || "Пациент",
			patientBirthDate: patient.birthDate,
			policyNumber: letter.policyNumber,
			insurerKey: letter.insurerKey,
			insurerName: letter.insurerName,
			letterNumber: letter.letterNumber,
			issueDate: letter.issueDate,
			validFrom: letter.validFrom,
			validUntil: letter.validUntil,
			maxCoverageRub: letter.maxCoverageRub,
			usedAmountRub: letter.usedAmountRub,
			franchisePct: letter.franchisePct,
			franchiseType: letter.franchiseType,
			franchiseFixedRub: letter.franchiseFixedRub,
			programExclusions: letter.programExclusions,
			approvedServiceCodes: letter.approvedServiceCodes,
			approvedDiagnosisCodes: letter.approvedDiagnosisCodes,
			notes: letter.notes,
			status: letter.status,
		});

		if (res.ok && res.letter && typeof res.letter === "object" && "id" in res.letter) {
			const b = res.letter as Record<string, unknown>;
			persistedLetter = {
				...letter,
				id: String(b.id),
				letterNumber: typeof b.letterNumber === "string" ? b.letterNumber : letter.letterNumber,
				organizationId: typeof b.organizationId === "string" ? b.organizationId : letter.organizationId,
				status: (typeof b.status === "string" ? b.status : letter.status) as DmsGuaranteeLetter["status"],
			};
		}
	}
	if (typeof window !== "undefined") {
		window.dispatchEvent(new CustomEvent("dente:dms-letter-attached", { detail: { letter: persistedLetter, patientId: persistedLetter.patientId } }));
	}
	return persistedLetter;
}
