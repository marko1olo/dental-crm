/**
 * DENTE CRM — Radiology Consultation Split Types (Layer 0)
 * Directed Acyclic Graph (DAG): Layer 0 (Zero runtime dependencies)
 */

import type { RadiologyStudy } from "../types.js";
import type { RadiologyFilmstripItem } from "../RadiologyFilmstripDock.js";
import type {
	ConsultationSlot,
	ViewportAnnotation,
	ViewportState,
} from "../consultationCanvasRenderers.js";
import type { ConsultationSplitMode } from "../ConsultationTopToolbar.js";

export type { ConsultationSlot, ViewportAnnotation, ViewportState, ConsultationSplitMode };

/**
 * Roles for Clinical Radiology Consilium / Teleconsultation
 */
export type ConsultationParticipantRole =
	| "surgeon"
	| "orthopedist"
	| "radiologist"
	| "therapist";

export type ConsultationParticipantStatus = "online" | "syncing" | "idle";

export interface ConsultationParticipant {
	readonly id: string;
	readonly name: string;
	readonly role: ConsultationParticipantRole;
	readonly roleLabel: string;
	readonly avatarUrl?: string | undefined;
	readonly status: ConsultationParticipantStatus;
	readonly color: string;
	readonly cursorPosition?: { readonly x: number; readonly y: number } | undefined;
}

export type ConsultationSyncStatus = "synced" | "independent" | "lagging";

export interface SliceAnnotation {
	readonly id: string;
	readonly sliceIndex: number;
	readonly zMm: number;
	readonly type: "measurement" | "arrow" | "freehand" | "density";
	readonly points: readonly { readonly x: number; readonly y: number }[];
	readonly label: string;
	readonly color: string;
	readonly authorId: string;
	readonly timestamp: string;
}

export interface DicomSeriesInfo {
	readonly seriesInstanceUid: string;
	readonly seriesDescription: string;
	readonly modality: string;
	readonly sliceCount: number;
	readonly sliceThicknessMm: number;
	readonly pixelSpacingMm?: readonly [number, number] | undefined;
}

export interface ConsultationNoteItem {
	readonly id: string;
	readonly authorRole: ConsultationParticipantRole;
	readonly authorName: string;
	readonly text: string;
	readonly timestamp: string;
	readonly targetTooth?: string | undefined;
	readonly attachmentUrl?: string | undefined;
}

export interface ConsultationChatMessage {
	readonly id: string;
	readonly authorId: string;
	readonly authorName: string;
	readonly authorRole: ConsultationParticipantRole;
	readonly text: string;
	readonly timestamp: string;
}

export type ActiveConsultationTool = "pan" | "laser" | "arrow" | "pencil" | "eraser";

export interface RadiologyConsultationSplitProps {
	readonly patientName?: string | undefined;
	readonly patientCardNumber?: string | undefined;
	readonly patientAge?: string | number | undefined;
	readonly patientGender?: string | undefined;
	readonly activeToothFdi?: string | number | undefined;
	readonly initialLeftStudy?: RadiologyStudy | RadiologyFilmstripItem | undefined;
	readonly initialRightStudy?: RadiologyStudy | RadiologyFilmstripItem | undefined;
	readonly patientStudiesHistory?: readonly (RadiologyStudy | RadiologyFilmstripItem)[] | undefined;
	readonly initialSplitMode?: ConsultationSplitMode | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly onInsertProtocol?: ((note: string) => void) | undefined;
	readonly onSaveSnapshot?: ((dataUrl: string) => void) | undefined;
}
