import React, { useState, useEffect, useCallback } from "react";
import { Activity, FolderSearch, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { DicomImportManagerModal } from "./DicomImportManagerModal.js";

export interface DicomDaemonStatusPayload {
	isRunning: boolean;
	enabled: boolean;
	watchPaths: string[];
	activeRoots: string[];
	lastScanAt: string | null;
	lastScanDurationMs: number;
	totalDiscoveredFolders: number;
	autoBoundCount: number;
	pendingReviewCount: number;
	unassignedCount: number;
}

export interface DicomAutoDetectStatusBadgeProps {
	className?: string;
	onStudyBound?: () => void;
}

export const DicomAutoDetectStatusBadge: React.FC<DicomAutoDetectStatusBadgeProps> = ({
	className = "",
	onStudyBound,
}) => {
	const [status, setStatus] = useState<DicomDaemonStatusPayload | null>(null);
	const [pendingCount, setPendingCount] = useState<number>(0);
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const fetchStatus = useCallback(async () => {
		try {
			setIsLoading(true);
			const [statusRes, pendingRes] = await Promise.all([
				fetch("/api/imaging/daemon/status"),
				fetch("/api/imaging/daemon/pending"),
			]);

			if (statusRes.ok) {
				const statusData = await statusRes.json();
				if (statusData.success && statusData.status) {
					setStatus(statusData.status);
				}
			}

			if (pendingRes.ok) {
				const pendingData = await pendingRes.json();
				if (pendingData.success && typeof pendingData.count === "number") {
					setPendingCount(pendingData.count);
				}
			}
		} catch {
			// Silent fallback for offline / mock mode
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetchStatus();
		const interval = setInterval(() => {
			void fetchStatus();
		}, 30000); // 30 сек поллинг
		return () => clearInterval(interval);
	}, [fetchStatus]);

	const hasPending = pendingCount > 0;
	const isDaemonActive = status?.isRunning ?? false;

	return (
		<>
			<button
				type="button"
				onClick={() => setIsModalOpen(true)}
				className={`inline-flex items-center gap-2 px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200 border cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-offset-1 ${className}`}
				style={{
					background: hasPending
						? "var(--warn-soft, rgba(234, 179, 8, 0.12))"
						: "var(--paper, #ffffff)",
					borderColor: hasPending
						? "var(--warn, #eab308)"
						: "var(--line, #e2e8f0)",
					color: hasPending
						? "var(--warn-fg, #ca8a04)"
						: "var(--ink, #1e293b)",
				}}
				title={
					isDaemonActive
						? `Автодетект КТ активен (${status?.activeRoots.length ?? 0} папок). Нажмите для управления очередью.`
						: "Фоновый автодетект томографов. Нажмите для настройки."
				}
			>
				<span className="relative flex h-2 w-2">
					{isDaemonActive && (
						<span
							className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
							style={{ background: hasPending ? "var(--warn, #eab308)" : "var(--accent, #0d9488)" }}
						/>
					)}
					<span
						className="relative inline-flex rounded-full h-2 w-2"
						style={{ background: isDaemonActive ? (hasPending ? "var(--warn, #eab308)" : "var(--accent, #0d9488)") : "var(--muted, #94a3b8)" }}
					/>
				</span>

				<FolderSearch className="w-3.5 h-3.5 opacity-80" />

				<span className="font-semibold tracking-tight">
					КТ Томограф
				</span>

				{hasPending ? (
					<span
						className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-xs font-bold"
						style={{
							background: "var(--warn, #eab308)",
							color: "var(--paper, #ffffff)",
						}}
					>
						{pendingCount}
					</span>
				) : (
					<span className="text-xs opacity-75">
						{isDaemonActive ? "активен" : "остановлен"}
					</span>
				)}
			</button>

			{isModalOpen && (
				<DicomImportManagerModal
					isOpen={isModalOpen}
					onClose={() => {
						setIsModalOpen(false);
						void fetchStatus();
					}}
					onStudyBound={() => {
						void fetchStatus();
						onStudyBound?.();
					}}
				/>
			)}
		</>
	);
};
