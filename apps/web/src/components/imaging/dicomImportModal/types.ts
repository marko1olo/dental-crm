/**
 * types.ts — Типы модального окна импорта исследований КТ (Мандат 8b <= 120 строк).
 */

export interface PendingStudyItem {
	id: string;
	title: string;
	patientId: string | null;
	patientFullName: string | null;
	kind: string;
	modality: string | null;
	capturedAt: string;
	storagePath: string | null;
	sliceCount: number | null;
	dimensions: string | null;
	voxelSpacing: string | null;
	fileSizeBytes: number | null;
	bindingStatus: string;
	bindingConfidence: number;
	dicomPatientName: string | null;
	dicomPatientId: string | null;
	dicomBirthDate: string | null;
	aiSummary: string | null;
}

export interface DicomImportManagerModalProps {
	isOpen: boolean;
	onClose: () => void;
	onStudyBound?: () => void;
}

export type DicomImportTabType = "pending" | "auto" | "unassigned" | "settings";
