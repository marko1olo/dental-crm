import React from "react";
import { Building2, ChevronRight } from "lucide-react";

interface MobileClinicIdentityCardProps {
	clinicName: string;
	presetLabel: string;
	onSelectClinic: () => void;
}

export const MobileClinicIdentityCard: React.FC<MobileClinicIdentityCardProps> = ({
	clinicName,
	presetLabel,
	onSelectClinic,
}) => {
	return (
		<div className="px-4 py-1">
			<div
				onClick={onSelectClinic}
				className="p-3.5 rounded-[16px] bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between gap-3 shadow-xs active:bg-[var(--paper-soft)] cursor-pointer transition-colors"
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onSelectClinic();
					}
				}}
				data-testid="mobile-clinic-profile-card"
			>
				<div className="flex items-center gap-3 min-w-0 flex-1">
					<div
						className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
						style={{ backgroundColor: "var(--teal)", color: "#ffffff" }}
					>
						<Building2 size={22} />
					</div>
					<div className="min-w-0 flex-1">
						<h3 className="text-[15px] font-bold text-[var(--ink)] leading-snug break-words">
							{clinicName}
						</h3>
						<div className="flex items-center flex-wrap gap-1.5 mt-0.5">
							<span className="text-[12px] text-[var(--muted)]">{presetLabel}</span>
						</div>
					</div>
				</div>
				<ChevronRight size={18} className="text-[var(--muted)] shrink-0" />
			</div>
		</div>
	);
};
