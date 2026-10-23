import type React from "react";
import { PackageCheck, ShieldCheck, Syringe } from "lucide-react";
import {
	type MdlpScanMode,
	isAcceptanceMode,
	isCareDispenseMode,
	isSpoilageMode,
} from "./types.js";

export interface MdlpModeTabsProps {
	readonly mode: MdlpScanMode;
	readonly onModeSwitch: (mode: MdlpScanMode) => void;
}

export const MdlpModeTabs: React.FC<MdlpModeTabsProps> = ({
	mode,
	onModeSwitch,
}) => {
	const isAcceptance = isAcceptanceMode(mode);
	const isCareDispense = isCareDispenseMode(mode);
	const isSpoilage = isSpoilageMode(mode);

	return (
		<div className="mdlp-mode-tabs" role="tablist">
			<button
				type="button"
				role="tab"
				aria-selected={isAcceptance}
				onClick={() => onModeSwitch("warehouse_acceptance")}
				className={`mdlp-tab-btn ${isAcceptance ? "active" : ""}`}
				data-testid="mdlp-tab-acceptance"
			>
				<PackageCheck className="w-4 h-4 shrink-0" />
				<span className="hidden sm:inline">Приёмка на склад</span>
				<span className="sm:hidden">Приёмка</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={isCareDispense}
				onClick={() => onModeSwitch("care_dispense")}
				className={`mdlp-tab-btn ${isCareDispense ? "active" : ""}`}
				data-testid="mdlp-tab-disposal"
			>
				<ShieldCheck className="w-4 h-4 shrink-0" />
				<span className="hidden sm:inline">Списание при оказании медпомощи</span>
				<span className="sm:hidden">Лечение</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={isSpoilage}
				onClick={() => onModeSwitch("spoilage_disposal")}
				className={`mdlp-tab-btn ${isSpoilage ? "active" : ""}`}
				data-testid="mdlp-tab-disposal-444"
			>
				<Syringe className="w-4 h-4 shrink-0" />
				<span className="hidden sm:inline">Списание по сроку годности / браку</span>
				<span className="sm:hidden">Брак / Срок</span>
				<span className="sr-only">Медпомощь 043/у (Схема 444)</span>
				<span className="sr-only">Схема 444</span>
			</button>
		</div>
	);
};
