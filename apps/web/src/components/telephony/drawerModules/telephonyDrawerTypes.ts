import type {
	CallDirection,
	CallHistoryItem,
	CallOutcome,
	CallStatus,
	CallTranscriptUtterance,
	IncomingCallPayload,
} from "../../../store/telephonyStore";

export type {
	CallDirection,
	CallHistoryItem,
	CallOutcome,
	CallStatus,
	CallTranscriptUtterance,
	IncomingCallPayload,
};

export type TelephonyCallKind = "incoming" | "outgoing" | "missed";

export type TelephonyCallbackSlaStatus =
	| "pending_within_sla"
	| "overdue_sla"
	| "completed"
	| "not_required";

export type TelephonyCallLogFilter =
	| "all"
	| "missed_unhandled"
	| "recorded";

export interface TelephonyCallRecordingMeta {
	recordingUrl: string;
	durationSeconds: number;
	seed: string;
	transcript?: CallTranscriptUtterance[];
}

export interface TelephonyDrawerProps {
	isOpen?: boolean;
	onClose?: () => void;
	call?: IncomingCallPayload | null;
}

export function resolveCallKind(item: CallHistoryItem): TelephonyCallKind {
	if (
		item.status === "missed" ||
		item.status === "rejected" ||
		item.outcome === "callback_15m"
	) {
		return "missed";
	}
	if (item.direction === "outbound") {
		return "outgoing";
	}
	return "incoming";
}

export function resolveCallbackSlaStatus(
	item: CallHistoryItem,
	nowMs: number = Date.now(),
): {
	status: TelephonyCallbackSlaStatus;
	remainingSeconds: number;
	formattedCountdown: string;
} {
	const kind = resolveCallKind(item);
	if (kind !== "missed") {
		return {
			status: "not_required",
			remainingSeconds: 0,
			formattedCountdown: "",
		};
	}

	if (
		item.actionTaken === "accepted" ||
		item.actionTaken === "transferred" ||
		item.outcome === "accepted" ||
		item.outcome === "transferred"
	) {
		return {
			status: "completed",
			remainingSeconds: 0,
			formattedCountdown: "Перезвонили",
		};
	}

	const startMs =
		item.callStartedAt ||
		(item.timestamp ? new Date(item.timestamp).getTime() : nowMs);
	const deadlineMs = item.callbackDueAt
		? new Date(item.callbackDueAt).getTime()
		: startMs + 15 * 60 * 1000;
	const remainingSeconds = Math.floor((deadlineMs - nowMs) / 1000);

	if (remainingSeconds <= 0) {
		const overdueMin = Math.max(1, Math.floor(Math.abs(remainingSeconds) / 60));
		return {
			status: "overdue_sla",
			remainingSeconds,
			formattedCountdown: `Просрочен на ${overdueMin} мин`,
		};
	}

	const mins = Math.floor(remainingSeconds / 60);
	const secs = remainingSeconds % 60;
	const formattedCountdown = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

	return {
		status: "pending_within_sla",
		remainingSeconds,
		formattedCountdown,
	};
}
