/**
 * Production-Grade OIIS Gateway REST Client for EGISZ REMD / FRMO / FRMR.
 * Supports N3.Health (Н3.Здравоохранение) and Medved.Telemed (Медвед.Телемед / ЕГИСЗ) protocols.
 * Compliant with Minzdrav of the Russian Federation integration standards for Dental SEMD 108.
 */

import { z } from "zod";
import type { EgiszRemdPackage } from "../cda/signature.js";
import { isValidSnils } from "../../utils/snils.js";

export interface OiisGatewayConfig {
	baseUrl: string;
	guid: string;
	lpuId: string;
	clinicOid: string;
	frmoId?: string | null | undefined;
	apiKey?: string | null | undefined;
	timeoutMs?: number | undefined;
	isSandbox?: boolean | undefined;
}

export const remdSubmissionResponseSchema = z.object({
	success: z.boolean(),
	transactionId: z.string().min(1),
	status: z.enum(["Pending", "Sent", "Registered", "Rejected", "Error"]),
	remdDocumentId: z.string().optional(),
	registrationDate: z.string().optional(),
	errorMessage: z.string().optional(),
	validationIssues: z
		.array(
			z.object({
				code: z.string(),
				message: z.string(),
				path: z.string().optional(),
			}),
		)
		.optional(),
	rawResponse: z.unknown().optional(),
});

export type RemdSubmissionResponse = z.infer<typeof remdSubmissionResponseSchema>;

export const remdStatusResponseSchema = z.object({
	transactionId: z.string(),
	status: z.enum(["Pending", "Sent", "Registered", "Rejected", "Error"]),
	remdDocumentId: z.string().optional(),
	statusCodeNsi: z.string().optional(),
	statusDescription: z.string().optional(),
	registrationDate: z.string().optional(),
	errors: z.array(z.string()).optional(),
	warnings: z.array(z.string()).optional(),
});

export type RemdStatusResponse = z.infer<typeof remdStatusResponseSchema>;

export class OiisGatewayClient {
	private readonly config: OiisGatewayConfig;

	constructor(config?: Partial<OiisGatewayConfig>) {
		this.config = {
			baseUrl: (config?.baseUrl || process.env.EGISZ_N3_BASE_URL || "https://api.n3health.ru/egisz/v1").replace(/\/+$/, ""),
			guid: config?.guid || process.env.EGISZ_N3_GUID || "00000000-0000-0000-0000-000000000000",
			lpuId: config?.lpuId || process.env.EGISZ_N3_LPU_ID || "1.2.643.5.1.13.13.12.2.77.1001",
			clinicOid: config?.clinicOid || process.env.EGISZ_CLINIC_OID || "1.2.643.5.1.13.13.12.2.77.1001",
			frmoId: config?.frmoId || process.env.EGISZ_FRMO_ID || null,
			apiKey: config?.apiKey || process.env.EGISZ_N3_API_KEY || null,
			timeoutMs: config?.timeoutMs ?? 15000,
			isSandbox: config?.isSandbox ?? (process.env.EGISZ_SANDBOX === "1" || process.env.NODE_ENV === "test"),
		};
	}

	public getConfig(): Readonly<OiisGatewayConfig> {
		return Object.freeze({ ...this.config });
	}

	/**
	 * Submits signed Dental SEMD 108 Package to REMD via OIIS Gateway.
	 */
	public async sendRemdDocument(pkg: EgiszRemdPackage): Promise<RemdSubmissionResponse> {
		// 1. Pre-flight validation
		if (pkg.metadata.patientSnils && !isValidSnils(pkg.metadata.patientSnils)) {
			return {
				success: false,
				transactionId: `ERR-${Date.now()}`,
				status: "Rejected",
				errorMessage: "Невалидный СНИЛС пациента в метаданных пакета ЕГИСЗ.",
				validationIssues: [
					{ code: "INVALID_PATIENT_SNILS", message: "Контрольное число СНИЛС пациента не сходится." },
				],
			};
		}

		if (!pkg.doctorSignature || !pkg.doctorSignature.signatureBase64) {
			return {
				success: false,
				transactionId: `ERR-${Date.now()}`,
				status: "Rejected",
				errorMessage: "Отсутствует обязательная отсоединенная УКЭП врача-автора документа.",
				validationIssues: [
					{ code: "MISSING_DOCTOR_SIGNATURE", message: "УКЭП врача обязательна для регистрации СЭМД в РЭМД." },
				],
			};
		}

		const transactionId = `REMD-${Date.now()}-${pkg.documentId.slice(0, 8)}`;

		// 2. Sandbox / Emulation mode for tests or offline operation
		if (this.config.isSandbox && !process.env.EGISZ_REAL_HTTP) {
			return {
				success: true,
				transactionId,
				status: "Sent",
				remdDocumentId: `EGISZ-DOC-${Date.now()}`,
				registrationDate: new Date().toISOString(),
				rawResponse: {
					gateway: "OIIS_N3_SANDBOX",
					protocolVersion: "2.4",
					acceptedAt: new Date().toISOString(),
					docType: pkg.metadata.docTypeNsiCode,
					clinicOid: this.config.clinicOid,
				},
			};
		}

		// 3. Real HTTP dispatch to OIIS Gateway
		const endpoint = `${this.config.baseUrl}/remd/documents`;
		const payload = {
			documentId: pkg.documentId,
			versionNumber: pkg.documentVersion,
			docTypeNsiCode: pkg.metadata.docTypeNsiCode,
			clinicOid: pkg.metadata.clinicOid || this.config.clinicOid,
			lpuId: this.config.lpuId,
			patientSnils: pkg.metadata.patientSnils,
			xmlData: Buffer.from(pkg.xmlCanonicalPayload, "utf8").toString("base64"),
			signatures: [
				{
					type: "doctor",
					signatureBase64: pkg.doctorSignature.signatureBase64,
					certificateSerialNumber: pkg.doctorSignature.certificateSerialNumber,
					certificateSubject: pkg.doctorSignature.certificateSubject,
					signedAt: pkg.doctorSignature.signedAt,
					algorithmOid: pkg.doctorSignature.algorithmOid,
				},
				...(pkg.moSignature
					? [
							{
								type: "clinic",
								signatureBase64: pkg.moSignature.signatureBase64,
								certificateSerialNumber: pkg.moSignature.certificateSerialNumber,
								certificateSubject: pkg.moSignature.certificateSubject,
								signedAt: pkg.moSignature.signedAt,
								algorithmOid: pkg.moSignature.algorithmOid,
							},
						]
					: []),
			],
		};

		const headers: Record<string, string> = {
			"Content-Type": "application/json; charset=utf-8",
			Accept: "application/json",
			"X-N3-Auth-Guid": this.config.guid,
			"X-N3-LPU-ID": this.config.lpuId,
		};

		if (this.config.apiKey) {
			headers.Authorization = `Bearer ${this.config.apiKey}`;
		}

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

		try {
			const res = await fetch(endpoint, {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
				signal: controller.signal,
			});

			clearTimeout(timeout);

			if (!res.ok) {
				const errorText = await res.text();
				let parsedJson: Record<string, unknown> | null = null;
				try {
					parsedJson = JSON.parse(errorText);
				} catch {
					parsedJson = null;
				}

				return {
					success: false,
					transactionId,
					status: "Error",
					errorMessage: `Шлюз ОИИС вернул HTTP ${res.status}: ${errorText.slice(0, 300)}`,
					rawResponse: parsedJson ?? errorText,
				};
			}

			const json = (await res.json()) as Record<string, unknown>;
			return {
				success: true,
				transactionId: String(json.transactionId || transactionId),
				status: (json.status as RemdSubmissionResponse["status"]) || "Sent",
				remdDocumentId: json.remdDocumentId ? String(json.remdDocumentId) : undefined,
				registrationDate: json.registrationDate ? String(json.registrationDate) : new Date().toISOString(),
				rawResponse: json,
			};
		} catch (err: unknown) {
			clearTimeout(timeout);
			const msg = err instanceof Error ? err.message : String(err);
			return {
				success: false,
				transactionId,
				status: "Error",
				errorMessage: `Сбой сетевого соединения со шлюзом ЕГИСЗ: ${msg}`,
			};
		}
	}

	/**
	 * Queries document registration status from REMD.
	 */
	public async getRemdDocumentStatus(transactionId: string): Promise<RemdStatusResponse> {
		if (this.config.isSandbox && !process.env.EGISZ_REAL_HTTP) {
			return {
				transactionId,
				status: "Registered",
				remdDocumentId: `REMD-REG-${transactionId.slice(-8)}`,
				statusCodeNsi: "1",
				statusDescription: "Документ успешно зарегистрирован в РЭМД ЕГИСЗ Минздрава РФ",
				registrationDate: new Date().toISOString(),
			};
		}

		const endpoint = `${this.config.baseUrl}/remd/documents/${encodeURIComponent(transactionId)}/status`;
		const headers: Record<string, string> = {
			Accept: "application/json",
			"X-N3-Auth-Guid": this.config.guid,
			"X-N3-LPU-ID": this.config.lpuId,
		};

		if (this.config.apiKey) {
			headers.Authorization = `Bearer ${this.config.apiKey}`;
		}

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

		try {
			const res = await fetch(endpoint, {
				method: "GET",
				headers,
				signal: controller.signal,
			});

			clearTimeout(timeout);

			if (!res.ok) {
				return {
					transactionId,
					status: "Error",
					statusDescription: `HTTP ${res.status}: ${await res.text()}`,
				};
			}

			const json = (await res.json()) as Record<string, unknown>;
			return {
				transactionId,
				status: (json.status as RemdStatusResponse["status"]) || "Sent",
				remdDocumentId: json.remdDocumentId ? String(json.remdDocumentId) : undefined,
				statusCodeNsi: json.statusCodeNsi ? String(json.statusCodeNsi) : undefined,
				statusDescription: json.statusDescription ? String(json.statusDescription) : undefined,
				registrationDate: json.registrationDate ? String(json.registrationDate) : undefined,
			};
		} catch (err: unknown) {
			clearTimeout(timeout);
			return {
				transactionId,
				status: "Error",
				statusDescription: err instanceof Error ? err.message : String(err),
			};
		}
	}
}
