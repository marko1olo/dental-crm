import { useState } from "react";
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
}: WorkspaceContinuityStripProps) {
	const [isMobileExpanded, setIsMobileExpanded] = useState(false);
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
			? `Синхронизация... (${pluralizeChanges(totalPending)} в очереди)`
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

	const badgeEmoji = isOffline || isSyncingMutations || (networkState && networkState.mode !== "cloud_online" && networkState.mode !== "lan_online")
		? "🟠"
		: networkState?.mode === "lan_online"
			? "🟡"
			: "🟢";

	const statusBadge = `${badgeEmoji} ${statusText}`;

	const title = isOffline
		? "Работа без сети"
		: totalPending > 0
			? `Есть очередь синхронизации (${statusBadge})`
			: `Проверьте локальное хранение (${statusBadge})`;

	const detailParts: string[] = [];
	if (isOffline) {
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
			className={`workspace-continuity-strip offline-continuity-strip ${isOffline ? "offline" : "queued"} ${isMobileExpanded ? "mobile-expanded" : "mobile-collapsed"}`}
			role="status"
			aria-live="polite"
		>
			{/* Mobile Compact 1-line Status Bar (<= 40px, active when not expanded) */}
			<div className="flex sm:hidden items-center justify-between w-full h-8 min-h-[32px] max-h-[38px] gap-2 px-1">
				<div className="flex items-center gap-2 min-w-0 flex-1">
					<span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
					<span className="text-xs font-bold truncate text-[var(--ink,#0f172a)]">
						{isOffline ? "Офлайн" : statusText}
						{totalPending > 0 ? ` · ${pluralizeChanges(totalPending)}` : ""}
					</span>
				</div>
				<button
					type="button"
					onClick={() => setIsMobileExpanded((prev) => !prev)}
					className="min-h-[30px] px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/40 cursor-pointer shrink-0 transition-colors"
					aria-expanded={isMobileExpanded}
				>
					{isMobileExpanded ? "Свернуть" : "Подробнее"}
				</button>
			</div>

			{/* Detailed Body (shown on desktop >=sm or when expanded on mobile) */}
			<div className={`${isMobileExpanded ? "block" : "hidden"} sm:block min-w-0`}>
				<div className="flex items-center gap-2 flex-wrap">
					<strong>{title}</strong>
					{isOffline && (
						<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
							<span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
							Автономный офлайн
						</span>
					)}
				</div>
				<p>{detail}</p>
				{isOffline ? (
					<small id={workspaceContinuityOfflineGuidanceId}>
						Кнопки отправки станут доступны после подключения. Данные
						сохранены в локальном защищенном хранилище и не будут утеряны.
					</small>
				) : null}
			</div>
			<div className={`workspace-continuity-actions ${isMobileExpanded ? "flex" : "hidden"} sm:flex`}>
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

export const OfflineContinuityStrip = WorkspaceContinuityStrip;
export { pluralizeChanges };

