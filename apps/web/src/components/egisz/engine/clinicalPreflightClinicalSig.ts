/**
 * clinicalPreflightClinicalSig.ts — Diagnoses, Odontogram, 804n Services & UKEP Signature Checks
 */

import { EGISZ_REMD_OIDS } from "../remdXml/egiszRemdPresets";
import type { EgiszDentalCdaPayload } from "../cdaR2XmlBuilder";
import type { EgiszPreflightCheckResult } from "./engineTypes";

export function checkClinicalAndSignature(payload: EgiszDentalCdaPayload, checks: EgiszPreflightCheckResult[]): void {
	// Clinical Diagnoses (ICD-10)
	const primaryDiag = payload.diagnoses.find((d) => d.isPrimary) || payload.diagnoses[0];
	if (!primaryDiag || !primaryDiag.icd10Code) {
		checks.push({
			id: "diag_missing", category: "clinical", title: "Клинический диагноз по МКБ-10",
			status: "failed", details: "Отсутствует основной диагноз по МКБ-10. Для СЭМД 043/у требуется минимум один диагноз",
			oid: EGISZ_REMD_OIDS.ICD10,
		});
	} else {
		checks.push({
			id: "diag_ok", category: "clinical", title: "Основной диагноз по МКБ-10",
			status: "passed", details: `${primaryDiag.icd10Code} — ${primaryDiag.icd10Name}${primaryDiag.tooth ? ` (зуб ${primaryDiag.tooth})` : ""}`,
			oid: EGISZ_REMD_OIDS.ICD10,
		});
	}

	// Dental Tooth Formula (Odontogram)
	const toothCount = Object.keys(payload.toothStates || {}).length;
	if (toothCount === 0) {
		checks.push({
			id: "tooth_formula_empty", category: "clinical", title: "Зубная формула (FDI ISO 3950)",
			status: "warning", details: "Зубная формула пуста. Рекомендуется заполнить статус зубов пациента для протокола 043/у",
			oid: EGISZ_REMD_OIDS.DENTAL_TOOTH,
		});
	} else {
		const nonHealthyCount = Object.values(payload.toothStates).filter((st) => st !== "Healthy" && st !== "0").length;
		checks.push({
			id: "tooth_formula_ok", category: "clinical", title: "Зубная формула и статус полости рта",
			status: "passed", details: `Заполнено зубов: ${toothCount} (патологий / реставраций: ${nonHealthyCount})`,
			oid: EGISZ_REMD_OIDS.DENTAL_TOOTH,
		});
	}

	// Medical Services & Procedures (804n)
	if (payload.docTypeCode === "303") {
		if (!payload.procedures || payload.procedures.length === 0) {
			checks.push({
				id: "proc_804n_empty", category: "clinical", title: "Медицинские услуги по номенклатуре",
				status: "failed", details: "Для протокола вмешательства (СЭМД 303) обязателен перечень выполненных медицинских услуг",
				oid: EGISZ_REMD_OIDS.NOMENKLATURA_804N,
			});
		} else {
			checks.push({
				id: "proc_804n_ok", category: "clinical", title: "Медицинские услуги",
				status: "passed", details: `Услуг оказано: ${payload.procedures.length} (${payload.procedures.map((p) => p.code).join(", ")})`,
				oid: EGISZ_REMD_OIDS.NOMENKLATURA_804N,
			});
		}
	}

	// Electronic Signature (63-FZ / GOST)
	if (payload.doctorSignature && payload.doctorSignature.signatureBase64) {
		checks.push({
			id: "sig_doctor_ok", category: "signature", title: "УКЭП врача (ГОСТ Р 34.10-2012 / 63-ФЗ)",
			status: "passed", details: `Подписано сертификатом № ${payload.doctorSignature.certificateSerialNumber} (${payload.doctorSignature.certificateSubject})`,
			oid: payload.doctorSignature.algorithmOid || EGISZ_REMD_OIDS.GOST_3410_2012_256,
		});
	} else {
		checks.push({
			id: "sig_doctor_missing", category: "signature", title: "Электронная подпись врача (УКЭП)",
			status: "warning", details: "Документ готов к генерации XML, но для прямой отправки в РЭМД требуется наложение УКЭП врача",
			oid: EGISZ_REMD_OIDS.GOST_3410_2012_256,
		});
	}
}
