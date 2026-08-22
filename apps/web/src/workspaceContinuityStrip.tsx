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
}

const workspaceContinuityOfflineGuidanceId =
	"workspace-continuity-offline-guidance";

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
}: WorkspaceContinuityStripProps) {
	const effectiveOnline = networkState ? networkState.isOnline : isOnline;
	const totalPending =
		pendingVisitSaveCount + pendingSpeechChunkCount + pendingMutationCount;

	const visible =
		!effectiveOnline ||
		totalPending > 0 ||
		browserContinuityCritical;

	if (!visible) return null;

	const statusBadge = networkState
		? networkState.mode === "cloud_online"
			? `🟢 Онлайн (Облако)${networkState.rttMs !== null ? ` · ${networkState.rttMs} мс` : ""}`
			: networkState.mode === "lan_online"
				? `🟡 Локальная сеть клиники (LAN/Wi-Fi)${networkState.rttMs !== null ? ` · ${networkState.rttMs} мс` : ""}`
				: "🟠 Автономный офлайн"
		: !effectiveOnline
			? "🟠 Автономный офлайн"
			: "🟢 Онлайн";

	const title = !effectiveOnline
		? `Работа без сети (${statusBadge})`
		: totalPending > 0
			? `Есть очередь синхронизации (${statusBadge})`
			: `Проверьте локальное хранение (${statusBadge})`;

	const detailParts: string[] = [];
	if (!effectiveOnline) {
		detailParts.push(
			"Можно продолжать прием: все изменения врача (043/у, одонтограмма, рецепты, документы, чеки) надежно сохраняются локально на этом устройстве.",
		);
	} else if (totalPending > 0) {
		const parts: string[] = [];
		if (pendingVisitSaveCount) {
			parts.push(`${pendingVisitSaveCount} сохранение приема`);
		}
		if (pendingSpeechChunkCount) {
			parts.push(`${pendingSpeechChunkCount} аудио`);
		}
		if (pendingMutationCount) {
			parts.push(`${pendingMutationCount} клинических изменений (043/у, одонтограмма, рецепты)`);
		}
		detailParts.push(`Ожидает отправки: ${parts.join("; ")}.`);
	} else {
		detailParts.push(
			browserWarnings.slice(0, 2).join(", ") ||
				"Проверьте, что браузер не очищает локальные черновики.",
		);
	}

	const detail = detailParts.join(" ");

	return (
		<section
			className={`workspace-continuity-strip ${!effectiveOnline ? "offline" : "queued"}`}
			role="status"
			aria-live="polite"
		>
			<div>
				<strong>{title}</strong>
				<p>{detail}</p>
				{!effectiveOnline ? (
					<small id={workspaceContinuityOfflineGuidanceId}>
						Кнопки отправки станут доступны после подключения. Данные
						сохранены в локальном защищенном хранилище и не будут утеряны.
					</small>
				) : null}
			</div>
			<div className="workspace-continuity-actions">
				{pendingMutationCount > 0 && onSyncMutations ? (
					<button
						className="secondary-button"
						type="button"
						onClick={onSyncMutations}
						disabled={!effectiveOnline || isSyncingMutations}
						aria-describedby={
							!effectiveOnline ? workspaceContinuityOfflineGuidanceId : undefined
						}
					>
						{isSyncingMutations
							? "Синхронизирую..."
							: "Синхронизировать сейчас"}
					</button>
				) : null}
				{pendingVisitSaveCount ? (
					<button
						className="secondary-button"
						type="button"
						onClick={onFlushVisit}
						disabled={!effectiveOnline || isPendingVisitSyncing}
						aria-describedby={
							!effectiveOnline ? workspaceContinuityOfflineGuidanceId : undefined
						}
					>
						{isPendingVisitSyncing ? "Отправляю приемы" : "Отправить приемы"}
					</button>
				) : null}
				{pendingSpeechChunkCount ? (
					<button
						className="secondary-button"
						type="button"
						onClick={onFlushSpeech}
						disabled={!effectiveOnline}
						aria-describedby={
							!effectiveOnline ? workspaceContinuityOfflineGuidanceId : undefined
						}
					>
						Отправить аудио
					</button>
				) : null}
				<button
					className="secondary-button"
					type="button"
					onClick={onCheckDevice}
				>
					Проверить это устройство
				</button>
			</div>
		</section>
	);
}
