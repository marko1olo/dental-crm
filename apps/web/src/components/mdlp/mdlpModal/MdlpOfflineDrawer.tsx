import type React from "react";
import { CheckCheck, Clock, X } from "lucide-react";
import type { MdlpOfflinePackage } from "../mdlpOfflineQueue.js";

export interface MdlpOfflineDrawerProps {
	readonly show: boolean;
	readonly offlineQueue: readonly MdlpOfflinePackage[];
	readonly onToggle: () => void;
	readonly onSyncOfflineQueue: () => void;
}

export const MdlpOfflineDrawer: React.FC<MdlpOfflineDrawerProps> = ({
	show,
	offlineQueue,
	onToggle,
	onSyncOfflineQueue,
}) => {
	if (!show) return null;

	return (
		<div className="mdlp-offline-drawer" data-testid="mdlp-offline-drawer">
			<div className="mdlp-offline-drawer-header">
				<span className="mdlp-offline-drawer-title">
					<Clock className="w-4 h-4 text-cyan-400" />
					<span>Пакеты в фоновом офлайн-буфере ({offlineQueue.length})</span>
				</span>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onSyncOfflineQueue}
						className="mdlp-action-btn secondary text-xs"
						style={{ height: 30, padding: "0 10px" }}
						data-testid="sync-offline-queue-btn"
					>
						<CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
						<span>Отправить в систему маркировки</span>
					</button>
					<button
						type="button"
						onClick={onToggle}
						className="text-xs text-[var(--muted)] hover:text-[var(--ink)] p-1 cursor-pointer"
						aria-label="Закрыть список офлайн-буфера"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			</div>
			<div className="mdlp-offline-list">
				{offlineQueue.map((pkg) => (
					<div key={pkg.id} className="mdlp-offline-pkg-row">
						<div>
							<div className="font-mono font-bold text-xs text-[var(--ink)]">{pkg.id}</div>
							<div className="text-[10px] text-[var(--muted)]">
								{pkg.createdAt} · {pkg.docNum} · {pkg.reason}
							</div>
						</div>
						<div className="text-right">
							<div className="text-xs font-bold text-teal-400">{pkg.itemsCount} поз.</div>
							<div className="text-[10px] text-[var(--muted)]">
								{pkg.totalCostRub} ₽ · {pkg.status === "synced" ? "Отправлен" : "В очереди"}
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
