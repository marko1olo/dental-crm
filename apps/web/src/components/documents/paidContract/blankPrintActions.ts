/**
 * paidContract/blankPrintActions.ts
 * Print actions for blank contracts and informed consents (Mandate 8b <= 120 lines, Mandate 8e)
 */

import { generateUuidV7 } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";
import { printHtmlViaWindowOrIframe } from "../../consents/consentTemplates";
import { showToast } from "../../GlobalToast";
import type { BlankContractOptions, BlankContractPatientInfo } from "./blankContractTypes";
import { LEGAL_CLAUSES } from "./blankContractTypes";
import { generateBlankContractFallbackHtml } from "./blankContractHtml";
import { generateBlankConsentFallbackHtml } from "./blankConsentHtml";

function printViaWindowOrIframe(html: string, toastMessage: string): void {
	printHtmlViaWindowOrIframe(html);
	showToast(toastMessage, "success", 4000);
}

export async function printBlankMedicalContract(
	patient?: BlankContractPatientInfo | null,
	options?: BlankContractOptions,
): Promise<void> {
	if (typeof window === "undefined") return;
	showToast("Подготовка бланка договора со строками _______...", "info", 2000);

	const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	const patientId = typeof patient?.id === "string" ? patient.id.trim() : null;
	const hasValidPatientUuid = Boolean(patientId && UUID_REGEX.test(patientId));

	if (hasValidPatientUuid && patientId) {
		try {
			const headers = denteClinicalMutationHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			});
			const todayIso = new Date().toISOString().slice(0, 10);
			const contractNum = options?.contractNumber?.trim() || `БЛАНК-${Date.now().toString().slice(-6)}`;
			const res = await fetch("/api/documents", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId,
					kind: "paid_medical_services_contract",
					title: "Договор платных медицинских услуг (Бланк)",
					status: "draft",
					payload: {
						paidMedicalServicesContract: {
							contractNumber: contractNum,
							signedAt: todayIso,
							serviceStart: todayIso,
							serviceEndOrCondition: "до завершения курса лечения",
							customerFullName: patient?.fullName?.trim() || "________________________",
							customerPassport: patient?.administrativeProfile?.identityDocument?.trim() || "_______ __________, выдан ________________________________________________",
							customerAddress: patient?.administrativeProfile?.registrationAddress?.trim() || patient?.administrativeProfile?.residentialAddress?.trim() || "________________________________________________",
							customerPhone: patient?.phone?.trim() || "________________________",
							doctorFullName: options?.doctorName || "",
							estimatedTotalRub: 0,
							...LEGAL_CLAUSES,
							patientReceivedClinicInfo: true,
							patientReceivedPriceAndServiceList: true,
							patientUnderstandsPaidBasis: true,
							changesRequireWrittenAgreement: true,
						},
					},
				}),
			});
			if (res.ok) {
				const doc = (await res.json()) as { id?: string };
				if (doc?.id) {
					const win = window.open(`/api/documents/${encodeURIComponent(doc.id)}/html`, "_blank");
					if (win) { win.focus(); showToast("Бланк договора отправлен в печать", "success", 3000); return; }
				}
			}
		} catch (err) {
			clientLogger.warn("Backend blank contract creation unavailable, using instant fallback:", err);
		}
	}

	try {
		const fallbackHtml = generateBlankContractFallbackHtml(patient, options);
		printViaWindowOrIframe(fallbackHtml, "Бланк договора (со строками _______) готов к печати");
	} catch (fallbackErr) {
		clientLogger.error("Critical error during blank contract printing:", fallbackErr);
		showToast("Не удалось открыть окно печати договора", "error", 4000);
	}
}

export async function printBlankMedicalConsent(
	patient?: BlankContractPatientInfo | null,
	options?: BlankContractOptions,
): Promise<void> {
	if (typeof window === "undefined") return;
	showToast("Подготовка бланка ИДС со строками _______...", "info", 2000);
	try {
		const fallbackHtml = generateBlankConsentFallbackHtml(patient, options);
		printViaWindowOrIframe(fallbackHtml, "Бланк ИДС (со строками _______) готов к печати");
	} catch (fallbackErr) {
		clientLogger.error("Critical error during blank consent printing:", fallbackErr);
		showToast("Не удалось открыть окно печати бланка ИДС", "error", 4000);
	}
}
