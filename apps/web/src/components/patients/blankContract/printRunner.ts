import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import { BlankContractPatientInfo, BlankContractOptions } from "./types";
import { LEGAL_CLAUSES } from "./legalClauses";
import { generateBlankContractFallbackHtml, generateBlankConsentFallbackHtml } from "./templateBuilder";

/**
 * Executes 1-click printing of a blank medical contract.
 * Guarantees zero 403 blocks, zero validation rejections, and immediate autonomy for the receptionist desk.
 *
 * Operational flow:
 * 1. If patient has a valid persisted UUID in DB, attempts background server PDF/HTML draft generation.
 * 2. If patient is unregistered, walk-in, offline, or server returns 400/403/500/network error,
 *    instantly falls back to publication-grade direct HTML printing with '_______' lines.
 * 3. Supports popup windows and auto-falls back to an invisible iframe when popup blockers are active.
 */
export async function printBlankMedicalContract(
	patient?: BlankContractPatientInfo | null,
	options?: BlankContractOptions,
): Promise<void> {
	if (typeof window === "undefined") {
		return;
	}

	showToast("Подготовка бланка договора со строками _______...", "info", 2000);

	const UUID_REGEX =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	const hasValidPatientUuid =
		typeof patient?.id === "string" && UUID_REGEX.test(patient.id.trim());

	// If we have an active persisted patient with a valid UUID, attempt to create/fetch draft on backend
	if (hasValidPatientUuid) {
		try {
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
			});

			const customerName =
				patient?.fullName?.trim() || "________________________";
			const customerPassport =
				patient?.administrativeProfile?.identityDocument?.trim() ||
				"_______ __________, выдан ________________________________________________";
			const customerAddress =
				patient?.administrativeProfile?.registrationAddress?.trim() ||
				patient?.administrativeProfile?.residentialAddress?.trim() ||
				"________________________________________________";
			const customerPhone =
				patient?.phone?.trim() || "________________________";
			const todayIso = new Date().toISOString().slice(0, 10);
			const contractNum =
				options?.contractNumber?.trim() ||
				`БЛАНК-${Date.now().toString().slice(-6)}`;

			const res = await fetch("/api/documents", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId: patient!.id!.trim(),
					kind: "paid_medical_services_contract",
					title: "Договор платных медицинских услуг (Бланк)",
					status: "draft",
					payload: {
						paidMedicalServicesContract: {
							contractNumber: contractNum,
							signedAt: todayIso,
							serviceStart: todayIso,
							serviceEndOrCondition: "до завершения курса лечения",
							customerFullName: customerName,
							customerPassport,
							customerAddress,
							customerPhone,
							doctorFullName: options?.doctorName || "",
							estimatedTotalRub: 0,
							plannedCareReason: LEGAL_CLAUSES.plannedCareReason,
							serviceScopeSummary: LEGAL_CLAUSES.serviceScopeSummary,
							paymentTerms: LEGAL_CLAUSES.paymentTerms,
							priceChangeRules: LEGAL_CLAUSES.priceChangeRules,
							freeCareAvailabilityNotice:
								LEGAL_CLAUSES.freeCareAvailabilityNotice,
							medicalRecommendationWarning:
								LEGAL_CLAUSES.medicalRecommendationWarning,
							refusalAndRefundTerms: LEGAL_CLAUSES.refusalAndRefundTerms,
							warrantyAndClaimsTerms: LEGAL_CLAUSES.warrantyAndClaimsTerms,
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
					const printUrl = `/api/documents/${encodeURIComponent(doc.id)}/html`;
					const win = window.open(printUrl, "_blank");
					if (win) {
						win.focus();
						showToast("Бланк договора отправлен в печать", "success", 3000);
						return;
					}
				}
			}
		} catch (err) {
			console.warn(
				"Backend blank contract creation unavailable, using instant fallback:",
				err,
			);
		}
	}

	// Instant client-side fallback printing:
	// Works for walk-ins, unregistered patients, offline mode, 403 prevention, popup blockers
	try {
		const fallbackHtml = generateBlankContractFallbackHtml(patient, options);
		let printedViaWindow = false;
		const printWindow = window.open("", "_blank");
		if (printWindow && !printWindow.closed) {
			try {
				printWindow.document.write(fallbackHtml);
				printWindow.document.close();
				printWindow.focus();
				printedViaWindow = true;
				showToast(
					"Бланк договора (со строками _______) готов к печати",
					"success",
					4000,
				);
			} catch (writeErr) {
				console.warn(
					"Popup document write failed, falling back to iframe:",
					writeErr,
				);
				printedViaWindow = false;
			}
		}

		if (!printedViaWindow) {
			// If popups are blocked or write failed, print via invisible iframe
			const iframe = document.createElement("iframe");
			iframe.style.position = "fixed";
			iframe.style.right = "0";
			iframe.style.bottom = "0";
			iframe.style.width = "0";
			iframe.style.height = "0";
			iframe.style.border = "0";
			document.body.appendChild(iframe);
			iframe.contentDocument?.write(fallbackHtml);
			iframe.contentDocument?.close();
			iframe.contentWindow?.focus();
			iframe.contentWindow?.print();
			setTimeout(() => {
				if (document.body.contains(iframe)) {
					document.body.removeChild(iframe);
				}
			}, 1500);
			showToast("Бланк договора отправлен на печать", "success", 4000);
		}
	} catch (fallbackErr) {
		console.error(
			"Critical error during blank contract printing:",
			fallbackErr,
		);
		showToast("Не удалось открыть окно печати договора", "error", 4000);
	}
}

/**
 * 1-клик печать бланка ИДС (информированного добровольного согласия) со строками _______
 * для заполнения пациентом вручную до приёма (Мандат 8e п. 8, ст. 20 323-ФЗ).
 * Полная автономность регистратора без 403-ошибок и без требований обязательных полей.
 */
export async function printBlankMedicalConsent(
	patient?: BlankContractPatientInfo | null,
	options?: BlankContractOptions,
): Promise<void> {
	if (typeof window === "undefined") {
		return;
	}

	showToast("Подготовка бланка ИДС со строками _______...", "info", 2000);

	const UUID_REGEX =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	const hasValidPatientUuid =
		typeof patient?.id === "string" && UUID_REGEX.test(patient.id.trim());

	if (hasValidPatientUuid) {
		try {
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
			});
			const todayIso = new Date().toISOString().slice(0, 10);
			const consentNum =
				options?.contractNumber?.trim() ||
				`БЛАНК-ИДС-${Date.now().toString().slice(-6)}`;

			const res = await fetch("/api/documents", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId: patient!.id!.trim(),
					kind: "informed_voluntary_consent",
					title: "Информированное добровольное согласие (Бланк)",
					status: "draft",
					payload: {
						patientFullName: patient?.fullName?.trim() || "________________________",
						doctorFullName: options?.doctorName || "",
						date: todayIso,
						contractNumber: consentNum,
						isUnderlinedBlank: true,
					},
				}),
			});

			if (res.ok) {
				const doc = (await res.json()) as { id?: string };
				if (doc?.id) {
					const printUrl = `/api/documents/${encodeURIComponent(doc.id)}/html`;
					const win = window.open(printUrl, "_blank");
					if (win) {
						win.focus();
						showToast("Бланк ИДС отправлен в печать", "success", 3000);
						return;
					}
				}
			}
		} catch (err) {
			console.warn(
				"Backend blank consent creation unavailable, using instant fallback:",
				err,
			);
		}
	}

	// Instant client-side fallback printing:
	// Works for walk-ins, unregistered patients, offline mode, 403 prevention, popup blockers
	try {
		const fallbackHtml = generateBlankConsentFallbackHtml(patient, options);
		let printedViaWindow = false;
		const printWindow = window.open("", "_blank");
		if (printWindow && !printWindow.closed) {
			try {
				printWindow.document.write(fallbackHtml);
				printWindow.document.close();
				printWindow.focus();
				printedViaWindow = true;
				showToast(
					"Бланк ИДС (со строками _______) готов к печати",
					"success",
					4000,
				);
			} catch (writeErr) {
				console.warn(
					"Popup document write failed, falling back to iframe:",
					writeErr,
				);
				printedViaWindow = false;
			}
		}

		if (!printedViaWindow) {
			const iframe = document.createElement("iframe");
			iframe.style.position = "fixed";
			iframe.style.right = "0";
			iframe.style.bottom = "0";
			iframe.style.width = "0";
			iframe.style.height = "0";
			iframe.style.border = "0";
			document.body.appendChild(iframe);
			iframe.contentDocument?.write(fallbackHtml);
			iframe.contentDocument?.close();
			iframe.contentWindow?.focus();
			iframe.contentWindow?.print();
			setTimeout(() => {
				if (document.body.contains(iframe)) {
					document.body.removeChild(iframe);
				}
			}, 1500);
			showToast("Бланк ИДС отправлен на печать", "success", 4000);
		}
	} catch (fallbackErr) {
		console.error("Critical error during blank consent printing:", fallbackErr);
		showToast("Не удалось открыть окно печати бланка ИДС", "error", 4000);
	}
}
