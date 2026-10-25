export interface RecallStatusUpdateRequest {
	readonly patientId: string;
	readonly status: string;
	readonly channel?: string | undefined;
	readonly note?: string | undefined;
}

export interface RecallStatusUpdateResponse {
	readonly ok: boolean;
	readonly patientId: string;
	readonly status: string;
	readonly updatedAt: string;
	readonly message?: string | undefined;
}

export async function sendRecallCandidateStatusUpdate(
	params: RecallStatusUpdateRequest,
	headers?: Record<string, string>,
): Promise<RecallStatusUpdateResponse> {
	const response = await fetch(
		`/api/patients/recall-candidates/${encodeURIComponent(params.patientId)}/status`,
		{
			method: "PATCH",
			headers: { ...(headers ?? {}), "content-type": "application/json", Accept: "application/json" },
			body: JSON.stringify({ status: params.status, channel: params.channel, note: params.note }),
		},
	);
	const payload = (await response.json().catch(() => ({}))) as {
		ok?: boolean; patientId?: string; status?: string; updatedAt?: string; message?: string;
	};
	if (!response.ok) {
		throw new Error(payload.message || `Сервер ответил ошибкой ${response.status}`);
	}
	return {
		ok: Boolean(payload.ok),
		patientId: payload.patientId ?? params.patientId,
		status: payload.status ?? params.status,
		updatedAt: payload.updatedAt ?? new Date().toISOString(),
		message: payload.message,
	};
}
