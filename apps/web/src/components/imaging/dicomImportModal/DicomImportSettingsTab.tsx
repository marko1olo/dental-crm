/**
 * DicomImportSettingsTab.tsx — Вкладка статуса фонового демона и путей томографов (Мандат 8b <= 120 строк).
 */

import React from "react";
import { HardDrive } from "lucide-react";

interface DicomImportSettingsTabProps {
	daemonStatus: any;
}

export const DicomImportSettingsTab: React.FC<DicomImportSettingsTabProps> = ({ daemonStatus }) => {
	return (
		<div className="space-y-6">
			<div
				className="p-4 rounded-xl border space-y-3"
				style={{ background: "var(--paper, #ffffff)", borderColor: "var(--line, #e2e8f0)" }}
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<HardDrive className="w-4 h-4 text-teal-600" />
						<span className="font-bold text-sm">Статус фонового демона</span>
					</div>
					<span
						className={`px-2 py-0.5 rounded-full text-xs font-bold ${
							daemonStatus?.isRunning
								? "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
								: "bg-gray-100 text-gray-700"
						}`}
					>
						{daemonStatus?.isRunning ? "Запущен и сканирует" : "Остановлен"}
					</span>
				</div>

				<div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2">
					<div className="p-2.5 rounded-lg border bg-black/[0.02] dark:bg-white/[0.02]">
						<span className="opacity-60 block">Отслеживаемых папок:</span>
						<strong className="text-sm">{daemonStatus?.activeRoots?.length ?? 0}</strong>
					</div>
					<div className="p-2.5 rounded-lg border bg-black/[0.02] dark:bg-white/[0.02]">
						<span className="opacity-60 block">Автопривязано (&gt;85%):</span>
						<strong className="text-sm text-teal-600">{daemonStatus?.autoBoundCount ?? 0}</strong>
					</div>
					<div className="p-2.5 rounded-lg border bg-black/[0.02] dark:bg-white/[0.02]">
						<span className="opacity-60 block">Ожидают решения:</span>
						<strong className="text-sm text-amber-600">{daemonStatus?.pendingReviewCount ?? 0}</strong>
					</div>
					<div className="p-2.5 rounded-lg border bg-black/[0.02] dark:bg-white/[0.02]">
						<span className="opacity-60 block">Нераспознано (&lt;60%):</span>
						<strong className="text-sm opacity-80">{daemonStatus?.unassignedCount ?? 0}</strong>
					</div>
				</div>
			</div>

			<div
				className="p-4 rounded-xl border space-y-3"
				style={{ background: "var(--paper, #ffffff)", borderColor: "var(--line, #e2e8f0)" }}
			>
				<span className="font-bold text-sm block">Активные пути экспорта аппаратов:</span>
				<div className="space-y-1.5 text-xs font-mono">
					{daemonStatus?.activeRoots && daemonStatus.activeRoots.length > 0 ? (
						daemonStatus.activeRoots.map((p: string, idx: number) => (
							<div
								key={idx}
								className="p-2 rounded border bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between"
							>
								<span className="truncate">{p}</span>
								<span className="text-xs opacity-60">доступна</span>
							</div>
						))
					) : (
						<p className="opacity-60 italic">Стандартные пути: D:\CT_Export, C:\Ez3D-i, Romexis, Sidexis</p>
					)}
				</div>
			</div>
		</div>
	);
};
