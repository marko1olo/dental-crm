import type {
	DentalSpecialty,
	VisitDraftAutosave,
} from "@dental/shared";
import type { VisitNoteForm } from "../../../AppHelpers";

export type SaveSyncState = "idle" | "saving" | "saved" | "queued" | "error";

export interface UseVisitSaveOptions {
	visitId?: string | null | undefined;
	patientId?: string | null | undefined;
	organizationId?: string | null | undefined;
	visitNoteForm?: VisitNoteForm | undefined;
	transcript?: string | undefined;
	isLocked?: boolean | undefined;
	allowLockedRevision?: boolean | undefined;
	isRevising?: boolean | undefined;
	debounceMs?: number | undefined;
	onSaveSuccess?: ((savedDraft?: VisitDraftAutosave | null) => void) | undefined;
	onSaveError?: ((error: unknown) => void) | undefined;
	silent?: boolean | undefined;
	selectedSpecialty?: DentalSpecialty | string | null | undefined;
}

export interface UseVisitSaveReturn {
	saveState: SaveSyncState;
	lastSavedAt: Date | null;
	hasUnsavedChanges: boolean;
	triggerSave: (options?: { silent?: boolean; force?: boolean }) => Promise<{ success: boolean; error?: string }>;
	flushPendingSave: () => Promise<void>;
	isSaving: boolean;
}
