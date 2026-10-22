/**
 * clinicalPreflightEngine.ts — Runs statutory preflight checks for Dental SEMD payload
 */

import type { EgiszDentalCdaPayload } from "../cdaR2XmlBuilder";
import { checkClinicAndDoctor, checkPatient } from "./clinicalPreflightMoDocPat";
import { checkClinicalAndSignature } from "./clinicalPreflightClinicalSig";
import type { EgiszPreflightCheckResult, EgiszPreflightReport } from "./engineTypes";

export function runEgisz043uPreflight(payload: EgiszDentalCdaPayload): EgiszPreflightReport {
	const checks: EgiszPreflightCheckResult[] = [];

	checkClinicAndDoctor(payload, checks);
	checkPatient(payload, checks);
	checkClinicalAndSignature(payload, checks);

	const failedCount = checks.filter((c) => c.status === "failed").length;
	const warningCount = checks.filter((c) => c.status === "warning").length;
	const passedCount = checks.filter((c) => c.status === "passed").length;
	const totalChecks = checks.length;
	const scorePercent = Math.round((passedCount / (totalChecks || 1)) * 100);

	return {
		isValid: failedCount === 0,
		canSendToRemd: failedCount === 0 && Boolean(payload.doctorSignature?.signatureBase64),
		totalChecks,
		passedCount,
		failedCount,
		warningCount,
		scorePercent,
		checks,
	};
}
