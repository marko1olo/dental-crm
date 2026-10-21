import type { OdontogramViewMode } from "@dental/shared";
import type React from "react";
import { DisplayModesSelection } from "./DisplayModesSelection";
import { DisplayModesToggles } from "./DisplayModesToggles";

export interface MoreMenuDisplayModesProps {
	readonly showWisdomTeeth: boolean;
	readonly setShowWisdomTeeth: React.Dispatch<React.SetStateAction<boolean>>;
	readonly activeMode: OdontogramViewMode;
	readonly showPulpAndCanals: boolean;
	readonly setShowPulpAndCanals: React.Dispatch<React.SetStateAction<boolean>>;
	readonly isFastExtractMode: boolean;
	readonly setIsFastExtractMode: React.Dispatch<React.SetStateAction<boolean>>;
	readonly isMultiSelectMode: boolean;
	readonly onToggleMultiSelect?: ((checked: boolean) => void) | undefined;
}

export const MoreMenuDisplayModes: React.FC<MoreMenuDisplayModesProps> = (
	props,
) => {
	return (
		<div>
			<div className="text-[11px] font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)] px-2 py-1 select-none">
				Анатомия и отображение
			</div>
			<div className="flex flex-col gap-1">
				<DisplayModesToggles
					showWisdomTeeth={props.showWisdomTeeth}
					setShowWisdomTeeth={props.setShowWisdomTeeth}
					activeMode={props.activeMode}
					showPulpAndCanals={props.showPulpAndCanals}
					setShowPulpAndCanals={props.setShowPulpAndCanals}
				/>
				<DisplayModesSelection
					isFastExtractMode={props.isFastExtractMode}
					setIsFastExtractMode={props.setIsFastExtractMode}
					isMultiSelectMode={props.isMultiSelectMode}
					onToggleMultiSelect={props.onToggleMultiSelect}
				/>
			</div>
		</div>
	);
};
