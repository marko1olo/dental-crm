import type { DocumentIssueSignatureMode } from "@dental/shared";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { logger } from "../../utils/logger";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../../utils/localStorageHelpers";

export const documentIssueSignatureStorageKey =
	"dental-crm:document-issue-signature:v1";

export type DocumentIssueSignatureDraft = {
	version: 1;
	mode: DocumentIssueSignatureMode;
	staffFullName: string;
	staffRole: string;
	savedAt: string;
};

export const documentIssueSignatureModeLabels: Record<
	DocumentIssueSignatureMode,
	string
> = {
	paper_signed: "Бумажный экземпляр подписан",
	simple_electronic_signature: "Простая электронная подпись",
	enhanced_non_qualified_electronic_signature: "УНЭП",
	qualified_electronic_signature: "УКЭП",
};

export function normalizedDocumentIssueSignatureMode(
	value: unknown,
): DocumentIssueSignatureMode {
	return value === "simple_electronic_signature" ||
		value === "qualified_electronic_signature" ||
		value === "paper_signed"
		? value
		: "paper_signed";
}

export function isDocumentIssueSignatureModePreference(
	value: unknown,
): value is DocumentIssueSignatureMode {
	return (
		value === "paper_signed" ||
		value === "simple_electronic_signature" ||
		value === "qualified_electronic_signature"
	);
}

export function documentIssueSignatureLocalKey(
	organizationId: string | null | undefined,
): string {
	return organizationScopedLocalStorageKey(
		documentIssueSignatureStorageKey,
		organizationId,
	);
}

export function loadDocumentIssueSignatureDraft(
	organizationId: string | null | undefined = null,
): DocumentIssueSignatureDraft {
	const fallback: DocumentIssueSignatureDraft = {
		version: 1,
		mode: "paper_signed",
		staffFullName: "",
		staffRole: "Врач/администратор",
		savedAt: "",
	};
	if (typeof window === "undefined") return fallback;
	try {
		const localKey = documentIssueSignatureLocalKey(organizationId);
		const raw =
			safeLocalStorageGetItem(localKey) ??
			(organizationId
				? safeLocalStorageGetItem(documentIssueSignatureStorageKey)
				: null);
		if (!raw) return fallback;
		const parsed = JSON.parse(raw) as Partial<DocumentIssueSignatureDraft>;
		if (parsed?.version !== 1) return fallback;
		const savedAt = typeof parsed.savedAt === "string" ? parsed.savedAt : "";
		if (!localSavedAtFresh(savedAt, localConvenienceRetentionMs)) {
			safeLocalStorageRemoveItem(localKey);
			if (organizationId)
				safeLocalStorageRemoveItem(documentIssueSignatureStorageKey);
			return fallback;
		}
		return {
			version: 1,
			mode: normalizedDocumentIssueSignatureMode(parsed.mode),
			staffFullName:
				typeof parsed.staffFullName === "string"
					? parsed.staffFullName.slice(0, 240)
					: "",
			staffRole:
				typeof parsed.staffRole === "string" && parsed.staffRole.trim()
					? parsed.staffRole.slice(0, 120)
					: "Врач/администратор",
			savedAt,
		};
	} catch (error) {
		logger.warn(error);
		return fallback;
	}
}

export function saveDocumentIssueSignatureDraft(
	organizationId: string | null | undefined,
	mode: DocumentIssueSignatureMode,
	staffFullName: string,
	staffRole: string,
): void {
	if (typeof window === "undefined") return;
	try {
		safeLocalStorageSetItem(
			documentIssueSignatureLocalKey(organizationId),
			JSON.stringify({
				version: 1,
				mode,
				staffFullName: staffFullName.trim().slice(0, 240),
				staffRole: staffRole.trim().slice(0, 120) || "Врач/администратор",
				savedAt: new Date().toISOString(),
			} satisfies DocumentIssueSignatureDraft),
		);
	} catch (error) {
		logger.warn(error);
	}
}
