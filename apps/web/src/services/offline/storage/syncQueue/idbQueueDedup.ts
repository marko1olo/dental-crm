import {
	computePayloadHash,
	createCompositeIdempotencyKey,
	getAdjustedNowIso,
	getAdjustedNowMs,
} from "@dental/shared";
import { generateMutationUuid } from "./idbQueueSchema";
import type { EnqueueMutationInput, OfflineMutation } from "./types";

export function createMutationEnvelope<T>(input: EnqueueMutationInput<T>): OfflineMutation<T> {
	const timestamp = input.timestamp || getAdjustedNowIso();
	const timestampMs = new Date(timestamp).getTime() || getAdjustedNowMs();
	const mutationId = input.mutationId || generateMutationUuid();
	const payloadHash = computePayloadHash(input.payload);
	const idempotencyKey = input.idempotencyKey || createCompositeIdempotencyKey(mutationId, input.payload);

	return {
		mutationId,
		idempotencyKey,
		payloadHash,
		entityType: input.entityType,
		entityId: input.entityId,
		action: input.action || "update",
		payload: input.payload,
		timestamp,
		timestampMs,
		organizationId: input.organizationId,
		mutationVector: input.mutationVector,
		authorUserId: input.authorUserId,
		status: "pending",
		retryCount: 0,
	};
}
