/**
 * DENTE CRM — Radiology Consultation Split Constants (Layer 1)
 * Directed Acyclic Graph (DAG): Layer 1 (Pure constants, 0 runtime side effects)
 */

import type {
	ConsultationParticipant,
	ConsultationParticipantRole,
	ActiveConsultationTool,
} from "./types.js";

export const CONSULTATION_ROLE_LABELS: Record<ConsultationParticipantRole, string> = {
	surgeon: "Хирург-имплантолог",
	orthopedist: "Стоматолог-ортопед",
	radiologist: "Врач-рентгенолог",
	therapist: "Стоматолог-терапевт",
} as const;

export const CONSULTATION_ROLE_COLORS: Record<ConsultationParticipantRole, string> = {
	surgeon: "#06b6d4", // Cyan
	orthopedist: "#10b981", // Emerald
	radiologist: "#8b5cf6", // Purple
	therapist: "#f59e0b", // Amber
} as const;

export const DEFAULT_CONSULTATION_PARTICIPANTS: readonly ConsultationParticipant[] = [
	{
		id: "part-surgeon-1",
		name: "Д-р Романенко А. И.",
		role: "surgeon",
		roleLabel: "Хирург-имплантолог",
		status: "online",
		color: CONSULTATION_ROLE_COLORS.surgeon,
	},
	{
		id: "part-ortho-1",
		name: "Д-р Смирнова Е. В.",
		role: "orthopedist",
		roleLabel: "Стоматолог-ортопед",
		status: "online",
		color: CONSULTATION_ROLE_COLORS.orthopedist,
	},
	{
		id: "part-radio-1",
		name: "Д-р Воронов М. К.",
		role: "radiologist",
		roleLabel: "Врач-рентгенолог",
		status: "syncing",
		color: CONSULTATION_ROLE_COLORS.radiologist,
	},
] as const;

export const CONSULTATION_TOOLS: readonly ActiveConsultationTool[] = [
	"pan",
	"laser",
	"arrow",
	"pencil",
	"eraser",
] as const;

export const DEFAULT_ANNOTATION_COLOR = "#ef4444";
export const DEFAULT_Z_MM = 25.0;
export const ACTIVE_SLOT_BORDER_COLOR = "#00C853";
