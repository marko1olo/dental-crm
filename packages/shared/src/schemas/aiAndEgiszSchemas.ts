import { z } from "zod";

export const aiJobKindSchema = z.enum([
	"voice_transcription",
	"visit_note_draft",
	"image_summary",
	"document_draft",
	"paper_ocr",
]);

export type AiJobKind = z.infer<typeof aiJobKindSchema>;

export const aiJobStatusSchema = z.enum([
	"queued",
	"running",
	"needs_review",
	"accepted",
	"rejected",
	"failed",
]);

export type AiJobStatus = z.infer<typeof aiJobStatusSchema>;

export const aiRecognitionTargetSchema = z.enum([
	"visit_note",
	"patient_import",
	"imaging_summary",
	"document_draft",
]);

export type AiRecognitionTarget = z.infer<typeof aiRecognitionTargetSchema>;

export const imagingStudyKindSchema = z.enum([
	"periapical",
	"bitewing",
	"opg",
	"ceph",
	"cbct",
	"photo",
	"other",
]);

export type ImagingStudyKind = z.infer<typeof imagingStudyKindSchema>;

export const imagingSourceKindSchema = z.enum([
	"manual_upload",
	"dicom_file",
	"dicomweb",
	"pacs",
	"twain_wia",
	"sensor_bridge",
	"folder_watch",
	"hot_folder",
	"dicom_worklist",
]);

export type ImagingSourceKind = z.infer<typeof imagingSourceKindSchema>;

export const egiszStatusSchema = z.enum([
	"Pending",
	"Sent",
	"Error",
	"Accepted",
]);

export type EgiszStatus = z.infer<typeof egiszStatusSchema>;

export const egiszOutboxStatusSchema = z.enum([
	"queued",
	"validating",
	"signing_pending",
	"ready_for_dispatch",
	"sending",
	"registered_in_remd",
	"delivered_to_epgu",
	"failed",
	"rejected_by_remd",
]);

export type EgiszOutboxStatus = z.infer<typeof egiszOutboxStatusSchema>;

export const clinicModeSchema = z.enum([
	"solo_doctor",
	"one_chair",
	"small_clinic",
	"network_clinic",
]);

export type ClinicMode = z.infer<typeof clinicModeSchema>;

export const staffRoleSchema = z.enum([
	"owner",
	"doctor",
	"administrator",
	"assistant",
	"manager",
	"curator",
]);

export type StaffRole = z.infer<typeof staffRoleSchema>;

export const dentalSpecialtySchema = z.enum([
	"therapist",
	"orthopedist",
	"surgeon",
	"orthodontist",
	"periodontist",
	"hygienist",
	"pediatric",
	"implantologist",
	"radiologist",
	"universal",
]);

export type DentalSpecialty = z.infer<typeof dentalSpecialtySchema>;

export const serviceCategorySchema = z.enum([
	"consultation",
	"therapy",
	"surgery",
	"prosthetics",
	"orthodontics",
	"periodontology",
	"hygiene",
	"imaging",
	"documents",
	"other",
]);

export type ServiceCategory = z.infer<typeof serviceCategorySchema>;

export const treatmentPlanItemStatusSchema = z.enum([
	"proposed",
	"approved",
	"in_progress",
	"completed",
	"cancelled",
]);

export type TreatmentPlanItemStatus = z.infer<
	typeof treatmentPlanItemStatusSchema
>;

export const treatmentPlanStatusSchema = z.enum([
	"Draft",
	"Active",
	"Approved",
	"Completed",
	"Rejected",
]);

export type TreatmentPlanStatus = z.infer<typeof treatmentPlanStatusSchema>;

export const treatmentPlanScenarioStrategySchema = z.enum([
	"urgent",
	"standard",
	"optimal",
	"phased",
	"maintenance",
]);

export type TreatmentPlanScenarioStrategy = z.infer<
	typeof treatmentPlanScenarioStrategySchema
>;

export const treatmentPlanScenarioPrioritySchema = z.enum([
	"budget",
	"balanced",
	"clinical",
]);

export type TreatmentPlanScenarioPriority = z.infer<
	typeof treatmentPlanScenarioPrioritySchema
>;

export const clinicalTaskStatusSchema = z.enum([
	"pending",
	"in_progress",
	"completed",
	"cancelled",
]);

export type ClinicalTaskStatus = z.infer<typeof clinicalTaskStatusSchema>;

export const clinicalRuleSeveritySchema = z.enum([
	"info",
	"warning",
	"blocker",
]);

export type ClinicalRuleSeverity = z.infer<typeof clinicalRuleSeveritySchema>;

export const clinicalRuleActionSchema = z.enum([
	"add_required_service",
	"block_service",
	"show_warning",
	"schedule_followup",
]);

export type ClinicalRuleAction = z.infer<typeof clinicalRuleActionSchema>;

export const communicationChannelSchema = z.enum([
	"phone",
	"sms",
	"whatsapp",
	"telegram",
	"email",
	"in_person",
	"vk",
	"max",
]);

export type CommunicationChannel = z.infer<typeof communicationChannelSchema>;

export const communicationIntentSchema = z.enum([
	"appointment_confirmation",
	"payment_reminder",
	"post_visit_instruction",
	"recall",
	"document_ready",
	"imaging_review",
	"general",
	"lead_capture",
	"callback_requested",
	/*
	 * Ответ на прямое обращение пациента: он написал «СТОП» или «СТАРТ», мы
	 * подтверждаем, что услышали. Единственное назначение, которому диспетчер
	 * разрешает обойти только что отозванное согласие и тихие часы (миграция
	 * 0132). Значение обязано быть и здесь: иначе строки очереди с ним молча
	 * отбрасываются при разборе ответа на клиенте.
	 */
	"transactional_reply",
]);

export type CommunicationIntent = z.infer<typeof communicationIntentSchema>;

export const communicationTaskWorkflowCodeSchema = z.enum([
	"telegram_tax_document_request",
	"telegram_billing_document_request",
	"telegram_medical_document_request",
	"telegram_patient_forms_request",
	"telegram_care_extraction_request",
	"telegram_care_implant_request",
	"telegram_care_filling_request",
	"telegram_care_endo_request",
	"telegram_care_surgery_request",
	"telegram_care_anesthesia_request",
	"telegram_care_hygiene_request",
	"telegram_care_prosthetics_request",
	"telegram_care_orthodontics_request",
	"telegram_care_periodontology_request",
	"telegram_appointment_reschedule_request",
	"telegram_appointment_call_request",
	"telegram_contact_request",
]);

export type CommunicationTaskWorkflowCode = z.infer<
	typeof communicationTaskWorkflowCodeSchema
>;

export const communicationStatusSchema = z.enum([
	"queued",
	"scheduled",
	"needs_call",
	"sent",
	"delivered",
	"completed",
	"failed",
	"skipped",
]);

export type CommunicationStatus = z.infer<typeof communicationStatusSchema>;

export const communicationPrioritySchema = z.enum([
	"low",
	"normal",
	"high",
	"urgent",
]);

export type CommunicationPriority = z.infer<typeof communicationPrioritySchema>;

export const communicationTaskOutcomeSchema = z.enum([
	"no_answer",
	"callback_requested",
	"reschedule_requested",
	"promised_payment",
	"document_pickup",
]);

export type CommunicationTaskOutcome = z.infer<
	typeof communicationTaskOutcomeSchema
>;

export const communicationDirectionSchema = z.enum([
	"inbound",
	"outbound",
]);

export type CommunicationDirection = z.infer<
	typeof communicationDirectionSchema
>;

export const communicationConsentScopeSchema = z.enum([
	"service",
	"marketing",
]);

export type CommunicationConsentScope = z.infer<
	typeof communicationConsentScopeSchema
>;

export const communicationConsentStateSchema = z.enum([
	"granted",
	"revoked",
]);

export type CommunicationConsentState = z.infer<
	typeof communicationConsentStateSchema
>;

export const communicationOutboxStatusSchema = z.enum([
	"queued",
	"sending",
	"sent",
	"delivered",
	"failed",
	"cancelled",
	"suppressed",
]);

export type CommunicationOutboxStatus = z.infer<
	typeof communicationOutboxStatusSchema
>;

export const integrationCategorySchema = z.enum([
	"dental_mis",
	"spreadsheet",
	"paper_archive",
	"imaging_system",
	"accounting",
	"custom",
]);

export type IntegrationCategory = z.infer<typeof integrationCategorySchema>;

export const integrationCapabilitySchema = z.enum([
	"patients",
	"appointments",
	"visits",
	"documents",
	"services",
	"payments",
	"imaging",
	"tax_documents",
	"audit",
]);

export type IntegrationCapability = z.infer<typeof integrationCapabilitySchema>;

export const integrationPresetStatusSchema = z.enum([
	"usable_now",
	"needs_mapping",
	"planned_connector",
]);

export type IntegrationPresetStatus = z.infer<
	typeof integrationPresetStatusSchema
>;

export const integrationPresetSchema = z.object({
	id: z.string(),
	title: z.string(),
	vendor: z.string(),
	category: integrationCategorySchema,
	status: integrationPresetStatusSchema,
	supportedInputs: z.array(z.string()),
	capabilities: z.array(integrationCapabilitySchema),
	migrationNotes: z.array(z.string()),
	riskLevel: z.enum(["low", "medium", "high"]),
});

export type IntegrationPreset = z.infer<typeof integrationPresetSchema>;

export const speechProviderKindSchema = z.enum([
	"browser_speech",
	"groq_whisper",
	"openai_transcribe",
	"deepgram_streaming",
	"assemblyai_async",
	"cloudflare_whisper",
	"azure_speech",
	"google_speech",
	"gemini_transcribe_live",
	"huggingface_asr",
	"mobile_native_speech",
	"local_whisper",
	"vosk_local",
]);

export type SpeechProviderKind = z.infer<typeof speechProviderKindSchema>;

export const speechProviderStatusSchema = z.enum([
	"usable_without_key",
	"needs_server_key",
	"planned_local",
]);

export type SpeechProviderStatus = z.infer<typeof speechProviderStatusSchema>;

export const speechProviderModeSchema = z.enum([
	"browser_live",
	"server_upload",
	"server_streaming",
	"local_worker",
]);

export type SpeechProviderMode = z.infer<typeof speechProviderModeSchema>;

export const speechProviderSchema = z.object({
	id: speechProviderKindSchema,
	title: z.string(),
	status: speechProviderStatusSchema,
	mode: speechProviderModeSchema,
	recommendedFor: z.array(z.string()),
	strengths: z.array(z.string()),
	limits: z.array(z.string()),
	costNote: z.string(),
	setupSettingsCount: z.number().int().nonnegative(),
	sourceUrl: z.string().url(),
});

export type SpeechProvider = z.infer<typeof speechProviderSchema>;

export const speechGatewayProviderSchema = z.union([
	speechProviderKindSchema,
	z.literal("none"),
]);

export type SpeechGatewayProvider = z.infer<typeof speechGatewayProviderSchema>;

export const speechTranscriptionSourceSchema = z.enum([
	"visit",
	"import",
	"document",
	"settings_lab",
]);

export type SpeechTranscriptionSource = z.infer<
	typeof speechTranscriptionSourceSchema
>;

export const speechChunkUploadSchema = z
	.object({
		recordingId: z.string().min(1).max(120),
		chunkIndex: z.number().int().nonnegative(),
		mimeType: z.string().min(1).max(120).default("audio/webm"),
		audioBase64: z.string().max(12_000_000).optional(),
		localTranscript: z.string().max(20_000).nullable().optional(),
		durationMs: z.number().int().positive().max(180_000).nullable().optional(),
		language: z.string().min(2).max(12).default("ru"),
		source: speechTranscriptionSourceSchema.default("visit"),
		patientId: z.string().uuid().nullable().optional(),
		visitId: z.string().uuid().nullable().optional(),
		specialty: dentalSpecialtySchema.optional(),
		clientRecordedAt: z.string().nullable().optional(),
	})
	.refine(
		(input) =>
			Boolean(input.audioBase64?.trim() || input.localTranscript?.trim()),
		{
			message: "Нужно передать аудиофайл или локальную расшифровку",
		},
	);

export type SpeechChunkUploadInput = z.infer<typeof speechChunkUploadSchema>;

export const speechTranscriptionStatusSchema = z.enum([
	"transcribed",
	"fallback_text",
	"needs_provider_key",
	"failed",
]);

export type SpeechTranscriptionStatus = z.infer<
	typeof speechTranscriptionStatusSchema
>;

export const speechTranscriptionQualityLevelSchema = z.enum([
	"clear",
	"review",
	"empty",
	"failed",
]);

export type SpeechTranscriptionQualityLevel = z.infer<
	typeof speechTranscriptionQualityLevelSchema
>;

export const speechTranscriptionQualitySchema = z.object({
	level: speechTranscriptionQualityLevelSchema,
	confidence: z.number().min(0).max(1).nullable(),
	wordCount: z.number().int().nonnegative(),
	charCount: z.number().int().nonnegative(),
	durationMs: z.number().int().positive().nullable(),
	bytesPerSecond: z.number().nonnegative().nullable(),
	providerWarnings: z.array(z.string()),
	signals: z.array(z.string()),
	nextAction: z.string(),
});

export type SpeechTranscriptionQuality = z.infer<
	typeof speechTranscriptionQualitySchema
>;

export const speechProviderSelectionModeSchema = z.enum([
	"disabled",
	"manual",
	"auto",
	"fallback",
]);

export type SpeechProviderSelectionMode = z.infer<
	typeof speechProviderSelectionModeSchema
>;

export const speechKeyPoolSchema = z.object({
	configuredKeyCount: z.number().int().nonnegative(),
	availableKeyCount: z.number().int().nonnegative(),
	coolingDownKeyCount: z.number().int().nonnegative(),
	rotationEnabled: z.boolean(),
	maxAttemptsPerProvider: z.number().int().nonnegative(),
	timeoutMs: z.number().int().positive(),
	rateLimitCooldownMs: z.number().int().positive(),
	errorCooldownMs: z.number().int().positive(),
	authCooldownMs: z.number().int().positive(),
});

export type SpeechKeyPool = z.infer<typeof speechKeyPoolSchema>;

export const speechProviderConnectorSchema = z.enum([
	"client_only",
	"server_wired",
	"server_cataloged",
	"local_bridge",
	"local_planned",
]);

export type SpeechProviderConnector = z.infer<
	typeof speechProviderConnectorSchema
>;

export const speechProviderRuntimeStatusSchema = z.object({
	providerId: speechProviderKindSchema,
	providerLabel: z.string(),
	connector: speechProviderConnectorSchema,
	doctorFacing: z.boolean(),
	canTranscribeChunks: z.boolean(),
	configured: z.boolean(),
	keyPool: speechKeyPoolSchema,
	acceptedSettingsCount: z.number().int().nonnegative(),
	missingSettingsCount: z.number().int().nonnegative(),
	recommendedUse: z.string(),
	nextStep: z.string(),
	warnings: z.array(z.string()),
});

export type SpeechProviderRuntimeStatus = z.infer<
	typeof speechProviderRuntimeStatusSchema
>;
