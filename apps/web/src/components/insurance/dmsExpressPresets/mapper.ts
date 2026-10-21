/**
 * mapper.ts — Преобразование ответа бэкенда в модель гарантийного письма
 */

import type { PatientGuaranteeLetter } from "./types.js";

export function mapBackendLetterToPatientGuaranteeLetter(item: any): PatientGuaranteeLetter {
	return {
		id: String(item.id),
		letterNumber: String(item.letterNumber || ""),
		insurerKey: String(item.insurerKey || "custom"),
		insurerName: String(item.insurerName || "Страховая компания ДМС"),
		patientId: String(item.patientId || ""),
		patientFullName: String(item.patientFullName || ""),
		policyNumber: String(item.policyNumber || ""),
		issueDate: String(item.issueDate || "").slice(0, 10),
		validFrom: String(item.validFrom || "").slice(0, 10),
		validUntil: String(item.validUntil || "").slice(0, 10),
		maxCoverageKopecks: Math.round(Number(item.maxCoverageRub || 0) * 100),
		usedAmountKopecks: Math.round(Number(item.usedAmountRub || 0) * 100),
		franchisePct: Number(item.franchisePct) || 0,
		franchiseType: item.franchiseType === "fixed_rub" ? "fixed_kopecks" : "percent",
		franchiseFixedKopecks: Math.round(Number(item.franchiseFixedRub || 0) * 100),
		approvedTeethFdi: Array.isArray(item.approvedTeethFdi) ? item.approvedTeethFdi : [],
		approvedServiceCodes804n: Array.isArray(item.approvedServiceCodes)
			? item.approvedServiceCodes
			: Array.isArray(item.approvedServiceCodes804n)
			? item.approvedServiceCodes804n
			: [],
		approvedDiagnosisMkb10: Array.isArray(item.approvedDiagnosisCodes)
			? item.approvedDiagnosisCodes
			: Array.isArray(item.approvedDiagnosisMkb10)
			? item.approvedDiagnosisMkb10
			: [],
		curatorFullName: String(item.curatorFullName || ""),
		curatorPhone: String(item.curatorPhone || ""),
		curatorEmail: item.curatorEmail ? String(item.curatorEmail) : undefined,
		notes: String(item.notes || ""),
		status: (item.status as PatientGuaranteeLetter["status"]) || "active",
	};
}
