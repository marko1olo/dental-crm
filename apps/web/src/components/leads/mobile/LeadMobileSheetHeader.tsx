/**
 * DENTE Dental CRM — Leads Mobile Bottom Sheet Header
 * Tactile Drag Handle, Stage Color Dot, Lead Name & Close Button
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import { X } from "lucide-react";

interface LeadMobileSheetHeaderProps {
	name: string;
	stageColor?: string;
	onClose: () => void;
}

export const LeadMobileSheetHeader: React.FC<LeadMobileSheetHeaderProps> = ({
	name, stageColor = "var(--teal)", onClose,
}) => {
	return (
		<>
			<div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
				<div className="w-9 h-1.5 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))]" />
			</div>

			<div className="flex items-center justify-between px-4 py-2 border-b border-[var(--line-subtle)] shrink-0">
				<div className="flex items-center gap-2 min-w-0 pr-2">
					<span className="w-3 h-3 rounded-full shrink-0" style={{ background: stageColor }} />
					<h3 id="lead-bottom-sheet-title" className="text-[17px] font-semibold text-[var(--ink)] truncate" title={name}>
						{name}
					</h3>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] active:scale-95 transition-transform"
					aria-label="Закрыть детали обращения"
					data-testid="btn-close-lead-bottom-sheet"
				>
					<X size={20} />
				</button>
			</div>
		</>
	);
};
