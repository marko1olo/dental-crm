import React from "react";
import { Check } from "lucide-react";
import type { OrthodonticAngleDefinition, OrthodonticAngleId, OrthodonticPhotoSession } from "@dental/shared";

interface OrthoCompareAnglePillsProps {
	comparisonAngles: readonly OrthodonticAngleDefinition[];
	selectedAngleId: OrthodonticAngleId;
	session: OrthodonticPhotoSession;
	onSelectAngle: (angleId: OrthodonticAngleId) => void;
}

export const OrthoCompareAnglePills: React.FC<OrthoCompareAnglePillsProps> = ({
	comparisonAngles,
	selectedAngleId,
	session,
	onSelectAngle,
}) => {
	return (
		<div className="flex items-center gap-1.5 overflow-x-auto pb-1">
			<span className="text-xs font-bold text-[var(--muted)] shrink-0">Ракурс:</span>
			{comparisonAngles.map((angle) => {
				const isSelected = selectedAngleId === angle.id;
				const hasPhoto = Boolean(session.slots[angle.id]?.imageUrl);
				return (
					<button
						key={angle.id}
						type="button"
						onClick={() => onSelectAngle(angle.id)}
						data-testid={`compare-angle-${angle.id}-btn`}
						className={`min-h-[36px] sm:min-h-[28px] sm:h-7 px-3 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-all cursor-pointer border ${
							isSelected
								? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--primary)]"
						}`}
					>
						{hasPhoto && <Check size={12} className={isSelected ? "text-white" : "text-emerald-500"} />}
						<span>{angle.shortLabelRu}</span>
					</button>
				);
			})}
		</div>
	);
};
