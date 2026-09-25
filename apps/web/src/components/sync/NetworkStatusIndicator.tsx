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

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
	const [syncError, setSyncError] = useState<string | null>(null);

	const {
		isOnline,
		isLan,
		isSyncing,
		pendingMutationCount,
		syncNow,
		lastSyncError,
	} = useOfflineSync({
		autoSyncOnReconnect: true,
	});

	// Защита от потери клинических данных врача при закрытии вкладки с неопорожненной очередью
	useEffect(() => {
		if (typeof window === "undefined" || pendingMutationCount <= 0) return;
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			e.returnValue = "В очереди синхронизации клиники есть неотправленные данные приёма!";
			return e.returnValue;
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [pendingMutationCount]);

	const handleClick = useCallback(() => {
		if (onOpenModal) {
			onOpenModal();
		} else {
			setIsModalOpen(true);
		}
	}, [onOpenModal]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				handleClick();
			}
		},
		[handleClick],
	);

	const handleSyncClick = useCallback(
		async (e: React.MouseEvent) => {
			e.stopPropagation();
			if (!isSyncing && isOnline) {
				setSyncError(null);
				try {
					await syncNow();
				} catch (err) {
					const msg = err instanceof Error ? err.message : "Сбой синхронизации очереди";
					setSyncError(msg);
				}
			}
		},
		[isSyncing, isOnline, syncNow],
	);

	// Determine status visual theme and labels with proper memoization
	const effectiveError = syncError || lastSyncError;

	const config = useMemo(() => {
		if (isSyncing) {
			return {
				label: "Синхронизация",
				sublabel: `${pendingMutationCount} в очереди`,
				bgStyle: {
					background: "var(--teal-soft, rgba(14, 165, 233, 0.1))",
					color: "var(--teal-dark, #0284c7)",
					borderColor: "var(--teal, rgba(14, 165, 233, 0.3))",
				},
				icon: RefreshCw,
				spin: true,
				dotStyle: { background: "var(--teal, #0284c7)" },
			};
		}

		if (!isOnline) {
			return {
				label: "Офлайн-режим",
				sublabel:
					pendingMutationCount > 0
						? `${pendingMutationCount} сохранено локально`
						: "Буферизация активна",
				bgStyle: {
					background: "rgba(239, 68, 68, 0.1)",
					color: "var(--critical, #dc2626)",
					borderColor: "rgba(239, 68, 68, 0.3)",
				},
				icon: WifiOff,
				spin: false,
				dotStyle: { background: "var(--critical, #dc2626)" },
			};
		}

		if (effectiveError) {
			return {
				label: "Ошибка синхронизации",
				sublabel: effectiveError,
				bgStyle: {
					background: "rgba(245, 158, 11, 0.12)",
					color: "var(--warn, #d97706)",
					borderColor: "rgba(245, 158, 11, 0.35)",
				},
				icon: AlertTriangle,
				spin: false,
				dotStyle: { background: "var(--warn, #d97706)" },
			};
		}

		if (isLan) {
			return {
				label: "Локальная сеть (LAN)",
				sublabel: "Сервер клиники доступен",
				bgStyle: {
					background: "rgba(245, 158, 11, 0.1)",
					color: "var(--warn, #d97706)",
					borderColor: "rgba(245, 158, 11, 0.3)",
				},
				icon: Activity,
				spin: false,
				dotStyle: { background: "var(--warn, #d97706)" },
			};
		}

		return {
			label: "Онлайн",
			sublabel:
				pendingMutationCount > 0
					? `${pendingMutationCount} на отправку`
					: "Связь стабильна",
			bgStyle: {
				background: "rgba(16, 185, 129, 0.1)",
				color: "var(--success, #059669)",
				borderColor: "rgba(16, 185, 129, 0.3)",
			},
			icon: Wifi,
			spin: false,
			dotStyle: { background: "var(--success, #059669)" },
		};
	}, [isSyncing, isOnline, effectiveError, isLan, pendingMutationCount]);

	const IconComponent = config.icon;

	return (
		<>
			<div
				className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border transition-all cursor-pointer select-none text-xs h-[32px] shrink-0 flex-shrink-0 whitespace-nowrap ${className}`}
				style={config.bgStyle}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				tabIndex={0}
				role="button"
				aria-label={`Статус сети: ${config.label}. ${config.sublabel}`}
				data-testid="network-status-indicator"
				title="Нажмите для открытия панели синхронизации клиники"
			>
				{/* Status indicator pulse dot */}
				<span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
					<span
						className="relative inline-flex rounded-full h-2 w-2"
						style={config.dotStyle}
					/>
				</span>

				<IconComponent
					className={`w-3.5 h-3.5 shrink-0 ${config.spin ? "animate-spin" : ""}`}
					aria-hidden="true"
				/>

				{!compact && (
					<span className="font-semibold tracking-tight whitespace-nowrap shrink-0">
						{config.label}
					</span>
				)}

				{pendingMutationCount > 0 && (
					<span
						className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold"
						style={{
							background: "var(--paper-soft, rgba(0, 0, 0, 0.08))",
							color: "inherit",
						}}
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
						className="ml-1 p-1 rounded-full hover:opacity-80 transition-opacity cursor-pointer border-0 bg-transparent"
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

