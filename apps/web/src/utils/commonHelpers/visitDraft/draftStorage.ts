import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";
import { isDentalSpecialty } from "../../clinicProfileUtils";
import {
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../../localStorageHelpers";
import { sensitiveLocalDraftRetentionMs } from "../documentDraftHelpers";
import { isVisitNoteForm } from "./typeGuards";
import type { VisitLocalDraft } from "./types";

export function browserGeneratedId(prefix: string): string {
	return `${prefix}-${crypto.randomUUID()}`;
}

export function visitLocalDraftKey(
	visitId: string,
	organizationId: string | null | undefined = null,
): string {
	return organizationScopedLocalStorageKey(
		`dental-crm:visit-draft:${visitId}`,
		organizationId,
	);
}

export function loadVisitLocalDraft(
	visitId: string,
	organizationId: string | null | undefined = null,
): VisitLocalDraft | null {
	if (typeof window === "undefined") return null;
	try {
		const raw =
			safeLocalStorageGetItem(visitLocalDraftKey(visitId, organizationId)) ??
			(organizationId
				? safeLocalStorageGetItem(visitLocalDraftKey(visitId))
				: null);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<VisitLocalDraft>;
		if (
			parsed.version !== 1 ||
			parsed.visitId !== visitId ||
			typeof parsed.savedAt !== "string" ||
			typeof parsed.transcript !== "string" ||
			!isDentalSpecialty(parsed.selectedSpecialty) ||
			!isVisitNoteForm(parsed.visitNoteForm)
		) {
			return null;
		}
		if (!localSavedAtFresh(parsed.savedAt, sensitiveLocalDraftRetentionMs)) {
			safeLocalStorageRemoveItem(visitLocalDraftKey(visitId, organizationId));
			if (organizationId)
				safeLocalStorageRemoveItem(visitLocalDraftKey(visitId));
			return null;
		}
		return parsed as VisitLocalDraft;
	} catch {
		return null;
	}
}

export function saveVisitLocalDraft(
	draft: VisitLocalDraft,
	organizationId: string | null | undefined = null,
): void {
	if (typeof window === "undefined") return;
	const key = visitLocalDraftKey(draft.visitId, organizationId);
	safeLocalStorageSetItem(
		key,
		JSON.stringify(draft),
	);
	// Dual-storage resilience: asynchronous backup to IndexedDB
	try {
		void import("../../offlineMutationQueue").then(({ saveOfflineDraft }) => {
			void saveOfflineDraft(
				key,
				"DIARY_043_DRAFT",
				draft.visitId,
				draft,
				organizationId || undefined,
			);
		}).catch(() => {});
	} catch {
		// Ignore dynamic import failure in non-browser environments
	}
}
