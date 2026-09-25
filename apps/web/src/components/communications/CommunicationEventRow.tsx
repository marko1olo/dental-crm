import type { Dashboard } from "@dental/shared";
import { History } from "lucide-react";
import {
	journalDirectionLabel,
	journalEntryNotice,
} from "./journalDigest";

type CommunicationTask = Dashboard["communicationTasks"][number];
type CommunicationEvent = Dashboard["communicationEvents"][number];

export interface CommunicationEventRowProps {
	communicationChannelLabels: Record<CommunicationTask["channel"], string>;
	communicationStatusLabels: Record<CommunicationTask["status"], string>;
	event: CommunicationEvent;
	formatDateTime: (value: string) => string;
}

export function CommunicationEventRow({
	communicationChannelLabels,
	communicationStatusLabels,
	event,
	formatDateTime,
}: CommunicationEventRowProps) {
	const notice = journalEntryNotice(event);
	const isUndelivered = event.status === "failed" || event.status === "skipped";
	return (
		<article
			key={event.id}
			className="communication-event-row"
			data-status={event.status}
			style={{
				contentVisibility: "auto",
				containIntrinsicSize: "1px 44px",
				contain: "content",
			}}
		>
			<History aria-hidden="true" />
			<div>
				<strong>
					{journalDirectionLabel(event.direction)} ·{" "}
					{communicationChannelLabels[event.channel]} ·{" "}
					<span
						className={
							isUndelivered
								? "text-[var(--bad-fg,#b42318)] font-semibold"
								: undefined
						}
					>
						{communicationStatusLabels[event.status]}
					</span>
				</strong>
				<p>
					{event.message} · {formatDateTime(event.createdAt)}
				</p>
				{notice ? (
					<p
						className={
							isUndelivered
								? "text-xs text-[var(--bad-fg,#b42318)] font-semibold"
								: "text-xs text-[var(--muted)]"
						}
						role={isUndelivered ? "alert" : undefined}
					>
						{notice}
					</p>
				) : null}
			</div>
		</article>
	);
}
