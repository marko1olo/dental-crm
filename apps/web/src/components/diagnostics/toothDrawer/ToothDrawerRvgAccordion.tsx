import React from "react";
import { ChevronDown, ChevronUp, Scan } from "lucide-react";
import { ToothRvgThumbnail } from "../ToothRvgThumbnail";
import type { ToothData } from "../../odontogram/ToothChart";
import type { WarmAccordionSection } from "./toothDrawerTypes";

interface ToothDrawerRvgAccordionProps {
	toothNumber: number;
	patientId?: string | undefined;
	toothData?: ToothData | undefined;
	activeSection: WarmAccordionSection;
	toggleSection: (section: WarmAccordionSection) => void;
	onOpenFullRadiology?: ((toothNumber: number) => void) | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
	onUpdateTooth?: ((num: number, updates: Partial<ToothData>) => void) | undefined;
}

export const ToothDrawerRvgAccordion: React.FC<ToothDrawerRvgAccordionProps> = ({
	toothNumber,
	patientId,
	toothData,
	activeSection,
	toggleSection,
	onOpenFullRadiology,
	onInsertToProtocol,
	onUpdateTooth,
}) => {
	const isExpanded = activeSection === "rvg_xray";

	return (
		<section className="dente-accordion-item">
			<button
				type="button"
				onClick={() => toggleSection("rvg_xray")}
				className={`dente-accordion-trigger ${isExpanded ? "expanded" : ""}`}
			>
				<div className="trigger-left min-w-0 flex-1">
					<div className="flex items-center gap-2 min-w-0">
						<Scan size={16} className="shrink-0" color="var(--brand-primary, var(--teal))" />
						<span className="trigger-title truncate">3. Снимок RVG (2D / 3D)</span>
					</div>
					<span className="trigger-summary text-[11px] text-[var(--muted)] font-medium pl-6 block sm:inline sm:pl-2">
						Периапикальный контроль
					</span>
				</div>
				<div className="trigger-right shrink-0">
					{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
				</div>
			</button>

			{isExpanded && (
				<div className="dente-accordion-content animate-in">
					<ToothRvgThumbnail
						toothNumber={toothNumber}
						patientId={patientId}
						scanImageUrl={(toothData?.clinicalData as { rvgScanUrl?: string } | undefined)?.rvgScanUrl}
						onOpenFullRadiology={onOpenFullRadiology}
						onInsertToProtocol={onInsertToProtocol}
						onAttachScan={(file) => {
							const objectUrl = URL.createObjectURL(file);
							onUpdateTooth?.(toothNumber, {
								clinicalData: {
									...(toothData?.clinicalData as Record<string, unknown> | undefined),
									rvgScanUrl: objectUrl,
									updatedAt: new Date().toISOString(),
								},
							});
						}}
					/>
				</div>
			)}
		</section>
	);
};
