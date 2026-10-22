import React, { useState } from "react";
import type { EndoCanalData } from "@dental/shared";
import { CANAL_NAME_OPTIONS } from "./endoCanalConstants";
import type { EndoCanalTableProps } from "./table/types";
import { DesktopCanalTable } from "./table/DesktopCanalTable";
import { MobileCanalsList } from "./table/MobileCanalsList";
import { MobileSealerDrawer } from "./table/MobileSealerDrawer";

export type { EndoCanalTableProps } from "./table/types";

export const EndoCanalTable: React.FC<EndoCanalTableProps> = (props) => {
	const [activeCanalForSealer, setActiveCanalForSealer] = useState<EndoCanalData | null>(null);

	return (
		<>
			{/* Datalist for fast canal name autocomplete */}
			<datalist id="endo-canal-names-list">
				{CANAL_NAME_OPTIONS.map((opt) => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</datalist>

			{/* Multi-canal Table / Matrix (Dense desktop ergonomics h-8/h-9, Mandate 8c) */}
			<DesktopCanalTable {...props} />

			{/* Mobile Grouped Cards View (Apple HIG & Anti-Desktop-Squeeze standard) */}
			<MobileCanalsList
				{...props}
				onSelectSealer={setActiveCanalForSealer}
			/>

			{/* Mobile Sealer Selection Bottom Sheet (Apple iOS HIG) */}
			<MobileSealerDrawer
				activeCanalForSealer={activeCanalForSealer}
				onClose={() => setActiveCanalForSealer(null)}
				onSelectSealer={(canalId, sealer) => {
					props.handleCanalChange(canalId, "sealer", sealer);
				}}
			/>
		</>
	);
};
