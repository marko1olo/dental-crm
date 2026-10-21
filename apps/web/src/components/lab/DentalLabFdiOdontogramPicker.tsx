import React from "react";
import type { JawScope } from "./labMath";
import { getBridgeSpanTeeth } from "./fdiPickerModules/fdiBridgeSpanHelper";
import { FdiPickerHeader } from "./fdiPickerModules/FdiPickerHeader";
import { FdiPickerDesktopGrid } from "./fdiPickerModules/FdiPickerDesktopGrid";
import { FdiPickerMobileView } from "./fdiPickerModules/FdiPickerMobileView";

export { getBridgeSpanTeeth };

export interface DentalLabFdiOdontogramPickerProps {
	selectedTeeth: number[];
	setSelectedTeeth: (teeth: number[]) => void;
	toggleTooth: (tooth: number) => void;
	selectQuadrant: (teeth: number[]) => void;
	jawScope?: JawScope | null | undefined;
	constructionType?: string | undefined;
}

/**
 * Интерактивный селектор зубной формулы FDI (ISO 3950) с поддержкой мостовидных пролетов (Мандат 8b: <= 120 строк).
 */
export function DentalLabFdiOdontogramPicker({
	selectedTeeth,
	setSelectedTeeth,
	toggleTooth,
	selectQuadrant,
	jawScope = null,
	constructionType,
}: DentalLabFdiOdontogramPickerProps): React.JSX.Element {
	const handleConnectBridgeSpan = () => {
		const expanded = getBridgeSpanTeeth(selectedTeeth);
		setSelectedTeeth(expanded);
	};

	return (
		<div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5 space-y-4">
			<FdiPickerHeader
				selectedTeeth={selectedTeeth}
				setSelectedTeeth={setSelectedTeeth}
				selectQuadrant={selectQuadrant}
				handleConnectBridgeSpan={handleConnectBridgeSpan}
				jawScope={jawScope}
				constructionType={constructionType}
			/>

			<div className="space-y-4 select-none pt-1">
				<FdiPickerDesktopGrid selectedTeeth={selectedTeeth} toggleTooth={toggleTooth} />
				<FdiPickerMobileView selectedTeeth={selectedTeeth} toggleTooth={toggleTooth} />
			</div>
		</div>
	);
}
