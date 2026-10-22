import React from "react";
import { Sliders, ChevronDown, ChevronUp } from "lucide-react";
import type { OrthodonticPhotoSession } from "@dental/shared";
import { OrthoOcclusionInputs } from "./orthoModal/OrthoOcclusionInputs";
import { OrthoEstheticInputs } from "./orthoModal/OrthoEstheticInputs";

export interface OrthoFindingsAccordionProps {
	session: OrthodonticPhotoSession;
	showFindingsAccordion: boolean;
	onToggleAccordion: () => void;
	onFindingsChange: (field: keyof OrthodonticPhotoSession["findings"], value: unknown) => void;
}

export const OrthoFindingsAccordion: React.FC<OrthoFindingsAccordionProps> = ({
	session,
	showFindingsAccordion,
	onToggleAccordion,
	onFindingsChange,
}) => {
	return (
		<div className="ortho-findings-section">
			<div className="ortho-findings-header" onClick={onToggleAccordion}>
				<div className="ortho-findings-title">
					<Sliders size={16} className="text-[var(--teal)]" />
					<span>Клиническая диагностика и окклюзионные параметры</span>
				</div>
				{showFindingsAccordion ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
			</div>

			{showFindingsAccordion && (
				<div className="ortho-findings-body">
					<OrthoOcclusionInputs session={session} onFindingsChange={onFindingsChange} />
					<OrthoEstheticInputs session={session} onFindingsChange={onFindingsChange} />
				</div>
			)}
		</div>
	);
};

export default OrthoFindingsAccordion;
