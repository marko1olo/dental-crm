import type React from "react";
import { useState } from "react";
import { StandaloneClinicalBundlesHost } from "../appLayout/modalsContainerModules/standalone/clinical/StandaloneClinicalBundlesHost";
import { clearUrlTokens, hasUrlToken } from "../appLayout/modalsContainerModules/standalone/deepLinkUrl";

export const DirectClinicalBundlesLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		return hasUrlToken(["clinical-bundles", "diagnosis-packages", "clinical_bundles"]);
	});

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[99999] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] overflow-y-auto">
			<StandaloneClinicalBundlesHost
				onClose={() => {
					setIsOpen(false);
					clearUrlTokens(["clinical-bundles", "diagnosis-packages", "clinical_bundles"]);
				}}
			/>
		</div>
	);
};
