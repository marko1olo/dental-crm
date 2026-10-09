import type { SpeechChunkUploadInput } from "@dental/shared";
import { normalizedLocalOrganizationId } from "../../AuthOnboardingHelpers";
import {
	dicomWorkbenchDraftStoreName,
	mprWorkbenchDraftStoreName,
} from "../../ImagingHelpers";
import { localSavedAtFresh } from "../../localStorageHelpers";
import {
	speechAudioQueueRetentionMs,
	speechChunkStoreName,
} from "../../SpeechHelpers";
import { pendingVisitSaveStoreName } from "../visitDraftHelpers";
import { localQueueOrganizationMatches } from "./domainGuards";
import type { PendingSpeechChunk } from "./types";

export const requiredSpeechChunkDbStoreNames = [
	pendingVisitSaveStoreName,
	dicomWorkbenchDraftStoreName,
	mprWorkbenchDraftStoreName,
	speechChunkStoreName,
] as const;

export const speechTranscriptionSources = [
	"visit",
	"import",
	"document",
	"settings_lab",
] as const;

export type SpeechTranscriptionSourceKind =
	(typeof speechTranscriptionSources)[number];

export function isSpeechTranscriptionSource(
	value: unknown,
): value is SpeechChunkUploadInput["source"] {
	return (
		typeof value === "string" &&
		(speechTranscriptionSources as readonly string[]).includes(value)
	);
}

export function normalizeSpeechTranscriptionSource(
	value: unknown,
): SpeechChunkUploadInput["source"] {
	return isSpeechTranscriptionSource(value) ? value : "visit";
}

export function isPendingSpeechChunk(
	value: unknown,
): value is PendingSpeechChunk {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<PendingSpeechChunk>;
	return (
		candidate.version === 1 &&
		typeof candidate.id === "string" &&
		typeof candidate.queuedAt === "string" &&
		typeof candidate.recordingId === "string" &&
		typeof candidate.chunkIndex === "number" &&
		Number.isInteger(candidate.chunkIndex) &&
		typeof candidate.mimeType === "string" &&
		typeof candidate.language === "string" &&
		isSpeechTranscriptionSource(candidate.source) &&
		(typeof candidate.audioBase64 === "string" ||
			typeof candidate.localTranscript === "string")
	);
}

export function normalizePendingSpeechChunk(
	value: unknown,
	activeOrganizationId: string | null | undefined,
	legacyOrganizationFallback: string | null | undefined = null,
): PendingSpeechChunk | null {
	if (!value || typeof value !== "object") return null;
	const candidate = value as Partial<PendingSpeechChunk>;
	if (
		candidate.version !== 1 ||
		typeof candidate.id !== "string" ||
		typeof candidate.queuedAt !== "string" ||
		typeof candidate.recordingId !== "string" ||
		typeof candidate.chunkIndex !== "number" ||
		!Number.isInteger(candidate.chunkIndex) ||
		typeof candidate.mimeType !== "string" ||
		typeof candidate.language !== "string" ||
		typeof candidate.source !== "string" ||
		(!candidate.audioBase64 && !candidate.localTranscript)
	) {
		return null;
	}
	const organizationId =
		normalizedLocalOrganizationId(candidate.organizationId) ??
		normalizedLocalOrganizationId(legacyOrganizationFallback);
	if (!localQueueOrganizationMatches(organizationId, activeOrganizationId))
		return null;
	if (!localSavedAtFresh(candidate.queuedAt, speechAudioQueueRetentionMs))
		return null;
	return {
		...(candidate as PendingSpeechChunk),
		organizationId,
		source: normalizeSpeechTranscriptionSource(candidate.source),
	};
}

export function sortPendingSpeechChunks(
	queue: PendingSpeechChunk[],
): PendingSpeechChunk[] {
	return queue
		.slice()
		.sort((left, right) => left.queuedAt.localeCompare(right.queuedAt));
}
