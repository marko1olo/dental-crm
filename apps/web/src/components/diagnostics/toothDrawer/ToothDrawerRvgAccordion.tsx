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
				<div className="trigger-left">
					<Scan size={16} color="var(--brand-primary, var(--teal))" />
					<span className="trigger-title">3. Прицельный снимок визиографа (200×200 RVG)</span>
				</div>
				<div className="trigger-right">
					<span className="trigger-summary">Периапикальный контроль</span>
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
