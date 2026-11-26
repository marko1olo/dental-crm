/**
 * TopBarContinuitySection — Компактный чип состояния синхронизации (0px шума в норме).
 * При потере сети или очереди несинхронизированных записей рендерится как h-8 чип внутри AppTopBar.
 */

import React from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import type { TopBarEmergencyAndSyncProps } from "../types/topBarBaseTypes";

export function TopBarContinuitySection({
	browserContinuityCritical = false,
	isOnline = true,
	isPendingVisitSyncing = false,
	flushPendingVisitSaves = async () => {},
	pendingSpeechChunkCount = 0,
	pendingVisitSaveCount = 0,
	pendingMutationCount = 0,
	syncOfflineMutations = async () => {},
	isSyncingMutations = false,
}: Partial<TopBarEmergencyAndSyncProps>) {
	const totalPending = pendingMutationCount + pendingSpeechChunkCount + pendingVisitSaveCount;
	const hasIssue = !isOnline || browserContinuityCritical || totalPending > 0;

	if (!hasIssue) {
		return null;
	}

	const busy = isPendingVisitSyncing || isSyncingMutations;
	const label = !isOnline
		? totalPending > 0
			? `Офлайн · ${totalPending}`
			: "Офлайн"
		: busy
			? "Синхронизация…"
			: `В очереди: ${totalPending || 1}`;

	return (
		<button
			type="button"
			data-testid="topbar-continuity-chip"
			onClick={() => {
				void syncOfflineMutations();
				void flushPendingVisitSaves({ silent: false });
			}}
			className="h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] text-xs font-medium inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
			title="Состояние подключения и очереди синхронизации"
		>
			{!isOnline ? (
				<WifiOff className="w-3.5 h-3.5 text-[var(--danger)] shrink-0" aria-hidden="true" />
			) : (
				<RefreshCw
					className={`w-3.5 h-3.5 text-[var(--primary)] shrink-0 ${busy ? "animate-spin" : ""}`}
					aria-hidden="true"
				/>
			)}
			<span>{label}</span>
		</button>
	);
}
