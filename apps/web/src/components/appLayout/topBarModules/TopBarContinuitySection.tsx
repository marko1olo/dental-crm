/**
 * TopBarContinuitySection — Полоса непрерывности и синхронизации офлайн-мутаций (Мандат 8b, <= 120 строк).
 */

import React from "react";
import { WorkspaceContinuityStrip } from "../../../workspaceContinuityStrip";
import type { TopBarEmergencyAndSyncProps } from "../types/topBarBaseTypes";

export function TopBarContinuitySection({
	browserContinuityCritical,
	browserContinuity,
	isOnline,
	isPendingVisitSyncing,
	refreshBrowserContinuity,
	flushPendingSpeechChunks,
	flushPendingVisitSaves,
	pendingSpeechChunkCount,
	pendingVisitSaveCount,
	networkState,
	pendingMutationCount,
	syncOfflineMutations,
	isSyncingMutations,
}: TopBarEmergencyAndSyncProps) {
	return (
		<WorkspaceContinuityStrip
			browserContinuityCritical={browserContinuityCritical}
			browserWarnings={browserContinuity?.warnings ?? []}
			isOnline={isOnline}
			isPendingVisitSyncing={isPendingVisitSyncing}
			onCheckDevice={() => void refreshBrowserContinuity({ silent: false })}
			onFlushSpeech={() => void flushPendingSpeechChunks({ silent: false })}
			onFlushVisit={() => void flushPendingVisitSaves({ silent: false })}
			pendingSpeechChunkCount={pendingSpeechChunkCount}
			pendingVisitSaveCount={pendingVisitSaveCount}
			networkState={networkState}
			pendingMutationCount={pendingMutationCount}
			onSyncMutations={() => void syncOfflineMutations()}
			isSyncingMutations={isSyncingMutations}
		/>
	);
}
