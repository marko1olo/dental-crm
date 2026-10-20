import React from "react";
import { ICD_GROUP_COLORS, type ICD10_DICTIONARY } from "../../../../lib/icd10";

export interface IcdSearchDropdownProps {
	readonly filteredIcd: readonly (typeof ICD10_DICTIONARY)[number][];
	readonly onSelectIcd: (code: string) => void;
}

export const IcdSearchDropdown: React.FC<IcdSearchDropdownProps> = ({
	filteredIcd,
	onSelectIcd,
}) => {
	if (!filteredIcd || filteredIcd.length === 0) return null;

	return (
		<div className="vde-043__icd-drop">
			{filteredIcd.map((icd) => (
				<div
					key={icd.code}
					className="vde-043__icd-opt min-h-[44px] min-w-0"
					role="option"
					aria-selected={false}
					tabIndex={0}
					onMouseDown={(e) => {
						e.preventDefault();
						onSelectIcd(icd.code);
					}}
				>
					<span className={`vde-043__icd-opt-code shrink-0 ${ICD_GROUP_COLORS[icd.group] ?? ""}`}>
						{icd.code}
					</span>
					<div className="flex-1 min-w-0 break-words">
						<div className="vde-043__icd-opt-label break-words whitespace-normal">{icd.label}</div>
						<div className="vde-043__icd-opt-group break-words">{icd.group}</div>
					</div>
				</div>
			))}
		</div>
	);
};
