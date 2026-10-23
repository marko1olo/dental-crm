export type CommunicationChannel =
	| "telegram"
	| "whatsapp"
	| "sms"
	| "vk"
	| "email"
	| "max";

export interface MessageTemplateRecord {
	id: string;
	organizationId: string;
	title: string;
	channel: string;
	intent: string;
	templateText: string;
	variables: string[] | null;
	isActive: boolean;
	createdAt: Date;
}

export interface CreateTemplateInput {
	title: string;
	channel?: CommunicationChannel | string | undefined;
	intent?: string | undefined;
	templateText: string;
	variables?: string[] | undefined;
	isActive?: boolean | undefined;
}

export interface UpdateTemplateInput {
	title?: string | undefined;
	channel?: CommunicationChannel | string | undefined;
	intent?: string | undefined;
	templateText?: string | undefined;
	variables?: string[] | undefined;
	isActive?: boolean | undefined;
}

export interface RenderTemplateOptions {
	templateId?: string | undefined;
	templateText?: string | undefined;
	channel?: CommunicationChannel | string | undefined;
	patientId?: string | undefined;
	appointmentId?: string | undefined;
	visitId?: string | undefined;
	variables?: Record<string, string | number | null | undefined> | undefined;
	allowPreviewFallback?: boolean | undefined;
	violationHandling?: "block" | "strip" | undefined;
}

export interface RenderTemplateResult {
	ok: boolean;
	renderedText: string;
	channel: string;
	characterCount: number;
	usedMacros: string[];
	missingMacros: string[];
	smsSegments?: number | undefined;
	smsEncoding?: "gsm7" | "ucs2" | undefined;
	hasMedicalSecrecyViolation: boolean;
	detectedMedicalTerms: string[];
	warning?: string | undefined;
	error?: string | undefined;
	problems: string[];
}
