import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders.js";
import { CONSENT_KEY_TO_DOCUMENT_KIND } from "../../../visit/consents/visitConsentTypes.js";
import { buildStructuredPayloadForConsent } from "./structuredPayloadBuilder";
import { recordConsentToPatientTimeline } from "./timelineConsentPersistence";
import type {
	ConsentTemplateKey,
	ConsentTemplate,
	SignedConsentPayload,
	ConsentSubstitutionContext,
	VerificationMethod,
} from "../types.js";

function isValidUuid(id: string | null | undefined): boolean {
	if (!id) return false;
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function persistSignedConsentToBackend(params: {
	patientId?: string | null | undefined;
	visitId?: string | null | undefined;
	consentKey: ConsentTemplateKey;
	template: ConsentTemplate;
	payload: SignedConsentPayload;
	effectiveContext: ConsentSubstitutionContext;
	svg: string;
	effectiveMethod: VerificationMethod;
}): Promise<void> {
	if (!params.patientId || !isValidUuid(params.patientId)) {
		return;
	}
	try {
		const docKind =
			CONSENT_KEY_TO_DOCUMENT_KIND[params.consentKey] || "informed_consent";
		const documentPayload = buildStructuredPayloadForConsent(
			docKind,
			params.template,
			params.effectiveContext,
		);

		const createRes = await fetch("/api/documents", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				patientId: params.patientId,
				visitId:
					params.visitId && isValidUuid(params.visitId)
						? params.visitId
						: undefined,
				kind: docKind,
				title: params.template.title,
				signatureSvg: params.svg || undefined,
				payload: documentPayload,
			}),
		});

		if (!createRes.ok) {
			console.warn(
				"Fastify /api/documents returned status:",
				createRes.status,
				await createRes.text(),
			);
			return;
		}

		const created = (await createRes.json()) as {
			id?: string;
			document?: { id?: string };
		};
		const docId = created.id || created.document?.id;
		if (docId) {
			await fetch(`/api/documents/${encodeURIComponent(docId)}/issue`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					signatureSvg: params.svg || undefined,
					signatureAttestation: {
						mode:
							params.effectiveMethod === "tablet_stylus"
								? "tablet_stylus"
								: params.effectiveMethod === "sms_otp"
									? "sms_otp"
									: "paper_signed",
						signedAt: params.payload.signedAt || new Date().toISOString(),
						recipientFullName:
							params.effectiveContext.patientName || "Пациент",
						recipientRole: "patient",
						staffFullName:
							params.effectiveContext.doctorName || "Врач-стоматолог",
						staffRole: "doctor",
						identityChecked: true,
						documentOpenedAndChecked: true,
						recipientSigned: true,
						clinicRepresentativeSigned: true,
						note: params.payload.statusText,
					},
				}),
			});
		}

		await recordConsentToPatientTimeline({
			patientId: params.patientId,
			visitId: params.visitId,
			consentKey: params.consentKey,
			template: params.template,
			payload: params.payload,
			effectiveContext: params.effectiveContext,
			svg: params.svg,
			effectiveMethod: params.effectiveMethod,
		});
	} catch (err) {
		console.warn("Could not persist signed consent to backend (offline/mock mode):", err);
	}
}
