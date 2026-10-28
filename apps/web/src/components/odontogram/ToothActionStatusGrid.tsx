import type React from "react";
import { TOOTH_STATE_ACTIONS } from "./odontogramModuleConstants";
import type { ToothState } from "./ToothChart";

export interface ToothActionStatusGridProps {
	readonly onApplyToothState: (state: ToothState) => void;
}

export const ToothActionStatusGrid: React.FC<ToothActionStatusGridProps> = ({
	onApplyToothState,
}) => {
	return (
		<>
			{TOOTH_STATE_ACTIONS.map((action) => (
				<button
					key={action.state}
					type="button"
					onClick={() => onApplyToothState(action.state)}
					className={`flex items-center justify-center min-h-[44px] sm:min-h-[36px] p-2.5 sm:p-2 rounded-xl border transition-all duration-150 font-black text-xs sm:text-sm cursor-pointer select-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 text-center leading-tight break-words min-w-0 shadow-2xs ${action.className}`}
				>
					<span className="min-w-0 break-words text-center leading-tight">
						{action.label}
					</span>
				</button>
			))}
		</>
	);
};
