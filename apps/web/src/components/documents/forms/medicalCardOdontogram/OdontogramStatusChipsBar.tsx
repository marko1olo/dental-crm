import React from "react";
import {
	type ToothClinicalStatusCode,
	toothStatusCodeShortMap,
	toothStatusCodeLabels,
} from "@dental/shared";
import { SELECTABLE_STATUSES } from "./types";

export interface OdontogramStatusChipsBarProps {
	readonly activeStatus: ToothClinicalStatusCode;
	readonly setActiveStatus: (s: ToothClinicalStatusCode) => void;
	readonly disabled?: boolean;
}

export const OdontogramStatusChipsBar: React.FC<OdontogramStatusChipsBarProps> = ({
	activeStatus,
	setActiveStatus,
	disabled = false,
}) => {
	return (
		<div className="condition-selector-bar flex items-center gap-1.5 flex-wrap mb-3 p-2 rounded-lg bg-[var(--paper-soft,rgba(0,0,0,0.02))] border border-[var(--line,#e2e8f0)]">
			<span className="text-xs font-semibold mr-1 text-[var(--ink-secondary,#64748b)]">
				Быстрый статус:
			</span>
			{SELECTABLE_STATUSES.map((code) => {
				const isSelected = activeStatus === code;
				return (
					<button
						key={code}
						type="button"
						className={`btn btn-sm text-xs py-1 px-2 rounded-md transition-all ${
							isSelected
								? "btn-primary font-bold shadow-xs scale-105"
								: "btn-outline-secondary opacity-90 hover:opacity-100"
						}`}
						onClick={() => setActiveStatus(code)}
						disabled={disabled}
						title={toothStatusCodeLabels[code]}
					>
						<span className="font-mono font-bold mr-1">
							{toothStatusCodeShortMap[code]}
						</span>
						<span>{toothStatusCodeLabels[code]}</span>
					</button>
				);
			})}
		</div>
	);
};
