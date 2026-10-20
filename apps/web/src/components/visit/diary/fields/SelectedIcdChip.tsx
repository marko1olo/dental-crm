import React from "react";
import { X } from "lucide-react";
import { getIcdColor, ICD10_DICTIONARY as ICD_LIST } from "../../../../lib/icd10";

export interface SelectedIcdChipProps {
	readonly code: string;
	readonly fieldsDisabled: boolean;
	readonly onReset: () => void;
}

export const SelectedIcdChip: React.FC<SelectedIcdChipProps> = ({
	code,
	fieldsDisabled,
	onReset,
}) => {
	const label = ICD_LIST.find((i) => i.code === code)?.label ?? "Диагноз выбран";

	return (
		<div className={`vde-043__icd-chip min-h-[44px] min-w-0 break-words ${getIcdColor(code)}`}>
			<span className="vde-043__icd-code shrink-0">{code}</span>
			<span className="flex-1 min-w-0 break-words">{label}</span>
			{!fieldsDisabled && (
				<button
					type="button"
					onClick={onReset}
					className="vde-043__btn vde-043__btn--ghost vde-043__btn--icon shrink-0"
					title="Сбросить диагноз"
					aria-label="Сбросить диагноз"
				>
					<X className="w-3.5 h-3.5" />
				</button>
			)}
		</div>
	);
};
