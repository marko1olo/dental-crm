/**
 * useLetterFieldsState.ts — Первичные стейты формы гарантийного письма ДМС
 */

import { useMemo, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { RUSSIAN_DMS_INSURERS, type DmsGuaranteeLetter } from "../insuranceMath.js";
import type { DmsFranchiseKind, DmsLetterLifecycleStatus, PatientDmsProfile } from "./types.js";

export function useLetterFieldsState(patient?: PatientDmsProfile | undefined, initialLetter?: DmsGuaranteeLetter | undefined) {
	const todayStr = useMemo(() => new Date().toISOString().split("T")[0] ?? "2026-08-22", []);
	const nextMonthStr = useMemo(() => {
		const d = new Date(); d.setMonth(d.getMonth() + 1);
		return d.toISOString().split("T")[0] ?? "2026-09-22";
	}, []);

	const [insurerKey, setInsurerKey] = useState<string>(
		initialLetter?.insurerKey || (patient?.insuranceCompany ? "custom" : RUSSIAN_DMS_INSURERS[0]?.key || "sogaz"),
	);
	const [customInsurerName, setCustomInsurerName] = useState<string>(initialLetter?.insurerName || patient?.insuranceCompany || "");
	const [policyNumber, setPolicyNumber] = useState<string>(initialLetter?.policyNumber || patient?.policyNumber || "");
	const [letterNumber, setLetterNumber] = useState<string>(initialLetter?.letterNumber || `ГП-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`);
	const [isEmergencyCare, setIsEmergencyCare] = useState<boolean>(false);
	const [isDeferredScan, setIsDeferredScan] = useState<boolean>(false);
	const [attachedScanFileName, setAttachedScanFileName] = useState<string>("");
	const [issueDate, setIssueDate] = useState<string>(initialLetter?.issueDate ?? todayStr);
	const [validFrom, setValidFrom] = useState<string>(initialLetter?.validFrom ?? todayStr);
	const [validUntil, setValidUntil] = useState<string>(initialLetter?.validUntil ?? nextMonthStr);

	const [maxCoverageRub, setMaxCoverageRub] = useState<number>(initialLetter?.maxCoverageRub ?? (isDemoShowcaseMode() ? 50000 : 0));
	const [usedAmountRub, setUsedAmountRub] = useState<number>(initialLetter?.usedAmountRub ?? 0);
	const [franchiseType, setFranchiseType] = useState<DmsFranchiseKind>(initialLetter?.franchiseType ?? "percent");
	const [franchisePct, setFranchisePct] = useState<number>(initialLetter?.franchisePct ?? 0);
	const [franchiseFixedRub, setFranchiseFixedRub] = useState<number>(initialLetter?.franchiseFixedRub ?? 0);

	const [selectedExclusions, setSelectedExclusions] = useState<string[]>(
		initialLetter?.programExclusions ? [...initialLetter.programExclusions] : isDemoShowcaseMode() ? ["orthodontics", "implantology", "whitening", "veneers", "prosthetics_precious"] : [],
	);
	const [approvedServiceCodes, setApprovedServiceCodes] = useState<string[]>(
		initialLetter?.approvedServiceCodes ? [...initialLetter.approvedServiceCodes] : isDemoShowcaseMode() ? ["A16.07.002.001", "A16.07.030.001", "A16.07.008.001", "B01.003.004.001"] : [],
	);
	const [approvedDiagnosisCodes, setApprovedDiagnosisCodes] = useState<string[]>(
		initialLetter?.approvedDiagnosisCodes ? [...initialLetter.approvedDiagnosisCodes] : isDemoShowcaseMode() ? ["K02.1", "K04.0"] : [],
	);
	const [approvedTeethFdi, setApprovedTeethFdi] = useState<string[]>(isDemoShowcaseMode() ? ["1.6", "2.6"] : []);
	const [notes, setNotes] = useState<string>(initialLetter?.notes || "");
	const [status, setStatus] = useState<DmsLetterLifecycleStatus>(initialLetter?.status || "active");

	return {
		todayStr, nextMonthStr,
		insurerKey, setInsurerKey, customInsurerName, setCustomInsurerName,
		policyNumber, setPolicyNumber, letterNumber, setLetterNumber,
		isEmergencyCare, setIsEmergencyCare, isDeferredScan, setIsDeferredScan,
		attachedScanFileName, setAttachedScanFileName,
		issueDate, setIssueDate, validFrom, setValidFrom, validUntil, setValidUntil,
		maxCoverageRub, setMaxCoverageRub, usedAmountRub, setUsedAmountRub,
		franchiseType, setFranchiseType, franchisePct, setFranchisePct,
		franchiseFixedRub, setFranchiseFixedRub,
		selectedExclusions, setSelectedExclusions,
		approvedServiceCodes, setApprovedServiceCodes,
		approvedDiagnosisCodes, setApprovedDiagnosisCodes,
		approvedTeethFdi, setApprovedTeethFdi,
		notes, setNotes, status, setStatus,
	};
}
