import { useState } from "react";
import { AlertCircle, ChevronRight, HeartPulse, ShieldCheck, X } from "lucide-react";
import { useUiSurfaceStore } from "../store/uiSurfaceStore";
import type { WorkspaceEmergencyBarProps } from "./types";

export function WorkspaceEmergencyBar({
	activeAlertsCount = 0,
	onDismiss,
	onOpenEmergencyModal,
	className = "",
}: WorkspaceEmergencyBarProps) {
	const [isDismissed, setIsDismissed] = useState(false);
	const openPrimaryModal = useUiSurfaceStore((s) => s.openPrimaryModal);

	if (isDismissed) return null;

	const handleOpenRescue = () => {
		if (onOpenEmergencyModal) {
			onOpenEmergencyModal();
		} else {
			openPrimaryModal("emergency_rescue");
		}
	};

	const handleDismiss = () => {
		setIsDismissed(true);
		onDismiss?.();
	};

	return (
		<aside
			role="status"
			aria-label="Экстренные оповещения и статус СанПиН"
			className={`workspace-emergency-bar flex items-center justify-between px-3 py-1 text-xs border-b border-[var(--line)] bg-[var(--paper-soft,var(--paper))] text-[var(--ink)] transition-all duration-200 ${className}`}
		>
			<div className="flex items-center gap-2 min-w-0 flex-1">
				{activeAlertsCount > 0 ? (
					<span className="inline-flex items-center gap-1 font-semibold text-[var(--bad-fg,#ef4444)] shrink-0">
						<AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
						<span>CITO ({activeAlertsCount})</span>
					</span>
				) : (
					<span className="inline-flex items-center gap-1 text-[var(--teal,#0d9488)] shrink-0 font-medium">
						<ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
						<span>СанПиН норма</span>
					</span>
				)}
				<span className="text-[var(--ink-secondary,var(--muted))] truncate">
					{activeAlertsCount > 0
						? "Пациент с острой болью ожидает допуска к приёму"
						: "Контроль стерилизации и дезинфекции кабинета активен"}
				</span>
			</div>

			<div className="flex items-center gap-2 shrink-0 ml-2">
				<button
					type="button"
					onClick={handleOpenRescue}
					className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--paper)] text-[var(--teal,#0d9488)] border border-[var(--line)] hover:bg-[var(--teal-soft)] transition-colors"
					title="Открыть протокол экстренной помощи и аптечки Антишок"
				>
					<HeartPulse className="w-3 h-3 text-[var(--teal,#0d9488)]" aria-hidden="true" />
					<span>Антишок / СМП</span>
					<ChevronRight className="w-2.5 h-2.5 opacity-60" aria-hidden="true" />
				</button>

				<button
					type="button"
					onClick={handleDismiss}
					className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors"
					aria-label="Скрыть оповещение"
					title="Скрыть"
				>
					<X className="w-3 h-3" aria-hidden="true" />
				</button>
			</div>
		</aside>
	);
}
