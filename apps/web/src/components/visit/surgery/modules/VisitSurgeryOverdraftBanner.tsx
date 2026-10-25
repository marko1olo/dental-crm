import type React from "react";
import { AlertTriangle } from "lucide-react";
import type { WarehouseOverdraftStatus } from "../../../surgery/surgeryProtocols";

interface VisitSurgeryOverdraftBannerProps {
	overdraftStatus: WarehouseOverdraftStatus;
	onDismiss: () => void;
}

export const VisitSurgeryOverdraftBanner: React.FC<VisitSurgeryOverdraftBannerProps> = ({
	overdraftStatus,
	onDismiss,
}) => {
	if (!overdraftStatus.hasOverdraft) return null;

	return (
		<div
			className="p-3 rounded-xl bg-[var(--amber-surface,rgba(245,158,11,0.1))] border border-[var(--amber-soft,rgba(245,158,11,0.3))] text-xs text-[var(--ink)] flex items-center justify-between gap-3 flex-wrap"
			data-testid="visit-surgery-overdraft-banner"
		>
			<div className="flex items-center gap-2.5">
				<AlertTriangle size={20} className="text-[var(--amber,#f59e0b)] shrink-0" />
				<div>
					<strong className="text-[var(--amber-dark,#b45309)]">
						{overdraftStatus.warningRu}:{" "}
					</strong>
					<span>{overdraftStatus.detailsRu}</span>
				</div>
			</div>
			<button
				type="button"
				onClick={onDismiss}
				className="px-3 py-1 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
			>
				Ознакомлен
			</button>
		</div>
	);
};
