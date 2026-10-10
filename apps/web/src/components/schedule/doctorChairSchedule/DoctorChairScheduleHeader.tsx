/**
 * DENTE Dental CRM — Doctor Chair Schedule Header (Layer 4)
 *
 * Header strip with chair identity, date indicator, close button,
 * and 1-Click Fast Solo Doctor Anchor Card (Mandate 8n).
 */

import React from "react";
import { Check, X, Zap } from "lucide-react";
import { DentalChairUnit } from "../../icons/DentalIcons";
import { formatDoctorShortName } from "../chairRosterMath";
import type { ChairModalChairItem, ChairModalDoctorItem } from "./types";

export interface DoctorChairScheduleHeaderProps {
	activeChair: ChairModalChairItem;
	dateKey: string;
	onClose: () => void;
	isSoloDoctor?: boolean | undefined;
	doctors: readonly ChairModalDoctorItem[];
	onSoloDoctorQuickAnchor: () => void;
}

export const DoctorChairScheduleHeader: React.FC<DoctorChairScheduleHeaderProps> = ({
	activeChair,
	dateKey,
	onClose,
	isSoloDoctor = false,
	doctors,
	onSoloDoctorQuickAnchor,
}) => {
	const soloDoctor = doctors[0];

	return (
		<div className="space-y-3">
			{/* Modal Header Strip */}
			<div className="flex items-center justify-between gap-3 border-b border-[var(--line,#e2e8f0)] pb-3">
				<div className="flex items-center gap-2.5">
					<div className="w-10 h-10 rounded-2xl bg-[var(--teal-soft,#ccfbf1)] border border-[var(--teal,#0d9488)]/30 flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
						<DentalChairUnit size={20} />
					</div>
					<div className="min-w-0">
						<h3
							id="chair-doctor-modal-title"
							className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] truncate leading-tight"
						>
							Закрепление врача за установкой
						</h3>
						<p className="text-xs text-[var(--muted,#64748b)] truncate mt-0.5">
							{activeChair.name} · {dateKey}
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
					aria-label="Закрыть окно назначения"
					data-testid="btn-close-chair-doctor-modal"
					style={{ minHeight: "44px", minWidth: "44px" }}
				>
					<X size={18} />
				</button>
			</div>

			{/* Solo Doctor Fast Anchor Card (Mandate 8n) */}
			{isSoloDoctor && soloDoctor && (
				<div
					className="p-3 rounded-2xl bg-[var(--teal-soft,#f0fdfa)] border border-[var(--teal,#0d9488)]/40 flex items-center justify-between gap-3"
					data-testid="solo-doctor-quick-anchor-card"
				>
					<div className="flex items-center gap-2">
						<Zap className="w-5 h-5 text-[var(--teal,#0d9488)] shrink-0" />
						<div>
							<span className="text-xs font-bold text-[var(--ink,#0f172a)] block">
								Соло-врач:
							</span>
							<span className="text-[11px] text-[var(--muted,#64748b)]">
								Закрепить {formatDoctorShortName(soloDoctor.fullName || soloDoctor.name || "Врача")} на весь день
							</span>
						</div>
					</div>
					<button
						type="button"
						onClick={onSoloDoctorQuickAnchor}
						className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
						data-testid="btn-solo-doctor-quick-anchor"
						style={{ minHeight: "44px" }}
					>
						<Check size={15} />
						<span>Закрепить меня</span>
					</button>
				</div>
			)}
		</div>
	);
};
