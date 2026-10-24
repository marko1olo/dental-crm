import { z } from "zod";

export const consentKindSchema = z.enum([
	"informed_consent",
	"procedure_specific_consent_packet",
	"anesthesia_consent_log",
	"personal_data_processing_consent",
	"minor_legal_representative_consent",
	"photo_video_consent",
	"medical_intervention_refusal",
	"general_treatment",
	"sedation",
	"implantology",
	"orthodontics",
	"pediatric",
	"radiation_xray",
]);

export type ConsentKind = z.infer<typeof consentKindSchema>;

export const saveConsentBodySchema = z.object({
	kind: consentKindSchema,
	title: z.string().min(1).default("Информированное согласие на лечение"),
	visitId: z.string().uuid().optional(),
	documentId: z.string().uuid().optional(),
	verificationMethod: z.enum(["paper_signed", "tablet_stylus", "sms_otp", "patient_portal"]).default("paper_signed"),
	signatureSvg: z.string().optional(),
	integrityHash: z.string().optional(),
	payload: z.record(z.unknown()).optional(),
	notes: z.string().optional(),
});

export type SaveConsentBody = z.infer<typeof saveConsentBodySchema>;

export const shareConsentLinkSchema = z.object({
	kind: consentKindSchema.default("informed_consent"),
	title: z.string().optional(),
	visitId: z.string().uuid().optional(),
	channel: z.enum(["whatsapp", "sms", "telegram", "qr"]).default("whatsapp"),
	phone: z.string().optional(),
});

export type ShareConsentLinkInput = z.infer<typeof shareConsentLinkSchema>;
