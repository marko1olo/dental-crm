/**
 * NetworkStatusIndicator.tsx — DENTE CRM Clinic Network Status & Offline Buffer Capsule
 *
 * Компактный индикатор статуса сети и буферизованных клинических мутаций:
 * - Эргономика Apple HIG / Medical Density: высота 32–36px, отсутствие визуального мусора
 * - 4 состояния сети: Онлайн (зеленый), Локальная сеть LAN (янтарный), Офлайн (красный), Синхронизация (анимация)
 * - Счетчик буферизованных приемов, дневников 043/у и зубных формул в очереди
 * - 1-клик дренаж мутаций при восстановлении связи без потери данных врача
 * - Клик по индикатору открывает модальное окно деталей синхронизации (OfflineSyncGuardModal)
 */

import React, { useCallback, useState } from "react";
import {
	Activity,
	AlertTriangle,
	CheckCircle2,
	RefreshCw,
	Wifi,
	WifiOff,
} from "lucide-react";
import { useOfflineSync } from "../../hooks/useOfflineSync";
import { OfflineSyncGuardModal } from "./OfflineSyncGuardModal";

export interface NetworkStatusIndicatorProps {
	readonly className?: string | undefined;
	readonly compact?: boolean | undefined;
	readonly onOpenModal?: (() => void) | undefined;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
	className = "",
	compact = false,
	onOpenModal,
}) => {
	const [isModalOpen, setIsModalOpen] = useState(false);

	const {
		isOnline,
		isLan,
		isSyncing,
		pendingMutationCount,
		syncNow,
		networkState,
	} = useOfflineSync({
		autoSyncOnReconnect: true,
	});

	const handleClick = useCallback(() => {
		if (onOpenModal) {
			onOpenModal();
		} else {
			setIsModalOpen(true);
		}
	}, [onOpenModal]);

	const handleSyncClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			if (!isSyncing && isOnline) {
				void syncNow();
			}
		},
		[isSyncing, isOnline, syncNow],
	);

	// Determine status visual theme
	const getStatusConfig = () => {
		if (isSyncing) {
			return {
				label: "Синхронизация",
				sublabel: `${pendingMutationCount} в очереди`,
				bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
				icon: RefreshCw,
				spin: true,
				dot: "bg-blue-500 animate-ping",
			};
		}

		if (!isOnline) {
			return {
				label: "Офлайн-режим",
				sublabel: pendingMutationCount > 0 ? `${pendingMutationCount} сохранено локально` : "Буферизация активна",
				bg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25",
				icon: WifiOff,
				spin: false,
				dot: "bg-red-500",
			};
		}

		if (isLan) {
			return {
				label: "Локальная сеть (LAN)",
				sublabel: "Сервер клиники доступен",
				bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
				icon: Activity,
				spin: false,
				dot: "bg-amber-500",
			};
		}

		return {
			label: "Онлайн",
			sublabel: pendingMutationCount > 0 ? `${pendingMutationCount} на отправку` : "Связь стабильна",
			bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
			icon: Wifi,
			spin: false,
			dot: "bg-emerald-500",
		};
	};

	const config = getStatusConfig();
	const IconComponent = config.icon;

	return (
		<>
			<div
				className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border transition-all cursor-pointer select-none text-xs h-[32px] ${config.bg} ${className}`}
				onClick={handleClick}
				role="status"
				aria-live="polite"
				aria-label={`Статус сети: ${config.label}. ${config.sublabel}`}
				data-testid="network-status-indicator"
				title="Нажмите для открытия панели синхронизации клиники"
			>
				{/* Status indicator pulse dot */}
				<span className="relative flex h-2 w-2">
					<span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
				</span>

				<IconComponent className={`w-3.5 h-3.5 ${config.spin ? "animate-spin" : ""}`} />

				{!compact && (
					<span className="font-semibold tracking-tight whitespace-nowrap">
						{config.label}
					</span>
				)}

				{pendingMutationCount > 0 && (
					<span
						className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-black/10 dark:bg-white/10"
						data-testid="pending-mutation-badge"
					>
						{pendingMutationCount}
					</span>
				)}

				{/* Quick Sync Button if mutations are pending and we are online */}
				{isOnline && pendingMutationCount > 0 && !isSyncing && (
					<button
						type="button"
						onClick={handleSyncClick}
						className="ml-1 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
						aria-label="Синхронизировать сейчас"
						data-testid="quick-sync-button"
						title="Синхронизировать очередь прямо сейчас"
					>
						<RefreshCw className="w-3 h-3 text-current" />
					</button>
				)}
			</div>

			{/* Guard modal instance if managed internally */}
			{!onOpenModal && (
				<OfflineSyncGuardModal
					isOpen={isModalOpen}
					onClose={() => setIsModalOpen(false)}
				/>
			)}
		</>
	);
};

export default NetworkStatusIndicator;
