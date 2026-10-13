import React from "react";
import { SanpinRegisters } from "../../components/sanpin/SanpinRegisters";

export function SterilizationView() {
	return (
		<div className="sterilization-view-root flex flex-col w-full min-h-full">
			<SanpinRegisters />
		</div>
	);
}

export default SterilizationView;
