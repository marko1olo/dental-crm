import React from "react";
import { BracketSystemPicker } from "./bracketProtocol/BracketSystemPicker";
import { PlateScrewSection } from "./bracketProtocol/PlateScrewSection";
import { AlignerAttachmentsSection } from "./bracketProtocol/AlignerAttachmentsSection";
import type { OrthoBracketProtocolSectionProps } from "./bracketProtocol/types";

export * from "./bracketProtocol/types";

export const OrthoBracketProtocolSection: React.FC<OrthoBracketProtocolSectionProps> = (props) => {
	const hasScrew =
		props.bracketSystem === "removable_plate" ||
		props.bracketSystem === "marco_rosa" ||
		props.bracketSystem === "haas_rpe" ||
		props.bracketSystem === "twin_block";

	return (
		<div className="flex flex-col gap-3">
			<BracketSystemPicker
				bracketSlot={props.bracketSlot}
				setBracketSlot={props.setBracketSlot}
				bracketSystem={props.bracketSystem}
				onSelectBracketSystem={props.onSelectBracketSystem}
			/>
			{hasScrew && (
				<PlateScrewSection
					plateActivationTurns={props.plateActivationTurns}
					setPlateActivationTurns={props.setPlateActivationTurns}
					onAddExpansionScrewAction={props.onAddExpansionScrewAction}
				/>
			)}
			<AlignerAttachmentsSection {...props} />
		</div>
	);
};
