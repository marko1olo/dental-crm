/**
 * n3Schemas.ts — Zod validation schemas for N3.Health EMK, PIX, and EventLog requests.
 * Mandate 8b compliant (<= 120 lines).
 */

import { z } from "zod";

export const emkAddDocumentBodySchema = z.object({
	dryRun: z.boolean().optional().default(false),
	idDocumentMis: z.string().min(1),
	idCaseMis: z.string().optional(),
	documentType: z.string().default("108"),
	documentName: z.string().min(2),
	documentDate: z.string(),
	cdaXmlContent: z.string().min(50),
	patient: z.object({
		idPatientMis: z.string().min(1), snils: z.string().min(11),
		familyName: z.string().min(1), givenName: z.string().min(1),
		middleName: z.string().optional(), birthDate: z.string(), gender: z.enum(["1", "2"]),
	}),
	doctor: z.object({
		snils: z.string().min(11), familyName: z.string().min(1), givenName: z.string().min(1),
		middleName: z.string().optional(), positionCode: z.string().optional(), specialtyCode: z.string().optional(),
	}),
	signatures: z.array(z.object({
		signatureType: z.enum(["Doctor", "Clinic"]), signatureBase64: z.string().min(1), signerSnils: z.string().optional(),
	})).optional(),
});

export const emkSendDocumentBodySchema = z.object({
	idDocumentMis: z.string().min(1),
	idCaseMis: z.string().optional(),
	targetSystem: z.enum(["REMD", "IEMK", "ALL"]).default("REMD"),
	dryRun: z.boolean().optional().default(false),
});

export const emkCloseCaseBodySchema = z.object({
	idCaseMis: z.string().min(1),
	closeDate: z.string(),
	resultCode: z.string().optional().default("301"),
	outcomeCode: z.string().optional().default("301"),
	dryRun: z.boolean().optional().default(false),
});

export const pixPatientBodySchema = z.object({
	dryRun: z.boolean().optional().default(false),
	idPatientMis: z.string().min(1),
	familyName: z.string().min(1), givenName: z.string().min(1), middleName: z.string().optional(),
	birthDate: z.string(), gender: z.enum(["1", "2"]), snils: z.string().min(11),
	omsPolicy: z.object({ number: z.string().min(1), type: z.string().optional(), issuer: z.string().optional() }).optional(),
	document: z.object({ docType: z.string().min(1), series: z.string().optional(), number: z.string().min(1), issueDate: z.string().optional(), issuer: z.string().optional() }).optional(),
	phone: z.string().optional(),
});

export const pixFindPatientsBodySchema = z.object({
	dryRun: z.boolean().optional().default(false),
	idPatientMis: z.string().optional(), snils: z.string().optional(),
	familyName: z.string().optional(), givenName: z.string().optional(),
	middleName: z.string().optional(), birthDate: z.string().optional(), omsNumber: z.string().optional(),
});

export const eventLogReexportBodySchema = z.object({
	idDocumentMis: z.string().min(1),
	queue: z.enum(["REMD", "IEMK"]).default("REMD"),
});
