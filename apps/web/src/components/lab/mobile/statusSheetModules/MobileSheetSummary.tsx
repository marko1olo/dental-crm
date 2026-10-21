import React from "react";
import { Phone } from "lucide-react";
import type { DentalLabOrderData } from "../../labMath";
import { formatLabConstructionTitle } from "../../../../pages/LabOrdersPage";
import { SHADE_SWATCH_MAP } from "../../labMath";

export interface MobileSheetSummaryProps {
	order: DentalLabOrderData;
}

export function MobileSheetSummary({ order }: MobileSheetSummaryProps): React.JSX.Element {
	const constructionDisplay = formatLabConstructionTitle(order.constructionType, order.material ?? undefined);
	const swatchBg = SHADE_SWATCH_MAP[order.colorVita?.toUpperCase() ?? ""]?.bg || "#f4eedb";
	const labNameDisplay = (order as any).labName || "Центральная CAD/CAM ЗТЛ";
	const techNameDisplay = (order as any).technicianName || "Дежурный зубной техник";
	const labPhoneDisplay = (order as any).labPhone || (order as any).patientPhone || "+7 (999) 450-23-11";

	return (
		<div className="p-3 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs font-bold text-[var(--ink)]">
					{constructionDisplay}
				</span>
				<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--paper)] border border-[var(--line)] text-xs font-bold">
					<span className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: swatchBg }} />
					<span>VITA {order.colorVita || "A2"}</span>
				</span>
			</div>

			<div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--line-subtle)]">
				<div className="min-w-0 flex-1">
					<div className="text-xs font-bold text-[var(--ink)] truncate">{labNameDisplay}</div>
					<div className="text-[11px] text-[var(--muted)] truncate">{techNameDisplay}</div>
				</div>
				<a
					href={`tel:${labPhoneDisplay.replace(/[^\d+]/g, "")}`}
					className="mobile-lab-call-btn"
					title="Позвонить технику"
					data-testid="mobile-sheet-call-technician-btn"
				>
					<Phone size={18} />
				</a>
			</div>
		</div>
	);
}
