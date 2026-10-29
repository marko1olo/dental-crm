/**
 * @file packages/shared/src/types/ai.ts
 * @description Canonical AI Assistant, Copilot, Two-Mode Workstation Harness,
 * and Voice Dictation contracts for DENTE CRM (Mandates 8e, 8n, 8am, 8ap).
 */

import { z } from "zod";

// ============================================================================
// 1. HARNESS MODES & EXECUTION CONTEXT
// ============================================================================

export const aiHarnessModeSchema = z.enum(["web_browser", "desktop_native"]);
export type AiHarnessMode = z.infer<typeof aiHarnessModeSchema>;

export const aiExecutionModeSchema = z.enum(["supervised", "autonomous", "audit"]);
export type AiExecutionMode = z.infer<typeof aiExecutionModeSchema>;

export const copilotPhaseSchema = z.enum([
	"idle",
	"listening",
	"thinking",
	"working",
	"answering",
	"confirmation_required",
	"error",
]);
export type CopilotPhase = z.infer<typeof copilotPhaseSchema>;

export const copilotRoleSchema = z.enum(["user", "assistant", "system", "tool"]);
export type CopilotRole = z.infer<typeof copilotRoleSchema>;

// ============================================================================
// 2. COPILOT ACTIONS & CONFIRMATION (HUMAN-IN-THE-LOOP)
// ============================================================================

export const copilotActionDecisionSchema = z.enum(["confirm", "reject", "modify"]);
export type CopilotActionDecision = z.infer<typeof copilotActionDecisionSchema>;

export const copilotPendingActionSchema = z.object({
	callId: z.string().min(1),
	sessionId: z.string().min(1),
	toolName: z.string().min(1),
	arguments: z.record(z.unknown()),
	description: z.string().optional(),
	isDestructive: z.boolean().default(false),
	createdAt: z.number().default(() => Date.now()),
	organizationId: z.string().optional(),
	userId: z.string().optional(),
	status: z.enum(["pending", "confirmed", "rejected", "expired"]).default("pending"),
	rejectionReason: z.string().optional(),
	resolvedAt: z.string().optional(),
});
export type CopilotPendingAction = z.infer<typeof copilotPendingActionSchema>;

// ============================================================================
// 3. CLINICAL DOMAIN TOOLS (WEB CRM HARNESS)
// ============================================================================

export const fdiToothUpdateActionSchema = z.object({
	toothNumber: z.number().int().min(11).max(85),
	status: z.string().min(1),
	diagnosisCode: z.string().optional(),
	surfaces: z.array(z.string()).optional(),
	notes: z.string().optional(),
});
export type FdiToothUpdateAction = z.infer<typeof fdiToothUpdateActionSchema>;

export const soapDiaryDraftActionSchema = z.object({
	complaint: z.string().optional(),
	anamnesis: z.string().optional(),
	objectiveStatus: z.string().optional(),
	treatmentPlan: z.string().optional(),
	recommendations: z.string().optional(),
	diagnosis: z.string().optional(),
	toothNumber: z.number().int().optional(),
});
export type SoapDiaryDraftAction = z.infer<typeof soapDiaryDraftActionSchema>;

export const treatmentEstimateItemSchema = z.object({
	serviceId: z.string().optional(),
	serviceCode: z.string().optional(),
	serviceName: z.string(),
	priceKopecks: z.number().int().nonnegative(),
	quantity: z.number().int().positive().default(1),
	toothNumber: z.number().int().optional(),
});
export type TreatmentEstimateItem = z.infer<typeof treatmentEstimateItemSchema>;

export const treatmentEstimateProposalSchema = z.object({
	items: z.array(treatmentEstimateItemSchema),
	totalAmountKopecks: z.number().int().nonnegative(),
	discountPercent: z.number().min(0).max(100).default(0),
	doctorName: z.string().optional(),
	safeAlternative: z.string().optional(),
});
export type TreatmentEstimateProposal = z.infer<typeof treatmentEstimateProposalSchema>;

export const scheduleAppointmentProposalSchema = z.object({
	patientId: z.string().uuid(),
	startsAt: z.string(),
	durationMinutes: z.number().int().positive().default(30),
	doctorId: z.string().uuid().optional(),
	reason: z.string().default("Консультация и лечение"),
	chairId: z.string().optional(),
});
export type ScheduleAppointmentProposal = z.infer<typeof scheduleAppointmentProposalSchema>;

// ============================================================================
// 4. DESKTOP NATIVE WORKSTATION HARNESS
// ============================================================================

export const desktopWorkstationAppSchema = z.enum([
	"vatech_ezdent",
	"planmeca_romexis",
	"ezsensor",
	"ondemand3d",
	"sidexis",
	"explorer_custom",
]);
export type DesktopWorkstationApp = z.infer<typeof desktopWorkstationAppSchema>;

export const desktopScreenCaptureReasonSchema = z.enum([
	"visiograph_optical",
	"cbct_diagnostic",
	"software_error",
	"clinical_telemetry",
]);
export type DesktopScreenCaptureReason = z.infer<typeof desktopScreenCaptureReasonSchema>;

export const desktopHardwareStatusSchema = z.object({
	isWindows: z.boolean(),
	workstationDropzonePath: z.string().optional(),
	installedDentalApps: z.array(desktopWorkstationAppSchema),
	fiscalRegisterOnline: z.boolean().default(false),
	fiscalComPort: z.string().optional(),
});
export type DesktopHardwareStatus = z.infer<typeof desktopHardwareStatusSchema>;

// ============================================================================
// 5. VOICE & SPEECH RECOGNITION (VOICE-FIRST CRM)
// ============================================================================

export const voiceDictationModeSchema = z.enum([
	"gemini_live",
	"server_whisper",
	"browser_speech",
	"offline_queue",
]);
export type VoiceDictationMode = z.infer<typeof voiceDictationModeSchema>;

export const voiceDictationStateSchema = z.enum([
	"idle",
	"listening",
	"processing",
	"speaking",
	"fallback",
	"error",
]);
export type VoiceDictationState = z.infer<typeof voiceDictationStateSchema>;

export const voiceTranscriptSegmentSchema = z.object({
	text: z.string(),
	isFinal: z.boolean(),
	confidence: z.number().min(0).max(1).optional(),
	timestamp: z.number().default(() => Date.now()),
});
export type VoiceTranscriptSegment = z.infer<typeof voiceTranscriptSegmentSchema>;
