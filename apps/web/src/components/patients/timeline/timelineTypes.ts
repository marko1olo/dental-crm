import type { CommunicationChannel, CommunicationStatus } from "@dental/shared";

export type CommunicationDirection = "inbound" | "outbound";

export interface PatientCommunicationEntry {
	id: string;
	channel: CommunicationChannel;
	direction: CommunicationDirection;
	status: CommunicationStatus;
	message: string;
	actorName: string | null;
	createdAt: string;
	recordingUrl?: string | null;
	durationSeconds?: number | null;
}

export interface PatientCommunicationLogResponse {
	entries: PatientCommunicationEntry[];
	totalEvents: number;
	shownEvents: number;
	truncated: boolean;
	needsCallCount: number;
	lastNeedsCallAt: string | null;
	firstEventAt: string | null;
	lastEventAt: string | null;
}

export type StatusTone = "success" | "waiting" | "failed" | "skipped";
