import type { NetworkState } from "./utils/networkConnectivity";

export interface WorkspaceContinuityStripProps {
	browserContinuityCritical: boolean;
	browserWarnings: string[];
	isOnline: boolean;
	isPendingVisitSyncing: boolean;
	onCheckDevice: () => void;
	onFlushSpeech: () => void;
	onFlushVisit: () => void;
	pendingSpeechChunkCount: number;
	pendingVisitSaveCount: number;
	networkState?: NetworkState;
	pendingMutationCount?: number;
	onSyncMutations?: () => void;
	isSyncingMutations?: boolean;
	onClearMutations?: () => void;
}

const workspaceContinuityOfflineGuidanceId =
	"workspace-continuity-offline-guidance";

function pluralizeChanges(count: number): string {
	const abs = Math.abs(count) % 100;
	const num = abs % 10;
	if (abs > 10 && abs < 20) return `${count} изменений`;
	if (num > 1 && num < 5) return `${count} изменения`;
	if (num === 1) return `${count} изменение`;
	return `${count} изменений`;
}

export function WorkspaceContinuityStrip({
	browserContinuityCritical,
	browserWarnings,
	isOnline,
	isPendingVisitSyncing,
	onCheckDevice,
	onFlushSpeech,
	onFlushVisit,
	pendingSpeechChunkCount,
	pendingVisitSaveCount,
	networkState,
	pendingMutationCount = 0,
	onSyncMutations,
	isSyncingMutations = false,
	onClearMutations,
}: WorkspaceContinuityStripProps) {
	const effectiveOnline = networkState ? networkState.isOnline : isOnline;
	const totalPending =
		pendingVisitSaveCount + pendingSpeechChunkCount + pendingMutationCount;

	const visible =
		!effectiveOnline ||
		totalPending > 0 ||
		browserContinuityCritical;

	if (!visible) return null;

	const isOffline = !effectiveOnline;
	const statusText = isSyncingMutations
		? totalPending > 0
			? `Синхронизация (${pluralizeChanges(totalPending)} в очереди)`
			: "Синхронизация..."
		: networkState
			? networkState.mode === "cloud_online"
				? `В сети${networkState.rttMs !== null ? ` · ${networkState.rttMs} мс` : ""}`
				: networkState.mode === "lan_online"
					? `Автономный режим (Wi-Fi)${networkState.rttMs !== null ? ` · ${networkState.rttMs} мс` : ""}`
					: totalPending > 0
						? `Автономный режим (${pluralizeChanges(totalPending)} в очереди)`
						: "Автономный офлайн"
			: isOffline
				? totalPending > 0
					? `Автономный режим (${pluralizeChanges(totalPending)} в очереди)`
					: "Автономный офлайн"
				: "В сети";

	return (
		<section
			className={`workspace-continuity-strip offline-continuity-strip ${isOffline ? "offline" : "queued"}`}
			role="status"
			aria-live="polite"
		>
			{/* Left: 8px status indicator dot + compact title */}
			<div className="workspace-continuity-left">
				<span
					className={`workspace-continuity-dot ${
						isOffline
							? "workspace-continuity-dot--offline"
							: totalPending > 0
								? "workspace-continuity-dot--queued"
								: "workspace-continuity-dot--online"
					}`}
					aria-hidden="true"
				/>
				<span className="workspace-continuity-text">
					{isOffline
						? `Офлайн · Данные сохраняются локально${totalPending > 0 ? ` (${pluralizeChanges(totalPending)})` : ""}`
						: totalPending > 0
							? `Очередь синхронизации: ${pluralizeChanges(totalPending)}`
							: statusText}
				</span>
			</div>

			{/* Right: Compact sync trigger */}
			<div className="workspace-continuity-actions">
				{pendingMutationCount > 0 && onClearMutations ? (
					<button
						className="workspace-continuity-btn workspace-continuity-btn--clear"
						type="button"
						onClick={onClearMutations}
						title="Очистить очередь офлайн-мутаций (1 клик)"
						data-testid="btn-clear-mutations"
					>
						Очистить очередь
					</button>
				) : null}
				{pendingMutationCount > 0 && onSyncMutations ? (
					<button
						className="workspace-continuity-btn"
						type="button"
						onClick={onSyncMutations}
						disabled={isSyncingMutations}
						title={
							!effectiveOnline
								? "Принудительная синхронизация мутаций при нестабильной сети (1 клик)"
								: "Синхронизировать очередь мутаций"
						}
						data-testid="btn-sync-mutations"
						aria-describedby={
							!effectiveOnline
								? workspaceContinuityOfflineGuidanceId
								: undefined
						}
					>
						{isSyncingMutations
							? "Синхронизация..."
							: !effectiveOnline
								? "Синхронизировать принудительно"
								: "Синхронизировать"}
					</button>
				) : null}
				{pendingVisitSaveCount ? (
					<button
						className="workspace-continuity-btn"
						type="button"
						onClick={onFlushVisit}
						disabled={isPendingVisitSyncing}
						title={
							!effectiveOnline
								? "Принудительная отправка сохраненных приемов (1 клик)"
								: "Отправить приемы"
						}
						data-testid="btn-flush-visits"
						aria-describedby={
							!effectiveOnline
								? workspaceContinuityOfflineGuidanceId
								: undefined
						}
					>
						{isPendingVisitSyncing ? "Отправляю..." : "Отправить приемы"}
					</button>
				) : null}
			</div>
		</section>
	);
}

export const OfflineContinuityStrip = WorkspaceContinuityStrip;
export { pluralizeChanges };


